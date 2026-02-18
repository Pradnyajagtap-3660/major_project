@echo off
echo ========================================
echo   UPDATING FLOOD RISK DATA
echo   Using Real Waterclogging + Elevation
echo ========================================
echo.
echo This will:
echo  1. Load waterclogging points (mumbai_wl.shp)
echo  2. Load elevation data (elev1.tif, elev2.tif)
echo  3. Calculate accurate flood risk for roads
echo  4. Update database
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul
echo.

echo ========================================
echo Step 1: Loading Waterclogging Points
echo ========================================
shp2pgsql -I -s 4326 -d "C:\Users\Pradnya\QGIS\mumbai_wl.shp" waterclogging_points | psql -U postgres -d flood_response -h localhost -p 5432 -q
if %errorlevel% neq 0 (
    echo ❌ Error loading waterclogging data!
    pause
    exit /b 1
)
echo ✅ Waterclogging points loaded
echo.

echo ========================================
echo Step 2: Loading Elevation Data (Part 1)
echo ========================================
raster2pgsql -I -C -s 4326 -t auto -d "C:\Users\Pradnya\QGIS\elev1.tif" elevation_1 | psql -U postgres -d flood_response -h localhost -p 5432 -q
if %errorlevel% neq 0 (
    echo ❌ Error loading elevation 1!
    pause
    exit /b 1
)
echo ✅ Elevation 1 loaded
echo.

echo ========================================
echo Step 3: Loading Elevation Data (Part 2)
echo ========================================
raster2pgsql -I -C -s 4326 -t auto -d "C:\Users\Pradnya\QGIS\elev2.tif" elevation_2 | psql -U postgres -d flood_response -h localhost -p 5432 -q
if %errorlevel% neq 0 (
    echo ❌ Error loading elevation 2!
    pause
    exit /b 1
)
echo ✅ Elevation 2 loaded
echo.

echo ========================================
echo Step 4: Calculating Flood Risk
echo ========================================
echo This may take 2-5 minutes depending on data size...
psql -U postgres -d flood_response -h localhost -p 5432 -f calculateFloodRisk.sql
if %errorlevel% neq 0 (
    echo ❌ Error calculating flood risk!
    pause
    exit /b 1
)
echo.

echo ========================================
echo   ✅ FLOOD RISK DATA UPDATED!
echo ========================================
echo.
echo Your database now has accurate flood risk based on:
echo  ✓ Real waterclogging locations
echo  ✓ Elevation data
echo  ✓ Spatial analysis
echo.
echo Next steps:
echo  1. Restart your backend server
echo  2. Test the routing again
echo  3. Red path should now be chosen over blue!
echo.
echo Press any key to view updated statistics...
pause >nul

psql -U postgres -d flood_response -h localhost -p 5432 -c "SELECT CASE WHEN flood_risk < 0.3 THEN 'Low (0-0.3)' WHEN flood_risk < 0.6 THEN 'Medium (0.3-0.6)' ELSE 'High (0.6-1.0)' END as risk_category, COUNT(*) as road_count FROM roads_in_risk GROUP BY risk_category ORDER BY risk_category;"

echo.
pause
