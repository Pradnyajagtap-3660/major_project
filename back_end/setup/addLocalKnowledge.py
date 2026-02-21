"""
Add locally known waterlogging spots that are missing from the shapefile.
Based on user's local knowledge: LBS Marg area in Kurla is known to flood.
"""
import psycopg2
import time

DB_CONFIG = {"host":"localhost","port":5432,"database":"flood_response","user":"postgres","password":"admin123"}

# Known waterlogging spots from local knowledge (lon, lat, description)
LOCAL_WATERLOGGING_SPOTS = [
    # LBS Marg (Lal Bahadur Shastri Marg) - user confirmed this floods in monsoon
    (72.8840, 19.0852, "LBS Marg near Kale Marg junction"),
    (72.8820, 19.0840, "LBS Marg Kurla West"),
    (72.8835, 19.0835, "LBS Marg - Kohinoor area"),
    (72.8860, 19.0840, "LBS Marg east section"),
    # Kale Marg also connects to LBS Marg and floods
    (72.8850, 19.0858, "Kale Marg near LBS junction"),
]

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()
print("Connected to database")

# Count existing zones
cur.execute("SELECT COUNT(*) FROM waterclogging_points")
existing = cur.fetchone()[0]
print("Existing waterclogging zones:", existing)

# Add local knowledge zones
print("\nAdding locally known waterlogging spots:")
added = 0
for lon, lat, desc in LOCAL_WATERLOGGING_SPOTS:
    cur.execute(
        "INSERT INTO waterclogging_points (geom) VALUES (ST_SetSRID(ST_Point(%s, %s), 4326))",
        (lon, lat)
    )
    print("  Added:", desc, "at", lon, lat)
    added += 1

conn.commit()
print("\nAdded", added, "local knowledge zones")
print("Total zones:", existing + added)

# Recalculate wl_distance for affected roads (within 2km of new zones)
print("\nRecalculating distances for affected roads...")
start = time.time()
cur.execute("""
    UPDATE roads_in_risk r
    SET wl_distance = (
        SELECT MIN(ST_Distance(r.geom::geography, w.geom::geography))
        FROM waterclogging_points w
        WHERE ST_DWithin(r.geom::geography, w.geom::geography, 2000)
    )
    WHERE ST_DWithin(r.geom::geography, ST_SetSRID(ST_Point(72.884, 19.085), 4326)::geography, 2000)
""")
conn.commit()
updated = cur.rowcount
elapsed = time.time() - start
print("Updated", updated, "roads in", round(elapsed, 1), "seconds")

# Apply risk scores
cur.execute("""
    UPDATE roads_in_risk
    SET
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
    WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_Point(72.884, 19.085), 4326)::geography, 2000)
""")
conn.commit()

# Show LBS Marg road risks now
cur.execute("""
    SELECT COALESCE(name,'Unnamed') as name,
      ROUND(flood_risk::numeric, 3) as risk,
      ROUND(COALESCE(wl_distance,9999)::numeric, 0) as wl_dist
    FROM roads_in_risk
    WHERE (name ILIKE '%lal bahadur%' OR name ILIKE '%kale marg%' OR name ILIKE '%kohinoor%' OR name ILIKE '%nathani%' OR name ILIKE '%father peter%')
    ORDER BY name, flood_risk DESC
    LIMIT 15
""")
print("\nKey road risks now:")
for r in cur.fetchall():
    print(" ", str(r[0])[:35].ljust(35), "risk=" + str(r[1]), "wl_dist=" + str(r[2]) + "m")

cur.close()
conn.close()
print("\nDone! Restart server.")
