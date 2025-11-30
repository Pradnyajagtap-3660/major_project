const pool = require('../db');

// Get shelter locations
exports.getShelters = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, ST_AsGeoJSON(geom) AS geometry FROM shelter;`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching shelter data');
  }
};

exports.getlatlon = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
      osm_id,
      osm_type,
      name,
      ST_Y(geom::geometry) AS lat,
      ST_X(geom::geometry) AS lon
    FROM shelter
  `)

  res.json(result.rows);
  }
  catch (err) {
    console.error(err);
    res.status(500).send('Error fetching shelter data');
  } 
};
