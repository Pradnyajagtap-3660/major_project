const pool = require('../db');

/**
 * Creates network topology for roads_in_risk table
 * This is a ONE-TIME setup script that populates source and target columns
 * Required for pgRouting to work properly
 */
async function createTopology() {
  console.log('🚀 Starting network topology creation...\n');

  try {
    // Step 1: Check if topology already exists
    console.log('Step 1: Checking existing topology...');
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM roads_in_risk
      WHERE source IS NOT NULL AND target IS NOT NULL
    `);

    const existingCount = parseInt(checkResult.rows[0].count);
    console.log(`   Found ${existingCount} roads with topology data`);

    if (existingCount > 0) {
      console.log('   ⚠️  Topology already exists. Cleaning up first...');
      await pool.query(`
        UPDATE roads_in_risk
        SET source = NULL, target = NULL
      `);
      console.log('   ✅ Cleaned up existing topology\n');
    }

    // Step 2: Check geometry type
    console.log('Step 2: Checking geometry types...');
    const geomTypeResult = await pool.query(`
      SELECT DISTINCT ST_GeometryType(geom) as geom_type
      FROM roads_in_risk
      LIMIT 5
    `);
    console.log('   Geometry types:', geomTypeResult.rows);

    // Step 3: Create vertices table for network nodes
    console.log('\nStep 3: Creating vertices table...');
    await pool.query(`
      DROP TABLE IF EXISTS roads_in_risk_vertices_pgr CASCADE;
    `);

    await pool.query(`
      CREATE TABLE roads_in_risk_vertices_pgr (
        id BIGSERIAL PRIMARY KEY,
        geom geometry(Point, 4326),
        cnt INTEGER DEFAULT 1
      );
    `);
    console.log('   ✅ Vertices table created');

    // Step 4: Extract unique start and end points as vertices
    console.log('\nStep 4: Extracting network vertices (this may take a few minutes)...');
    const startTime = Date.now();

    await pool.query(`
      INSERT INTO roads_in_risk_vertices_pgr (geom)
      SELECT DISTINCT ST_StartPoint(ST_GeometryN(geom, 1))
      FROM roads_in_risk
      WHERE geom IS NOT NULL
      UNION
      SELECT DISTINCT ST_EndPoint(ST_GeometryN(geom, 1))
      FROM roads_in_risk
      WHERE geom IS NOT NULL;
    `);

    const vertexCount = await pool.query(`SELECT COUNT(*) FROM roads_in_risk_vertices_pgr`);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   ✅ Extracted ${vertexCount.rows[0].count} unique vertices in ${duration} seconds`);

    // Step 5: Create spatial index on vertices
    console.log('\nStep 5: Creating spatial index on vertices...');
    await pool.query(`
      CREATE INDEX roads_in_risk_vertices_pgr_geom_idx
      ON roads_in_risk_vertices_pgr USING GIST(geom);
    `);
    console.log('   ✅ Spatial index created');

    // Step 6: Populate source column
    console.log('\nStep 6: Populating source nodes (this may take a few minutes)...');
    const sourceStart = Date.now();

    await pool.query(`
      UPDATE roads_in_risk r
      SET source = v.id
      FROM roads_in_risk_vertices_pgr v
      WHERE ST_DWithin(
        ST_StartPoint(ST_GeometryN(r.geom, 1)),
        v.geom,
        0.0001
      )
      AND r.source IS NULL;
    `);

    const sourceDuration = ((Date.now() - sourceStart) / 1000).toFixed(2);
    console.log(`   ✅ Source nodes populated in ${sourceDuration} seconds`);

    // Step 7: Populate target column
    console.log('\nStep 7: Populating target nodes (this may take a few minutes)...');
    const targetStart = Date.now();

    await pool.query(`
      UPDATE roads_in_risk r
      SET target = v.id
      FROM roads_in_risk_vertices_pgr v
      WHERE ST_DWithin(
        ST_EndPoint(ST_GeometryN(r.geom, 1)),
        v.geom,
        0.0001
      )
      AND r.target IS NULL;
    `);

    const targetDuration = ((Date.now() - targetStart) / 1000).toFixed(2);
    console.log(`   ✅ Target nodes populated in ${targetDuration} seconds`);

    // Step 4: Verify topology
    console.log('\nStep 4: Verifying topology...');
    const verifyResult = await pool.query(`
      SELECT
        COUNT(*) as total_roads,
        COUNT(source) as roads_with_source,
        COUNT(target) as roads_with_target,
        COUNT(*) FILTER (WHERE source IS NOT NULL AND target IS NOT NULL) as fully_connected
      FROM roads_in_risk
    `);
    console.log('   Verification:', verifyResult.rows[0]);

    // Step 5: Create spatial indexes for performance
    console.log('\nStep 5: Creating spatial indexes...');

    // Check if indexes already exist
    const indexCheck = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'roads_in_risk'
      AND indexname IN ('roads_in_risk_source_idx', 'roads_in_risk_target_idx')
    `);

    if (indexCheck.rows.length < 2) {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS roads_in_risk_source_idx
        ON roads_in_risk(source);
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS roads_in_risk_target_idx
        ON roads_in_risk(target);
      `);
      console.log('   ✅ Spatial indexes created');
    } else {
      console.log('   ✅ Spatial indexes already exist');
    }

    // Step 8: Get statistics
    console.log('\nStep 8: Getting topology statistics...');
    const statsResult = await pool.query(`
      SELECT
        MIN(source) as min_source,
        MAX(source) as max_source,
        MIN(target) as min_target,
        MAX(target) as max_target,
        COUNT(DISTINCT source) as unique_sources,
        COUNT(DISTINCT target) as unique_targets
      FROM roads_in_risk
      WHERE source IS NOT NULL AND target IS NOT NULL
    `);
    console.log('   Statistics:', statsResult.rows[0]);

    console.log('\n✅ ✅ ✅ Network topology creation completed successfully! ✅ ✅ ✅\n');
    console.log('Your road network is now ready for routing operations.');

  } catch (error) {
    console.error('\n❌ Error creating topology:', error);
    throw error;
  }
}

// Run the setup
createTopology()
  .then(() => {
    console.log('\nClosing database connection...');
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFatal error:', error);
    pool.end();
    process.exit(1);
  });
