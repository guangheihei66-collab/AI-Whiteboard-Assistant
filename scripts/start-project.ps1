[CmdletBinding()]
param(
    [switch]$ValidateOnly,
    [switch]$NoBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $scriptDirectory 'project-runtime.ps1')

$runtime = $null
$records = @()
$startedRecords = @()
$launchTimestampUtc = [DateTime]::UtcNow.ToString('o')

try {
    $runtime = Get-ProjectRuntimeConfiguration -ScriptDirectory $scriptDirectory

    Write-LauncherInfo "Configuration is valid for $(@($runtime.Services).Count) service(s)."
    foreach ($service in $runtime.Services) {
        Write-Host "  - $($service.Name): $($service.Path)"
    }

    if ($ValidateOnly) {
        Write-LauncherInfo 'Validation completed. No dependencies or services were started.'
        exit 0
    }

    foreach ($service in $runtime.Services) {
        $isNpmInstall = Test-NpmCommand -Command $service.InstallCommand
        $dependencyDirectory = Join-Path $service.Path 'node_modules'
        if (-not $isNpmInstall -or (Test-Path -LiteralPath $dependencyDirectory -PathType Container)) {
            continue
        }

        Write-Warning "Dependencies are missing for '$($service.Name)'."
        Write-Host 'The configured npm install command uses the service package files,'
        Write-Host 'downloads packages from the npm registry, and may run dependency lifecycle scripts.'
        $answer = (Read-Host "Run '$($service.InstallCommand)' inside '$($service.Path)'? [y/N]").Trim()
        if ($answer -notin @('y', 'Y', 'yes', 'YES', 'Yes')) {
            throw "Dependency installation was declined for '$($service.Name)'."
        }

        Write-LauncherInfo "Installing dependencies for $($service.Name)..."
        Push-Location -LiteralPath $service.Path
        try {
            & $env:ComSpec /d /c $service.InstallCommand
            if ($LASTEXITCODE -ne 0) {
                throw "Dependency installation failed for '$($service.Name)' with exit code $LASTEXITCODE."
            }
        }
        finally {
            Pop-Location
        }
    }

    $existingState = Read-ProjectRuntimeState -Runtime $runtime
    if ($null -ne $existingState) {
        $records = @($existingState.services)
        $launchTimestampUtc = Get-TextProperty -Object $existingState -Name 'launchedAtUtc' -Required

        $configuredNames = @($runtime.Services | ForEach-Object { $_.Name })
        $unknownRecords = @($records | Where-Object { $_.name -notin $configuredNames })
        if ($unknownRecords.Count -gt 0) {
            $unknownNames = ($unknownRecords | ForEach-Object { $_.name }) -join ', '
            throw "Runtime state contains unknown services: $unknownNames. No processes were changed."
        }
    }

    $timestamp = [DateTime]::Now.ToString('yyyy-MM-dd-HHmmss')
    foreach ($service in $runtime.Services) {
        $matchingRecords = @($records | Where-Object { $_.name -eq $service.Name })
        if ($matchingRecords.Count -gt 1) {
            throw "Runtime state contains duplicate records for '$($service.Name)'. No processes were changed."
        }

        if ($matchingRecords.Count -eq 1) {
            $record = $matchingRecords[0]
            $status = Get-ServiceRuntimeStatus -Record $record -Runtime $runtime
            if ($status.Status -eq 'stale') {
                throw "Runtime state for '$($service.Name)' is stale ($($status.Reason)). No process was stopped."
            }

            if ($status.Status -in @('ready', 'running-not-ready')) {
                Write-LauncherInfo "$($service.Name) is already running (PID $($record.processId))."
                continue
            }

            $records = @($records | Where-Object { $_.name -ne $service.Name })
        }
        elseif (Test-ServiceReady -ReadyUrl $service.ReadyUrl) {
            throw "The readiness endpoint for '$($service.Name)' is already available, but no verified project state exists. No new process was started."
        }

        Write-LauncherInfo "Starting $($service.Name) in the background..."
        $newRecord = Start-ProjectServiceProcess -Runtime $runtime -Service $service -Timestamp $timestamp
        $startedRecords += $newRecord
        $records += $newRecord
        Write-ProjectRuntimeState `
            -Runtime $runtime `
            -Services $records `
            -LaunchedAtUtc $launchTimestampUtc
        Write-LauncherInfo "$($service.Name) started as PID $($newRecord.processId)."
    }

    $pendingServices = @($runtime.Services | Where-Object { $null -ne $_.ReadyUrl })
    $deadline = [DateTime]::UtcNow.AddSeconds($runtime.TimeoutSeconds)

    while ($pendingServices.Count -gt 0 -and [DateTime]::UtcNow -lt $deadline) {
        $stillPending = @()
        foreach ($service in $pendingServices) {
            if (Test-ServiceReady -ReadyUrl $service.ReadyUrl) {
                Write-LauncherInfo "$($service.Name) is ready: $($service.ReadyUrl)"
            }
            else {
                $record = @($records | Where-Object { $_.name -eq $service.Name })[0]
                $status = Get-RecordedProcessStatus -Record $record -Runtime $runtime
                if ($status.Status -ne 'running') {
                    throw "$($service.Name) stopped before becoming ready. Check: $($record.standardErrorLog)"
                }
                $stillPending += $service
            }
        }

        $pendingServices = @($stillPending)
        if ($pendingServices.Count -gt 0) {
            Start-Sleep -Milliseconds 500
        }
    }

    if ($pendingServices.Count -gt 0) {
        $pendingNames = ($pendingServices | ForEach-Object { $_.Name }) -join ', '
        throw "Startup timed out while waiting for: $pendingNames. Newly started processes will be stopped; logs are preserved."
    }

    if (-not $NoBrowser) {
        Write-LauncherInfo "Opening $($runtime.BrowserUrl)"
        Start-Process -FilePath $runtime.BrowserUrl | Out-Null
    }

    Write-LauncherInfo 'Project started successfully in the background.'
    Write-Host 'Use status-project.cmd to inspect it and stop-project.cmd to stop it.'
    exit 0
}
catch {
    if ($null -ne $runtime -and $startedRecords.Count -gt 0) {
        Write-Warning 'Startup failed. Stopping only processes created by this attempt...'
        for ($index = $startedRecords.Count - 1; $index -ge 0; $index--) {
            $record = $startedRecords[$index]
            $result = Stop-VerifiedServiceProcess -Record $record -Runtime $runtime
            if (-not $result.Stopped) {
                Write-Warning "Could not stop '$($record.name)': $($result.Message)"
            }
            $records = @($records | Where-Object { $_.processId -ne $record.processId })
        }

        if ($records.Count -gt 0) {
            Write-ProjectRuntimeState `
                -Runtime $runtime `
                -Services $records `
                -LaunchedAtUtc $launchTimestampUtc
        }
        else {
            Remove-ProjectRuntimeState -Runtime $runtime
        }
    }

    Write-Host "[Launcher] ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
