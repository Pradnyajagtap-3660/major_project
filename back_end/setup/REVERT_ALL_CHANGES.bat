@echo off
echo ========================================
echo   REVERT ALL CHANGES FROM TODAY
echo ========================================
echo.
echo WARNING: This will:
echo  - Restore original flood_risk values
echo  - Remove added database columns
echo  - Remove waterclogging/elevation tables
echo.
echo Your routing will go back to showing
echo the WRONG path (blue instead of red)
echo.
echo Are you sure? Press Ctrl+C to cancel
pause
echo.

set POSTGIS_BIN=C:\Program Files\PostgreSQL\18\bin
set PSQL="%POSTGIS_BIN%\psql.exe"
set PGPASSWORD=admin123

echo Reverting database...
%PSQL% -U postgres -d flood_response -f REVERT_DATABASE.sql

echo.
echo ========================================
echo   ✅ DATABASE REVERTED
echo ========================================
echo.
echo Database is back to original state.
echo All roads have ~90%% high risk again.
echo.
echo Restart your server for changes to take effect.
echo.
pause
