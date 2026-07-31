[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDirectory 'project-runtime.ps1')

try {
    $runtime = Get-ProjectRuntimeConfiguration -ScriptDirectory $scriptDirectory
    $state = Read-ProjectRuntimeState -Runtime $runtime

    if ($null -eq $state) {
        Write-LauncherInfo 'No project-owned background processes are recorded.'
        exit 0
    }

    $configuredNames = @($runtime.Services | ForEach-Object { $_.Name })
    $unknownRecords = @($state.services | Where-Object { $_.name -notin $configuredNames })
    if ($unknownRecords.Count -gt 0) {
        $unknownNames = ($unknownRecords | ForEach-Object { $_.name }) -join ', '
        throw "Runtime state contains unknown services: $unknownNames. No processes were changed."
    }

    $remainingRecords = @()
    $hadFailure = $false
    $records = @($state.services)

    for ($index = $records.Count - 1; $index -ge 0; $index--) {
        $record = $records[$index]
        Write-LauncherInfo "Stopping $($record.name) (recorded PID $($record.processId))..."
        $result = Stop-VerifiedServiceProcess -Record $record -Runtime $runtime

        if ($result.Stopped) {
            Write-Host "  $($record.name): $($result.Message)" -ForegroundColor Green
        }
        else {
            Write-Warning "$($record.name) was not stopped: $($result.Message)"
            $remainingRecords += $record
            $hadFailure = $true
        }
    }

    if ($remainingRecords.Count -gt 0) {
        Write-ProjectRuntimeState `
            -Runtime $runtime `
            -Services $remainingRecords `
            -LaunchedAtUtc ([string]$state.launchedAtUtc)
    }
    else {
        Remove-ProjectRuntimeState -Runtime $runtime
    }

    foreach ($service in $runtime.Services) {
        if (Test-ServiceReady -ReadyUrl $service.ReadyUrl) {
            Write-Warning "$($service.Name) endpoint is still available. It may belong to an untracked process; it was not stopped."
            $hadFailure = $true
        }
    }

    if ($hadFailure) {
        throw 'One or more services could not be safely stopped. Review status and logs.'
    }

    Write-LauncherInfo 'Project stopped successfully.'
    exit 0
}
catch {
    Write-Host "[Stop] ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
