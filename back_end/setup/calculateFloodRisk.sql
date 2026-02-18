-- ========================================
-- Calculate Accurate Flood Risk for Roads
-- Based on: Waterclogging Points + Elevation
-- ========================================

-- Step 1: Add helper columns if they don't exist
ALTER TABLE roads_in_risk
ADD COLUMN IF NOT EXISTS wl_distance FLOAT,
ADD COLUMN IF NOT EXISTS elevation FLOAT,
ADD COLUMN IF NOT EXISTS calculated_risk FLOAT;

-- Step 2: Calculate distance to nearest waterclogging point
-- (Closer to waterlogging = Higher risk)
UPDATE roads_in_risk r
SET wl_distance = (
  SELECT MIN(ST_Distance(r.geom::geography, w.geom::geography))
  FROM waterclogging_points w
  WHERE ST_DWithin(r.geom::geography, w.geom::geography, 2000)  -- Within 2km
);

-- Step 3: Extract elevation for each road
-- (Lower elevation = Higher risk)
UPDATE roads_in_risk r
SET elevation = (
  SELECT AVG((ST_SummaryStats(ST_Clip(e.rast, r.geom))).mean)
  FROM elevation_merged e
  WHERE ST_Intersects(e.rast, r.geom)
);

-- Step 4: Calculate normalized flood risk (0-1 scale)
-- Combines waterclogging proximity + elevation
WITH risk_stats AS (
  SELECT
    MIN(wl_distance) as min_wl_dist,
    MAX(wl_distance) as max_wl_dist,
    MIN(elevation) as min_elev,
    MAX(elevation) as max_elev
  FROM roads_in_risk
  WHERE wl_distance IS NOT NULL AND elevation IS NOT NULL
)
UPDATE roads_in_risk r
SET calculated_risk = (
  -- Waterclogging component (50% weight)
  -- Closer to waterlogging = higher risk
  CASE
    WHEN r.wl_distance IS NULL THEN 0.5  -- Default if no nearby waterlogging
    ELSE 0.5 * (1 - ((r.wl_distance - s.min_wl_dist) / NULLIF((s.max_wl_dist - s.min_wl_dist), 0)))
  END
  +
  -- Elevation component (50% weight)
  -- Lower elevation = higher risk
  CASE
    WHEN r.elevation IS NULL THEN 0.5  -- Default if no elevation data
    ELSE 0.5 * (1 - ((r.elevation - s.min_elev) / NULLIF((s.max_elev - s.min_elev), 0)))
  END
)
FROM risk_stats s
WHERE r.wl_distance IS NOT NULL OR r.elevation IS NOT NULL;

-- Step 5: Update the main flood_risk column
UPDATE roads_in_risk
SET flood_risk = COALESCE(calculated_risk, flood_risk),
    risk_categ = CASE
      WHEN calculated_risk < 0.3 THEN 'Low Risk'
      WHEN calculated_risk < 0.6 THEN 'Medium Risk'
      ELSE 'High Risk'
    END
WHERE calculated_risk IS NOT NULL;

-- Step 6: Show results
SELECT
  CASE
    WHEN flood_risk < 0.3 THEN 'Low (0-0.3)'
    WHEN flood_risk < 0.6 THEN 'Medium (0.3-0.6)'
    ELSE 'High (0.6-1.0)'
  END as risk_category,
  COUNT(*) as road_count,
  ROUND(AVG(flood_risk)::numeric, 3) as avg_risk
FROM roads_in_risk
GROUP BY risk_category
ORDER BY avg_risk;

-- Show sample of updated roads
SELECT
  gid,
  name,
  ROUND(wl_distance::numeric, 0) as dist_to_waterlog_m,
  ROUND(elevation::numeric, 1) as elevation_m,
  ROUND(flood_risk::numeric, 3) as flood_risk,
  risk_categ
FROM roads_in_risk
WHERE calculated_risk IS NOT NULL
ORDER BY flood_risk DESC
LIMIT 20;

-- Summary
SELECT
  COUNT(*) as total_roads,
  COUNT(*) FILTER (WHERE calculated_risk IS NOT NULL) as roads_updated,
  COUNT(*) FILTER (WHERE calculated_risk IS NULL) as roads_no_data,
  ROUND(AVG(flood_risk)::numeric, 3) as overall_avg_risk
FROM roads_in_risk;
