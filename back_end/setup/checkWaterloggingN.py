import shapefile
from pyproj import Transformer
import psycopg2

SHP_PATH = r"C:\Users\Pradnya\QGIS\waterlogging_n.shp"
DB_CONFIG = {"host":"localhost","port":5432,"database":"flood_response","user":"postgres","password":"admin123"}

def get_centroid(points):
    return sum(p[0] for p in points)/len(points), sum(p[1] for p in points)/len(points)

sf = shapefile.Reader(SHP_PATH)
fields = [f[0] for f in sf.fields[1:]]
print("Fields:", fields)
print("Records:", sf.numRecords)
print()

# Find which CRS - check if WGS84 or UTM
# Based on earlier check, prj size=145 bytes = WGS84
# Show all Kurla records
print("All Kurla area zones:")
for rec in sf.shapeRecords():
    shape = rec.shape
    record = rec.record
    if not shape.points: continue
    if shape.shapeType in [5,15,25]:
        cx, cy = get_centroid(shape.points)
    else:
        cx, cy = shape.points[0]

    # Check if WGS84 (lon 72-73, lat 18-20) or projected
    if 72.0 < cx < 73.5 and 18.0 < cy < 20.0:
        lon, lat = cx, cy
    else:
        print("  Projected coords:", round(cx,1), round(cy,1), "- skipping")
        continue

    if 19.06 < lat < 19.12 and 72.84 < lon < 72.95:
        name = record[fields.index('Name')] if 'Name' in fields else 'N/A'
        print("  " + str(round(lon,4)) + "," + str(round(lat,4)) + " | Name: " + str(name))

print()

# Now check: distance from green route's LBS Marg area to nearest waterlogging zone
# Green route passes through lat 19.083-19.086, lon 72.878-72.885
conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

# Check waterclogging_points loaded in DB
cur.execute("SELECT ST_X(geom), ST_Y(geom) FROM waterclogging_points WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_Point(72.883, 19.084), 4326)::geography, 1500) ORDER BY ST_Distance(geom::geography, ST_SetSRID(ST_Point(72.883, 19.084), 4326)::geography)")
print("Waterclogging zones near LBS Marg (72.883, 19.084):")
for r in cur.fetchall():
    print("  " + str(round(r[0],4)) + "," + str(round(r[1],4)))

# Check waterclogging zones near Nathani Rd (orange route) (72.892, 19.081)
cur.execute("SELECT ST_X(geom), ST_Y(geom) FROM waterclogging_points WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_Point(72.892, 19.081), 4326)::geography, 1500) ORDER BY ST_Distance(geom::geography, ST_SetSRID(ST_Point(72.892, 19.081), 4326)::geography)")
print("\nWaterclogging zones near Nathani Road (72.892, 19.081):")
for r in cur.fetchall():
    print("  " + str(round(r[0],4)) + "," + str(round(r[1],4)))

cur.close()
conn.close()
