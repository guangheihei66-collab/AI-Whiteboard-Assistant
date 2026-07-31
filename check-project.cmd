@echo off
setlocal

set "PROJECT_ROOT=%~dp0"
set "POWERSHELL=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

"%POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%scripts\check-project.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Project checks did not pass. Review the failed command above.
  pause
)

exit /b %EXIT_CODE%

