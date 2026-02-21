"""
Load waterclogging shapefile into PostgreSQL and calculate flood risk.
Handles:
- Polygon shapes (waterlogging zones) - extracts centroids
- UTM Zone 43N coordinates -> WGS84 (lat/lon) conversion
Uses: pyshp + pyproj + psycopg2
"""
import shapefile
import psycopg2
import sys
import time
from pyproj import Transformer

# Coordinate transformer: UTM 43N -> WGS84
transformer = Transformer.from_crs("EPSG:32643", "EPSG:4326", always_xy=True)

# Database connection
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "flood_response",
    "user": "postgres",
    "password": "admin123"
}

# Shapefile path
SHP_PATH = r"C:\Users\Pradnya\QGIS\mumbai_wl.shp"

def get_centroid(points):
    """Calculate centroid of polygon points"""
    if not points:
        return None, None
    x_sum = sum(p[0] for p in points)
    y_sum = sum(p[1] for p in points)
    return x_sum / len(points), y_sum / len(points)

def load_waterclogging(conn, cur):
    print("=" * 50)
    print("Step 1: Loading Waterclogging Zones")
    print("=" * 50)

    sf = shapefile.Reader(SHP_PATH)
    records = sf.shapeRecords()
    print("Found " + str(len(records)) + " waterclogging zones in shapefile")
    print("Shape type: " + str(sf.shapeType) + " (5=Polygon, 1=Point)")

    cur.execute("DROP TABLE IF EXISTS waterclogging_points")
    cur.execute("""
        CREATE TABLE waterclogging_points (
            gid SERIAL PRIMARY KEY,
            geom GEOMETRY(Point, 4326)
        )
    """)
    cur.execute("CREATE INDEX ON waterclogging_points USING GIST (geom)")

    count = 0
    skipped = 0
    for rec in records:
        shape = rec.shape

        # Handle Point types (1, 11, 21)
        if shape.shapeType in [1, 11, 21]:
            if shape.points:
                utm_x, utm_y = shape.points[0]
                lon, lat = transformer.transform(utm_x, utm_y)
                # Validate coordinates are in Mumbai area
                if 72.5 < lon < 73.5 and 18.5 < lat < 19.5:
                    cur.execute(
                        "INSERT INTO waterclogging_points (geom) VALUES (ST_SetSRID(ST_Point(%s, %s), 4326))",
                        (lon, lat)
                    )
                    count += 1
                else:
                    skipped += 1

        # Handle Polygon types (5, 15, 25) - extract centroid
        elif shape.shapeType in [5, 15, 25]:
            if shape.points:
                utm_x, utm_y = get_centroid(shape.points)
                if utm_x is not None:
                    lon, lat = transformer.transform(utm_x, utm_y)
                    # Validate coordinates are in Mumbai area
                    if 72.5 < lon < 73.5 and 18.5 < lat < 19.5:
                        cur.execute(
                            "INSERT INTO waterclogging_points (geom) VALUES (ST_SetSRID(ST_Point(%s, %s), 4326))",
                            (lon, lat)
                        )
                        count += 1
                    else:
                        skipped += 1
            else:
                skipped += 1  # Null shape

        # Skip null shapes
        elif shape.shapeType == 0:
            skipped += 1

    conn.commit()
    print("Loaded " + str(count) + " waterclogging zones as centroids")
    if skipped > 0:
        print("Skipped " + str(skipped) + " shapes (null/out of bounds)")

    # Show sample coordinates
    cur.execute("SELECT ST_X(geom), ST_Y(geom) FROM waterclogging_points LIMIT 5")
    sample = cur.fetchall()
    print("Sample coordinates (lon, lat):")
    for s in sample:
        print("  " + str(round(s[0], 4)) + ", " + str(round(s[1], 4)))

    return count

def calculate_flood_risk(conn, cur):
    print()
    print("=" * 50)
    print("Step 2: Adding columns to roads_in_risk")
    print("=" * 50)

    cur.execute("""
        ALTER TABLE roads_in_risk
        ADD COLUMN IF NOT EXISTS wl_distance FLOAT,
        ADD COLUMN IF NOT EXISTS calculated_risk FLOAT
    """)
    conn.commit()
    print("OK: Columns added")

    print()
    print("=" * 50)
    print("Step 3: Calculating distances to waterclogging zones")
    print("(This may take 2-5 minutes for 46k roads...)")
    print("=" * 50)

    start = time.time()
    cur.execute("""
        UPDATE roads_in_risk r
        SET wl_distance = (
            SELECT MIN(ST_Distance(r.geom::geography, w.geom::geography))
            FROM waterclogging_points w
            WHERE ST_DWithin(r.geom::geography, w.geom::geography, 1000)
        )
    """)
    conn.commit()
    elapsed = time.time() - start
    print("OK: Distances calculated in " + str(round(elapsed, 1)) + " seconds")

    # Check how many got distances
    cur.execute("SELECT COUNT(*) FROM roads_in_risk WHERE wl_distance IS NOT NULL")
    near_count = cur.fetchone()[0]
    print("Roads within 1000m of waterclogging: " + str(near_count))

    print()
    print("=" * 50)
    print("Step 4: Applying flood risk thresholds")
    print("=" * 50)
    print("  0m     -> 1.0 (Very High)")
    print("  100m   -> 0.75 (High)")
    print("  500m   -> 0.50 (Medium)")
    print("  800m   -> 0.25 (Low)")
    print("  >1000m -> 0.20 (Very Low)")

    cur.execute("""
        UPDATE roads_in_risk
        SET calculated_risk = CASE
            WHEN wl_distance IS NULL OR wl_distance > 1000 THEN 0.2
            WHEN wl_distance = 0 THEN 1.0
            WHEN wl_distance <= 100 THEN 1.0 - ((wl_distance / 100.0) * 0.25)
            WHEN wl_distance <= 500 THEN 0.75 - (((wl_distance - 100) / 400.0) * 0.25)
            WHEN wl_distance <= 800 THEN 0.50 - (((wl_distance - 500) / 300.0) * 0.25)
            ELSE 0.25 - (((wl_distance - 800) / 200.0) * 0.05)
        END
    """)
    conn.commit()

    cur.execute("""
        UPDATE roads_in_risk
        SET
            flood_risk = calculated_risk,
            risk_categ = CASE
                WHEN calculated_risk < 0.3 THEN 'Low Risk'
                WHEN calculated_risk < 0.6 THEN 'Medium Risk'
                ELSE 'High Risk'
            END
        WHERE calculated_risk IS NOT NULL
    """)
    conn.commit()
    print("OK: Flood risk values updated")

def show_results(conn, cur):
    print()
    print("=" * 50)
    print("RESULTS: Flood Risk Distribution")
    print("=" * 50)

    cur.execute("""
        SELECT
            risk_categ,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as pct,
            ROUND(AVG(flood_risk::numeric), 3) as avg_risk
        FROM roads_in_risk
        GROUP BY risk_categ
        ORDER BY avg_risk
    """)
    rows = cur.fetchall()
    for row in rows:
        print("  " + str(row[0]) + ": " + str(row[1]) + " roads (" + str(row[2]) + "%), avg=" + str(row[3]))

    cur.execute("""
        SELECT
            COUNT(*) FILTER (WHERE calculated_risk IS NOT NULL) as updated,
            COUNT(*) as total,
            ROUND(MIN(flood_risk::numeric), 3) as min_risk,
            ROUND(MAX(flood_risk::numeric), 3) as max_risk
        FROM roads_in_risk
    """)
    stats = cur.fetchone()
    print()
    print("Total: " + str(stats[1]) + " roads, " + str(stats[0]) + " updated with waterclogging data")
    print("Risk range: " + str(stats[2]) + " to " + str(stats[3]))

def main():
    print("Waterclogging Data Loader")
    print()

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        cur = conn.cursor()
        print("OK: Connected to database")

        count = load_waterclogging(conn, cur)
        if count == 0:
            print("ERROR: No waterclogging zones loaded!")
            print("Check the shapefile path and coordinate system")
            sys.exit(1)

        calculate_flood_risk(conn, cur)
        show_results(conn, cur)

        cur.close()
        conn.close()

        print()
        print("=" * 50)
        print("DONE! Database updated with real waterclogging data.")
        print("=" * 50)
        print()
        print("Next steps:")
        print("  1. Restart your backend server (run start.bat)")
        print("  2. Test routing - paths now use real flood risk!")

    except Exception as e:
        import traceback
        print("ERROR: " + str(e))
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
