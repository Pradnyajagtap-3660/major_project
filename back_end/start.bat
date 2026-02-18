@echo off
echo Cleaning up old Node processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Starting server...
echo.

node server.js

pause
