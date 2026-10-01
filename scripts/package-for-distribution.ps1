<#
  package-for-distribution.ps1
  Dong goi du an GiveAID v2.0 thanh file .zip de gui cho tester.

  Output: Desktop\GiveAID-v2.0-yyyyMMdd-HHmm.zip

  Excluded:
    .git, node_modules, bin/, obj/, .vs/, TestResults/,
    playwright-report/, test-results/, *.log, *.err, *.pid, iis_*.txt
#>

$ErrorActionPreference = 'Stop'

$root     = $PSScriptRoot
$desktop  = [Environment]::GetFolderPath('Desktop')
$ts       = Get-Date -Format 'yyyyMMdd-HHmm'
$zipPath  = Join-Path $desktop "GiveAID-v2.0-$ts.zip"
$staging  = Join-Path $env:TEMP "GiveAID-package-$ts"

if (-not (Test-Path $root)) {
    Write-Host "[ERROR] Khong tim thay thu muc goc: $root" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  GiveAID v2.0 - Distribution packager" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Source : $root"
Write-Host "Output : $zipPath"
Write-Host ""

# ── Reset staging dir ──────────────────────────────────────────
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

# ── Define exclusion regex (matched against full path) ────────
$excludePatterns = @(
    '[\\/]\.git[\\/]',
    '[\\/]node_modules[\\/]',
    '[\\/]bin[\\/]',
    '[\\/]obj[\\/]',
    '[\\/]\.vs[\\/]',
    '[\\/]TestResults[\\/]',
    '[\\/]playwright-report[\\/]',
    '[\\/]test-results[\\/]',
    '\\backend\.log$',
    '\\backend\.out\.log$',
    '\\backend\.err$',
    '\\frontend\.log$',
    '\\frontend\.out\.log$',
    '\\pre-start\.log$',
    '\\admin\.log$',
    '\\admin\.out\.log$',
    '\\iis_(out|err)\.txt$',
    '\.pid$'
)
$excludeRegex = ($excludePatterns -join '|')

Write-Host "[1/4] Dang copy source code..." -ForegroundColor Yellow
$copied = 0
$skipped = 0
Get-ChildItem -Path $root -Recurse -File -Force | ForEach-Object {
    $relPath = $_.FullName.Substring($root.Length).TrimStart('\','/')
    # Skip if matches any exclusion pattern
    if ($relPath -match $excludeRegex) {
        $skipped++
        return
    }
    $dest = Join-Path $staging $relPath
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item -Path $_.FullName -Destination $dest -Force
    $copied++
}
Write-Host "       Copied: $copied file(s), skipped: $skipped" -ForegroundColor Gray
Write-Host ""

# ── Verify critical files exist ───────────────────────────────
$must = @(
    'START.bat',
    'STOP.bat',
    'HUONG_DAN.txt',
    'GiveAID.Client\package.json',
    'GiveAID.Client\scripts\start-backend.ps1',
    'src\WebApi\GiveAID.V2.WebApi.csproj',
    'src\WebApi\appsettings.Development.json'
)
$missing = $must | Where-Object { -not (Test-Path (Join-Path $staging $_)) }
if ($missing) {
    Write-Host "[ERROR] Thieu file trong staging:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Remove-Item $staging -Recurse -Force
    exit 1
}
Write-Host "[2/4] Kiem tra file quan trong: OK" -ForegroundColor Green
Write-Host ""

# ── Zip ───────────────────────────────────────────────────────
Write-Host "[3/4] Dang nen zip (mat 1-3 phut)..." -ForegroundColor Yellow
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $staging,
    $zipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false  # includeBaseDirectory = false → no top-level folder in zip
)

# ── Cleanup ───────────────────────────────────────────────────
Write-Host "[4/4] Don dep staging dir..." -ForegroundColor Yellow
Remove-Item $staging -Recurse -Force

$zipSize = (Get-Item $zipPath).Length
$zipMb   = [math]::Round($zipSize / 1MB, 1)
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  XONG!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  File: $zipPath" -ForegroundColor White
Write-Host "  Size: $zipMb MB" -ForegroundColor White
Write-Host ""
Write-Host "  Gui file nay cho tester (qua Zalo, Drive, USB, ...)." -ForegroundColor Cyan
Write-Host "  Tester giai nen -> double-click START.bat -> xong." -ForegroundColor Cyan
Write-Host ""
