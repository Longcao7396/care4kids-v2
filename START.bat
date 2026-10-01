@echo off
chcp 65001 >nul
title GiveAID v2.0 - Dev Server
color 0B

echo.
echo ============================================================
echo        GiveAID v2.0 - Backend + Frontend starter
echo ============================================================
echo.

REM ============================================================
REM Pre-flight: check tools
REM ============================================================

where dotnet >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Chua cai .NET SDK 10. Cai tai:
    echo         https://dotnet.microsoft.com/download/dotnet/10.0
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Chua cai Node.js 18+. Cai tai:
    echo         https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Chua cai npm. Cai tai:
    echo         https://nodejs.org/
    pause
    exit /b 1
)

REM ============================================================
REM Check SQL Server LocalDB (REQUIRED, NOT bundled with .NET SDK)
REM ============================================================

where sqllocaldb >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Chua cai SQL Server LocalDB. LocalDB KHONG tu dong di kem .NET SDK.
    echo         Cai mot trong cac cach sau:
    echo         [1] Tai SQL Server Express va tick chon LocalDB:
    echo             https://www.microsoft.com/sql-server/sql-server-downloads
    echo         [2] Neu co Visual Studio: Visual Studio Installer, Modify,
    echo             Individual components, tick "SQL Server Express LocalDB".
    echo         Sau khi cai, mo terminal moi va chay lai START.bat.
    pause
    exit /b 1
)

echo [OK] Da co .NET SDK, Node.js, npm, SQL Server LocalDB.
echo.

REM ============================================================
REM Set dev-only secrets (DO NOT use in production!)
REM Required by SeedData: ADMIN_PASSWORD (min 8 chars), DEMO_PASSWORD
REM Jwt__Secret is now in appsettings.Development.json (64-char random secret)
REM ============================================================

set "ADMIN_PASSWORD=DevAdmin@123"
set "DEMO_PASSWORD=Demo@123"
set "ASPNETCORE_ENVIRONMENT=Development"

REM ============================================================
REM Step 1: install frontend deps (first time only)
REM ============================================================

if not exist "GiveAID.Client\node_modules" (
    echo [STEP 1/2] Dang cai dat React dependencies lan dau, mat 2-5 phut...
    cd GiveAID.Client
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install that bai. Kiem tra internet va thu lai.
        pause
        exit /b 1
    )
    cd ..
) else (
    echo [STEP 1/2] React dependencies da san, bo qua.
)
echo.

REM ============================================================
REM Step 2: open browser after 25s
REM ============================================================

echo [STEP 2/2] Dang khoi dong backend + frontend...
echo.
echo    Backend  -^> http://localhost:5231
echo    Frontend -^> http://localhost:3000
echo.
echo    Sau ~20 giay, trinh duyet se tu mo trang web.
echo    Nhan Ctrl+C bat ky luc nao de dung server.
echo.
echo ============================================================
echo.

REM Launch browser in background after a 25-second delay (frontend compile time).
REM PowerShell with Start-Sleep is more reliable than CMD `timeout` here, and
REM avoids CMD's "filename, directory name, or volume label syntax is incorrect"
REM warning that an empty `start /min ""` title used to trigger.
start "Browser Launcher" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 25; Start-Process 'http://localhost:3000'"

REM Start the dev stack (this blocks; Ctrl+C stops everything)
cd /d "%~dp0GiveAID.Client"
if errorlevel 1 (
    echo [ERROR] Khong tim thay GiveAID.Client. Hay giai nen day du project.
    pause
    exit /b 1
)
call npm start