@echo off
echo ========================================================
echo   Starting SafeX (VisionX) Platform (SIH25002)
echo ========================================================
echo.
echo [1/2] Starting Node.js Backend on http://localhost:5000...
start "SafeX Backend (Port 5000)" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Police Dashboard on http://localhost:5173...
start "SafeX Police Dashboard (Port 5173)" cmd /k "cd police-dashboard && npm run dev"

echo.
echo ========================================================
echo   Backend and Police Dashboard are now running!
echo   Police Dashboard: http://localhost:5173
echo   Backend Health:   http://localhost:5000/api/health
echo.
echo   To launch the Flutter Tourist App:
echo   cd mobile ^&^& flutter run -d chrome
echo ========================================================
pause
