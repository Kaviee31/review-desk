@echo off
echo Starting Review Desk dev servers...

start "Backend - port 5000" cmd /k "cd /d "%~dp0backend" && npm run dev"
start "Frontend - port 5173" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo   Backend  ^> http://localhost:5000
echo   Frontend ^> http://localhost:5173
echo.
