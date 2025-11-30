const pool = require("../db");

exports.getsafePath = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    const { userLocation, shelterLocation } = req.body;

    const [userLon, userLat] = userLocation;
    const [destLon, destLat] = shelterLocation;

    const result = await pool.query(
      `
      WITH 
      start_pt AS (
        SELECT id AS start_id 
        FROM roads_in_risk 
        ORDER BY geom <-> ST_SetSRID(ST_Point($1, $2), 4326) 
        LIMIT 1
      ),
      end_pt AS (
        SELECT id AS end_id
        FROM roads_in_risk
        ORDER BY geom <-> ST_SetSRID(ST_Point($3, $4), 4326) 
        LIMIT 1
      )
      SELECT * FROM pgr_dijkstra(
        'SELECT id, source, target,
                CASE WHEN risk_level = 1 THEN 999999 ELSE 1 END AS cost
         FROM roads',
        (SELECT start_id FROM start_pt),
        (SELECT end_id FROM end_pt)
      );
    `,
      [userLon, userLat, destLon, destLat]
    );

    const edges = result.rows.map(r => r.edge);

    if (edges.length === 0) {
      return res.json({ path: null });
    }

    // Fetch geometry of each edge
    const geomQuery = await pool.query(
      `
      SELECT ST_AsGeoJSON(geom) AS geom
      FROM roads
      WHERE id = ANY($1)
    `,
      [edges]
    );

    // Collect coordinates in correct order
    let routeCoords = [];

    geomQuery.rows.forEach(row => {
      const coords = JSON.parse(row.geom).coordinates;
      routeCoords.push(...coords);
    });

    res.json({ path: routeCoords });
  } catch (err) {
    console.error("Route Error:", err);
    res.status(500).json({ error: "Route failed" });
  }
};


