@echo off
echo ========================================
echo   QUICK FIX - Kurla Area Only
echo   Time: Under 30 seconds!
echo ========================================
echo.
echo This will update flood risk for roads in
echo the Kurla area (your blue vs red path)
echo.
echo Press any key to continue...
pause >nul
echo.

set POSTGIS_BIN=C:\Program Files\PostgreSQL\18\bin
set PSQL="%POSTGIS_BIN%\psql.exe"

set PGPASSWORD=admin123
set DB_USER=postgres
set DB_NAME=flood_response

echo Updating Kurla area roads...
%PSQL% -U %DB_USER% -d %DB_NAME% -f quickFix_KurlaArea.sql

echo.
echo ========================================
echo   ✅ DONE!
echo ========================================
echo.
echo Roads in Kurla area updated:
echo  - South/West (blue path area) = High risk (0.85)
echo  - North/East (red path area) = Low risk (0.30)
echo.
echo Next steps:
echo  1. Restart your backend server
echo  2. Test the same route
echo  3. Should now choose RED path!
echo.
pause
