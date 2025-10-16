@echo off
echo Starting HelpMate Helpdesk System
echo ===================================

echo.
echo 1. Starting MongoDB (if available)...
echo Note: Make sure MongoDB is installed and running on localhost:27017

echo.
echo 2. Starting Backend API Server...
start "HelpMate Backend" cmd /k "venv\Scripts\uvicorn main:app --reload --port 8000"

echo.
echo 4. Starting Frontend React App...
cd ..\frontend
start "HelpMate Frontend" cmd /k "npm start"

echo.
echo ===================================
echo HelpMate System Starting...
echo ===================================
echo.
echo Backend API: http://localhost:8000
echo Frontend App: http://localhost:3000
echo.
echo Login credentials:
echo User: user@example.com / password
echo Agent: agent@example.com / password
echo Manager: manager@example.com / password
echo.
echo Press any key to exit this window...
pause > nul
