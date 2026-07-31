@echo off
setlocal

set "PROJECT_ROOT=%~dp0"
set "POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

"%POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\status-project.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

echo.
echo This window closes automatically in 12 seconds.
"%POWERSHELL%" -NoLogo -NoProfile -Command "Start-Sleep -Seconds 12"

exit /b %EXIT_CODE%
