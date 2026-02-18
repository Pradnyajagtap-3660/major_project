const https = require('https');
const fs = require('fs');
const pool = require('../db');

/**
 * Download complete road network for Mumbai from OpenStreetMap
 * This will give us all roads including highways, main roads, and local streets
 */

console.log('🌍 Starting Mumbai Complete Road Network Download...\n');

// Mumbai bounding box coordinates
const MUMBAI_BBOX = {
  south: 18.90,
  west: 72.77,
  north: 19.28,
  east: 72.98
};

console.log('📍 Mumbai Bounding Box:');
console.log(`   South: ${MUMBAI_BBOX.south}, West: ${MUMBAI_BBOX.west}`);
console.log(`   North: ${MUMBAI_BBOX.north}, East: ${MUMBAI_BBOX.east}\n`);

// Overpass API query to get all roads in Mumbai
const overpassQuery = `
[out:json][timeout:300];
(
  way["highway"]["highway"!="footway"]["highway"!="path"]["highway"!="steps"]["highway"!="cycleway"]["highway"!="pedestrian"]
    (${MUMBAI_BBOX.south},${MUMBAI_BBOX.west},${MUMBAI_BBOX.north},${MUMBAI_BBOX.east});
);
out geom;
`;

const overpassUrl = 'https://overpass-api.de/api/interpreter';

async function downloadRoads() {
  return new Promise((resolve, reject) => {
    console.log('📥 Downloading road data from OpenStreetMap...');
    console.log('   This may take 2-5 minutes for complete Mumbai data...\n');

    const postData = overpassQuery;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(overpassUrl, options, (res) => {
      let data = '';
      let downloadedMB = 0;

      res.on('data', (chunk) => {
        data += chunk;
        downloadedMB = (Buffer.byteLength(data) / 1024 / 1024).toFixed(2);
        process.stdout.write(`\r   Downloaded: ${downloadedMB} MB`);
      });

      res.on('end', () => {
        console.log('\n✅ Download complete!\n');

        // Save to file
        const filename = 'mumbai_roads_complete.json';
        fs.writeFileSync(filename, data);
        console.log(`💾 Saved to: ${filename}`);
        console.log(`   File size: ${downloadedMB} MB\n`);

        resolve(JSON.parse(data));
      });
    });

    req.on('error', (error) => {
      console.error('❌ Download error:', error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function importRoadsToDatabase(osmData) {
  console.log('📊 Processing OSM data...\n');

  const roads = osmData.elements.filter(el => el.type === 'way' && el.geometry);
  console.log(`   Found ${roads.length} road segments\n`);

  // Create temporary table for complete roads
  console.log('🗄️  Creating complete_roads table...');

  await pool.query(`
    DROP TABLE IF EXISTS complete_roads CASCADE;
  `);

  await pool.query(`
    CREATE TABLE complete_roads (
      id BIGSERIAL PRIMARY KEY,
      osm_id BIGINT,
      highway VARCHAR(50),
      name VARCHAR(255),
      oneway VARCHAR(10),
      maxspeed VARCHAR(20),
      surface VARCHAR(50),
      lanes INTEGER,
      geom geometry(LineString, 4326),
      source BIGINT,
      target BIGINT,
      cost DOUBLE PRECISION,
      reverse_cost DOUBLE PRECISION,
      flood_risk NUMERIC,
      risk_categ VARCHAR(50)
    );
  `);

  console.log('✅ Table created\n');

  // Insert roads in batches
  console.log('📥 Importing roads to database...');
  let imported = 0;
  const batchSize = 100;

  for (let i = 0; i < roads.length; i += batchSize) {
    const batch = roads.slice(i, i + batchSize);
    const values = [];
    const placeholders = [];

    batch.forEach((road, idx) => {
      const baseIdx = idx * 7;
      const coords = road.geometry.map(node => `${node.lon} ${node.lat}`).join(',');
      const lineString = `LINESTRING(${coords})`;

      values.push(
        road.id,
        road.tags?.highway || 'unclassified',
        road.tags?.name || null,
        road.tags?.oneway || null,
        road.tags?.maxspeed || null,
        road.tags?.surface || null,
        road.tags?.lanes ? parseInt(road.tags.lanes) : null
      );

      placeholders.push(`($${baseIdx + 1}, $${baseIdx + 2}, $${baseIdx + 3}, $${baseIdx + 4}, $${baseIdx + 5}, $${baseIdx + 6}, $${baseIdx + 7}, ST_GeomFromText('${lineString}', 4326))`);
    });

    if (values.length > 0) {
      await pool.query(`
        INSERT INTO complete_roads (osm_id, highway, name, oneway, maxspeed, surface, lanes, geom)
        VALUES ${placeholders.join(',')}
      `, values);
    }

    imported += batch.length;
    process.stdout.write(`\r   Imported: ${imported}/${roads.length} roads`);
  }

  console.log('\n✅ All roads imported!\n');
}

async function overlayFloodRisk() {
  console.log('🌊 Overlaying flood risk data on complete roads...\n');

  // Spatial join to assign flood risk to each road segment
  console.log('   Calculating flood risk for each road...');

  await pool.query(`
    UPDATE complete_roads cr
    SET flood_risk = COALESCE(
      (
        SELECT AVG(rir.flood_risk)
        FROM roads_in_risk rir
        WHERE ST_DWithin(cr.geom, rir.geom, 0.001)
        AND rir.flood_risk IS NOT NULL
      ),
      0.5  -- Default medium risk if no data
    ),
    risk_categ = CASE
      WHEN COALESCE(
        (
          SELECT AVG(rir.flood_risk)
          FROM roads_in_risk rir
          WHERE ST_DWithin(cr.geom, rir.geom, 0.001)
          AND rir.flood_risk IS NOT NULL
        ),
        0.5
      ) >= 0.7 THEN 'High Risk'
      WHEN COALESCE(
        (
          SELECT AVG(rir.flood_risk)
          FROM roads_in_risk rir
          WHERE ST_DWithin(cr.geom, rir.geom, 0.001)
          AND rir.flood_risk IS NOT NULL
        ),
        0.5
      ) >= 0.4 THEN 'Medium Risk'
      ELSE 'Low Risk'
    END;
  `);

  console.log('✅ Flood risk data overlaid\n');
}

async function createTopology() {
  console.log('🔗 Creating network topology...\n');

  // Create vertices table
  console.log('   Creating vertices...');
  await pool.query(`
    DROP TABLE IF EXISTS complete_roads_vertices_pgr CASCADE;
  `);

  await pool.query(`
    CREATE TABLE complete_roads_vertices_pgr (
      id BIGSERIAL PRIMARY KEY,
      geom geometry(Point, 4326)
    );
  `);

  await pool.query(`
    INSERT INTO complete_roads_vertices_pgr (geom)
    SELECT DISTINCT ST_StartPoint(geom)
    FROM complete_roads
    UNION
    SELECT DISTINCT ST_EndPoint(geom)
    FROM complete_roads;
  `);

  const vertexCount = await pool.query(`SELECT COUNT(*) FROM complete_roads_vertices_pgr`);
  console.log(`   ✅ Created ${vertexCount.rows[0].count} vertices\n`);

  // Create spatial index
  console.log('   Creating spatial index...');
  await pool.query(`
    CREATE INDEX complete_roads_vertices_geom_idx
    ON complete_roads_vertices_pgr USING GIST(geom);
  `);
  console.log('   ✅ Index created\n');

  // Populate source/target
  console.log('   Populating source nodes...');
  await pool.query(`
    UPDATE complete_roads cr
    SET source = v.id
    FROM complete_roads_vertices_pgr v
    WHERE ST_DWithin(ST_StartPoint(cr.geom), v.geom, 0.00001);
  `);
  console.log('   ✅ Source nodes populated\n');

  console.log('   Populating target nodes...');
  await pool.query(`
    UPDATE complete_roads cr
    SET target = v.id
    FROM complete_roads_vertices_pgr v
    WHERE ST_DWithin(ST_EndPoint(cr.geom), v.geom, 0.00001);
  `);
  console.log('   ✅ Target nodes populated\n');

  // Calculate costs
  console.log('   Calculating routing costs...');
  await pool.query(`
    UPDATE complete_roads
    SET cost = ST_Length(geom::geography),
        reverse_cost = ST_Length(geom::geography)
    WHERE source IS NOT NULL AND target IS NOT NULL;
  `);
  console.log('   ✅ Costs calculated\n');

  // Verify
  const stats = await pool.query(`
    SELECT
      COUNT(*) as total,
      COUNT(source) as with_source,
      COUNT(target) as with_target
    FROM complete_roads;
  `);
  console.log('📊 Topology Statistics:');
  console.log('   Total roads:', stats.rows[0].total);
  console.log('   With source:', stats.rows[0].with_source);
  console.log('   With target:', stats.rows[0].with_target);
  console.log();
}

// Main execution
async function main() {
  try {
    // Step 1: Download
    const osmData = await downloadRoads();

    // Step 2: Import
    await importRoadsToDatabase(osmData);

    // Step 3: Overlay flood risk
    await overlayFloodRisk();

    // Step 4: Create topology
    await createTopology();

    console.log('✅ ✅ ✅ Complete road network setup finished! ✅ ✅ ✅\n');
    console.log('🎉 Your routing will now work across all of Mumbai!\n');
    console.log('Next steps:');
    console.log('1. Update safePathC.js to use complete_roads table');
    console.log('2. Test routing between any two locations in Mumbai');
    console.log('3. Enjoy full city coverage!\n');

    pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    pool.end();
    process.exit(1);
  }
}

main();
