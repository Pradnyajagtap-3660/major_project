-- ========================================
-- FAST Flood Risk Calculation
-- Uses: Waterclogging Points Only
-- Time: 2-5 minutes (much faster!)
-- ========================================

-- Step 1: Add helper columns if they don't exist
ALTER TABLE roads_in_risk
ADD COLUMN IF NOT EXISTS wl_distance FLOAT,
ADD COLUMN IF NOT EXISTS calculated_risk FLOAT;

COMMIT;

-- Step 2: Calculate distance to nearest waterclogging point
-- This is FAST with spatial index
DO $$
DECLARE
  total_roads INT;
  processed INT := 0;
  start_time TIMESTAMP;
BEGIN
  SELECT COUNT(*) INTO total_roads FROM roads_in_risk;
  start_time := clock_timestamp();

  RAISE NOTICE 'Calculating waterclogging distance for % roads...', total_roads;

  UPDATE roads_in_risk r
  SET wl_distance = (
    SELECT MIN(ST_Distance(r.geom::geography, w.geom::geography))
    FROM waterclogging_points w
    WHERE ST_DWithin(r.geom::geography, w.geom::geography, 1000)
  );

  GET DIAGNOSTICS processed = ROW_COUNT;
  RAISE NOTICE 'Updated % roads in % seconds', processed, EXTRACT(EPOCH FROM (clock_timestamp() - start_time));
END $$;

COMMIT;

-- Step 3: Calculate normalized flood risk (0-1 scale)
-- Based ONLY on waterclogging proximity
DO $$
DECLARE
  min_dist FLOAT;
  max_dist FLOAT;
BEGIN
  -- Get distance range
  SELECT
    MIN(wl_distance),
    MAX(wl_distance)
  INTO min_dist, max_dist
  FROM roads_in_risk
  WHERE wl_distance IS NOT NULL;

  RAISE NOTICE 'Distance range: % to % meters', min_dist, max_dist;

  -- Calculate risk with custom thresholds:
  -- 0m → 1.0 (Very High)
  -- 100m → 0.75 (High)
  -- 500m → 0.50 (Medium)
  -- 800m → 0.25 (Low)
  -- >1000m → 0.20 (Very Low)
  UPDATE roads_in_risk
  SET calculated_risk = CASE
    WHEN wl_distance IS NULL OR wl_distance > 1000 THEN 0.2  -- Far from waterlogging = Very Low risk
    WHEN wl_distance = 0 THEN 1.0  -- Directly on waterlogging point = Very High risk
    WHEN wl_distance <= 100 THEN 1.0 - ((wl_distance / 100.0) * 0.25)  -- 0-100m: 1.0 to 0.75
    WHEN wl_distance <= 500 THEN 0.75 - (((wl_distance - 100) / 400.0) * 0.25)  -- 100-500m: 0.75 to 0.50
    WHEN wl_distance <= 800 THEN 0.50 - (((wl_distance - 500) / 300.0) * 0.25)  -- 500-800m: 0.50 to 0.25
    ELSE 0.25 - (((wl_distance - 800) / 200.0) * 0.05)  -- 800-1000m: 0.25 to 0.20
  END;

  RAISE NOTICE 'Calculated risk scores';
END $$;

COMMIT;

-- Step 4: Update main flood_risk column and categories
UPDATE roads_in_risk
SET
  flood_risk = calculated_risk,
  risk_categ = CASE
    WHEN calculated_risk < 0.3 THEN 'Low Risk'
    WHEN calculated_risk < 0.6 THEN 'Medium Risk'
    ELSE 'High Risk'
  END
WHERE calculated_risk IS NOT NULL;

COMMIT;

-- Step 5: Show results
\echo ''
\echo '========================================'
\echo '  FLOOD RISK DISTRIBUTION'
\echo '========================================'

SELECT
  CASE
    WHEN flood_risk < 0.3 THEN 'Low (0-0.3)'
    WHEN flood_risk < 0.6 THEN 'Medium (0.3-0.6)'
    ELSE 'High (0.6-1.0)'
  END as risk_category,
  COUNT(*) as road_count,
  ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER())::numeric, 1) as percentage,
  ROUND(AVG(flood_risk)::numeric, 3) as avg_risk
FROM roads_in_risk
GROUP BY risk_category
ORDER BY avg_risk;

\echo ''
\echo 'Sample of HIGH RISK roads (near waterlogging):'
SELECT
  gid,
  COALESCE(name, 'Unnamed Road') as name,
  ROUND(wl_distance::numeric, 0) as meters_to_waterlog,
  ROUND(flood_risk::numeric, 3) as flood_risk,
  risk_categ
FROM roads_in_risk
WHERE flood_risk > 0.7
ORDER BY flood_risk DESC
LIMIT 10;

\echo ''
\echo 'Sample of LOW RISK roads (far from waterlogging):'
SELECT
  gid,
  COALESCE(name, 'Unnamed Road') as name,
  ROUND(COALESCE(wl_distance, 2000)::numeric, 0) as meters_to_waterlog,
  ROUND(flood_risk::numeric, 3) as flood_risk,
  risk_categ
FROM roads_in_risk
WHERE flood_risk < 0.3
ORDER BY flood_risk ASC
LIMIT 10;

\echo ''
\echo '========================================'
\echo '  Summary'
\echo '========================================'

SELECT
  COUNT(*) as total_roads,
  COUNT(*) FILTER (WHERE calculated_risk IS NOT NULL) as roads_updated,
  COUNT(*) FILTER (WHERE flood_risk < 0.3) as low_risk_roads,
  COUNT(*) FILTER (WHERE flood_risk >= 0.3 AND flood_risk < 0.6) as medium_risk_roads,
  COUNT(*) FILTER (WHERE flood_risk >= 0.6) as high_risk_roads,
  ROUND(AVG(flood_risk)::numeric, 3) as overall_avg_risk
FROM roads_in_risk;

\echo ''
\echo '✅ Done! Restart your server and test routing.'
\echo ''
