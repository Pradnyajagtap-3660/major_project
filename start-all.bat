@echo off
echo ========================================
echo   Mumbai Flood Response System
echo ========================================
echo.

echo [1/2] Cleaning up old processes...
taskkill /F /IM node.exe >nul 2>&1

echo [2/2] Starting servers...
echo.

echo Starting BACKEND on port 5000...
start "Backend Server" cmd /k "cd back_end && node server.js"

timeout /t 3 /nobreak >nul

echo Starting FRONTEND on port 3000...
start "Frontend Server" cmd /k "cd front_end && npm start"

echo.
echo ========================================
echo   ✅ Both servers started!
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo ========================================
echo.
echo Check the separate windows for each server.
pause
