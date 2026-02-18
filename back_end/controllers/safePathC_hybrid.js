const pool = require("../db");
const https = require("https");

/**
 * HYBRID ROUTING SOLUTION
 * Step 1: Get route from OSRM (works anywhere in Mumbai)
 * Step 2: Overlay flood risk data from your database
 * Step 3: Reroute around high-risk areas when possible
 *
 * This gives you full city coverage like Google Maps + flood safety!
 */

async function getOSRMRoute(startLon, startLat, endLon, endLat) {
  return new Promise((resolve, reject) => {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 'Ok' && result.routes && result.routes.length > 0) {
            resolve(result.routes[0]);
          } else {
            reject(new Error('No route found by OSRM'));
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function analyzeRouteRisk(routeCoordinates) {
  // Analyze flood risk along the route
  const lineString = `LINESTRING(${routeCoordinates.map(c => `${c[0]} ${c[1]}`).join(',')})`;

  const result = await pool.query(`
    SELECT
      AVG(flood_risk) as avg_risk,
      MAX(flood_risk) as max_risk,
      COUNT(*) as risky_segments
    FROM roads_in_risk
    WHERE ST_DWithin(
      geom,
      ST_GeomFromText($1, 4326),
      0.001
    )
    AND flood_risk > 0.6
  `, [lineString]);

  return result.rows[0];
}

async function findSaferAlternative(startLon, startLat, endLon, endLat, mainRouteRisk) {
  // Try to find alternative routes with lower risk
  // Get MAXIMUM route alternatives from OSRM (increased from 3 to 10)
  // More alternatives = better chance of finding safer path
  const alternativesUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&alternatives=10`;

  return new Promise((resolve) => {
    https.get(alternativesUrl, async (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', async () => {
        try {
          const result = JSON.parse(data);
          if (result.routes && result.routes.length > 1) {
            // Analyze risk for each alternative
            let bestRoute = null;
            let lowestRisk = mainRouteRisk;

            for (const route of result.routes) {
              const risk = await analyzeRouteRisk(route.geometry.coordinates);
              const routeRisk = parseFloat(risk.avg_risk) || 0;
              // Accept ANY route that's safer, even by small margin
              // Critical when most roads are in 0.7-1.0 range
              if (routeRisk < lowestRisk) {
                const improvement = ((lowestRisk - routeRisk) * 100).toFixed(1);
                console.log(`   🔄 Found safer route: ${routeRisk.toFixed(3)} vs ${lowestRisk.toFixed(3)} (${improvement}% better)`);
                lowestRisk = routeRisk;
                bestRoute = route;
              }
            }

            resolve(bestRoute);
          } else {
            resolve(null);
          }
        } catch (error) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

exports.getsafePath = async (req, res) => {
  try {
    console.log("🗺️  Hybrid Safe Route Request:", req.body);
    const { userLocation, shelterLocation } = req.body;

    if (!userLocation || !shelterLocation) {
      return res.status(400).json({ error: "Missing userLocation or shelterLocation" });
    }

    const [userLon, userLat] = userLocation;
    const [destLon, destLat] = shelterLocation;

    // Step 1: Get basic route from OSRM (works anywhere!)
    console.log("   📍 Getting route from OSRM...");
    const mainRoute = await getOSRMRoute(userLon, userLat, destLon, destLat);

    // Step 2: Analyze flood risk along the route
    console.log("   🌊 Analyzing flood risk...");
    const riskAnalysis = await analyzeRouteRisk(mainRoute.geometry.coordinates);

    let finalRoute = mainRoute;
    let routeType = "standard";

    // Step 3: If route has high risk, try to find safer alternative
    const currentAvgRisk = parseFloat(riskAnalysis.avg_risk) || 0;
    if (currentAvgRisk > 0.6) {
      console.log("   ⚠️  High risk detected, searching for safer route...");
      const saferRoute = await findSaferAlternative(userLon, userLat, destLon, destLat, currentAvgRisk);

      if (saferRoute) {
        finalRoute = saferRoute;
        routeType = "safer_alternative";
        console.log("   ✅ Found safer alternative route!");
      } else {
        console.log("   ⚠️  No safer alternative available");
        routeType = "high_risk_required";
      }
    }

    // Format response
    const routeCoords = finalRoute.geometry.coordinates;
    const distanceKm = (finalRoute.distance / 1000).toFixed(2);
    const durationMin = Math.round(finalRoute.duration / 60);

    // Safely convert risk values to numbers
    const avgRisk = parseFloat(riskAnalysis.avg_risk) || 0;
    const maxRisk = parseFloat(riskAnalysis.max_risk) || 0;
    const riskySegs = parseInt(riskAnalysis.risky_segments) || 0;

    console.log(`✅ Route found: ${distanceKm}km, ${durationMin}min, risk: ${avgRisk.toFixed(2)}`);

    res.json({
      path: routeCoords,
      metadata: {
        segments: routeCoords.length,
        totalDistance: parseFloat(distanceKm),
        duration: durationMin,
        averageRisk: parseFloat(avgRisk.toFixed(2)),
        maxRisk: parseFloat(maxRisk.toFixed(2)),
        safetyLevel: avgRisk < 0.5 ? "Safe" : avgRisk < 0.7 ? "Moderate" : "High Risk",
        routeType: routeType,
        riskySegments: riskySegs
      }
    });

  } catch (err) {
    console.error("❌ Route Error:", err);

    // Fallback error message
    res.status(500).json({
      error: "Route calculation failed",
      details: err.message,
      suggestion: "Please try again or check if locations are valid"
    });
  }
};
