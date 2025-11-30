const pool = require('../db');

// Get hospital locations
exports.getHospitals = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, ST_AsGeoJSON(geom) AS geometry FROM hospital;`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching hospital data');
  }
};



exports.getlatlon = async (req, res) => {
  try {
    console.log("Fetching hospital latlon data");
    const result = await pool.query(
      `SELECT
      osm_id,
      osm_type,
      name,
      ST_Y(geom::geometry) AS lat,
      ST_X(geom::geometry) AS lon
    FROM hospital
  `)
      
  res.json(result.rows);
  }
  catch (err) {
    console.error(err);
    res.status(500).send('Error fetching hospital data');
  } 
};
