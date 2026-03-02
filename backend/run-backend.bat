@echo off
echo Starting PrintVault Backend...
cd /d "%~dp0"
call venv\Scripts\activate.bat
python main.py
