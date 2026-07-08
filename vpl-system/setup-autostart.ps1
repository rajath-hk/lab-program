<#
.SYNOPSIS
    AMC VPL System - Auto-Start Setup Script
.DESCRIPTION
    Creates a Windows Scheduled Task that starts the VPL server
    automatically when the PC boots, even before anyone logs in.
    The server will also auto-restart if it crashes.

    Run this script AS ADMINISTRATOR (right-click → Run as PowerShell).
.NOTES
    To remove the auto-start later, run:
    Unregister-ScheduledTask -TaskName "AMC VPL Lab Server" -Confirm:$false
#>

$ErrorActionPreference = "Stop"

# ─── Configuration ───
$TaskName = "AMC VPL Lab Server"
$TaskDescription = "Auto-starts the AMC Virtual Programming Lab server at system boot"
$ProjectPath = "C:\Users\rajat\OneDrive\Documents\GitHub\lab-program\vpl-system"
$NodePath = "C:\Program Files\nodejs\node.exe"

# Colors
$C = @{
    Green  = [ConsoleColor]::Green
    Yellow = [ConsoleColor]::Yellow
    Red    = [ConsoleColor]::Red
    Cyan   = [ConsoleColor]::Cyan
    White  = [ConsoleColor]::White
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

# ─── Header ───
Clear-Host
Write-Host @"

  ╔══════════════════════════════════════════════════════╗
  ║     AMC VPL Server - Auto-Start Setup                ║
  ╚══════════════════════════════════════════════════════╝

"@ -ForegroundColor $C.Cyan

# ─── Check Admin ───
Write-Step 1 5 "Checking administrator privileges..."
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Error "This script must be run as Administrator."
    Write-Host ""
    Write-Host "  Right-click this file and select:" -ForegroundColor $C.Yellow
    Write-Host "    'Run with PowerShell'" -ForegroundColor $C.White
    Write-Host ""
    Write-Host "  Or run from an elevated PowerShell:" -ForegroundColor $C.Yellow
    Write-Host "    powershell -Command Start-Process PowerShell -Verb RunAs" -ForegroundColor $C.White
    Read-Host "`nPress Enter to exit"
    exit 1
}
Write-OK "Running as Administrator"

# ─── Check paths exist ───
Write-Step 2 5 "Validating project paths..."

if (-not (Test-Path $ProjectPath)) {
    Write-Error "Project path not found: $ProjectPath"
    Read-Host "`nPress Enter to exit"
    exit 1
}
Write-OK "Project path: $ProjectPath"

if (-not (Test-Path $NodePath)) {
    Write-Warn "Node.js not found at $NodePath"
    # Try to find it from PATH
    $nodeFromPath = Get-Command "node" -ErrorAction SilentlyContinue
    if ($nodeFromPath) {
        $NodePath = $nodeFromPath.Source
        Write-OK "Found Node.js at: $NodePath"
    } else {
        Write-Error "Node.js is not installed. Install from https://nodejs.org"
        Read-Host "`nPress Enter to exit"
        exit 1
    }
} else {
    Write-OK "Node.js: $NodePath"
}

# ─── Check if task already exists ───
Write-Step 3 5 "Checking existing scheduled task..."
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Warn "Task '$TaskName' already exists."
    $choice = Read-Host "  Overwrite? (Y/N) [Y]"
    if ($choice -eq "" -or $choice -eq "Y" -or $choice -eq "y") {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-OK "Removed existing task"
    } else {
        Write-Warn "Keeping existing task. Exiting."
        Read-Host "`nPress Enter to exit"
        exit 0
    }
} else {
    Write-OK "No existing task found"
}

# ─── Build the startup script ───
Write-Step 4 5 "Creating startup action..."

# We create a .bat wrapper that cd's to the project and starts the server
$startupBat = @"
@echo off
cd /d "$ProjectPath"
set NEXTAUTH_URL=http://localhost:3000
call npx prisma generate > NUL 2>&1
call npm start
"@

$startupBatPath = Join-Path $ProjectPath "start-autostart.bat"
$startupBat | Out-File -FilePath $startupBatPath -Encoding ascii
Write-OK "Created startup wrapper: start-autostart.bat"

# ─── Create the Scheduled Task ───
Write-Step 5 5 "Registering scheduled task..."

# Build task action — runs the .bat file with Node in PATH
$action = New-ScheduledTaskAction -Execute "cmd.exe" `
    -Argument "/c `"$startupBatPath`"" `
    -WorkingDirectory $ProjectPath

# Trigger: at system startup
$trigger = New-ScheduledTaskTrigger -AtStartup

# Run as the current user (so npm/node is available with their profile)
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -RunLevel Highest -LogonType Interactive

# Settings: restart on failure
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit 0  # No time limit

try {
    Register-ScheduledTask -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Principal $principal `
        -Settings $settings `
        -Description $TaskDescription -Force | Out-Null
    
    Write-OK "Scheduled task created successfully!"
} catch {
    Write-Error "Failed to create task: $_"
    Read-Host "`nPress Enter to exit"
    exit 1
}

# ─── Summary ───
Clear-Host
Write-Host @"

  ╔══════════════════════════════════════════════════════╗
  ║                 All Set Up!                           ║
  ╚══════════════════════════════════════════════════════╝

"@ -ForegroundColor $C.Green

Write-Host "  Auto-start has been configured:" -ForegroundColor $C.White
Write-Host ""
Write-Host "  Task Name :" -NoNewline; Write-Host " AMC VPL Lab Server" -ForegroundColor $C.Cyan
Write-Host "  Trigger   :" -NoNewline; Write-Host " At system startup" -ForegroundColor $C.Cyan
Write-Host "  User      :" -NoNewline; Write-Host " $currentUser" -ForegroundColor $C.Cyan
Write-Host "  Restart   :" -NoNewline; Write-Host " Up to 3 times if it crashes" -ForegroundColor $C.Cyan
Write-Host "  Project   :" -NoNewline; Write-Host " $ProjectPath" -ForegroundColor $C.Cyan
Write-Host ""

Write-Host "  The server will automatically start:" -ForegroundColor $C.Yellow
Write-Host "  - On every boot, before anyone logs in" -ForegroundColor $C.Yellow
Write-Host "  - If it crashes, it restarts within 1 minute" -ForegroundColor $C.Yellow
Write-Host ""

Write-Host "  ── Test it now?" -ForegroundColor $C.White
Write-Host "  You can start the task immediately without rebooting:" -ForegroundColor $C.Gray
Write-Host "    Start-ScheduledTask -TaskName `"AMC VPL Lab Server`"" -ForegroundColor $C.Cyan
Write-Host ""

Write-Host "  ── To remove auto-start later:" -ForegroundColor $C.White
Write-Host "    Unregister-ScheduledTask -TaskName `"AMC VPL Lab Server`" -Confirm:`$false" -ForegroundColor $C.Cyan
Write-Host ""

Write-Host "  ── To see the task in Task Scheduler GUI:" -ForegroundColor $C.White
Write-Host "    1. Press Win+R, type taskschd.msc, press Enter" -ForegroundColor $C.Cyan
Write-Host "    2. Navigate to: Task Scheduler Library" -ForegroundColor $C.Cyan
Write-Host "    3. Find 'AMC VPL Lab Server' in the list" -ForegroundColor $C.Cyan
Write-Host ""

Write-Host "  ── Watch the server logs:" -ForegroundColor $C.White
Write-Host "  The server output will appear in the Task Scheduler log." -ForegroundColor $C.Gray
Write-Host "  For real-time monitoring, check:" -ForegroundColor $C.Gray
Write-Host "    Get-ScheduledTask -TaskName `"AMC VPL Lab Server`" | Get-ScheduledTaskInfo" -ForegroundColor $C.Cyan
Write-Host ""

# ─── Ask to start now ───
$startNow = Read-Host "  Start the server now? (Y/N) [Y]"
if ($startNow -eq "" -or $startNow -eq "Y" -or $startNow -eq "y") {
    try {
        Start-ScheduledTask -TaskName $TaskName
        Write-Host "  Server is starting! Check in a few seconds at:" -ForegroundColor $C.Green
        Write-Host "    http://localhost:3000" -ForegroundColor $C.Cyan
        
        # Also show LAN IP if detectable
        $lanIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or
            ($_.IPAddress -like "172.*" -and [int]($_.IPAddress -split "\.")[1] -ge 16 -and [int]($_.IPAddress -split "\.")[1] -le 31)
        } | Select-Object -First 1
        if ($lanIP) {
            Write-Host "    http://$($lanIP.IPAddress):3000" -ForegroundColor $C.Cyan
        }
    } catch {
        Write-Warn "Could not start the task: $_"
        Write-Warn "It will start automatically on next boot."
    }
} else {
    Write-Host "  The server will start automatically on next boot." -ForegroundColor $C.Yellow
}

Read-Host "`nPress Enter to exit"
