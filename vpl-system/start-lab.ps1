<#
.SYNOPSIS
    AMC VPL System - Lab Server Startup Script (PowerShell)
.DESCRIPTION
    Starts the VPL system for lab use. Detects LAN IP, checks prerequisites,
    optionally configures firewall, and launches the production server.
    Accessible from all lab PCs via browser.
#>

$ErrorActionPreference = "Stop"

# ─── Colors ───
$C = @{
    Green  = [ConsoleColor]::Green
    Yellow = [ConsoleColor]::Yellow
    Red    = [ConsoleColor]::Red
    Cyan   = [ConsoleColor]::Cyan
    White  = [ConsoleColor]::White
    Gray   = [ConsoleColor]::DarkGray
}

function Write-Header {
    Clear-Host
    Write-Host @"

  ╔══════════════════════════════════════════════════════╗
  ║       AMC Virtual Programming Lab - Server           ║
  ╚══════════════════════════════════════════════════════╝

"@ -ForegroundColor $C.Cyan
}

function Write-Step([int]$Num, [int]$Total, [string]$Label) {
    Write-Host " [$Num/$Total]" -ForegroundColor $C.Cyan -NoNewline
    Write-Host " $Label" -ForegroundColor $C.White
}

function Write-OK([string]$Msg) {
    Write-Host "   [OK]" -ForegroundColor $C.Green -NoNewline
    Write-Host " $Msg" -ForegroundColor $C.Gray
}

function Write-Warn([string]$Msg) {
    Write-Host "   [WARN]" -ForegroundColor $C.Yellow -NoNewline
    Write-Host " $Msg" -ForegroundColor $C.Gray
}

function Write-Error([string]$Msg) {
    Write-Host "   [ERROR]" -ForegroundColor $C.Red -NoNewline
    Write-Host " $Msg" -ForegroundColor $C.Gray
}

# ───────────────────────────────────────
#  MAIN
# ───────────────────────────────────────
$TOTAL_STEPS = 7

Write-Header

# ── Step 1: Check Node.js ──
Write-Step 1 $TOTAL_STEPS "Checking prerequisites..."

$node = Get-Command "node" -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error "Node.js is not installed. Download from https://nodejs.org"
    Read-Host "`nPress Enter to exit"
    exit 1
}
$nodeVer = & node -v
Write-OK "Node.js $nodeVer"

$npm = Get-Command "npm" -ErrorAction SilentlyContinue
if (-not $npm) {
    Write-Error "npm is not installed."
    Read-Host "`nPress Enter to exit"
    exit 1
}
Write-OK "npm found"

# ── Step 2: Detect LAN IP ──
Write-Step 2 $TOTAL_STEPS "Detecting network configuration..."

$lanIP = $null
$interfaces = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -like "192.168.*" -or
    $_.IPAddress -like "10.*" -or
    ($_.IPAddress -like "172.*" -and [int]($_.IPAddress -split "\.")[1] -ge 16 -and [int]($_.IPAddress -split "\.")[1] -le 31)
}

$detectedIPs = @()
foreach ($iface in $interfaces) {
    $detectedIPs += $iface.IPAddress
    Write-Host "       http://$($iface.IPAddress):3000" -ForegroundColor $C.Cyan
}

if ($detectedIPs.Count -gt 0) {
    $lanIP = $detectedIPs[0]
    Write-Host ""
    Write-OK "Primary LAN IP: $lanIP"
} else {
    # Fallback: get any IPv4 address
    $anyIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.PrefixOrigin -ne "WellKnown" -and $_.IPAddress -ne "127.0.0.1"
    } | Select-Object -First 1
    if ($anyIP) {
        $lanIP = $anyIP.IPAddress
        Write-Warn "Using IP: $lanIP (not a private range, may not work on LAN)"
    } else {
        $lanIP = "YOUR_SERVER_IP"
        Write-Warn "Could not auto-detect LAN IP"
    }
}

# ── Step 3: Check .env ──
Write-Step 3 $TOTAL_STEPS "Configuring environment variables..."

$envPath = Join-Path $PSScriptRoot ".env"
$envUpdated = $false

if (-not (Test-Path $envPath)) {
    Write-Warn ".env file not found. Creating with defaults..."
    $secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
    @"
DATABASE_URL=file:./dev.db
NEXTAUTH_SECRET=$secret
NEXTAUTH_URL=http://$lanIP`:3000
"@ | Out-File -FilePath $envPath -Encoding utf8
    Write-OK ".env created with NEXTAUTH_URL=http://$lanIP`:3000"
} else {
    $content = Get-Content $envPath -Raw
    if ($content -match 'NEXTAUTH_URL=http://localhost') {
        $content = $content -replace 'NEXTAUTH_URL=http://localhost:\d+', "NEXTAUTH_URL=http://$lanIP`:3000"
        $content | Out-File -FilePath $envPath -Encoding utf8
        Write-Warn "Updated NEXTAUTH_URL from localhost to http://$lanIP`:3000"
    } elseif ($content -notmatch 'NEXTAUTH_URL') {
        $content += "`nNEXTAUTH_URL=http://$lanIP`:3000`n"
        $content | Out-File -FilePath $envPath -Encoding utf8
        Write-Warn "Added NEXTAUTH_URL=http://$lanIP`:3000"
    } else {
        Write-OK ".env is configured"
    }
}

# ── Step 4: Firewall check ──
Write-Step 4 $TOTAL_STEPS "Checking Windows Firewall..."

$fwRule = Get-NetFirewallRule -DisplayName "VPL System Port 3000" -ErrorAction SilentlyContinue
if (-not $fwRule) {
    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if ($isAdmin) {
        Write-Warn "Creating firewall rule for port 3000..."
        try {
            New-NetFirewallRule -DisplayName "VPL System Port 3000" `
                -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow `
                -Description "Allow lab PCs to access the VPL system" | Out-Null
            Write-OK "Firewall rule created"
        } catch {
            Write-Warn "Could not create firewall rule: $_"
        }
    } else {
        Write-Warn "Firewall rule not found. Run as Administrator to auto-configure."
        Write-Warn "Or run setup-firewall.bat as Administrator manually."
    }
} else {
    Write-OK "Firewall rule exists"
}

# ── Step 5: Install dependencies ──
Write-Step 5 $TOTAL_STEPS "Checking dependencies..."
Set-Location $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    Write-Warn "Dependencies not found. Installing..."
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install failed."
        Read-Host "`nPress Enter to exit"
        exit 1
    }
    Write-OK "Dependencies installed"
} else {
    Write-OK "Dependencies found"
}

# Regenerate Prisma client
Write-Host "   Generating Prisma client..." -ForegroundColor $C.Gray
& npx prisma generate 2>&1 | Out-Null
& npx prisma migrate dev --name init 2>&1 | Out-Null

# ── Step 6: Build ──
Write-Step 6 $TOTAL_STEPS "Building project for production..."
Write-Host "   This may take a minute..." -ForegroundColor $C.Yellow

& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed. Check for errors above."
    Read-Host "`nPress Enter to exit"
    exit 1
}
Write-OK "Build complete"

# ── Step 7: Launch ──
Clear-Host
Write-Host @"

  ╔══════════════════════════════════════════════════════╗
  ║              Server is starting up...                 ║
  ╚══════════════════════════════════════════════════════╝

"@ -ForegroundColor $C.Green

Write-Host "  ┌─────────────────────────────────────────────────────┐" -ForegroundColor $C.Cyan
Write-Host "  │                                                     │" -ForegroundColor $C.Cyan
Write-Host "  │  Access the VPL System from any lab PC at:          │" -ForegroundColor $C.Cyan
Write-Host "  │                                                     │" -ForegroundColor $C.Cyan

foreach ($ip in $detectedIPs) {
    $url = "http://$ip`:3000"
    $padding = " " * ([math]::Max(0, 50 - $url.Length))
    Write-Host "  │     " -ForegroundColor $C.Cyan -NoNewline
    Write-Host "$url$padding" -ForegroundColor $C.White -NoNewline
    Write-Host "│" -ForegroundColor $C.Cyan
}

Write-Host "  │                                                     │" -ForegroundColor $C.Cyan
Write-Host "  │  Or on THIS machine:                                 │" -ForegroundColor $C.Cyan
Write-Host "  │                                                     │" -ForegroundColor $C.Cyan
Write-Host "  │     " -ForegroundColor $C.Cyan -NoNewline
Write-Host "http://localhost:3000                                " -ForegroundColor $C.White -NoNewline
Write-Host "│" -ForegroundColor $C.Cyan
Write-Host "  │                                                     │" -ForegroundColor $C.Cyan
Write-Host "  └─────────────────────────────────────────────────────┘" -ForegroundColor $C.Cyan

Write-Host @"

  Press Ctrl+C to stop the server when done.
  Close this window to shut down.

"@ -ForegroundColor $C.Yellow

# Override NEXTAUTH_URL for this session
$env:NEXTAUTH_URL = "http://$lanIP`:3000"

# Start production server
& npm start
