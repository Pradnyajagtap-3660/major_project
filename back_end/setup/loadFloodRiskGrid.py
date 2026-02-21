"""
Load Flood_Risk_200_lines.shp (200m grid with pre-computed flood risk)
and update roads_in_risk based on spatial intersection.
This data uses elevation + rainfall + drainage + waterclogging - much more accurate!
"""
import shapefile
import psycopg2
import sys
import time
from pyproj import Transformer

transformer = Transformer.from_crs("EPSG:32643", "EPSG:4326", always_xy=True)

SHP_PATH = r"C:\Users\Pradnya\QGIS\Flood_Risk_200_lines.shp"

DB_CONFIG = {
    "host": "localhost", "port": 5432,
    "database": "flood_response",
    "user": "postgres", "password": "admin123"
}

def transform_points(points):
    """Convert list of UTM 43N points to WGS84"""
    return [transformer.transform(p[0], p[1]) for p in points]

def load_grid(conn, cur):
    print("=" * 50)
    print("Step 1: Loading Flood Risk Grid (200m cells)")
    print("=" * 50)

    sf = shapefile.Reader(SHP_PATH)
    fields = [f[0] for f in sf.fields[1:]]
    fr_idx = fields.index('flood_risk')
    cat_idx = fields.index('risk_categ')

    # Create grid table
    cur.execute("DROP TABLE IF EXISTS flood_risk_grid")
    cur.execute("""
        CREATE TABLE flood_risk_grid (
            gid SERIAL PRIMARY KEY,
            flood_risk FLOAT,
            risk_categ VARCHAR(50),
            geom GEOMETRY(Polygon, 4326)
        )
    """)
    cur.execute("CREATE INDEX ON flood_risk_grid USING GIST (geom)")

    count = 0
    skipped = 0

    for rec in sf.shapeRecords():
        shape = rec.shape
        record = rec.record

        if shape.shapeType not in [5, 15, 25] or not shape.points:
            skipped += 1
            continue

        flood_risk = float(record[fr_idx]) if record[fr_idx] else None
        risk_categ = str(record[cat_idx]) if record[cat_idx] else None

        if flood_risk is None:
            skipped += 1
            continue

        # Convert polygon points to WGS84
        wgs_points = transform_points(shape.points)

        # Check if in Mumbai area
        if not (72.5 < wgs_points[0][0] < 73.5 and 18.5 < wgs_points[0][1] < 19.5):
            skipped += 1
            continue

        # Build WKT polygon
        wkt_pts = ', '.join(str(p[0]) + ' ' + str(p[1]) for p in wgs_points)
        wkt = 'POLYGON((' + wkt_pts + '))'

        # Handle parts (rings) for complex polygons
        if len(shape.parts) > 1:
            rings = []
            parts = list(shape.parts) + [len(shape.points)]
            for i in range(len(shape.parts)):
                ring_pts = shape.points[parts[i]:parts[i+1]]
                wgs_ring = transform_points(ring_pts)
                rings.append('(' + ', '.join(str(p[0]) + ' ' + str(p[1]) for p in wgs_ring) + ')')
            wkt = 'POLYGON(' + ', '.join(rings) + ')'

        try:
            cur.execute(
                "INSERT INTO flood_risk_grid (flood_risk, risk_categ, geom) VALUES (%s, %s, ST_GeomFromText(%s, 4326))",
                (flood_risk, risk_categ, wkt)
            )
            count += 1
        except Exception as e:
            skipped += 1

    conn.commit()
    print("Loaded " + str(count) + " grid cells")
    if skipped > 0:
        print("Skipped " + str(skipped) + " cells")
    return count

def update_roads(conn, cur):
    print()
    print("=" * 50)
    print("Step 2: Updating roads from grid data")
    print("(roads get risk from the grid cell they fall in)")
    print("=" * 50)

    start = time.time()

    # For each road, find the grid cell that intersects it
    # Use the grid cell's flood_risk value
    cur.execute("""
        UPDATE roads_in_risk r
        SET
            flood_risk = g.flood_risk,
            risk_categ = g.risk_categ
        FROM (
            SELECT DISTINCT ON (r2.id)
                r2.id,
                g2.flood_risk,
                g2.risk_categ
            FROM roads_in_risk r2
            JOIN flood_risk_grid g2 ON ST_Intersects(r2.geom, g2.geom)
            ORDER BY r2.id, g2.flood_risk
        ) g
        WHERE r.id = g.id
    """)
    updated = cur.rowcount
    conn.commit()

    elapsed = time.time() - start
    print("Updated " + str(updated) + " roads in " + str(round(elapsed, 1)) + " seconds")

    # Roads not in any grid cell keep their waterclogging-based risk
    cur.execute("SELECT COUNT(*) FROM roads_in_risk WHERE risk_categ NOT IN ('High Risk', 'Medium Risk', 'Low Risk')")
    unchanged = cur.fetchone()[0]
    if unchanged > 0:
        print(str(unchanged) + " roads not in grid (keeping waterclogging-based risk)")

def show_results(conn, cur):
    print()
    print("=" * 50)
    print("RESULTS: New Flood Risk Distribution")
    print("=" * 50)

    cur.execute("""
        SELECT
            risk_categ,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as pct,
            ROUND(MIN(flood_risk::numeric), 3) as min_risk,
            ROUND(MAX(flood_risk::numeric), 3) as max_risk,
            ROUND(AVG(flood_risk::numeric), 3) as avg_risk
        FROM roads_in_risk
        GROUP BY risk_categ
        ORDER BY avg_risk
    """)
    rows = cur.fetchall()
    for row in rows:
        print("  " + str(row[0]) + ": " + str(row[1]) + " roads (" + str(row[2]) + "%)")
        print("    risk range: " + str(row[3]) + " to " + str(row[4]) + ", avg=" + str(row[5]))

    # Check specific Kurla area
    cur.execute("""
        SELECT
            ROUND(AVG(flood_risk::numeric), 3) as avg,
            ROUND(MIN(flood_risk::numeric), 3) as min,
            ROUND(MAX(flood_risk::numeric), 3) as max,
            COUNT(*) as count
        FROM roads_in_risk
        WHERE geom && ST_MakeEnvelope(72.875, 19.079, 72.892, 19.087, 4326)
    """)
    kurla = cur.fetchone()
    print()
    print("Kurla route area (green route zone):")
    print("  Roads:", kurla[3], "| risk:", kurla[1], "to", kurla[2], "avg:", kurla[0])

def main():
    print("Flood Risk Grid Loader")
    print("Source: Flood_Risk_200_lines.shp")
    print("Data: elevation + rainfall + drainage + waterclogging")
    print()

    conn = psycopg2.connect(**DB_CONFIG)
    conn.autocommit = False
    cur = conn.cursor()
    print("Connected to database")

    count = load_grid(conn, cur)
    if count == 0:
        print("ERROR: No grid cells loaded!")
        sys.exit(1)

    update_roads(conn, cur)
    show_results(conn, cur)

    cur.close()
    conn.close()

    print()
    print("=" * 50)
    print("DONE! Roads updated with comprehensive flood risk.")
    print("=" * 50)
    print()
    print("Next: Restart server and test routing!")

if __name__ == "__main__":
    main()
