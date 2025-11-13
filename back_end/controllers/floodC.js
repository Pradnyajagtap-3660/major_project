const pool = require('../db');

// Get all flood risk zones
exports.getFloodRisk = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, flood_risk_score, ST_AsGeoJSON(geom) AS geometry FROM flood_risk;`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching flood risk data');
  }
};
