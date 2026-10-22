@echo off
echo Stopping Hola Ingeniero (ports 5173 and 5000)...
for %%P in (5173 5000) do (
  for /f "tokens=5" %%A in ('netstat -aon ^| findstr ":%%P " ^| findstr LISTENING') do taskkill /F /PID %%A >nul 2>nul
)
echo Done.
pause
