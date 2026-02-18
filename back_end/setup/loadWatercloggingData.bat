@echo off
echo ========================================
echo   Loading Waterclogging Data into DB
echo ========================================
echo.

echo [1/3] Loading mumbai_wl.shp...
shp2pgsql -I -s 4326 "C:\Users\Pradnya\QGIS\mumbai_wl.shp" waterclogging_points | psql -U postgres -d flood_response -h localhost -p 5432

echo.
echo [2/3] Verifying data...
psql -U postgres -d flood_response -h localhost -p 5432 -c "SELECT COUNT(*) as total_points FROM waterclogging_points;"

echo.
echo ========================================
echo   ✅ Waterclogging data loaded!
echo ========================================
pause
