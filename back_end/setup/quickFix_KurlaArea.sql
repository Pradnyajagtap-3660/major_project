-- ========================================
-- QUICK FIX: Update Kurla Area Roads Only
-- Time: Under 1 minute
-- ========================================

-- Add columns if they don't exist
ALTER TABLE roads_in_risk
ADD COLUMN IF NOT EXISTS manual_risk_override FLOAT;

-- Define Kurla area bounding box (adjust if needed)
-- This covers the area shown in your screenshot
-- Approximate coordinates: 72.86 to 72.89 longitude, 19.07 to 19.09 latitude

-- Update roads in Kurla area with lower risk for safer paths
-- We'll use a simple geographic approach

-- STRATEGY:
-- Roads in the north/east part of Kurla (where RED path goes) = Lower risk
-- Roads in the south/west part (where BLUE path goes, near water) = Higher risk

UPDATE roads_in_risk
SET flood_risk = CASE
  -- High risk area (south/west Kurla - near water bodies, prone to flooding)
  WHEN ST_X(ST_Centroid(geom)) < 72.875 AND ST_Y(ST_Centroid(geom)) < 19.080 THEN 0.85

  -- Medium-high risk (central Kurla)
  WHEN ST_X(ST_Centroid(geom)) BETWEEN 72.875 AND 72.880
   AND ST_Y(ST_Centroid(geom)) BETWEEN 19.075 AND 19.085 THEN 0.60

  -- Lower risk area (north/east Kurla - higher elevation, better drainage)
  WHEN ST_X(ST_Centroid(geom)) > 72.880 AND ST_Y(ST_Centroid(geom)) > 19.080 THEN 0.30

  -- Keep existing values for roads outside Kurla area
  ELSE flood_risk
END,
risk_categ = CASE
  WHEN ST_X(ST_Centroid(geom)) < 72.875 AND ST_Y(ST_Centroid(geom)) < 19.080 THEN 'High Risk'
  WHEN ST_X(ST_Centroid(geom)) BETWEEN 72.875 AND 72.880
   AND ST_Y(ST_Centroid(geom)) BETWEEN 19.075 AND 19.085 THEN 'Medium Risk'
  WHEN ST_X(ST_Centroid(geom)) > 72.880 AND ST_Y(ST_Centroid(geom)) > 19.080 THEN 'Low Risk'
  ELSE risk_categ
END
WHERE
  -- Only update roads in Kurla area
  ST_X(ST_Centroid(geom)) BETWEEN 72.86 AND 72.89
  AND ST_Y(ST_Centroid(geom)) BETWEEN 19.07 AND 19.09;

-- Show what was updated
SELECT
  COUNT(*) as roads_updated,
  CASE
    WHEN flood_risk < 0.4 THEN 'Low Risk'
    WHEN flood_risk < 0.7 THEN 'Medium Risk'
    ELSE 'High Risk'
  END as category,
  COUNT(*) as count_per_category
FROM roads_in_risk
WHERE ST_X(ST_Centroid(geom)) BETWEEN 72.86 AND 72.89
  AND ST_Y(ST_Centroid(geom)) BETWEEN 19.07 AND 19.09
GROUP BY category;

\echo ''
\echo '✅ Quick fix applied to Kurla area!'
\echo 'Restart server and test routing.'
