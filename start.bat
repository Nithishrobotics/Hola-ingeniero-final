@echo off
title Hola Ingeniero
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\Programs\nodejs" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js is not installed. Install the LTS version from https://nodejs.org and run setup.bat.
  pause
  exit /b 1
)
if not exist "node_modules" goto needsetup
if not exist "backend\node_modules" goto needsetup
if not exist "frontend\node_modules" goto needsetup
goto ready
:needsetup
echo First run: installing dependencies...
call node scripts\setup.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
:ready
if not exist ".env" copy ".env.example" ".env" >nul
echo.
echo  Hola Ingeniero is starting...
echo    Website : http://localhost:5173
echo    Backend : http://localhost:5000/api/health
echo    To STOP : press Ctrl+C in this window (or close it, or run stop.bat)
echo.
start "" /min cmd /c "timeout /t 6 /nobreak >nul & start http://localhost:5173"
call npm start
pause
