const https = require('https');
const pool = require('../db');

const userLon = 72.8886567, userLat = 19.0821704;
const destLon = 72.8831157, destLat = 19.0815079;

function getOffsetWaypoint(offsetMeters) {
  const midLon = (userLon + destLon) / 2;
  const midLat = (userLat + destLat) / 2;
  const dLon = destLon - userLon;
  const dLat = destLat - userLat;
  const len = Math.sqrt(dLon*dLon + dLat*dLat);
  const perpLon = -dLat / len;
  const perpLat = dLon / len;
  const deg = offsetMeters / 111000;
  return { lon: midLon + perpLon * deg, lat: midLat + perpLat * deg };
}

function fetchRoute(startLon, startLat, endLon, endLat, viaLon, viaLat) {
  return new Promise((resolve) => {
    const coords = viaLon
      ? `${startLon},${startLat};${viaLon},${viaLat};${endLon},${endLat}`
      : `${startLon},${startLat};${endLon},${endLat}`;
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          resolve(j.routes?.[0] || null);
        } catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function analyzeRoute(route, label) {
  if (!route) { console.log(label + ': null'); return; }
  const coords = route.geometry.coordinates;
  console.log('\n--- ' + label + ': ' + (route.distance/1000).toFixed(2) + 'km, ' + coords.length + ' points ---');

  // Query avg risk along full route
  const lineString = 'LINESTRING(' + coords.map(c => c[0] + ' ' + c[1]).join(',') + ')';
  const res = await pool.query(`
    SELECT
      AVG(flood_risk) as avg_risk,
      MAX(flood_risk) as max_risk,
      COUNT(*) as segments
    FROM roads_in_risk
    WHERE ST_DWithin(geom, ST_GeomFromText($1, 4326), 0.001)
    AND flood_risk > 0.3
  `, [lineString]);
  const stats = res.rows[0];
  console.log('  Avg risk:', parseFloat(stats.avg_risk).toFixed(3),
    '| Max:', parseFloat(stats.max_risk).toFixed(3),
    '| Segments:', stats.segments);

  // Show key road names every 10 points
  const step = Math.max(1, Math.floor(coords.length / 6));
  for (let i = 0; i < coords.length; i += step) {
    const [lon, lat] = coords[i];
    const r = await pool.query(`
      SELECT COALESCE(name, 'Unnamed') as name, ROUND(flood_risk::numeric, 3) as risk
      FROM roads_in_risk
      ORDER BY geom <-> ST_SetSRID(ST_Point($1, $2), 4326) LIMIT 1
    `, [lon, lat]);
    if (r.rows[0]) {
      console.log('  [' + lon.toFixed(4) + ',' + lat.toFixed(4) + '] ' +
        r.rows[0].name.substring(0,30).padEnd(30) + ' risk=' + r.rows[0].risk);
    }
  }
}

async function main() {
  const wp1 = getOffsetWaypoint(400);
  const wp2 = getOffsetWaypoint(-400);
  const wp3 = getOffsetWaypoint(800);

  console.log('Waypoints:');
  console.log('  wp1 (+400m):', wp1.lon.toFixed(4), wp1.lat.toFixed(4));
  console.log('  wp2 (-400m):', wp2.lon.toFixed(4), wp2.lat.toFixed(4));
  console.log('  wp3 (+800m):', wp3.lon.toFixed(4), wp3.lat.toFixed(4));

  const [r0, r1, r2, r3] = await Promise.all([
    fetchRoute(userLon, userLat, destLon, destLat, null, null),
    fetchRoute(userLon, userLat, destLon, destLat, wp1.lon, wp1.lat),
    fetchRoute(userLon, userLat, destLon, destLat, wp2.lon, wp2.lat),
    fetchRoute(userLon, userLat, destLon, destLat, wp3.lon, wp3.lat),
  ]);

  await analyzeRoute(r0, 'Direct route');
  await analyzeRoute(r1, 'Via WP1 (+400m north)');
  await analyzeRoute(r2, 'Via WP2 (-400m south)');
  await analyzeRoute(r3, 'Via WP3 (+800m north)');

  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
