@echo off
echo ========================================
echo   Loading Elevation Data into DB
echo ========================================
echo.

echo [1/4] Loading elev1.tif...
raster2pgsql -I -C -s 4326 -t auto "C:\Users\Pradnya\QGIS\elev1.tif" elevation_1 | psql -U postgres -d flood_response -h localhost -p 5432

echo.
echo [2/4] Loading elev2.tif...
raster2pgsql -I -C -s 4326 -t auto "C:\Users\Pradnya\QGIS\elev2.tif" elevation_2 | psql -U postgres -d flood_response -h localhost -p 5432

echo.
echo [3/4] Creating merged elevation view...
psql -U postgres -d flood_response -h localhost -p 5432 -c "CREATE OR REPLACE VIEW elevation_merged AS SELECT * FROM elevation_1 UNION ALL SELECT * FROM elevation_2;"

echo.
echo [4/4] Verifying data...
psql -U postgres -d flood_response -h localhost -p 5432 -c "SELECT COUNT(*) FROM elevation_merged;"

echo.
echo ========================================
echo   ✅ Elevation data loaded!
echo ========================================
pause
