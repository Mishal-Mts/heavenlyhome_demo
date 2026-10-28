@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo  Node.js is not installed. Please install the LTS version from https://nodejs.org and try again. & echo. & pause & exit /b 1)
if not exist node_modules\http-server (
  echo  First time only: downloading the tools. This can take a few minutes...
  call npm install --no-audit --no-fund
)
echo.
echo  The website preview is opening in your browser at http://localhost:8080
echo  Close this window to stop the preview.
echo.
start "" http://localhost:8080
call npx http-server . -p 8080 -c-1 -s
