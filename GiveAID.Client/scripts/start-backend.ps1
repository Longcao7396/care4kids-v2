# start-backend.ps1 — Build & run GiveAID v2 WebApi on port 5231.
# Logs to scripts/backend.log, writes PID to scripts/backend.pid.
#
# Resolves the v2 repo root using two strategies, in order:
#   1. Walk up from this script's folder until we find GiveAID.V2.slnx
#      (works regardless of where the repo was cloned).
#   2. Fall back to scanning the current user's Desktop for common project
#      folder names ("project NGO.v2", "NGO.v2", etc.). This preserves the
#      legacy behaviour for users who keep the repo under their Desktop.

$ErrorActionPreference = 'Stop'

function Find-V2Root {
    # Strategy 1: walk up from scripts/ looking for the .slnx marker.
    $cursor = [System.IO.DirectoryInfo]::new($PSScriptRoot)
    for ($i = 0; $i -lt 8; $i++) {
        $slnx = Join-Path $cursor.FullName 'GiveAID.V2.slnx'
        if (Test-Path $slnx) { return $cursor.FullName }
        $parent = $cursor.Parent
        if (-not $parent) { break }
        $cursor = $parent
    }

    # Strategy 2: scan Desktop for legacy pattern names.
    $desktop = [Environment]::GetFolderPath('Desktop')
    if (-not $desktop) { return $null }
    $patterns = @(
        'project NGO.v2',
        'project NGO v2',
        'project-NGO.v2',
        'project-NGO',
        'NGO.v2',
        'NGO',
        'care4kids'
    )
    foreach ($pattern in $patterns) {
        $candidate = Join-Path $desktop $pattern
        if (-not (Test-Path $candidate)) { continue }
        if ((Test-Path (Join-Path $candidate 'GiveAID.V2.slnx')) -or
            (Test-Path (Join-Path $candidate 'src\WebApi\GiveAID.V2.WebApi.csproj'))) {
            return $candidate
        }
    }

    return $null
}

$v2Root = Find-V2Root
if (-not $v2Root) {
    Write-Host "[start-backend] ERROR: Could not locate the GiveAID v2 project root." -ForegroundColor Red
    Write-Host "[start-backend] Expected GiveAID.V2.slnx in this folder or a parent folder," -ForegroundColor Yellow
    Write-Host "[start-backend] OR a folder named one of: project NGO.v2, NGO.v2, care4kids, ..." -ForegroundColor Yellow
    Write-Host "[start-backend] sitting under $env:USERPROFILE\Desktop." -ForegroundColor Yellow
    Write-Host "[start-backend] Fix: clone the repo with GiveAID.Client/ as a sub-folder of the solution root." -ForegroundColor Yellow
    exit 1
}

$apiProject = Join-Path $v2Root 'src\WebApi\GiveAID.V2.WebApi.csproj'
$apiDll       = Join-Path $v2Root 'src\WebApi\bin\Debug\net10.0\GiveAID.V2.WebApi.dll'
$slnx         = Join-Path $v2Root 'GiveAID.V2.slnx'
$logFile      = Join-Path $PSScriptRoot 'backend.log'
$pidFile      = Join-Path $PSScriptRoot 'backend.pid'
$apiPort      = 5231

Write-Host "[start-backend] v2 root: $v2Root" -ForegroundColor Cyan

# --- Pre-flight: free API port ---
Write-Host "[start-backend] Checking port $apiPort..." -ForegroundColor Cyan
Get-NetTCPConnection -LocalPort $apiPort -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "[start-backend] Port $apiPort held by $($proc.ProcessName) (PID $($proc.Id)) - killing" -ForegroundColor Yellow
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1

# Kill previous backend from .pid
if (Test-Path $pidFile) {
    $oldPid = Get-Content $pidFile -ErrorAction SilentlyContinue
    if ($oldPid) {
        try {
            Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
            Write-Host "[start-backend] Killed previous backend (PID $oldPid)" -ForegroundColor Yellow
        } catch {}
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}

# --- Check dotnet ---
$dotnet = Get-Command dotnet -ErrorAction SilentlyContinue
if (-not $dotnet) {
    Write-Host "[start-backend] ERROR: dotnet CLI not found in PATH" -ForegroundColor Red
    Write-Host "[start-backend] Install .NET 8 SDK from https://dotnet.microsoft.com/download" -ForegroundColor Yellow
    exit 1
}

# --- Build if DLL missing or stale ---
$needsBuild = $false
if (-not (Test-Path $apiDll)) {
    $needsBuild = $true
} else {
    $csFiles = Get-ChildItem $v2Root -Recurse -Filter '*.cs' -ErrorAction SilentlyContinue |
               Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' }
    $dllTime = (Get-Item $apiDll).LastWriteTime
    foreach ($f in $csFiles) {
        if ($f.LastWriteTime -gt $dllTime) { $needsBuild = $true; break }
    }
}

if ($needsBuild) {
    Write-Host "[start-backend] Building GiveAID.V2.WebApi..." -ForegroundColor Cyan
    & dotnet build $apiProject -c Debug --nologo -v minimal 2>&1 | Tee-Object -FilePath $logFile -Append
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[start-backend] BUILD FAILED. Check $logFile" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[start-backend] DLL up-to-date, skipping build" -ForegroundColor Green
}

# Start WebApi ---
Write-Host "[start-backend] Starting WebApi on http://localhost:$apiPort..." -ForegroundColor Cyan

# Run dotnet directly with -NoNewWindow so the console output goes to this PowerShell
# and npm sees this process as running
$proc = Start-Process -FilePath "dotnet" `
    -ArgumentList "run --project `"$apiProject`" --no-build --urls http://localhost:$apiPort" `
    -WorkingDirectory $v2Root `
    -NoNewWindow `
    -PassThru

if ($proc) {
    Set-Content -Path $pidFile -Value $proc.Id
    Write-Host "[start-backend] WebApi started, PID $($proc.Id)" -ForegroundColor Green
    # Wait for the dotnet process to exit - this keeps npm's concurrently happy
    $proc.WaitForExit()
    Write-Host "[start-backend] WebApi stopped (PID $($proc.Id))" -ForegroundColor Yellow
} else {
    Write-Host "[start-backend] WARNING: Could not get process handle" -ForegroundColor Yellow
}
