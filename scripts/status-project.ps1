[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDirectory 'project-runtime.ps1')

try {
    $runtime = Get-ProjectRuntimeConfiguration -ScriptDirectory $scriptDirectory
    $state = Read-ProjectRuntimeState -Runtime $runtime
    $hasProblem = $false

    Write-Host ''
    Write-Host 'AI Whiteboard Assistant status' -ForegroundColor White
    Write-Host "Project: $($runtime.ProjectRoot)"

    foreach ($service in $runtime.Services) {
        $records = @()
        if ($null -ne $state) {
            $records = @($state.services | Where-Object { $_.name -eq $service.Name })
        }

        if ($records.Count -gt 1) {
            Write-Host "[INVALID] $($service.Name): duplicate runtime records" -ForegroundColor Red
            $hasProblem = $true
            continue
        }

        if ($records.Count -eq 0) {
            if (Test-ServiceReady -ReadyUrl $service.ReadyUrl) {
                Write-Host "[UNTRACKED] $($service.Name): endpoint is available but no verified PID is recorded" -ForegroundColor Yellow
                $hasProblem = $true
            }
            else {
                Write-Host "[STOPPED] $($service.Name)" -ForegroundColor DarkGray
            }
            continue
        }

        $record = $records[0]
        $status = Get-ServiceRuntimeStatus -Record $record -Runtime $runtime
        switch ($status.Status) {
            'ready' {
                Write-Host "[READY] $($service.Name) - PID $($record.processId)" -ForegroundColor Green
            }
            'running-not-ready' {
                Write-Host "[STARTING] $($service.Name) - PID $($record.processId), endpoint unavailable" -ForegroundColor Yellow
                $hasProblem = $true
            }
            'stopped' {
                Write-Host "[STOPPED] $($service.Name) - recorded process has exited" -ForegroundColor DarkGray
            }
            default {
                Write-Host "[STALE] $($service.Name) - $($status.Reason)" -ForegroundColor Red
                $hasProblem = $true
            }
        }

        Write-Host "  stdout: $($record.standardOutputLog)"
        Write-Host "  stderr: $($record.standardErrorLog)"
    }

    if ($null -ne $state) {
        $configuredNames = @($runtime.Services | ForEach-Object { $_.Name })
        $unknownRecords = @($state.services | Where-Object { $_.name -notin $configuredNames })
        foreach ($record in $unknownRecords) {
            Write-Host "[STALE] Unknown recorded service '$($record.name)' was not touched." -ForegroundColor Red
            $hasProblem = $true
        }
    }

    Write-Host ''
    if ($hasProblem) {
        Write-Host 'Status completed with warnings. Review the messages above.' -ForegroundColor Yellow
        exit 2
    }

    Write-Host 'Status completed successfully.' -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "[Status] ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
