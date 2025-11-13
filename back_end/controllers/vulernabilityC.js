// const pool = require('../db');

// exports.getVulernableZones = async (req, res) => {
//   try {
//     // const result = await pool.query(`
//     //   SELECT 
//     //     id,
//     //     ST_AsGeoJSON(geom)::json AS geometry
//     //   FROM vulnerability_zones;
//     // `);
//     const result = await pool.query(`
//     SELECT id, ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geometry
//     FROM vulnerability_zones  LIMIT 30000;
//     `);


//     res.json(result.rows);
//     console.log(result);
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Error fetching vulnerable zone data');
//   }
// };

const pool = require("../db");

exports.getVulnerableZones = async (req, res) => {
  try {
    const { minLng, minLat, maxLng, maxLat } = req.query;

    // If bounding box params are passed, use them
    if (minLng && minLat && maxLng && maxLat) {
      const result = await pool.query(
        `
         SELECT id, "Vul_Class", ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geometry
        FROM vulnerability_zones
        WHERE geom && ST_Transform(
            ST_MakeEnvelope($1, $2, $3, $4, 4326),
            ST_SRID(geom)
        )
        LIMIT 5000;
        `,
        [minLng, minLat, maxLng, maxLat]
      );
      return res.json(result.rows);
    }

    // Default: return a few zones
    const result = await pool.query(`
      SELECT id,"Vul_Class", ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geometry
      FROM vulnerability_zones
      LIMIT 100;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching vulnerable zones:", err);
    res.status(500).send("Error fetching vulnerable zone data");
  }
}; 
// working version zoom in zoom out version

// backend/controllers/vulnerabilityController.js
// const pool = require("../db");

// /**
//  * Controller to get vulnerable zones with bounding box & pagination
//  * Supports chunked fetch using offset and limit.
//  * Example request:
//  * GET /api/vulernable_zone?minLng=72.8&minLat=19.0&maxLng=73.0&maxLat=19.2&offset=0&limit=10000
//  */
// exports.getVulnerableZones = async (req, res) => {
//   try {
//     const { minLng, minLat, maxLng, maxLat, offset = 0, limit = 10000 } = req.query;

//     // Validate required params
//     if (!minLng || !minLat || !maxLng || !maxLat) {
//       return res.status(400).json({ error: "Missing bounding box parameters" });
//     }

//     const result = await pool.query(
//       `
//       SELECT id, ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geometry
//       FROM vulnerability_zones
//       WHERE geom && ST_Transform(
//         ST_MakeEnvelope($1, $2, $3, $4, 4326),
//         ST_SRID(geom)
//       )
//       OFFSET $5 LIMIT $6;
//       `,
//       [minLng, minLat, maxLng, maxLat, offset, limit]
//     );

//     res.json(result.rows);
//   } catch (err) {
//     console.error("❌ Error fetching vulnerable zones:", err);
//     res.status(500).send("Error fetching vulnerable zone data");
//   }
// };
