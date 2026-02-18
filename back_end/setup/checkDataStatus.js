const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'flood_response',
  password: 'admin123',
  port: 5432,
});

async function checkStatus() {
  try {
    // Check if new columns exist
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE wl_distance IS NOT NULL) as roads_with_waterlog_data,
        COUNT(*) FILTER (WHERE elevation IS NOT NULL) as roads_with_elevation_data,
        COUNT(*) FILTER (WHERE calculated_risk IS NOT NULL) as roads_with_calculated_risk,
        COUNT(*) as total_roads
      FROM roads_in_risk;
    `);

    console.log('\n📊 Database Update Status:\n');
    console.log('═══════════════════════════════════════');
    const r = result.rows[0];
    console.log(`Total Roads: ${r.total_roads}`);
    console.log(`Roads with waterclogging data: ${r.roads_with_waterlog_data || 0}`);
    console.log(`Roads with elevation data: ${r.roads_with_elevation_data || 0}`);
    console.log(`Roads with calculated risk: ${r.roads_with_calculated_risk || 0}`);
    console.log('═══════════════════════════════════════\n');

    if (parseInt(r.roads_with_calculated_risk) === 0) {
      console.log('❌ DATABASE NOT YET UPDATED!\n');
      console.log('The database still has old flood risk values.');
      console.log('Blue path is being chosen because both paths');
      console.log('have similar high risk values.\n');
      console.log('TO FIX THIS, RUN:\n');
      console.log('  cd setup');
      console.log('  .\\updateFloodRiskData.bat\n');
    } else {
      console.log('✅ Database has been updated!\n');

      // Show risk distribution
      const dist = await pool.query(`
        SELECT
          CASE
            WHEN flood_risk < 0.3 THEN 'Low (0-0.3)'
            WHEN flood_risk < 0.6 THEN 'Medium (0.3-0.6)'
            ELSE 'High (0.6-1.0)'
          END as risk_category,
          COUNT(*) as count,
          ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 1) as percentage
        FROM roads_in_risk
        GROUP BY risk_category
        ORDER BY
          CASE
            WHEN flood_risk < 0.3 THEN 1
            WHEN flood_risk < 0.6 THEN 2
            ELSE 3
          END;
      `);

      console.log('Risk Distribution:');
      console.log('═══════════════════════════════════════');
      dist.rows.forEach(row => {
        console.log(`${row.risk_category.padEnd(20)} ${row.count.toString().padStart(8)} (${row.percentage}%)`);
      });
      console.log('═══════════════════════════════════════\n');
      console.log('Restart your server to use the new data!');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('column "wl_distance" does not exist')) {
      console.log('\n❌ Database has NOT been updated yet.');
      console.log('The new columns do not exist.\n');
      console.log('RUN THIS TO UPDATE:\n');
      console.log('  cd setup');
      console.log('  .\\updateFloodRiskData.bat\n');
    }
  }

  pool.end();
}

checkStatus();
