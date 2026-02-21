"""
Apply pure waterclogging proximity risk (no grid mixing).
merge_WL.shp already loaded in waterclogging_points table.
Thresholds: 0m->1.0, 100m->0.75, 500m->0.50, 800m->0.25, >1000m->0.20
"""
import psycopg2

DB_CONFIG = {"host":"localhost","port":5432,"database":"flood_response","user":"postgres","password":"admin123"}

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()
print("Connected")

# Apply PURE waterclogging proximity risk
print("Applying pure waterclogging proximity risk...")
cur.execute("""
    UPDATE roads_in_risk
    SET
        calculated_risk = CASE
            WHEN wl_distance IS NULL OR wl_distance > 1000 THEN 0.20
            WHEN wl_distance = 0 THEN 1.0
            WHEN wl_distance <= 100 THEN 1.0 - (wl_distance / 100.0 * 0.25)
            WHEN wl_distance <= 500 THEN 0.75 - ((wl_distance - 100) / 400.0 * 0.25)
            WHEN wl_distance <= 800 THEN 0.50 - ((wl_distance - 500) / 300.0 * 0.25)
            ELSE 0.25 - ((wl_distance - 800) / 200.0 * 0.05)
        END,
        flood_risk = CASE
            WHEN wl_distance IS NULL OR wl_distance > 1000 THEN 0.20
            WHEN wl_distance = 0 THEN 1.0
            WHEN wl_distance <= 100 THEN 1.0 - (wl_distance / 100.0 * 0.25)
            WHEN wl_distance <= 500 THEN 0.75 - ((wl_distance - 100) / 400.0 * 0.25)
            WHEN wl_distance <= 800 THEN 0.50 - ((wl_distance - 500) / 300.0 * 0.25)
            ELSE 0.25 - ((wl_distance - 800) / 200.0 * 0.05)
        END,
        risk_categ = CASE
            WHEN COALESCE(wl_distance, 9999) > 1000 THEN 'Low Risk'
            WHEN COALESCE(wl_distance, 9999) > 500  THEN 'Medium Risk'
            ELSE 'High Risk'
        END
""")
conn.commit()
print("Updated", cur.rowcount, "roads")

# Show distribution
cur.execute("""
    SELECT risk_categ, COUNT(*),
      ROUND(MIN(flood_risk::numeric),3) as min,
      ROUND(MAX(flood_risk::numeric),3) as max,
      ROUND(AVG(flood_risk::numeric),3) as avg
    FROM roads_in_risk GROUP BY risk_categ ORDER BY avg
""")
print("\nRisk distribution:")
for r in cur.fetchall():
    print(" ", r[0], ":", r[1], "roads | range:", r[2], "-", r[3], "avg:", r[4])

# Check specific route roads
cur.execute("""
    SELECT COALESCE(name,'Unnamed') as name,
      ROUND(flood_risk::numeric, 3) as risk,
      ROUND(COALESCE(wl_distance,9999)::numeric,0) as wl_dist
    FROM roads_in_risk
    WHERE geom && ST_MakeEnvelope(72.875, 19.079, 72.895, 19.088, 4326)
    AND name IS NOT NULL
    AND name != 'Unnamed'
    ORDER BY flood_risk DESC
    LIMIT 15
""")
print("\nKey roads in route area:")
for r in cur.fetchall():
    print(" ", str(r[0])[:35].ljust(35), "risk=" + str(r[1]), "wl_dist=" + str(r[2]) + "m")

cur.close()
conn.close()
print("\nDone! Restart server.")
