@echo off
cd /d "%~dp0"
echo.
echo  Updating the website pictures...
echo  (Your original pictures are only read, never changed.)
echo.
where node >nul 2>nul || (echo  Node.js is not installed. Please install the LTS version from https://nodejs.org and try again. & echo. & pause & exit /b 1)
if not exist node_modules\sharp (
  echo  First time only: downloading the tools. This can take a few minutes...
  call npm install --no-audit --no-fund
)
call npm run images
echo.
pause
