@echo off
title Hola Ingeniero - Setup
cd /d "%~dp0"
echo.
echo === Hola Ingeniero: one-time setup ===
if exist "%LOCALAPPDATA%\Programs\nodejs" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [X] Node.js is not installed.
  echo     1. Open https://nodejs.org and download the LTS version.
  echo     2. Install it with the default options.
  echo     3. Close this window and double-click setup.bat again.
  echo.
  pause
  exit /b 1
)
call node scripts\setup.mjs
if errorlevel 1 (
  echo.
  echo Setup did not finish. Read the message above.
  pause
  exit /b 1
)
echo.
pause
