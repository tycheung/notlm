@echo off
REM Playwright smoke e2e (mocked / no @fullflow). Starts its own SQLite API + Vite dev server.
cd /d "%~dp0.."
if not exist node_modules\@playwright\test (
  echo Installing npm dependencies...
  call npm install
)
call npm run test:e2e:install
call npm run test:e2e -- --grep-invert "@fullflow" %*
