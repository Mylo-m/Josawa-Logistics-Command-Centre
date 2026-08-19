@echo off
REM ============================================================
REM  AlphaTech AI Logistics — Windows launcher
REM  Double-click this file. It will:
REM   1. Find Python (or tell you to install it)
REM   2. Install Flask if missing (needs internet, first run only)
REM   3. Start the app and open it in your browser
REM ============================================================
SETLOCAL
SET APPDIR=%~dp0
CD /D "%APPDIR%"

REM --- locate python ---
SET PY=
where py >nul 2>nul && SET PY=py -3
if "%PY%"=="" where python >nul 2>nul && SET PY=python
if "%PY%"=="" where python3 >nul 2>nul && SET PY=python3
if "%PY%"=="" (
  echo.
  echo  [!] Python was not found. Install it from https://python.org (tick "Add Python to PATH")
  echo      then run this launcher again.
  pause
  EXIT /B 1
)

REM --- ensure flask ---
echo Checking dependencies...
%PY% -c "import flask" >nul 2>nul
if ERRORLEVEL 1 (
  echo Installing Flask (one-time, needs internet)...
  %PY% -m pip install -r "%APPDIR%requirements.txt" --quiet
  if ERRORLEVEL 1 (
    echo  [!] Could not install Flask. Check your internet connection and try again.
    pause
    EXIT /B 1
  )
)

REM --- start app in background, then open browser ---
echo Starting AlphaTech AI Logistics...
start "" %PY% "%APPDIR%app.py"
timeout /t 4 >nul
start "" http://localhost:7501
echo.
echo  App is running. Keep this window open. Close it to stop the app.
echo  Open http://localhost:7501  (or the LAN address shown in the app) on other computers.
echo.
pause
ENDLOCAL
