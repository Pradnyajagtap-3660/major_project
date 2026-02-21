"""
Check Flood_Risk_200_lines.shp coverage and load flood risk data
"""
import shapefile
import psycopg2
from pyproj import Transformer
import sys

transformer = Transformer.from_crs("EPSG:32643", "EPSG:4326", always_xy=True)

SHP_PATH = r"C:\Users\Pradnya\QGIS\Flood_Risk_200_lines.shp"

DB_CONFIG = {
    "host": "localhost", "port": 5432,
    "database": "flood_response",
    "user": "postgres", "password": "admin123"
}

def get_centroid(points):
    if not points: return None, None
    x = sum(p[0] for p in points) / len(points)
    y = sum(p[1] for p in points) / len(points)
    return x, y

sf = shapefile.Reader(SHP_PATH)
fields = [f[0] for f in sf.fields[1:]]
print("Fields:", fields)
print("Total records:", sf.numRecords)

# Find flood_risk column index
fr_idx = fields.index('flood_risk')
cat_idx = fields.index('risk_categ')
print("flood_risk column index:", fr_idx)

# Check coverage and sample data
kurla_count = 0
sample_kurla = []
all_risks = []

for rec in sf.shapeRecords():
    shape = rec.shape
    record = rec.record

    if shape.shapeType in [5, 15, 25] and shape.points:
        utm_x, utm_y = get_centroid(shape.points)
        lon, lat = transformer.transform(utm_x, utm_y)

        flood_risk = record[fr_idx]
        risk_cat = record[cat_idx]

        all_risks.append(float(flood_risk) if flood_risk else 0)

        # Check Kurla area (lat 19.06-19.10, lon 72.86-72.92)
        if 19.06 < lat < 19.10 and 72.86 < lon < 72.92:
            kurla_count += 1
            if len(sample_kurla) < 5:
                sample_kurla.append((round(lon,4), round(lat,4), flood_risk, risk_cat))

print()
print("Kurla area cells:", kurla_count)
print("Sample Kurla data:")
for s in sample_kurla:
    print("  lon:", s[0], "lat:", s[1], "| flood_risk:", s[2], "| categ:", s[3])

print()
print("Risk range:", round(min(all_risks),3), "to", round(max(all_risks),3))
print("Avg risk:", round(sum(all_risks)/len(all_risks),3))

# Count by category
from collections import Counter
cats = []
for rec in sf.shapeRecords():
    cats.append(rec.record[cat_idx])
print("Categories:", Counter(cats).most_common())
