const pool = require('../db');

async function getHospitalNameExpr() {
  const cols = await pool.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'hospital';`
  );
  const names = new Set(cols.rows.map(r => r.column_name));

  if (names.has('name')) return "NULLIF(name, '')";
  if (names.has('hospital')) return "NULLIF(hospital, '')";
  if (names.has('tags')) return "NULLIF(tags->>'name', '')";
  return null;
}

// Get hospital locations
exports.getHospitals = async (req, res) => {
  try {
    const preferredName = await getHospitalNameExpr();
    const nameExpr = preferredName
      ? `COALESCE(${preferredName}, NULLIF(amenity, ''), 'Hospital')`
      : `COALESCE(NULLIF(amenity, ''), 'Hospital')`;

    const result = await pool.query(
      `SELECT
        id,
        ${nameExpr} AS name,
        ST_X(geom) AS longitude,
        ST_Y(geom) AS latitude
      FROM hospital;`
    );
    // Format as GeoJSON-like structure for compatibility
    const formatted = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      geometry: {
        type: 'Point',
        coordinates: [row.longitude, row.latitude]
      }
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching hospital data');
  }
};



exports.getlatlon = async (req, res) => {
  try {
    console.log("Fetching hospital latlon data");
    const preferredName = await getHospitalNameExpr();
    const nameExpr = preferredName
      ? `COALESCE(${preferredName}, NULLIF(amenity, ''), 'Hospital')`
      : `COALESCE(NULLIF(amenity, ''), 'Hospital')`;

    const result = await pool.query(
      `SELECT
      id,
      ${nameExpr} AS name,
      ST_Y(geom) AS lat,
      ST_X(geom) AS lon
    FROM hospital`
    );

  res.json(result.rows);
  }
  catch (err) {
    console.error(err);
    res.status(500).send('Error fetching hospital data');
  }
};
