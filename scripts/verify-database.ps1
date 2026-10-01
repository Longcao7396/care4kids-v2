# =============================================================================
# verify-database.ps1 - Single-source-of-truth health check for GiveAID DB.
#
# What it does:
#   1. Detects which SQL Server instance the app will actually hit
#      (reads src/WebApi/appsettings.Development.json - the project's
#      canonical source of truth - and lets you override on the CLI).
#   2. Pings the server, opens a real SqlClient connection.
#   3. Confirms GiveAIDDB exists.
#   4. Counts rows in key tables (users, campaigns, donations, causes, faqs).
#   5. Prints a clean report - green for OK, red for FAIL, with hints.
#   6. Exits 0 when the database is reachable and populated, non-zero otherwise
#      (so it can be wired into CI).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File verify-database.ps1
#   powershell -ExecutionPolicy Bypass -File verify-database.ps1 -Server ".\SQLEXPRESS"
#   powershell -ExecutionPolicy Bypass -File verify-database.ps1 -SkipJsonRead
#   powershell -ExecutionPolicy Bypass -File verify-database.ps1 -Quiet    # only errors
# =============================================================================

[CmdletBinding()]
param(
    # Default to (localdb)\MSSQLLocalDB - the project's single source of truth.
    # Override only if you've intentionally switched to .\SQLEXPRESS or a named instance.
    [string]$Server = '(localdb)\MSSQLLocalDB',

    [string]$Database = 'GiveAIDDB',

    # Path to appsettings.Development.json.  If found, its DefaultConnection
    # is used and overrides -Server.  This is the recommended mode.
    # We try a few common locations (script dir, cwd, repo root) since
    # $PSScriptRoot may be empty when the script is invoked via -File.
    [string]$AppSettingsPath = '',

    [switch]$SkipJsonRead,

    [switch]$Quiet
)

# Resolve AppSettingsPath if not explicitly provided.
if ([string]::IsNullOrWhiteSpace($AppSettingsPath)) {
    $candidates = @(
        (Join-Path $PSScriptRoot 'src\WebApi\appsettings.Development.json'),
        (Join-Path (Get-Location).Path 'src\WebApi\appsettings.Development.json'),
        '.\src\WebApi\appsettings.Development.json'
    )
    foreach ($c in $candidates) {
        if ($c -and (Test-Path $c)) { $AppSettingsPath = $c; break }
    }
}

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Data

# ----------------------------- helpers ----------------------------------------
function Write-Section([string]$Text) {
    if ($Quiet) { return }
    Write-Host ''
    Write-Host ('=' * 76) -ForegroundColor Cyan
    Write-Host " $Text" -ForegroundColor Cyan
    Write-Host ('=' * 76) -ForegroundColor Cyan
}

function Write-Ok([string]$Text)   { if (-not $Quiet) { Write-Host "  [OK]   $Text" -ForegroundColor Green } }
function Write-Warn([string]$Text) { if (-not $Quiet) { Write-Host "  [WARN] $Text" -ForegroundColor Yellow } }
function Write-Err([string]$Text)  { Write-Host "  [FAIL] $Text" -ForegroundColor Red }
function Write-Info([string]$Text) { if (-not $Quiet) { Write-Host "  [..]   $Text" -ForegroundColor Gray } }

# --------------------- 1. resolve which server to use ------------------------
Write-Section '1. Resolving connection target'

# Try to read the canonical connection string from appsettings.Development.json.
# Note: appsettings.*.json in this repo contains // comments (ASP.NET Core tolerates them,
# but PowerShell's ConvertFrom-Json does not).  We therefore extract the
# DefaultConnection value with a regex first; if that fails we fall back to
# parsing the whole file with comments stripped.
if (-not $SkipJsonRead) {
    if (Test-Path $AppSettingsPath) {
        $resolved = $false
        try {
            $raw = Get-Content -LiteralPath $AppSettingsPath -Raw -ErrorAction Stop
            # Strip // line comments (ASP.NET Core style) before parsing.
            $stripped = ($raw -replace '(?m)^\s*//.*$', '') -replace '(?m)\s*//\s*$', ''
            $json = $stripped | ConvertFrom-Json -ErrorAction Stop
            if ($json.ConnectionStrings -and $json.ConnectionStrings.DefaultConnection) {
                $rawConn = [string]$json.ConnectionStrings.DefaultConnection
                # If the value already starts with "Server=" (typical for ASP.NET Core),
                # use it as-is.  Otherwise, prepend Server=.
                if ($rawConn -match '^Server=') {
                    $Server = $rawConn
                } else {
                    $Server = "Server=$rawConn"
                }
                Write-Ok "Read connection string from $AppSettingsPath"
                $resolved = $true
            } else {
                Write-Warn "No DefaultConnection in $AppSettingsPath - using CLI/server default."
            }
        } catch {
            Write-Warn "Could not parse $AppSettingsPath ($($_.Exception.Message)) - using default."
        }
    } else {
        Write-Warn "appsettings.Development.json not found at $AppSettingsPath - using default."
    }
}

# If we got a full connection string, extract the Server= token so the report
# prints a clean instance name instead of the whole string.
if ($Server -match 'Server=([^;]+);') {
    $resolvedInstance = $Matches[1]
} else {
    $resolvedInstance = $Server
}

Write-Info "Target instance : $resolvedInstance"
Write-Info "Database        : $Database"

# --------------------- 2. ping the server -----------------------------------
Write-Section '2. Connectivity test'

# If the value already looks like a full connection string (has Server=, plus
# other tokens), pass it through as-is.  Otherwise treat it as a bare server
# name and wrap it.
if ($Server -match 'Server=' -and $Server -match ';') {
    $fullConnStr = $Server
} else {
    $fullConnStr = "Server=$Server;Database=$Database;Integrated Security=True;TrustServerCertificate=True;Connect Timeout=15;Application Name=GiveAID.verify"
}

$conn = New-Object System.Data.SqlClient.SqlConnection $fullConnStr
$opened = $false
try {
    $conn.Open()
    $opened = $true
    Write-Ok "Connected to $resolvedInstance"
} catch {
    Write-Err "Could not connect to $resolvedInstance"
    Write-Host ''
    Write-Host '  Hints:' -ForegroundColor Yellow
    Write-Host '   * LocalDB? Make sure it is installed (ships with Visual Studio):' -ForegroundColor Yellow
    Write-Host '       sqllocaldb info MSSQLLocalDB' -ForegroundColor Gray
    Write-Host '       sqllocaldb start MSSQLLocalDB' -ForegroundColor Gray
    Write-Host '   * SQL Server Express? Enable TCP/IP + Named Pipes in:' -ForegroundColor Yellow
    Write-Host '       SQL Server Configuration Manager -> Protocols for SQLEXPRESS' -ForegroundColor Gray
    Write-Host '   * Override the server on the CLI:' -ForegroundColor Yellow
    Write-Host '       powershell -File verify-database.ps1 -Server ".\SQLEXPRESS"' -ForegroundColor Gray
    Write-Host ''
    if ($conn) { $conn.Dispose() }
    exit 2
}

if (-not $opened) { exit 2 }

# --------------------- 3. verify the database exists ------------------------
Write-Section '3. Database existence'

$dbExists = 0
try {
    $dbCheck = $conn.CreateCommand()
    $dbCheck.CommandText = "SELECT COUNT(*) FROM sys.databases WHERE name = @n"
    $dbCheck.Parameters.AddWithValue('@n', $Database) | Out-Null
    $dbExists = [int]$dbCheck.ExecuteScalar()
} catch {
    Write-Err "Could not query sys.databases: $($_.Exception.Message)"
    $conn.Close(); $conn.Dispose()
    exit 4
}

if ($dbExists -gt 0) {
    Write-Ok "Database '$Database' exists"

    try {
        $meta = $conn.CreateCommand()
        $meta.CommandText = "SELECT collation_name, recovery_model_desc FROM sys.databases WHERE name = @n"
        $meta.Parameters.AddWithValue('@n', $Database) | Out-Null
        $reader = $meta.ExecuteReader()
        if ($reader.Read()) {
            Write-Info ("Collation       : {0}" -f $reader.GetString(0))
            Write-Info ("Recovery model  : {0}" -f $reader.GetString(1))
        }
        $reader.Close()
    } catch {
        # best-effort; not fatal
    }
} else {
    Write-Err "Database '$Database' does NOT exist on $resolvedInstance"
    Write-Host ''
    Write-Host '  Create it by either:' -ForegroundColor Yellow
    Write-Host '   * Running the application once - EF Core auto-creates on first start' -ForegroundColor Gray
    Write-Host '   * Running the full schema script:' -ForegroundColor Gray
    Write-Host '       powershell -ExecutionPolicy Bypass -File database\99_Apply-All.ps1' -ForegroundColor Gray
    Write-Host ''
    $conn.Close(); $conn.Dispose()
    exit 3
}

# --------------------- 4. count rows in key tables -------------------------
Write-Section '4. Row counts (key tables)'

$tables = @('users', 'campaigns', 'donations', 'causes', 'faqs', 'organizations')
$totalRows = 0
$missingTables = @()
$emptyTables = @()

foreach ($t in $tables) {
    try {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT COUNT(*) FROM [dbo].[$t]"
        $n = [int]$cmd.ExecuteScalar()
        $totalRows += $n
        if ($n -gt 0) {
            Write-Ok ("{0,-16} {1,6} row(s)" -f $t, $n)
        } else {
            Write-Warn ("{0,-16} {1,6} row(s) - table is empty" -f $t, $n)
            $emptyTables += $t
        }
    } catch [System.Data.SqlClient.SqlException] {
        # table does not exist
        $missingTables += $t
        Write-Err ("{0,-16} MISSING (table does not exist)" -f $t)
    } catch {
        $missingTables += $t
        Write-Err ("{0,-16} ERROR: {1}" -f $t, $_.Exception.Message)
    }
}

# --------------------- 5. verdict -------------------------------------------
Write-Section '5. Summary'

Write-Info ("Instance        : {0}" -f $resolvedInstance)
Write-Info ("Database        : {0}" -f $Database)
Write-Info ("Tables checked  : {0}" -f $tables.Count)
Write-Info ("Total rows      : {0}" -f $totalRows)
if ($missingTables.Count -gt 0) { Write-Warn ("Missing tables : {0}" -f ($missingTables -join ', ')) }
if ($emptyTables.Count   -gt 0) { Write-Warn ("Empty tables   : {0}" -f ($emptyTables   -join ', ')) }

$conn.Close()
$conn.Dispose()

if ($missingTables.Count -gt 0) {
    Write-Host ''
    Write-Err 'Schema is incomplete - run the application once (auto-creates + migrates) or:'
    Write-Host '       powershell -ExecutionPolicy Bypass -File database\99_Apply-All.ps1' -ForegroundColor Yellow
    exit 5
}

if ($emptyTables.Count -gt 0) {
    Write-Host ''
    Write-Warn 'Some key tables are empty - the application will auto-seed on first start.'
    Write-Host '       Or seed manually:' -ForegroundColor Yellow
    Write-Host '       powershell -ExecutionPolicy Bypass -File database\99_Apply-All.ps1' -ForegroundColor Gray
    exit 6
}

Write-Host ''
Write-Ok 'Database is reachable, schema is in place, and key tables are populated.'
exit 0
