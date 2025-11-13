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
