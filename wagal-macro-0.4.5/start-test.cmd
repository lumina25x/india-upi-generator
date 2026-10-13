@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run the local test page.
  pause
  exit /b 1
)
node test-server.cjs --open
pause
