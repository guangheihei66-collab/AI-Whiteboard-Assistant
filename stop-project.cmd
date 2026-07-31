@echo off
setlocal

set "PROJECT_ROOT=%~dp0"
set "POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

"%POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\stop-project.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Stop did not complete safely. Review the message above.
  pause
) else (
  "%POWERSHELL%" -NoLogo -NoProfile -Command "Start-Sleep -Seconds 3"
)

exit /b %EXIT_CODE%
