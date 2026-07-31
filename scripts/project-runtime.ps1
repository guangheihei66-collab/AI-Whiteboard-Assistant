Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:RuntimeStateVersion = 1
$script:ProcessStartToleranceSeconds = 3

function Write-LauncherInfo {
    param([Parameter(Mandatory = $true)][string]$Message)

    Write-Host "[Launcher] $Message" -ForegroundColor Cyan
}

function Get-TextProperty {
    param(
        [Parameter(Mandatory = $true)][object]$Object,
        [Parameter(Mandatory = $true)][string]$Name,
        [switch]$Required
    )

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property -or $null -eq $property.Value) {
        if ($Required) {
            throw "Missing required configuration property '$Name'."
        }

        return $null
    }

    $value = ([string]$property.Value).Trim()
    if ([string]::IsNullOrWhiteSpace($value)) {
        if ($Required) {
            throw "Configuration property '$Name' cannot be empty."
        }

        return $null
    }

    if ($value -match "[`r`n]") {
        throw "Configuration property '$Name' cannot contain line breaks."
    }

    return $value
}

function Assert-HttpUrl {
    param(
        [Parameter(Mandatory = $true)][string]$Value,
        [Parameter(Mandatory = $true)][string]$Label
    )

    $parsed = $null
    if (-not [Uri]::TryCreate($Value, [UriKind]::Absolute, [ref]$parsed)) {
        throw "$Label must be an absolute URL."
    }

    if ($parsed.Scheme -notin @('http', 'https')) {
        throw "$Label must use http or https."
    }
}

function Test-NpmCommand {
    param([AllowNull()][string]$Command)

    return -not [string]::IsNullOrWhiteSpace($Command) -and
        $Command -match '(?i)(^|[\s&|])npm(?:\.cmd)?(?=\s|$)'
}

function Test-PathInsideProject {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$ProjectRoot
    )

    $normalizedPath = [IO.Path]::GetFullPath($Path).TrimEnd('\', '/')
    $normalizedRoot = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\', '/')
    $rootPrefix = $normalizedRoot + [IO.Path]::DirectorySeparatorChar

    return $normalizedPath.Equals($normalizedRoot, [StringComparison]::OrdinalIgnoreCase) -or
        $normalizedPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)
}

function Get-ProjectRuntimeConfiguration {
    param([Parameter(Mandatory = $true)][string]$ScriptDirectory)

    $projectRoot = [IO.Path]::GetFullPath((Join-Path $ScriptDirectory '..')).TrimEnd('\', '/')
    $configurationPath = Join-Path $projectRoot 'project-start.json'

    if (-not (Test-Path -LiteralPath $configurationPath -PathType Leaf)) {
        throw "Missing launcher configuration: $configurationPath"
    }

    try {
        $configuration = Get-Content -LiteralPath $configurationPath -Raw -Encoding UTF8 |
            ConvertFrom-Json
    }
    catch {
        throw "project-start.json is not valid JSON: $($_.Exception.Message)"
    }

    $versionProperty = $configuration.PSObject.Properties['version']
    if ($null -eq $versionProperty -or ([string]$versionProperty.Value) -ne '1') {
        throw 'project-start.json must use launcher version 1.'
    }

    $browserUrl = Get-TextProperty -Object $configuration -Name 'browserUrl' -Required
    Assert-HttpUrl -Value $browserUrl -Label 'browserUrl'

    $timeoutSeconds = 60
    $timeoutProperty = $configuration.PSObject.Properties['startupTimeoutSeconds']
    if ($null -ne $timeoutProperty) {
        $parsedTimeout = 0
        if (-not [int]::TryParse(([string]$timeoutProperty.Value), [ref]$parsedTimeout) -or
            $parsedTimeout -lt 5 -or $parsedTimeout -gt 600) {
            throw 'startupTimeoutSeconds must be an integer from 5 through 600.'
        }

        $timeoutSeconds = $parsedTimeout
    }

    $servicesProperty = $configuration.PSObject.Properties['services']
    if ($null -eq $servicesProperty -or -not ($servicesProperty.Value -is [System.Array])) {
        throw "Configuration property 'services' must be a JSON array."
    }

    $serviceDefinitions = @($servicesProperty.Value)
    if ($serviceDefinitions.Count -eq 0) {
        throw 'At least one service must be configured.'
    }

    $services = @()
    foreach ($definition in $serviceDefinitions) {
        $name = Get-TextProperty -Object $definition -Name 'name' -Required
        if ($name.Length -gt 60 -or $name -match '[&|<>^]') {
            throw "Service name '$name' contains unsupported characters or is too long."
        }

        $directory = Get-TextProperty -Object $definition -Name 'directory' -Required
        $startCommand = Get-TextProperty -Object $definition -Name 'startCommand' -Required
        $installCommand = Get-TextProperty -Object $definition -Name 'installCommand'
        $readyUrl = Get-TextProperty -Object $definition -Name 'readyUrl'
        $servicePath = [IO.Path]::GetFullPath((Join-Path $projectRoot $directory))

        if (-not (Test-PathInsideProject -Path $servicePath -ProjectRoot $projectRoot)) {
            throw "Service '$name' points outside the project directory."
        }

        if (-not (Test-Path -LiteralPath $servicePath -PathType Container)) {
            throw "Service directory does not exist for '$name': $servicePath"
        }

        if ($null -ne $readyUrl) {
            Assert-HttpUrl -Value $readyUrl -Label "readyUrl for '$name'"
        }

        $logName = ($name.ToLowerInvariant() -replace '[^a-z0-9_-]+', '-') -replace '^-|-$', ''
        if ([string]::IsNullOrWhiteSpace($logName)) {
            throw "Service name '$name' cannot be converted to a safe log directory name."
        }

        $services += [PSCustomObject]@{
            Name = $name
            Path = $servicePath
            StartCommand = $startCommand
            InstallCommand = $installCommand
            ReadyUrl = $readyUrl
            LogName = $logName
        }
    }

    $usesNpm = $false
    foreach ($service in $services) {
        if ((Test-NpmCommand -Command $service.StartCommand) -or
            (Test-NpmCommand -Command $service.InstallCommand)) {
            $usesNpm = $true
            break
        }
    }

    if ($usesNpm) {
        if ($null -eq (Get-Command -Name 'node.exe' -CommandType Application -ErrorAction SilentlyContinue)) {
            throw 'Node.js is required by the configured npm commands but was not found.'
        }

        if ($null -eq (Get-Command -Name 'npm.cmd' -CommandType Application -ErrorAction SilentlyContinue)) {
            throw 'npm.cmd is required by the configured services but was not found.'
        }
    }

    $logsRoot = Join-Path $projectRoot 'logs'
    return [PSCustomObject]@{
        ProjectRoot = $projectRoot
        BrowserUrl = $browserUrl
        TimeoutSeconds = $timeoutSeconds
        Services = $services
        LogsRoot = $logsRoot
        RuntimeDirectory = Join-Path $logsRoot 'runtime'
        StatePath = Join-Path (Join-Path $logsRoot 'runtime') 'state.json'
    }
}

function Test-ServiceReady {
    param([AllowNull()][string]$ReadyUrl)

    if ([string]::IsNullOrWhiteSpace($ReadyUrl)) {
        return $true
    }

    try {
        $response = Invoke-WebRequest `
            -Uri $ReadyUrl `
            -UseBasicParsing `
            -Proxy $null `
            -TimeoutSec 2
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
    }
    catch {
        return $false
    }
}

function Read-ProjectRuntimeState {
    param([Parameter(Mandatory = $true)][object]$Runtime)

    if (-not (Test-Path -LiteralPath $Runtime.StatePath -PathType Leaf)) {
        return $null
    }

    try {
        $state = Get-Content -LiteralPath $Runtime.StatePath -Raw -Encoding UTF8 | ConvertFrom-Json
    }
    catch {
        throw "Runtime state is invalid JSON. No processes were changed. Inspect: $($Runtime.StatePath)"
    }

    if ($null -eq $state.PSObject.Properties['version'] -or
        ([string]$state.version) -ne ([string]$script:RuntimeStateVersion)) {
        throw "Runtime state uses an unsupported version. No processes were changed: $($Runtime.StatePath)"
    }

    $stateRoot = Get-TextProperty -Object $state -Name 'projectRoot' -Required
    if (-not $stateRoot.Equals($Runtime.ProjectRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Runtime state belongs to another project. No processes were changed: $($Runtime.StatePath)"
    }

    if ($null -eq $state.PSObject.Properties['services'] -or
        -not ($state.services -is [System.Array])) {
        throw "Runtime state has an invalid services list. No processes were changed: $($Runtime.StatePath)"
    }

    return $state
}

function Write-ProjectRuntimeState {
    param(
        [Parameter(Mandatory = $true)][object]$Runtime,
        [Parameter(Mandatory = $true)][object[]]$Services,
        [AllowNull()][string]$LaunchedAtUtc
    )

    New-Item -ItemType Directory -Path $Runtime.RuntimeDirectory -Force | Out-Null
    $timestamp = if ([string]::IsNullOrWhiteSpace($LaunchedAtUtc)) {
        [DateTime]::UtcNow.ToString('o')
    }
    else {
        $LaunchedAtUtc
    }

    $state = [ordered]@{
        version = $script:RuntimeStateVersion
        projectRoot = $Runtime.ProjectRoot
        launchedAtUtc = $timestamp
        services = @($Services)
    }

    $temporaryPath = Join-Path $Runtime.RuntimeDirectory ("state-{0}.tmp" -f [Guid]::NewGuid())
    try {
        $json = $state | ConvertTo-Json -Depth 8
        [IO.File]::WriteAllText($temporaryPath, $json, [Text.UTF8Encoding]::new($false))
        Move-Item -LiteralPath $temporaryPath -Destination $Runtime.StatePath -Force
    }
    finally {
        if (Test-Path -LiteralPath $temporaryPath -PathType Leaf) {
            Remove-Item -LiteralPath $temporaryPath -Force
        }
    }
}

function Remove-ProjectRuntimeState {
    param([Parameter(Mandatory = $true)][object]$Runtime)

    if (Test-Path -LiteralPath $Runtime.StatePath -PathType Leaf) {
        Remove-Item -LiteralPath $Runtime.StatePath -Force
    }
}

function Get-RecordedProcessStatus {
    param(
        [Parameter(Mandatory = $true)][object]$Record,
        [Parameter(Mandatory = $true)][object]$Runtime
    )

    $servicePath = Get-TextProperty -Object $Record -Name 'path' -Required
    if (-not (Test-PathInsideProject -Path $servicePath -ProjectRoot $Runtime.ProjectRoot)) {
        return [PSCustomObject]@{ Status = 'stale'; Process = $null; Reason = 'recorded path is outside this project' }
    }

    $processId = 0
    if ($null -eq $Record.PSObject.Properties['processId'] -or
        -not [int]::TryParse(([string]$Record.processId), [ref]$processId) -or
        $processId -le 0) {
        return [PSCustomObject]@{ Status = 'stale'; Process = $null; Reason = 'recorded PID is invalid' }
    }

    $recordedStart = [DateTime]::MinValue
    if ($null -eq $Record.PSObject.Properties['processStartTimeUtc'] -or
        -not [DateTime]::TryParse(
            ([string]$Record.processStartTimeUtc),
            [Globalization.CultureInfo]::InvariantCulture,
            [Globalization.DateTimeStyles]::RoundtripKind,
            [ref]$recordedStart
        )) {
        return [PSCustomObject]@{ Status = 'stale'; Process = $null; Reason = 'recorded process start time is invalid' }
    }

    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        return [PSCustomObject]@{ Status = 'stopped'; Process = $null; Reason = 'recorded process is not running' }
    }

    try {
        $actualStart = $process.StartTime.ToUniversalTime()
    }
    catch {
        return [PSCustomObject]@{ Status = 'stale'; Process = $null; Reason = 'process start time cannot be verified' }
    }

    $difference = [Math]::Abs(($actualStart - $recordedStart.ToUniversalTime()).TotalSeconds)
    if ($difference -gt $script:ProcessStartToleranceSeconds) {
        return [PSCustomObject]@{ Status = 'stale'; Process = $null; Reason = 'PID was reused by another process' }
    }

    return [PSCustomObject]@{ Status = 'running'; Process = $process; Reason = 'recorded process is running' }
}

function Get-ServiceRuntimeStatus {
    param(
        [Parameter(Mandatory = $true)][object]$Record,
        [Parameter(Mandatory = $true)][object]$Runtime
    )

    $processStatus = Get-RecordedProcessStatus -Record $Record -Runtime $Runtime
    if ($processStatus.Status -ne 'running') {
        return $processStatus
    }

    $readyUrl = Get-TextProperty -Object $Record -Name 'readyUrl'
    if (Test-ServiceReady -ReadyUrl $readyUrl) {
        return [PSCustomObject]@{
            Status = 'ready'
            Process = $processStatus.Process
            Reason = 'process is running and its readiness endpoint is available'
        }
    }

    return [PSCustomObject]@{
        Status = 'running-not-ready'
        Process = $processStatus.Process
        Reason = 'process is running but its readiness endpoint is unavailable'
    }
}

function New-ServiceLogPaths {
    param(
        [Parameter(Mandatory = $true)][object]$Runtime,
        [Parameter(Mandatory = $true)][object]$Service,
        [Parameter(Mandatory = $true)][string]$Timestamp
    )

    $serviceLogDirectory = Join-Path $Runtime.LogsRoot $Service.LogName
    New-Item -ItemType Directory -Path $serviceLogDirectory -Force | Out-Null

    return [PSCustomObject]@{
        StandardOutput = Join-Path $serviceLogDirectory "$Timestamp.out.log"
        StandardError = Join-Path $serviceLogDirectory "$Timestamp.err.log"
    }
}

function Start-ProjectServiceProcess {
    param(
        [Parameter(Mandatory = $true)][object]$Runtime,
        [Parameter(Mandatory = $true)][object]$Service,
        [Parameter(Mandatory = $true)][string]$Timestamp
    )

    $logs = New-ServiceLogPaths -Runtime $Runtime -Service $Service -Timestamp $Timestamp
    $commandArgument = '"' + $Service.StartCommand + '"'
    $process = Start-Process `
        -FilePath $env:ComSpec `
        -ArgumentList @('/d', '/s', '/c', $commandArgument) `
        -WorkingDirectory $Service.Path `
        -WindowStyle Hidden `
        -RedirectStandardOutput $logs.StandardOutput `
        -RedirectStandardError $logs.StandardError `
        -PassThru

    $process.Refresh()
    return [PSCustomObject][ordered]@{
        name = $Service.Name
        processId = $process.Id
        processStartTimeUtc = $process.StartTime.ToUniversalTime().ToString('o')
        path = $Service.Path
        readyUrl = $Service.ReadyUrl
        standardOutputLog = $logs.StandardOutput
        standardErrorLog = $logs.StandardError
    }
}

function Stop-VerifiedServiceProcess {
    param(
        [Parameter(Mandatory = $true)][object]$Record,
        [Parameter(Mandatory = $true)][object]$Runtime
    )

    $status = Get-RecordedProcessStatus -Record $Record -Runtime $Runtime
    if ($status.Status -eq 'stopped') {
        return [PSCustomObject]@{ Stopped = $true; Changed = $false; Message = 'process was already stopped' }
    }

    if ($status.Status -ne 'running') {
        return [PSCustomObject]@{ Stopped = $false; Changed = $false; Message = $status.Reason }
    }

    $taskKill = Join-Path $env:SystemRoot 'System32\taskkill.exe'
    $result = Start-Process `
        -FilePath $taskKill `
        -ArgumentList @('/PID', ([string]$status.Process.Id), '/T', '/F') `
        -WindowStyle Hidden `
        -Wait `
        -PassThru

    if ($result.ExitCode -ne 0) {
        return [PSCustomObject]@{
            Stopped = $false
            Changed = $false
            Message = "taskkill exited with code $($result.ExitCode)"
        }
    }

    $deadline = [DateTime]::UtcNow.AddSeconds(8)
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($null -eq (Get-Process -Id $status.Process.Id -ErrorAction SilentlyContinue)) {
            return [PSCustomObject]@{ Stopped = $true; Changed = $true; Message = 'process tree stopped' }
        }
        Start-Sleep -Milliseconds 200
    }

    return [PSCustomObject]@{ Stopped = $false; Changed = $true; Message = 'process did not exit in time' }
}
