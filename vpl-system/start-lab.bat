@echo off
setlocal enabledelayedexpansion

:: ============================================================
::  AMC VPL System - Lab Server Startup Script
:: ============================================================
::  This script starts the VPL system in production mode,
::  accessible from all lab PCs over the local network.
:: ============================================================

title AMC VPL Lab Server

:: ── Colors ──
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "CYAN=[96m"
set "WHITE=[97m"
set "BOLD=[1m"
set "RESET=[0m"

:: ── Header ──
cls
echo.
echo  %BOLD%╔══════════════════════════════════════════════════════╗%RESET%
echo  %BOLD%║       AMC Virtual Programming Lab - Server          ║%RESET%
echo  %BOLD%╚══════════════════════════════════════════════════════╝%RESET%
echo.

:: ── Step 1: Check Node.js ──  echo  %CYAN%[1/5]%RESET% Checking prerequisites...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  %RED%[ERROR] Node.js is not installed or not in PATH.%RESET%
    echo  Please install Node.js 20+ from https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%i in ('node -v') do set "NODE_VER=%%i"
echo  %GREEN%  [OK] Node.js %NODE_VER%%RESET%

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo  %RED%[ERROR] npm is not installed.%RESET%
    pause
    exit /b 1
)
echo  %GREEN%  [OK] npm found%RESET%

:: ── Step 2: Check .env and detect LAN IP ──
echo.
echo  %CYAN%[2/5]%RESET% Checking network configuration...

:: Get the .env NEXTAUTH_URL
set "ENV_URL=unknown"
if exist .env (
    for /f "tokens=2 delims==" %%a in ('findstr /B "NEXTAUTH_URL" .env 2^>nul') do set "ENV_URL=%%a"
)

:: Detect LAN IPs
echo  %YELLOW%  Detecting network interfaces...%RESET%
echo.
set "LAN_IP="
for /f "tokens=3 delims=: " %%i in ('netsh interface ip show addresses ^| findstr /C:"192.168" /C:"10." /C:"172."') do (
    if not defined LAN_IP set "LAN_IP=%%i"
    echo  %CYAN%       http://%%i:3000%RESET%
)

if not defined LAN_IP (
    for /f "tokens=3 delims=: " %%i in ('netsh interface ip show addresses ^| findstr "IP Address"') do (
        if not defined LAN_IP set "LAN_IP=%%i"
        echo  %CYAN%       http://%%i:3000%RESET%
    )
)

if not defined LAN_IP (
    set "LAN_IP=YOUR_SERVER_IP"
    echo  %YELLOW%       (could not auto-detect)%RESET%
)

echo.
if "%ENV_URL%"=="unknown" (
    echo  %YELLOW%  [WARN] .env file not found or NEXTAUTH_URL not set.%RESET%
    echo  %YELLOW%         Creating .env with detected IP...%RESET%
    (
        echo DATABASE_URL=file:./dev.db
        echo NEXTAUTH_SECRET=439c4b22eb41bbe6d744ae2a0cae82c45bca4f7a1e15a02c6b0eb26a32076603
        echo NEXTAUTH_URL=http://%LAN_IP%:3000
    ) > .env
) else (
    echo  %GREEN%  [OK] NEXTAUTH_URL configured as %ENV_URL%%RESET%
)

:: ── Step 3: Install dependencies if needed ──
echo.
echo  %CYAN%[3/5]%RESET% Checking dependencies...
if not exist "node_modules" (
    echo  %YELLOW%  Dependencies not found. Installing...%RESET%
    call npm install
    if !errorlevel! neq 0 (
        echo  %RED%  [ERROR] npm install failed.%RESET%
        pause
        exit /b 1
    )
    echo  %GREEN%  [OK] Dependencies installed%RESET%
) else (
    echo  %GREEN%  [OK] Dependencies found%RESET%
)

:: ── Step 4: Build the project ──
echo.
echo  %CYAN%[4/5]%RESET% Building project for production...
echo  %YELLOW%  This may take a minute...%RESET%

:: Regenerate Prisma client
npx prisma generate >nul 2>&1

:: Run database migrations if needed
npx prisma migrate dev --name init >nul 2>&1

:: Build
call npm run build
if %errorlevel% neq 0 (
    echo  %RED%  [ERROR] Build failed. Check for errors above.%RESET%
    pause
    exit /b 1
)
echo  %GREEN%  [OK] Build complete%RESET%

:: ── Step 5: Start server ──
cls
echo.
echo  %BOLD%%GREEN%╔══════════════════════════════════════════════════════╗%RESET%
echo  %BOLD%%GREEN%║             Server is starting up...                ║%RESET%
echo  %BOLD%%GREEN%╚══════════════════════════════════════════════════════╝%RESET%
echo.
echo  %CYAN%  ┌─────────────────────────────────────────────────────┐%RESET%
echo  %CYAN%  │                                                     │%RESET%
echo  %CYAN%  │  Access the VPL System from any lab PC at:          │%RESET%
echo  %CYAN%  │                                                     │%RESET%
echo  %BOLD%%WHITE%  │      http://%LAN_IP%:3000%RESET%                 
echo  %CYAN%  │                                                     │%RESET%
echo  %CYAN%  │  Or on THIS machine:                                 │%RESET%
echo  %CYAN%  │                                                     │%RESET%
echo  %BOLD%%WHITE%  │      http://localhost:3000%RESET%                        
echo  %CYAN%  │                                                     │%RESET%
echo  %CYAN%  └─────────────────────────────────────────────────────┘%RESET%
echo.
echo  %YELLOW%  Press Ctrl+C to stop the server when done.%RESET%
echo  %YELLOW%  Close this window to shut down.%RESET%
echo.

:: Override NEXTAUTH_URL for this session
set NEXTAUTH_URL=http://%LAN_IP%:3000

:: Start the production server
call npm start

:: ── Cleanup ──
echo.
echo  %RED%Server stopped.%RESET%
echo.
pause
