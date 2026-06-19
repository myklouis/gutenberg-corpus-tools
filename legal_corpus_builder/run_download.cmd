@echo off
setlocal

set "SCRIPT=%~dp0download_open_corpus.mjs"
set "OUT=%~dp0..\legal_corpus"
set "BUNDLED_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

where node >nul 2>nul
if %ERRORLEVEL%==0 (
  node "%SCRIPT%" --out "%OUT%" --limit 30
  goto done
)

if exist "%BUNDLED_NODE%" (
  "%BUNDLED_NODE%" "%SCRIPT%" --out "%OUT%" --limit 30
  goto done
)

echo Node.js was not found. Install Node.js or run this from the Codex bundled runtime.
exit /b 1

:done
echo.
echo Finished. Check the outputs\legal_corpus folder.
pause
