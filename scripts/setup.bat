@echo off
setlocal

cd /d "%~dp0"

echo === CuffedOrNot Matching Script Setup ===

python --version >nul 2>&1 || (
    echo ERROR: Python is not on PATH. Install Python 3.10+ from python.org.
    exit /b 1
)

if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

echo Installing dependencies...
call .venv\Scripts\activate.bat
pip install --upgrade pip -q
pip install -r requirements.txt -q

echo.
echo Setup complete.
echo To run the matching script:
echo   call scripts\.venv\Scripts\activate.bat
echo   python scripts\run_matching.py --env .env.local --dry-run
echo   python scripts\run_matching.py --env .env.local
