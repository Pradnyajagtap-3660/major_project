const pool = require('../db');

async function check() {
  // Check waterclogging zones near the green route area (LBS Marg / north path area)
  const r1 = await pool.query(`
    SELECT COUNT(*) as wl_count
    FROM waterclogging_points
    WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_Point(72.882, 19.083), 4326)::geography, 2000)
  `);
  console.log('Waterclogging zones within 2km of green route area:', r1.rows[0].wl_count);

  // Show all waterclogging zone locations
  const r2 = await pool.query(`
    SELECT
      ROUND(ST_X(geom)::numeric, 4) as lon,
      ROUND(ST_Y(geom)::numeric, 4) as lat
    FROM waterclogging_points
    ORDER BY ST_Y(geom) DESC
    LIMIT 20
  `);
  console.log('\nTop waterclogging zones (northernmost first):');
  r2.rows.forEach(r => console.log('  lon:', r.lon, 'lat:', r.lat));

  // Check roads on the green route path (roughly LBS Marg going east-west around lat 19.083)
  const r3 = await pool.query(`
    SELECT
      COALESCE(name, 'Unnamed') as road_name,
      ROUND(flood_risk::numeric, 3) as flood_risk,
      risk_categ,
      ROUND(COALESCE(wl_distance, 9999)::numeric, 0) as dist_to_waterlog_m
    FROM roads_in_risk
    WHERE geom && ST_MakeEnvelope(72.875, 19.079, 72.892, 19.087, 4326)
    ORDER BY flood_risk ASC
    LIMIT 15
  `);
  console.log('\nRoads in green route bounding box (sorted by risk):');
  r3.rows.forEach(r => console.log(
    ' ', r.road_name.substring(0,30).padEnd(30),
    '| risk:', r.flood_risk,
    '| wl_dist:', r.dist_to_waterlog_m + 'm',
    '|', r.risk_categ
  ));

  // Compare: what's the waterclogging data bounding box?
  const r4 = await pool.query(`
    SELECT
      ROUND(MIN(ST_X(geom))::numeric, 4) as min_lon,
      ROUND(MAX(ST_X(geom))::numeric, 4) as max_lon,
      ROUND(MIN(ST_Y(geom))::numeric, 4) as min_lat,
      ROUND(MAX(ST_Y(geom))::numeric, 4) as max_lat,
      COUNT(*) as total_zones
    FROM waterclogging_points
  `);
  console.log('\nWaterclogging zones coverage area:');
  console.log('  Lon:', r4.rows[0].min_lon, 'to', r4.rows[0].max_lon);
  console.log('  Lat:', r4.rows[0].min_lat, 'to', r4.rows[0].max_lat);
  console.log('  Total zones:', r4.rows[0].total_zones);

  process.exit(0);
}

check().catch(e => { console.error(e.message); process.exit(1); });
