<#
.SYNOPSIS
    AMC VPL System - Server Health Monitor
.DESCRIPTION
    Checks if the VPL server is running, responds to requests,
    and reports key health metrics. Run it anytime to check
    server status, or set up Scheduled Task for periodic monitoring.
.EXAMPLE
    .\check-server-health.ps1
.EXAMPLE
    .\check-server-health.ps1 -Watch   # Re-check every 10 seconds
.PARAMETER Watch
    Continuously monitor, refreshing every 10 seconds
.PARAMETER Port
    Port to check (default: 3000)
#>

param(
    [switch]$Watch,
    [int]$Port = 3000
)

$ServerName = "AMC VPL Lab Server"
$BaseUrl = "http://localhost:$Port"

$C = @{
    Green  = [ConsoleColor]::Green
    Yellow = [ConsoleColor]::Yellow
    Red    = [ConsoleColor]::Red
    Cyan   = [ConsoleColor]::Cyan
    White  = [ConsoleColor]::White
    Gray   = [ConsoleColor]::DarkGray
}

function Write-Stat([string]$Label, [string]$Value, [ConsoleColor]$Color = $C.White) {
    Write-Host "  $Label".PadRight(28) -ForegroundColor $C.Gray -NoNewline
    Write-Host "$Value" -ForegroundColor $Color
}

function Test-Url([string]$Url, [int]$TimeoutSeconds = 5) {
    try {
        $request = [System.Net.WebRequest]::Create($Url)
        $request.Timeout = $TimeoutSeconds * 1000
        $request.Method = "GET"
        $response = $request.GetResponse()
        $statusCode = [int]$response.StatusCode
        $response.Close()
        return @{ Success = $true; StatusCode = $statusCode }
    } catch {
        if ($_.Exception.InnerException) {
            return @{ Success = $false; Error = $_.Exception.InnerException.Message }
        }
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

function Get-ServerMetrics {
    # Check if port is listening
    $portOpen = $false
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(2000, $false)
        if ($wait) {
            $tcp.EndConnect($connect) | Out-Null
            $portOpen = $true
        }
        $tcp.Close()
    } catch {}

    return @{ PortOpen = $portOpen }
}

function Get-ScheduledTaskStatus {
    $task = Get-ScheduledTask -TaskName "AMC VPL Lab Server" -ErrorAction SilentlyContinue
    if (-not $task) { return $null }
    
    $info = Get-ScheduledTaskInfo -TaskName "AMC VPL Lab Server" -ErrorAction SilentlyContinue
    return @{
        Exists = $true
        Status = $task.State
        LastRun = $info.LastRunTime
        LastResult = $info.LastTaskResult
        NextRun = $info.NextRunTime
    }
}

function Show-HealthReport {
    Clear-Host
    Write-Host @"

  ╔══════════════════════════════════════════════════════╗
  ║         $ServerName — Health Report             ║
  ╚══════════════════════════════════════════════════════╝

"@ -ForegroundColor $C.Cyan

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Stat "Report generated" "$timestamp" $C.Gray

    # ── Server Process Check ──
    Write-Host "`n ── Server Status ──" -ForegroundColor $C.White
    $metrics = Get-ServerMetrics
    if ($metrics.PortOpen) {
        Write-Stat "Port $Port" "LISTENING" $C.Green
    } else {
        Write-Stat "Port $Port" "NOT LISTENING" $C.Red
    }

    # ── HTTP Check ──
    Write-Host "`n ── HTTP Response ──" -ForegroundColor $C.White
    $httpResult = Test-Url "$BaseUrl/login"
    if ($httpResult.Success) {
        Write-Stat "Login page" "HTTP $($httpResult.StatusCode)" $C.Green
    } else {
        Write-Stat "Login page" "FAILED — $($httpResult.Error)" $C.Red
    }

    # ── API Check ──
    $healthResult = Test-Url "$BaseUrl/api/auth/session"
    if ($healthResult.Success) {
        Write-Stat "Auth API" "HTTP $($healthResult.StatusCode)" $C.Green
    } else {
        Write-Stat "Auth API" "FAILED" $C.Red
    }

    # ── Scheduled Task Status ──
    Write-Host "`n ── Auto-Start (Scheduled Task) ──" -ForegroundColor $C.White
    $taskStatus = Get-ScheduledTaskStatus
    if ($taskStatus -and $taskStatus.Exists) {
        $statusColor = switch ($taskStatus.Status) {
            "Ready" { $C.Green }
            "Running" { $C.Cyan }
            "Disabled" { $C.Red }
            default { $C.Yellow }
        }
        Write-Stat "Task Status" "$($taskStatus.Status)" $statusColor
        if ($taskStatus.LastRun -and $taskStatus.LastRun -ne [DateTime]::MinValue) {
            Write-Stat "Last Run" "$($taskStatus.LastRun)" $C.Gray
            Write-Stat "Last Result" "$($taskStatus.LastResult)" ($taskStatus.LastResult -eq 0 ? $C.Green : $C.Red)
        }
        if ($taskStatus.NextRun -and $taskStatus.NextRun -ne [DateTime]::MaxValue) {
            Write-Stat "Next Run" "$($taskStatus.NextRun)" $C.Gray
        }
    } else {
        Write-Stat "Auto-Start" "NOT CONFIGURED" $C.Yellow
        Write-Host "  Run setup-autostart.ps1 to enable" -ForegroundColor $C.Yellow
    }

    # ── System Resources ──
    Write-Host "`n ── System Resources ──" -ForegroundColor $C.White
    try {
        $os = Get-CimInstance Win32_OperatingSystem
        $totalMem = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
        $freeMem = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
        $usedMem = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1MB, 1)
        $memPct = [math]::Round(($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize * 100, 1)
        
        Write-Stat "Memory Usage" "$usedMem GB / $totalMem GB ($memPct%)" ($memPct -gt 80 ? $C.Red : $C.Gray)
        Write-Stat "CPU Load" "$([math]::Round((Get-CimInstance Win32_Processor).LoadPercentage, 0))%" $C.Gray
        
        # Disk space for project drive
        $drive = (Get-Item $PSScriptRoot).PSDrive.Name + ":"
        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$drive'"
        if ($disk) {
            $freeGB = [math]::Round($disk.FreeSpace / 1GB, 1)
            $totalGB = [math]::Round($disk.Size / 1GB, 1)
            Write-Stat "Disk ($drive)" "$freeGB GB free / $totalGB GB total" ($freeGB -lt 5 ? $C.Red : $C.Gray)
        }
    } catch {}

    # ── Network Info ──
    Write-Host "`n ── Lab Access URLs ──" -ForegroundColor $C.White
    $interfaces = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" -or
        ($_.IPAddress -like "172.*" -and [int]($_.IPAddress -split "\.")[1] -ge 16 -and [int]($_.IPAddress -split "\.")[1] -le 31)
    }
    if ($interfaces.Count -gt 0) {
        foreach ($iface in $interfaces) {
            Write-Host "  http://$($iface.IPAddress):$Port" -ForegroundColor $C.Cyan
        }
    } else {
        Write-Stat "LAN IP" "Could not detect" $C.Yellow
    }
    Write-Stat "Local" "http://localhost:$Port" $C.Gray

    # ── Quick Actions ──
    Write-Host "`n ── Quick Actions ──" -ForegroundColor $C.White
    if (-not $metrics.PortOpen) {
        $taskS = Get-ScheduledTask -TaskName "AMC VPL Lab Server" -ErrorAction SilentlyContinue
        if ($taskS) {
            Write-Host "  Start the server now:" -ForegroundColor $C.Yellow
            Write-Host "    Start-ScheduledTask -TaskName `"AMC VPL Lab Server`"" -ForegroundColor $C.Cyan
        } else {
            Write-Host "  Start the server manually:" -ForegroundColor $C.Yellow
            Write-Host "    cd $PSScriptRoot && npm start" -ForegroundColor $C.Cyan
        }
    }
    Write-Host "  Open admin dashboard:" -ForegroundColor $C.Yellow
    Write-Host "    Start-Process `"http://localhost:$Port/admin`"" -ForegroundColor $C.Cyan
    Write-Host "  View task scheduler:" -ForegroundColor $C.Yellow
    Write-Host "    Start-Process taskschd.msc" -ForegroundColor $C.Cyan

    Write-Host ""
    if ($metrics.PortOpen) {
        Write-Host "  ✅ Server is RUNNING" -ForegroundColor $C.Green
    } else {
        Write-Host "  ❌ Server is DOWN" -ForegroundColor $C.Red
    }
    Write-Host ""
}

# ─── Main ───
if ($Watch) {
    while ($true) {
        Show-HealthReport
        Write-Host "  Refreshing every 10s... (Ctrl+C to stop)" -ForegroundColor $C.Gray
        Start-Sleep -Seconds 10
    }
} else {
    Show-HealthReport
}
