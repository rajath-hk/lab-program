@echo off
echo ========================================
echo  VPL System - Firewall Setup
echo ========================================
echo.
echo This script must be run AS ADMINISTRATOR.
echo Right-click this file and select "Run as administrator".
echo.
pause

powershell -Command "New-NetFirewallRule -DisplayName 'VPL System Port 3000' -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Description 'Allow lab PCs to access the VPL system'"

echo.
echo Firewall rule created successfully!
echo Port 3000 is now open for incoming connections.
echo.
pause
