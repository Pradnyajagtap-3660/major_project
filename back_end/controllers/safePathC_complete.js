const pool = require("../db");

/**
 * Calculate the safest route between two locations using COMPLETE road network
 * Now works for ANY two locations in Mumbai - just like Google Maps!
 * Uses pgr_dijkstra with dynamic cost calculation based on flood risk
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

    // Main routing query using complete road network with safety-first cost calculation
    const result = await pool.query(
      `
      WITH
      -- Find nearest road node to user location (try top 5)
      start_nodes AS (
        SELECT DISTINCT v.id AS node_id
        FROM complete_roads r
        JOIN complete_roads_vertices_pgr v ON r.source = v.id OR r.target = v.id
        WHERE r.source IS NOT NULL AND r.target IS NOT NULL
        ORDER BY v.geom <-> ST_SetSRID(ST_Point($1, $2), 4326)
        LIMIT 5
      ),
      -- Find nearest road node to destination (try top 5)
      end_nodes AS (
        SELECT DISTINCT v.id AS node_id
        FROM complete_roads r
        JOIN complete_roads_vertices_pgr v ON r.source = v.id OR r.target = v.id
        WHERE r.source IS NOT NULL AND r.target IS NOT NULL
        ORDER BY v.geom <-> ST_SetSRID(ST_Point($3, $4), 4326)
        LIMIT 5
      ),
      -- Try all combinations to find a connected path
      best_route AS (
        SELECT
          route.seq,
          route.node,
          route.edge,
          route.cost,
          route.agg_cost,
          s.node_id as start_node,
          e.node_id as end_node,
          ROW_NUMBER() OVER (ORDER BY MAX(route.agg_cost)) as route_rank
        FROM start_nodes s
        CROSS JOIN end_nodes e
        CROSS JOIN LATERAL pgr_dijkstra(
          -- Dynamic cost calculation based on flood risk
          'SELECT
            id,
            source,
            target,
            -- Safety-first cost: base distance + exponential flood risk penalties
            (cost +
             CASE
               WHEN flood_risk >= 0.8 THEN cost * 100
               WHEN flood_risk >= 0.6 THEN cost * 50
               WHEN flood_risk >= 0.4 THEN cost * 10
               ELSE cost
             END +
             CASE risk_categ
               WHEN ''High Risk'' THEN cost * 20
               WHEN ''Medium Risk'' THEN cost * 5
               ELSE 0
             END) AS cost,
            -- Reverse cost (bidirectional roads)
            (reverse_cost +
             CASE
               WHEN flood_risk >= 0.8 THEN reverse_cost * 100
               WHEN flood_risk >= 0.6 THEN reverse_cost * 50
               WHEN flood_risk >= 0.4 THEN reverse_cost * 10
               ELSE reverse_cost
             END +
             CASE risk_categ
               WHEN ''High Risk'' THEN reverse_cost * 20
               WHEN ''Medium Risk'' THEN reverse_cost * 5
               ELSE 0
             END) AS reverse_cost
          FROM complete_roads
          WHERE source IS NOT NULL AND target IS NOT NULL',
          s.node_id,
          e.node_id,
          directed := false
        ) AS route
        WHERE route.edge IS NOT NULL
        GROUP BY route.seq, route.node, route.edge, route.cost, route.agg_cost, s.node_id, e.node_id
        HAVING COUNT(*) > 0
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
        rd.name,
        rd.highway,
        ST_AsGeoJSON(rd.geom) AS geom
      FROM best_route r
      LEFT JOIN complete_roads rd ON r.edge = rd.id
      WHERE r.route_rank = 1
      ORDER BY r.seq;
    `,
      [userLon, userLat, destLon, destLat]
    );

    if (result.rows.length === 0) {
      console.log("⚠️  No route found between locations");
      return res.json({
        path: null,
        message: "No route found. Please check if both locations are within Mumbai."
      });
    }

    // Process route geometry and calculate metadata
    let routeCoords = [];
    let totalDistance = 0;
    let riskLevels = [];
    let roadNames = new Set();

    result.rows.forEach(row => {
      if (row.geom) {
        const geomData = JSON.parse(row.geom);

        // Handle LineString geometry
        if (geomData.type === "LineString") {
          routeCoords.push(...geomData.coordinates);
        }

        // Collect metadata
        if (row.flood_risk !== null) {
          riskLevels.push(row.flood_risk);
        }
        if (row.name) {
          roadNames.add(row.name);
        }
        totalDistance += (row.cost || 0) / 120; // Approximate actual distance after penalty removal
      }
    });

    // Calculate route statistics
    const avgRisk = riskLevels.length > 0
      ? riskLevels.reduce((sum, r) => sum + r, 0) / riskLevels.length
      : 0;

    const maxRisk = riskLevels.length > 0 ? Math.max(...riskLevels) : 0;

    console.log(`✅ Route found: ${result.rows.length} segments, ~${totalDistance.toFixed(2)}km, avg risk: ${avgRisk.toFixed(2)}`);

    res.json({
      path: routeCoords,
      metadata: {
        segments: result.rows.length,
        totalDistance: parseFloat(totalDistance.toFixed(2)),
        averageRisk: parseFloat(avgRisk.toFixed(2)),
        maxRisk: parseFloat(maxRisk.toFixed(2)),
        safetyLevel: maxRisk < 0.5 ? "Safe" : maxRisk < 0.7 ? "Moderate" : "High Risk",
        roadNames: Array.from(roadNames).slice(0, 5).join(", ") || "Local roads"
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
