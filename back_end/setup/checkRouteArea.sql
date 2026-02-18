-- Check flood risk in the route area
SELECT
  gid,
  COALESCE(name, 'Unnamed') as road_name,
  ST_X(ST_Centroid(geom)) as lon,
  ST_Y(ST_Centroid(geom)) as lat,
  ROUND(flood_risk::numeric, 3) as flood_risk,
  risk_categ
FROM roads_in_risk
WHERE
  -- Area around Don Bosco to nearby location
  ST_DWithin(
    geom,
    ST_MakeLine(
      ST_MakePoint(72.8886567, 19.0821704),
      ST_MakePoint(72.8831157, 19.0815079)
    ),
    0.002  -- ~200 meters buffer
  )
ORDER BY flood_risk DESC
LIMIT 20;
