const pool = require('../db');

async function main() {
  // Green route goes via LBS Marg (lat ~19.083-19.086, north area)
  // Orange route goes via Nathani Road (lat ~19.079-19.083, stays south)

  console.log('=== Grid cell risk in GREEN route area (LBS Marg, north) ===');
  const g1 = await pool.query(`
    SELECT ROUND(flood_risk::numeric, 4) as risk, risk_categ,
      ROUND(ST_X(ST_Centroid(geom))::numeric, 4) as lon,
      ROUND(ST_Y(ST_Centroid(geom))::numeric, 4) as lat
    FROM flood_risk_grid
    WHERE geom && ST_MakeEnvelope(72.875, 19.082, 72.892, 19.088, 4326)
    ORDER BY flood_risk
    LIMIT 10
  `);
  g1.rows.forEach(r => console.log('  risk=' + r.risk + ' (' + r.risk_categ + ') at', r.lon, r.lat));

  console.log('\n=== Grid cell risk in ORANGE route area (Nathani Rd, east-south) ===');
  const g2 = await pool.query(`
    SELECT ROUND(flood_risk::numeric, 4) as risk, risk_categ,
      ROUND(ST_X(ST_Centroid(geom))::numeric, 4) as lon,
      ROUND(ST_Y(ST_Centroid(geom))::numeric, 4) as lat
    FROM flood_risk_grid
    WHERE geom && ST_MakeEnvelope(72.886, 19.078, 72.896, 19.083, 4326)
    ORDER BY flood_risk
    LIMIT 10
  `);
  g2.rows.forEach(r => console.log('  risk=' + r.risk + ' (' + r.risk_categ + ') at', r.lon, r.lat));

  // Check roads along green route specifically
  console.log('\n=== Roads along GREEN route (LBS Marg area) ===');
  const r1 = await pool.query(`
    SELECT COALESCE(name, 'Unnamed') as name,
      ROUND(flood_risk::numeric, 4) as risk,
      risk_categ
    FROM roads_in_risk
    WHERE geom && ST_MakeEnvelope(72.875, 19.082, 72.892, 19.088, 4326)
    AND name IS NOT NULL
    ORDER BY flood_risk DESC
    LIMIT 10
  `);
  r1.rows.forEach(r => console.log(' ', r.name.substring(0,30).padEnd(30), 'risk=' + r.risk, r.risk_categ));

  // Check roads along orange route
  console.log('\n=== Roads along ORANGE route (Nathani Rd area) ===');
  const r2 = await pool.query(`
    SELECT COALESCE(name, 'Unnamed') as name,
      ROUND(flood_risk::numeric, 4) as risk,
      risk_categ
    FROM roads_in_risk
    WHERE geom && ST_MakeEnvelope(72.886, 19.078, 72.896, 19.083, 4326)
    AND name IS NOT NULL
    ORDER BY flood_risk DESC
    LIMIT 10
  `);
  r2.rows.forEach(r => console.log(' ', r.name.substring(0,30).padEnd(30), 'risk=' + r.risk, r.risk_categ));

  process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
