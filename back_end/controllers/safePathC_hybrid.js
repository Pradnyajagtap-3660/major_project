const pool = require("../db");
const https = require("https");

// Fetch a route from OSRM (with optional waypoint)
function fetchOSRMRoute(startLon, startLat, endLon, endLat, viaLon = null, viaLat = null) {
  return new Promise((resolve) => {
    const coords = viaLon
      ? `${startLon},${startLat};${viaLon},${viaLat};${endLon},${endLat}`
      : `${startLon},${startLat};${endLon},${endLat}`;

    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 'Ok' && result.routes && result.routes.length > 0) {
            resolve(result.routes[0]);
          } else {
            resolve(null);
          }
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// Fetch direct route + alternatives from OSRM
function fetchOSRMAlternatives(startLon, startLat, endLon, endLat) {
  return new Promise((resolve) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&alternatives=true`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 'Ok' && result.routes) {
            resolve(result.routes);
          } else {
            resolve([]);
          }
        } catch { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

// Analyze flood risk along a route
async function analyzeRouteRisk(routeCoordinates) {
  const lineString = `LINESTRING(${routeCoordinates.map(c => `${c[0]} ${c[1]}`).join(',')})`;
  const result = await pool.query(`
    SELECT
      AVG(flood_risk) as avg_risk,
      MAX(flood_risk) as max_risk,
      COUNT(*) as risky_segments
    FROM roads_in_risk
    WHERE ST_DWithin(geom, ST_GeomFromText($1, 4326), 0.001)
    AND flood_risk > 0.3
  `, [lineString]);
  return result.rows[0];
}

// Generate a waypoint offset from midpoint (perpendicular direction)
// offsetMeters: positive = north-east, negative = south-west
function getOffsetWaypoint(startLon, startLat, endLon, endLat, offsetMeters) {
  const midLon = (startLon + endLon) / 2;
  const midLat = (startLat + endLat) / 2;

  // Direction vector of the route
  const dLon = endLon - startLon;
  const dLat = endLat - startLat;
  const len = Math.sqrt(dLon * dLon + dLat * dLat);

  // Perpendicular direction (rotate 90 degrees)
  const perpLon = -dLat / len;
  const perpLat = dLon / len;

  // Convert meters to degrees (~111,000 meters per degree)
  const degreeOffset = offsetMeters / 111000;

  return {
    lon: midLon + perpLon * degreeOffset,
    lat: midLat + perpLat * degreeOffset
  };
}

// Format a route object for frontend
function formatRoute(route, risk, type, label, color) {
  const avgRisk = parseFloat(risk.avg_risk) || 0;
  return {
    type,
    label,
    color,
    path: route.geometry.coordinates,
    metadata: {
      totalDistance: parseFloat((route.distance / 1000).toFixed(2)),
      duration: Math.round(route.duration / 60),
      averageRisk: parseFloat(avgRisk.toFixed(2)),
      maxRisk: parseFloat((parseFloat(risk.max_risk) || 0).toFixed(2)),
      safetyLevel: avgRisk < 0.4 ? "Safe" : avgRisk < 0.7 ? "Moderate" : "High Risk",
      riskySegments: parseInt(risk.risky_segments) || 0
    }
  };
}

exports.getsafePath = async (req, res) => {
  try {
    console.log("🗺️  Multi-Route Request:", req.body);
    const { userLocation, shelterLocation } = req.body;

    if (!userLocation || !shelterLocation) {
      return res.status(400).json({ error: "Missing userLocation or shelterLocation" });
    }

    const [userLon, userLat] = userLocation;
    const [destLon, destLat] = shelterLocation;

    // Step 1: Get direct route + OSRM alternatives
    console.log("   📍 Getting routes from OSRM...");
    const osrmRoutes = await fetchOSRMAlternatives(userLon, userLat, destLon, destLat);

    // Step 2: Scale waypoint offsets based on straight-line distance
    // For short trips, small offsets; for long trips, larger offsets
    const straightLineDeg = Math.sqrt(
      Math.pow(destLon - userLon, 2) + Math.pow(destLat - userLat, 2)
    );
    const straightLineMeters = straightLineDeg * 111000;
    // Two offset scales: small for nearby alternatives, large for diverse/longer alternatives
    // Small: 20% of distance (min 150m) — finds close, efficient routes
    // Large: 50% of distance (min 400m) — finds routes that go around flood zones
    // The 3.5x distance filter prevents excessively long detour routes
    const wpOffsetSmall = Math.min(300, Math.max(150, straightLineMeters * 0.2));
    const wpOffsetLarge = Math.min(800, Math.max(400, straightLineMeters * 0.5));
    console.log(`   📐 Straight-line: ${(straightLineMeters/1000).toFixed(2)}km, offsets: ${Math.round(wpOffsetSmall)}m / ${Math.round(wpOffsetLarge)}m`);

    const wp1 = getOffsetWaypoint(userLon, userLat, destLon, destLat, wpOffsetSmall);
    const wp2 = getOffsetWaypoint(userLon, userLat, destLon, destLat, -wpOffsetSmall);
    const wp3 = getOffsetWaypoint(userLon, userLat, destLon, destLat, wpOffsetLarge);
    const wp4 = getOffsetWaypoint(userLon, userLat, destLon, destLat, -wpOffsetLarge);

    const [wpRoute1, wpRoute2, wpRoute3, wpRoute4] = await Promise.all([
      fetchOSRMRoute(userLon, userLat, destLon, destLat, wp1.lon, wp1.lat),
      fetchOSRMRoute(userLon, userLat, destLon, destLat, wp2.lon, wp2.lat),
      fetchOSRMRoute(userLon, userLat, destLon, destLat, wp3.lon, wp3.lat),
      fetchOSRMRoute(userLon, userLat, destLon, destLat, wp4.lon, wp4.lat),
    ]);

    // Step 3: Combine all unique routes
    const allRoutes = [...osrmRoutes];
    for (const r of [wpRoute1, wpRoute2, wpRoute3, wpRoute4]) {
      if (r) allRoutes.push(r);
    }

    if (allRoutes.length === 0) {
      return res.status(404).json({ error: "No routes found", suggestion: "Try different locations" });
    }

    // Use OSRM direct route as reference (not minimum which could be a near-zero waypoint route)
    // This prevents the 2.5x limit from being too tight when OSRM returns a very short route
    const osrmRefDist = osrmRoutes.length > 0
      ? osrmRoutes[0].distance
      : Math.min(...allRoutes.map(r => r.distance));
    // Max acceptable detour: 3.5x the direct OSRM route distance
    // (2.5x was too tight - excluded valid safer routes slightly longer than direct)
    const maxAllowedDist = Math.max(osrmRefDist * 3.5, straightLineMeters * 4);
    const filteredRoutes = allRoutes.filter(r => r.distance <= maxAllowedDist);
    // Fallback: if not enough filtered routes, use 5x straight-line cap instead of ALL routes
    // This prevents extremely long detour routes (e.g. 8.26km for a 1km straight-line trip)
    const absoluteMaxDist = Math.max(osrmRefDist * 4, straightLineMeters * 5);
    const fallbackRoutes = allRoutes.filter(r => r.distance <= absoluteMaxDist);
    const routePool = filteredRoutes.length >= 2 ? filteredRoutes
      : fallbackRoutes.length >= 2 ? fallbackRoutes
      : allRoutes;

    console.log(`   📍 Total candidates: ${allRoutes.length}, within limit (${(maxAllowedDist/1000).toFixed(1)}km): ${filteredRoutes.length}`);

    // Step 4: Analyze flood risk for each route
    console.log("   🌊 Analyzing flood risk for all routes...");
    const routesWithRisk = [];

    for (const route of routePool) {
      const risk = await analyzeRouteRisk(route.geometry.coordinates);
      const avgRisk = parseFloat(risk.avg_risk) || 0;
      routesWithRisk.push({ route, risk, avgRisk });
    }

    // Step 5: Sort by risk (safest first)
    routesWithRisk.sort((a, b) => a.avgRisk - b.avgRisk);
    console.log("   📊 Risk levels:", routesWithRisk.map(r => r.avgRisk.toFixed(2)).join(', '));

    // Step 6: Pick up to 3 distinct routes by removing near-duplicates
    const distinctRoutes = [];
    for (const candidate of routesWithRisk) {
      if (distinctRoutes.length >= 3) break;
      const tooSimilar = distinctRoutes.some(r => Math.abs(r.avgRisk - candidate.avgRisk) < 0.02);
      if (!tooSimilar) distinctRoutes.push(candidate);
    }
    // Fill remaining slots — only add routes with meaningfully different distances (different physical paths)
    // If moderate and high are the same path, skip high; show only safe + moderate
    for (const candidate of routesWithRisk) {
      if (distinctRoutes.length >= 3) break;
      if (distinctRoutes.includes(candidate)) continue;
      const samePath = distinctRoutes.some(r =>
        Math.abs(r.route.distance - candidate.route.distance) / Math.max(r.route.distance, candidate.route.distance) < 0.05
      );
      if (!samePath) distinctRoutes.push(candidate);
    }
    // Always re-sort by risk so labels are correct: safe=lowest, high=highest
    distinctRoutes.sort((a, b) => a.avgRisk - b.avgRisk);

    // HYBRID LABELING: rank 0 is always "Safest"; ranks 1 & 2 use absolute risk thresholds
    // This prevents labeling a 0% risk route as "High Risk Route"
    const routes = distinctRoutes.map((candidate, i) => {
      const avgRisk = candidate.avgRisk;
      let type, label, color;

      if (i === 0) {
        // Best route is always the recommended safest option
        type = 'safe'; label = '🟢 Safest Route'; color = '#22c55e';
      } else if (avgRisk < 0.4) {
        // Genuinely low risk — don't call it moderate or high
        type = 'safe';
        label = i === 1 ? '🟢 Safe Route' : '🟢 Safe Alternative';
        color = '#22c55e';
      } else if (avgRisk < 0.7) {
        type = 'moderate'; label = '🟡 Moderate Route'; color = '#f59e0b';
      } else {
        type = 'high'; label = '🔴 High Risk Route'; color = '#ef4444';
      }

      console.log(`   ${label}: risk=${avgRisk.toFixed(2)}, dist=${(candidate.route.distance/1000).toFixed(2)}km`);
      return formatRoute(candidate.route, candidate.risk, type, label, color);
    });


    console.log(`✅ Returning ${routes.length} route(s)`);
    res.json({ routes });

  } catch (err) {
    console.error("❌ Route Error:", err);
    res.status(500).json({
      error: "Route calculation failed",
      details: err.message,
      suggestion: "Please try again or check if locations are valid"
    });
  }
};
