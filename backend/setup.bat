@echo off
echo ========================================
echo   PrintVault - Backend Setup
echo ========================================

echo.
echo Creating virtual environment...
python -m venv venv

echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Installing backend dependencies...
pip install -r requirements.txt

echo.
echo ========================================
echo   Backend Setup Complete!
echo ========================================
echo.
echo To run the backend:
echo   cd backend
echo   python main.py
echo.
echo Or use: run-backend.bat
echo.

pause
