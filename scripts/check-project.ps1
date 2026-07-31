[CmdletBinding()]
param(
  [switch]$IncludeE2E
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

function Invoke-ProjectCheck {
  param(
    [Parameter(Mandatory)] [string]$Label,
    [Parameter(Mandatory)] [string]$WorkingDirectory,
    [Parameter(Mandatory)] [string[]]$Arguments
  )

  Write-Host "`n== $Label ==" -ForegroundColor Cyan
  Push-Location $WorkingDirectory
  try {
    & npm.cmd @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "$Label failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

$frontend = Join-Path $projectRoot 'frontend'
$backend = Join-Path $projectRoot 'backend'

if (-not (Test-Path (Join-Path $frontend 'node_modules'))) {
  throw 'frontend/node_modules is missing. Run npm.cmd install in frontend first.'
}
if (-not (Test-Path (Join-Path $backend 'node_modules'))) {
  throw 'backend/node_modules is missing. Run npm.cmd install in backend first.'
}

Invoke-ProjectCheck 'Frontend lint' $frontend @('run', 'lint')
Invoke-ProjectCheck 'Frontend unit tests' $frontend @('test', '--', '--run')
Invoke-ProjectCheck 'Frontend production build' $frontend @('run', 'build')
Invoke-ProjectCheck 'Backend API tests' $backend @('test')
Invoke-ProjectCheck 'Backend typecheck' $backend @('run', 'typecheck')
Invoke-ProjectCheck 'Backend production build' $backend @('run', 'build')

if ($IncludeE2E) {
  Invoke-ProjectCheck 'Playwright end-to-end tests' $frontend @('run', 'test:e2e')
}

Write-Host "`nAll requested project checks passed." -ForegroundColor Green

