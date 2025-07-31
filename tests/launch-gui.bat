@echo off
echo 🧪 Lucaverse Test Runner GUI Launcher
echo =====================================
echo.

cd /d "%~dp0"

echo 📦 Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo 💡 Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is available
echo.

echo 🚀 Starting GUI Test Runner...
echo 🌐 GUI will be available at: http://localhost:8090
echo 📝 Press Ctrl+C to stop the server
echo.

node launch-gui.js
pause