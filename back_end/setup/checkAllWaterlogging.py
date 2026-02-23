"""
Check all waterlogging shapefiles for Kurla area coverage
"""
import shapefile
import sys

files = [
    (r"C:\Users\Pradnya\QGIS\waterlogging.shp", "WGS84"),
    (r"C:\Users\Pradnya\QGIS\waterlogging_n.shp", "WGS84"),
    (r"C:\Users\Pradnya\QGIS\waterlog_reproject.shp", "UTM43N"),
    (r"C:\Users\Pradnya\QGIS\merge_WL.shp", "WGS84"),
]

from pyproj import Transformer
utm_to_wgs = Transformer.from_crs("EPSG:32643", "EPSG:4326", always_xy=True)

def get_centroid(points):
    x = sum(p[0] for p in points) / len(points)
    y = sum(p[1] for p in points) / len(points)
    return x, y

for path, crs in files:
    try:
        sf = shapefile.Reader(path)
        fields = [f[0] for f in sf.fields[1:]]
        print("\n" + "="*50)
        print("File:", path.split("\\")[-1])
        print("Shape type:", sf.shapeType, "| Records:", sf.numRecords)
        print("Fields:", fields[:10])

        kurla_count = 0
        for rec in sf.shapeRecords():
            shape = rec.shape
            if not shape.points:
                continue

            if shape.shapeType in [5, 15, 25]:
                cx, cy = get_centroid(shape.points)
            elif shape.shapeType in [1, 11, 21]:
                cx, cy = shape.points[0]
            else:
                continue

            if crs == "UTM43N":
                lon, lat = utm_to_wgs.transform(cx, cy)
            else:
                lon, lat = cx, cy

            # Kurla area: lat 19.06-19.10, lon 72.84-19.92
            if 19.06 < lat < 19.10 and 72.84 < lon < 72.92:
                kurla_count += 1

        print("Kurla area records:", kurla_count)

        # Show coordinate range
        lons, lats = [], []
        for rec in sf.shapeRecords():
            shape = rec.shape
            if not shape.points:
                continue
            if shape.shapeType in [5, 15, 25]:
                cx, cy = get_centroid(shape.points)
            elif shape.shapeType in [1, 11, 21]:
                cx, cy = shape.points[0]
            else:
                continue
            if crs == "UTM43N":
                lon, lat = utm_to_wgs.transform(cx, cy)
            else:
                lon, lat = cx, cy
            if 72.0 < lon < 74.0 and 18.0 < lat < 20.0:
                lons.append(lon)
                lats.append(lat)

        if lons:
            print("Coverage: lon", round(min(lons),3), "to", round(max(lons),3),
                  "| lat", round(min(lats),3), "to", round(max(lats),3))

    except Exception as e:
        print("Error with", path.split("\\")[-1], ":", str(e))
