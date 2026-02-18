@echo off
echo ========================================
echo   FAST FLOOD RISK UPDATE
echo   Using Waterclogging Data Only
echo ========================================
echo.
echo This FASTER version:
echo  1. Loads waterclogging points
echo  2. Calculates distance to waterlogging
echo  3. Creates flood risk scores
echo.
echo Time: 2-5 minutes (much faster!)
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul
echo.

REM Set paths
set POSTGIS_BIN=C:\Program Files\PostgreSQL\18\bin
set PSQL="%POSTGIS_BIN%\psql.exe"
set SHP2PGSQL="%POSTGIS_BIN%\shp2pgsql.exe"

REM Database connection
set PGPASSWORD=admin123
set DB_USER=postgres
set DB_NAME=flood_response
set DB_HOST=localhost
set DB_PORT=5432

echo ========================================
echo Step 1/2: Loading Waterclogging Points
echo ========================================
%SHP2PGSQL% -I -s 4326 -d "C:\Users\Pradnya\QGIS\mumbai_wl.shp" waterclogging_points | %PSQL% -U %DB_USER% -d %DB_NAME% -h %DB_HOST% -p %DB_PORT% -q
if %errorlevel% neq 0 (
    echo ❌ Error loading waterclogging data!
    pause
    exit /b 1
)
echo ✅ Waterclogging points loaded
echo.

echo ========================================
echo Step 2/2: Calculating Flood Risk (FAST)
echo ========================================
echo This will take 2-5 minutes...
echo.
%PSQL% -U %DB_USER% -d %DB_NAME% -h %DB_HOST% -p %DB_PORT% -f calculateFloodRisk_fast.sql
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
echo Your roads now have accurate flood risk based on:
echo  ✓ Distance to actual waterclogging points
echo  ✓ Linear risk calculation (closer = higher risk)
echo.
echo Next steps:
echo  1. Run: node checkDataStatus.js (to verify)
echo  2. Restart your backend server
echo  3. Test routing - RED path should be chosen!
echo.
pause
