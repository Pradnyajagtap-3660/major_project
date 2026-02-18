@echo off
echo ========================================
echo   FIX SPECIFIC ROUTE
echo ========================================
echo.
echo This will update roads around your
echo specific route (Don Bosco area)
echo.
echo Northern routes = 0.30 risk (Low)
echo Southern routes = 0.75 risk (High)
echo.
pause

set POSTGIS_BIN=C:\Program Files\PostgreSQL\18\bin
set PSQL="%POSTGIS_BIN%\psql.exe"
set PGPASSWORD=admin123

%PSQL% -U postgres -d flood_response -f fixSpecificRoute.sql

echo.
echo ✅ Done! Restart server and test again.
pause
