"""
Load merge_WL.shp (28 Kurla area waterlogging zones, WGS84)
and recalculate flood risk combining grid data + waterclogging proximity
"""
import shapefile
import psycopg2
import sys
import time

SHP_PATH = r"C:\Users\Pradnya\QGIS\merge_WL.shp"

DB_CONFIG = {
    "host": "localhost", "port": 5432,
    "database": "flood_response",
    "user": "postgres", "password": "admin123"
}

def get_centroid(points):
    x = sum(p[0] for p in points) / len(points)
    y = sum(p[1] for p in points) / len(points)
    return x, y

conn = psycopg2.connect(**DB_CONFIG)
conn.autocommit = False
cur = conn.cursor()
print("Connected to database")

# Step 1: Load merge_WL zones (already WGS84!)
print("\n=== Loading merge_WL waterlogging zones ===")
sf = shapefile.Reader(SHP_PATH)
fields = [f[0] for f in sf.fields[1:]]
print("Fields:", fields)

# Drop and recreate waterclogging_points with merge_WL data
cur.execute("DROP TABLE IF EXISTS waterclogging_points")
cur.execute("""
    CREATE TABLE waterclogging_points (
        gid SERIAL PRIMARY KEY,
        geom GEOMETRY(Point, 4326)
    )
""")
cur.execute("CREATE INDEX ON waterclogging_points USING GIST (geom)")

count = 0
kurla_count = 0
for rec in sf.shapeRecords():
    shape = rec.shape
    if not shape.points:
        continue

    if shape.shapeType in [5, 15, 25]:
        lon, lat = get_centroid(shape.points)
    elif shape.shapeType in [1, 11, 21]:
        lon, lat = shape.points[0]
    else:
        continue

    # Validate Mumbai area
    if 72.5 < lon < 73.5 and 18.5 < lat < 19.5:
        cur.execute(
            "INSERT INTO waterclogging_points (geom) VALUES (ST_SetSRID(ST_Point(%s, %s), 4326))",
            (lon, lat)
        )
        count += 1
        if 19.06 < lat < 19.10 and 72.84 < lon < 72.92:
            kurla_count += 1
            print("  Kurla zone:", round(lon, 4), round(lat, 4))

conn.commit()
print("Loaded " + str(count) + " zones (" + str(kurla_count) + " in Kurla area)")

# Step 2: Recalculate wl_distance using the new zones
print("\n=== Recalculating distances to waterlogging zones ===")
start = time.time()
cur.execute("""
    UPDATE roads_in_risk r
    SET wl_distance = (
        SELECT MIN(ST_Distance(r.geom::geography, w.geom::geography))
        FROM waterclogging_points w
        WHERE ST_DWithin(r.geom::geography, w.geom::geography, 2000)
    )
""")
conn.commit()
elapsed = time.time() - start
print("Distances updated in " + str(round(elapsed, 1)) + " seconds")

# Check how many roads have waterclogging nearby
cur.execute("SELECT COUNT(*) FROM roads_in_risk WHERE wl_distance IS NOT NULL")
near = cur.fetchone()[0]
print("Roads within 2km of waterlogging zone:", near)

# Step 3: Combine grid flood risk + waterclogging proximity
# Formula: combined_risk = grid_flood_risk * 0.5 + wl_risk * 0.5
# where wl_risk = proximity-based risk from waterclogging zones
print("\n=== Combining grid + waterclogging data ===")
cur.execute("""
    UPDATE roads_in_risk
    SET
        calculated_risk = CASE
            WHEN wl_distance IS NULL OR wl_distance > 2000 THEN flood_risk  -- keep grid risk
            WHEN wl_distance = 0 THEN 1.0
            WHEN wl_distance <= 100 THEN flood_risk * 0.4 + (1.0 - (wl_distance/100.0 * 0.25)) * 0.6
            WHEN wl_distance <= 500 THEN flood_risk * 0.4 + (0.75 - ((wl_distance-100)/400.0 * 0.25)) * 0.6
            WHEN wl_distance <= 800 THEN flood_risk * 0.4 + (0.50 - ((wl_distance-500)/300.0 * 0.25)) * 0.6
            WHEN wl_distance <= 1500 THEN flood_risk * 0.4 + (0.25 - ((wl_distance-800)/700.0 * 0.15)) * 0.6
            ELSE flood_risk * 0.7 + 0.20 * 0.3  -- far from wl zone, mostly grid risk
        END
""")
conn.commit()

# Apply to main columns
cur.execute("""
    UPDATE roads_in_risk
    SET
        flood_risk = LEAST(1.0, calculated_risk),
        risk_categ = CASE
            WHEN LEAST(1.0, calculated_risk) < 0.4 THEN 'Low Risk'
            WHEN LEAST(1.0, calculated_risk) < 0.65 THEN 'Medium Risk'
            ELSE 'High Risk'
        END
    WHERE calculated_risk IS NOT NULL
""")
conn.commit()
print("Combined risk applied")

# Step 4: Show results
print("\n=== Results ===")
cur.execute("""
    SELECT risk_categ, COUNT(*) as count,
      ROUND(MIN(flood_risk::numeric), 3) as min,
      ROUND(MAX(flood_risk::numeric), 3) as max,
      ROUND(AVG(flood_risk::numeric), 3) as avg
    FROM roads_in_risk
    GROUP BY risk_categ ORDER BY avg
""")
for row in cur.fetchall():
    print("  " + str(row[0]) + ": " + str(row[1]) + " roads, range " + str(row[2]) + "-" + str(row[3]) + ", avg=" + str(row[4]))

# Check specific routes
cur.execute("""
    SELECT COALESCE(name,'Unnamed') as name,
      ROUND(flood_risk::numeric, 4) as risk,
      ROUND(COALESCE(wl_distance,9999)::numeric, 0) as wl_dist
    FROM roads_in_risk
    WHERE name IN ('Lal Bahadur Shastri Marg', 'Nathani Road', 'Father peter periera road',
                   'Father Peter Periera Road', 'Naupada Road', 'Magan Nathuram Road')
    ORDER BY name, risk DESC
    LIMIT 12
""")
print("\nKey road risks:")
for row in cur.fetchall():
    print("  " + str(row[0]).ljust(35) + " risk=" + str(row[1]) + " wl_dist=" + str(row[2]) + "m")

cur.close()
conn.close()

print("\nDone! Restart server to test new routes.")
