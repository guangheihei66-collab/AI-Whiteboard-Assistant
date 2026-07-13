[CmdletBinding()]
param(
    [switch]$ValidateOnly,
    [switch]$NoBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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

try {
    $scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
    $projectRoot = [IO.Path]::GetFullPath((Join-Path $scriptDirectory '..')).TrimEnd('\', '/')
    $projectRootPrefix = $projectRoot + [IO.Path]::DirectorySeparatorChar
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
    if ($null -eq $servicesProperty) {
        throw "Missing required configuration property 'services'."
    }

    if (-not ($servicesProperty.Value -is [System.Array])) {
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
        $isProjectRoot = $servicePath.Equals($projectRoot, [StringComparison]::OrdinalIgnoreCase)
        $isInsideProject = $servicePath.StartsWith(
            $projectRootPrefix,
            [StringComparison]::OrdinalIgnoreCase
        )

        if (-not $isProjectRoot -and -not $isInsideProject) {
            throw "Service '$name' points outside the project directory."
        }

        if (-not (Test-Path -LiteralPath $servicePath -PathType Container)) {
            throw "Service directory does not exist for '$name': $servicePath"
        }

        if ($null -ne $readyUrl) {
            Assert-HttpUrl -Value $readyUrl -Label "readyUrl for '$name'"
        }

        $services += [PSCustomObject]@{
            Name = $name
            Path = $servicePath
            StartCommand = $startCommand
            InstallCommand = $installCommand
            ReadyUrl = $readyUrl
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

    Write-LauncherInfo "Configuration is valid for $($services.Count) service(s)."
    foreach ($service in $services) {
        Write-Host "  - $($service.Name): $($service.Path)"
    }

    if ($ValidateOnly) {
        Write-LauncherInfo 'Validation completed. No dependencies or services were started.'
        exit 0
    }

    foreach ($service in $services) {
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

    $projectName = Split-Path -Leaf $projectRoot
    foreach ($service in $services) {
        $windowTitle = "$projectName - $($service.Name)" -replace '[&|<>^]', '-'
        $commandLine = "title $windowTitle && $($service.StartCommand)"

        Write-LauncherInfo "Starting $($service.Name)..."
        try {
            Start-Process -FilePath $env:ComSpec `
                -ArgumentList @('/d', '/k', $commandLine) `
                -WorkingDirectory $service.Path | Out-Null
        }
        catch {
            throw "Could not open the '$($service.Name)' service window: $($_.Exception.Message)"
        }
    }

    $pendingServices = @($services | Where-Object { $null -ne $_.ReadyUrl })
    $deadline = [DateTime]::UtcNow.AddSeconds($timeoutSeconds)

    while ($pendingServices.Count -gt 0 -and [DateTime]::UtcNow -lt $deadline) {
        $stillPending = @()
        foreach ($service in $pendingServices) {
            try {
                $response = Invoke-WebRequest `
                    -Uri $service.ReadyUrl `
                    -UseBasicParsing `
                    -Proxy $null `
                    -TimeoutSec 2
                if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                    Write-LauncherInfo "$($service.Name) is ready: $($service.ReadyUrl)"
                }
                else {
                    $stillPending += $service
                }
            }
            catch {
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
        throw "Startup timed out while waiting for: $pendingNames. Service windows remain open for diagnostics."
    }

    if (-not $NoBrowser) {
        Write-LauncherInfo "Opening $browserUrl"
        Start-Process -FilePath $browserUrl | Out-Null
    }

    Write-LauncherInfo 'Project started successfully. Close a service window or press Ctrl+C in it to stop that service.'
    exit 0
}
catch {
    Write-Host "[Launcher] ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
