@echo off
echo ===================================================
echo   InferaDx - Robust Startup Script
echo ===================================================

echo [1/3] Checking dependencies...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install it from https://nodejs.org/
    pause
    exit /b
)

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed. Please install it from https://python.org/
    pause
    exit /b
)

echo [2/3] Cleaning up previous sessions...
npm run kill-ports

echo [3/3] Starting Frontend and Backend...
echo (Both will run in this terminal. Use Ctrl+C to stop.)
npm run dev

pause
