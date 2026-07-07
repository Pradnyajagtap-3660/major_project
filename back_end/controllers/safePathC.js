const pool = require("../db");

/**
 * Calculate the safest route between two locations
 * Uses pgr_astar with dynamic cost calculation based on flood risk
 * Heavily penalizes high-risk roads while still allowing routing through them if necessary
 */
exports.getsafePath = async (req, res) => {
  try {
    console.log("🗺️  Safe Route Request:", req.body);
    const { userLocation, shelterLocation } = req.body;

    if (!userLocation || !shelterLocation) {
      return res.status(400).json({ error: "Missing userLocation or shelterLocation" });
    }

    const [userLon, userLat] = userLocation;
    const [destLon, destLat] = shelterLocation;

    // Validate coordinates
    if (!userLon || !userLat || !destLon || !destLat) {
      return res.status(400).json({ error: "Invalid coordinates" });
    }

    // Main routing query using pgr_aStar with safety-first cost calculation
    // A* uses x1,y1,x2,y2 coordinates as heuristic to guide search toward destination
    const result = await pool.query(
      `
      WITH
      -- Find nearest road nodes to user location (try top 10)
      start_nodes AS (
        SELECT DISTINCT v.id AS node_id
        FROM roads_in_risk r
        JOIN roads_in_risk_vertices_pgr v ON r.source = v.id OR r.target = v.id
        WHERE r.source IS NOT NULL AND r.target IS NOT NULL
        ORDER BY v.geom <-> ST_SetSRID(ST_Point($1, $2), 4326)
        LIMIT 10
      ),
      -- Find nearest road nodes to destination (try top 10)
      end_nodes AS (
        SELECT DISTINCT v.id AS node_id
        FROM roads_in_risk r
        JOIN roads_in_risk_vertices_pgr v ON r.source = v.id OR r.target = v.id
        WHERE r.source IS NOT NULL AND r.target IS NOT NULL
        ORDER BY v.geom <-> ST_SetSRID(ST_Point($3, $4), 4326)
        LIMIT 10
      ),
      -- Try all combinations to find a connected path
      all_routes AS (
        SELECT
          route.seq,
          route.node,
          route.edge,
          route.cost,
          route.agg_cost,
          s.node_id as start_node,
          e.node_id as end_node
        FROM start_nodes s
        CROSS JOIN end_nodes e
        CROSS JOIN LATERAL pgr_aStar(
          -- A* requires x1,y1 (start point) and x2,y2 (end point) for heuristic
          'SELECT
            id,
            source,
            target,
            -- Safety-first cost: base distance + exponential flood risk penalties
            (ST_Length(geom::geography) +
             CASE
               WHEN flood_risk >= 0.8 THEN ST_Length(geom::geography) * 100
               WHEN flood_risk >= 0.6 THEN ST_Length(geom::geography) * 50
               WHEN flood_risk >= 0.4 THEN ST_Length(geom::geography) * 10
               ELSE ST_Length(geom::geography)
             END +
             CASE risk_categ
               WHEN ''High Risk'' THEN ST_Length(geom::geography) * 20
               WHEN ''Medium Risk'' THEN ST_Length(geom::geography) * 5
               ELSE 0
             END) AS cost,
            -- Reverse cost (bidirectional roads)
            (ST_Length(geom::geography) +
             CASE
               WHEN flood_risk >= 0.8 THEN ST_Length(geom::geography) * 100
               WHEN flood_risk >= 0.6 THEN ST_Length(geom::geography) * 50
               WHEN flood_risk >= 0.4 THEN ST_Length(geom::geography) * 10
               ELSE ST_Length(geom::geography)
             END +
             CASE risk_categ
               WHEN ''High Risk'' THEN ST_Length(geom::geography) * 20
               WHEN ''Medium Risk'' THEN ST_Length(geom::geography) * 5
               ELSE 0
             END) AS reverse_cost,
            -- Coordinates of road segment start and end points for A* heuristic
            ST_X(ST_StartPoint(ST_GeometryN(geom, 1))) AS x1,
            ST_Y(ST_StartPoint(ST_GeometryN(geom, 1))) AS y1,
            ST_X(ST_EndPoint(ST_GeometryN(geom, 1)))   AS x2,
            ST_Y(ST_EndPoint(ST_GeometryN(geom, 1)))   AS y2
          FROM roads_in_risk
          WHERE source IS NOT NULL AND target IS NOT NULL',
          s.node_id,
          e.node_id,
          directed := false,
          heuristic := 4
        ) AS route
        WHERE route.edge IS NOT NULL
        LIMIT 1
      )
      -- Get route geometry
      SELECT
        r.seq,
        r.node,
        r.edge,
        r.cost,
        r.agg_cost,
        rd.flood_risk,
        rd.risk_categ,
        ST_AsGeoJSON(rd.geom) AS geom
      FROM all_routes r
      LEFT JOIN roads_in_risk rd ON r.edge = rd.id
      ORDER BY r.seq;
    `,
      [userLon, userLat, destLon, destLat]
    );

    if (result.rows.length === 0) {
      console.log("⚠️  No route found between locations");
      return res.json({
        path: null,
        message: "No route found. The road network may be disconnected in this area. Try locations closer together or in a different area."
      });
    }

    // Process route geometry and calculate metadata
    let routeCoords = [];
    let totalDistance = 0;
    let riskLevels = [];

    result.rows.forEach(row => {
      if (row.geom) {
        const geomData = JSON.parse(row.geom);
        // Handle MultiLineString geometry
        if (geomData.type === "MultiLineString") {
          geomData.coordinates.forEach(lineString => {
            routeCoords.push(...lineString);
          });
        } else if (geomData.type === "LineString") {
          routeCoords.push(...geomData.coordinates);
        }

        // Collect metadata
        if (row.flood_risk !== null) {
          riskLevels.push(row.flood_risk);
        }
        totalDistance += row.cost || 0;
      }
    });

    // Calculate route statistics
    const avgRisk = riskLevels.length > 0
      ? riskLevels.reduce((sum, r) => sum + r, 0) / riskLevels.length
      : 0;

    const maxRisk = riskLevels.length > 0 ? Math.max(...riskLevels) : 0;

    // Approximate distance in km (accounting for penalties, this is the actual road length)
    const actualDistance = (totalDistance / 120).toFixed(2); // Rough estimate after penalty removal

    console.log(`✅ Route found: ${result.rows.length} segments, ~${actualDistance}km, avg risk: ${avgRisk.toFixed(2)}`);

    res.json({
      path: routeCoords,
      metadata: {
        segments: result.rows.length,
        totalDistance: parseFloat(actualDistance),
        averageRisk: parseFloat(avgRisk.toFixed(2)),
        maxRisk: parseFloat(maxRisk.toFixed(2)),
        safetyLevel: maxRisk < 0.5 ? "Safe" : maxRisk < 0.7 ? "Moderate" : "High Risk"
      }
    });

  } catch (err) {
    console.error("❌ Route Error:", err);
    res.status(500).json({
      error: "Route calculation failed",
      details: err.message
    });
  }
};

