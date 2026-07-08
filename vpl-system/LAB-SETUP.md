# AMC Virtual Programming Lab — Complete Setup Guide

> **Last Updated:** July 8, 2026
> **Server IP:** `192.168.68.106` — **Replace this with your actual server IP throughout this document**
> **Port:** 3000

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Server PC Setup — Step by Step](#3-server-pc-setup--step-by-step)
4. [Updating the Server](#4-updating-the-server-when-code-changes)
5. [Network Configuration](#5-network-configuration)
6. [Firewall Configuration](#6-firewall-configuration)
7. [Starting the Server](#7-starting-the-server)
8. [Accessing from Lab PCs](#8-accessing-from-lab-pcs)
9. [Auto-Start on Boot](#9-auto-start-on-boot)
10. [Monitoring the Server](#10-monitoring-the-server)
11. [Code Execution Setup](#11-code-execution-setup)
12. [Managing Users & Departments](#12-managing-users--departments)
13. [Data Backup](#13-data-backup)
14. [Troubleshooting](#14-troubleshooting)
15. [Scripts Reference](#15-scripts-reference)

---

## 1. System Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                      LAB NETWORK                           │
│                                                             │
│  ┌─────────────────────────────────┐                        │
│  │         SERVER PC (Main)         │                       │
│  │  Installed: Node.js, Python, etc │                       │
│  │  Runs: Next.js + SQLite DB       │                       │
│  │  IP: 192.168.68.106:3000         │                       │
│  │                                  │                       │
│  │  ┌─────────────────────────┐     │                       │
│  │  │  VPL System (Next.js)   │     │                       │
│  │  │  ├─ Web App (students)  │     │                       │
│  │  │  ├─ Admin Dashboard     │     │                       │
│  │  │  ├─ Teacher Dashboard   │     │                       │
│  │  │  ├─ Code Execution      │     │  ← ALL code runs here │
│  │  │  └─ SQLite Database     │     │  ← DB stays on server │
│  │  └─────────────────────────┘     │                       │
│  └────────────┬────────────────────┘                        │
│               │                                             │
│     ┌─────────┴──────────┬──────────┬──────────┐           │
│     ▼                    ▼          ▼          ▼            │
│  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐                │
│  │ PC 1 │   │ PC 2 │   │ PC 3 │   │ PC 4 │   ...          │
│  │Browser│   │Browser│   │Browser│   │Browser│              │
│  └──────┘   └──────┘   └──────┘   └──────┘                │
│                                                             │
│  Clients ONLY need a web browser (Chrome/Firefox/Edge).     │
│  No installation required on student PCs.                   │
└────────────────────────────────────────────────────────────┘
```

### Key Concepts

| Aspect | How It Works |
|--------|-------------|
| **Server PC** | One machine runs everything — the web app, database, and code execution |
| **Client PCs** | Students just open a browser and go to the server's IP address |
| **Database** | SQLite file (`dev.db`) lives on the server PC only |
| **Code Execution** | Student code runs **on the server PC**, not on client machines |
| **No Installation** | Student PCs need nothing but a modern web browser |

---

## 2. Prerequisites

### Server PC Requirements

| Requirement | Minimum | Recommended |
|------------|---------|-------------|
| **OS** | Windows 10 / 11 | Windows 11 |
| **RAM** | 8 GB | 16 GB |
| **CPU** | Any dual-core | Intel i5 / AMD Ryzen 5 |
| **Storage** | 10 GB free | 50 GB+ |
| **Node.js** | v20+ | Latest LTS |
| **npm** | 9+ | Latest |
| **Python 3** | (optional) | For running Python code |
| **Java JDK** | (optional) | For running Java code |
| **GCC/G++** | (optional) | For running C/C++ code |

### Required Software (Server PC)

1. **Node.js** v20 or later
   - Download: https://nodejs.org (Download LTS version)
   - Verify installation:
     ```bash
     node -v   # Should show v20.x.x or higher
     npm -v    # Should show 10.x.x or higher
     ```

2. **Git** (optional, for updates)
   - Download: https://git-scm.com/downloads

3. **Optional — Code Execution Runtimes**
   Install these on the **server PC** for students to use those languages:
   - **Python 3**: https://python.org
   - **Java JDK 17+**: https://adoptium.net
   - **GCC/G++** (via MinGW): https://winlibs.com
   - **Rust**: https://rustup.rs
   - **Go**: https://go.dev

### Client PC Requirements

- A modern web browser: **Chrome**, **Firefox**, or **Edge**
- Network connectivity to the server PC
- **Nothing else** needs to be installed

---

## 3. Server PC Setup — Step by Step

### Step 1: Install Node.js

1. Go to https://nodejs.org
2. Download the **LTS** version (not the "Current" version)
3. Run the installer — use all default settings
4. After installation, open **Command Prompt** and verify:
   ```bash
   node -v
   npm -v
   ```

### Step 2: Get the VPL System Files

#### Option A: Clone with Git (if you have Git installed)
```bash
cd C:\Users\rajat\Documents
git clone <repository-url> lab-program
cd lab-program\vpl-system
```

#### Option B: Copy from USB / Download
1. Make sure the `vpl-system` folder is on your server PC
2. Open Command Prompt in that folder:
   ```bash
   cd C:\Users\rajat\OneDrive\Documents\GitHub\lab-program\vpl-system
   ```

### Step 3: Install Dependencies
```bash
npm install
```
This may take 1–2 minutes. You should see no errors.

### Step 4: Initialize the Database
```bash
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```

The seed script creates these default accounts:

| Role | Login ID | Password |
|------|----------|----------|
| **Admin** | `admin@amc.edu` | `password123` |
| **Teacher** | `teacher@amc.edu` | `password123` |
| **Student** | `1AM25MC001` (roll number) | `password123` |

> **Important:** Students log in using their **roll number**. Admins and teachers use their **email address**.

### Step 5: Configure Environment Variables

The `.env` file should already be configured. Verify it contains:
```env
DATABASE_URL=file:./dev.db
NEXTAUTH_SECRET=439c4b22eb41bbe6d744ae2a0cae82c45bca4f7a1e15a02c6b0eb26a32076603
NEXTAUTH_URL=http://192.168.68.106:3000
```

> **NEXTAUTH_URL** MUST be set to the server's LAN IP address (not localhost) for other PCs to be able to log in.

### Step 6: Build the Project
```bash
npm run build
```
This creates an optimized production build. Takes about 30–60 seconds.

---

## 4. Updating the Server (When Code Changes)

When you pull new code updates (e.g., bug fixes, new features), follow this order:

```bash
# 1. Go to the project folder
cd C:\Users\rajat\OneDrive\Documents\GitHub\lab-program\vpl-system

# 2. Pull the latest code (if using Git)
git pull

# 3. Install any new dependencies
npm install

# 4. Apply any database changes
npx prisma migrate dev --name init

# 5. Rebuild the project
npm run build

# 6. Restart the server
# Press Ctrl+C to stop, then:
npm start
```

> **Important:** If you skip `npm run build`, the old version will keep running.

---

## 5. Network Configuration

### Find Your Server's LAN IP

Open Command Prompt and run:
```bash
ipconfig
```

Look for the line:
```
IPv4 Address. . . . . . . . . . . : 192.168.68.106
```

This is your server's LAN IP. Common patterns:
- `192.168.x.x` — Most home/small office networks
- `10.x.x.x` — Some corporate networks
- `172.16.x.x` — Some corporate networks

### Update the Environment File

After finding the IP, make sure `.env` has it:
```env
NEXTAUTH_URL=http://192.168.68.106:3000
```

### Static IP (Recommended)

To prevent the IP from changing after a reboot:
1. Open **Control Panel → Network and Sharing Center → Change adapter settings**
2. Right-click your network connection → **Properties**
3. Select **Internet Protocol Version 4 (TCP/IPv4)** → **Properties**
4. Choose **Use the following IP address** and enter:
   - **IP address:** `192.168.68.106` (your server's actual IP)
   - **Subnet mask:** `255.255.255.0`
   - **Default gateway:** `192.168.68.1` (your router's IP)
   - **DNS:** `8.8.8.8` and `8.8.4.4`

---

## 6. Firewall Configuration

### Find Your Server's LAN IP

Open Command Prompt and run:
```bash
ipconfig
```

Look for the line:
```
IPv4 Address. . . . . . . . . . . : 192.168.68.106
```

This is your server's LAN IP. Common patterns:
- `192.168.x.x` — Most home/small office networks
- `10.x.x.x` — Some corporate networks
- `172.16.x.x` — Some corporate networks

### Update the Environment File

After finding the IP, make sure `.env` has it:
```env
NEXTAUTH_URL=http://192.168.68.106:3000
```

### Static IP (Recommended)

To prevent the IP from changing after a reboot:
1. Open **Control Panel → Network and Sharing Center → Change adapter settings**
2. Right-click your network connection → **Properties**
3. Select **Internet Protocol Version 4 (TCP/IPv4)** → **Properties**
4. Choose **Use the following IP address** and enter:
   - **IP address:** `192.168.68.106` (your server's actual IP)
   - **Subnet mask:** `255.255.255.0`
   - **Default gateway:** `192.168.68.1` (your router's IP)
   - **DNS:** `8.8.8.8` and `8.8.4.4`

---

## 5. Firewall Configuration

### Method 1: Run the Setup Script (Recommended)

1. Navigate to `vpl-system\setup-firewall.bat`
2. **Right-click** → **Run as administrator**
3. Click **Yes** on the UAC prompt
4. The script will create a firewall rule allowing port 3000

### Method 2: Manual PowerShell (Run as Admin)

```powershell
New-NetFirewallRule -DisplayName "VPL System Port 3000" `
    -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow `
    -Description "Allow lab PCs to access the VPL system"
```

### Method 3: Manual via Windows UI

1. Open **Windows Security** → **Firewall & network protection**
2. Click **Advanced settings**
3. Click **Inbound Rules** → **New Rule...**
4. Select **Port** → Next
5. Select **TCP** → **Specific local ports:** `3000` → Next
6. Select **Allow the connection** → Next
7. Check all profiles (Domain, Private, Public) → Next
8. Name: `VPL System Port 3000` → Finish

---

## 7. Starting the Server

### Option A: Production Mode (Recommended — Faster, Stable)

**One-time build:**
```bash
npm run build
```

**Then start the server:**
```bash
npm run lab
```

Or use the startup script:
- **Double-click** `start-lab.bat`
- Or run: `.\start-lab.ps1` (PowerShell)

### Option B: Development Mode

```bash
npm run lab:dev
```

This starts the server bound to all network interfaces (`0.0.0.0`).

### What You Should See

Once the server starts, you'll see output like:
```
▲ Next.js 16.x.x
- Local:        http://localhost:3000
- Network:      http://192.168.68.106:3000
```

---

## 8. Accessing from Lab PCs

### For Students

On any lab PC, open a web browser and go to:
```
http://192.168.68.106:3000
```

Then log in with:
- **Roll number** (e.g., `1AM25MC001`)
- **Password** (provided by admin)

### For Teachers

```
http://192.168.68.106:3000
```
Log in with email and password.

### For Admin

```
http://192.168.68.106:3000
```
Log in with `admin@amc.edu` / `password123`.

### Creating a Desktop Shortcut for Students

1. On a student PC, right-click the desktop → **New → Shortcut**
2. Location: `http://192.168.68.106:3000`
3. Name: `VPL Lab`
4. Finish

You can also push this via Group Policy or simply put the URL in the browser bookmarks.

---

## 9. Auto-Start on Boot

### Setup Using the Provided Script

1. **Open `vpl-system\setup-autostart.ps1`**
2. **Right-click → Run with PowerShell**
3. The script will:
   - Create a Windows Scheduled Task called **"AMC VPL Lab Server"**
   - Configure it to run at system startup
   - Set it to restart automatically if it crashes
4. Follow the prompts — it will ask if you want to start the server now

### What the Scheduled Task Does

| Setting | Value |
|---------|-------|
| **Task Name** | AMC VPL Lab Server |
| **Trigger** | At system startup |
| **Run As** | Current user (admin) |
| **Restart on Failure** | 3 times, 1 minute apart |
| **Runs Even When** | No one is logged in |

### Manual Task Scheduler Setup

1. Press **Win+R**, type `taskschd.msc`, press Enter
2. Click **Create Task** in the right panel
3. **General tab:**
   - Name: `AMC VPL Lab Server`
   - Check **Run with highest privileges**
   - Check **Run whether user is logged on or not**
4. **Triggers tab:** New → **At startup**
5. **Actions tab:** New → Start a program:
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `C:\Users\rajat\OneDrive\Documents\GitHub\lab-program\vpl-system\node_modules\next\dist\bin\next start`
   - Start in: `C:\Users\rajat\OneDrive\Documents\GitHub\lab-program\vpl-system`
6. **Settings tab:**
   - Check **Allow task to be run on demand**
   - Check **Restart if the task fails** (set to 3 times, restart every 1 minute)

### To Remove Auto-Start Later

```powershell
Unregister-ScheduledTask -TaskName "AMC VPL Lab Server" -Confirm:$false
```

---

## 10. Monitoring the Server

### Built-in Monitoring (No Setup Needed)

| Dashboard | URL | What It Shows |
|-----------|-----|---------------|
| **Admin Dashboard** | `/admin` | Users, submissions, programs stats |
| **Activity Logs** | `/admin/activity` | Every action (logins, submissions, reviews) with search, filters, and **Excel export** |
| **Piston Health** | `/admin/piston` | Code execution engine status |

### Health Check Script

```bash
.\check-server-health.ps1
```

Shows in a single screen:
- Is the server running? (port check)
- HTTP response status (200 OK?)
- Scheduled task auto-start status
- System resource usage (RAM, CPU, disk)
- Lab access URLs
- Quick action commands

**Live monitoring mode** (refreshes every 10 seconds):
```bash
.\check-server-health.ps1 -Watch
```

---

## 11. Code Execution Setup

### How Code Execution Works

When a student clicks **Run** or **Submit** in the code editor:

1. The code is sent from the student's browser to the server PC
2. The server PC creates a temporary directory
3. The code is written to a file
4. The appropriate compiler/interpreter is called (e.g., `python`, `node`, `g++`)
5. The output is captured and sent back to the student's browser
6. The temp directory is cleaned up

> **All code runs on the server PC.** Students' machines only show the editor and results.

### Supported Languages & Requirements

| Language | Server Requirement | Check Installation |
|----------|-------------------|-------------------|
| **Python** | `python3` or `python` | `python --version` |
| **JavaScript** | Node.js (✓ included) | `node -v` |
| **TypeScript** | tsx (✓ via npm) | — |
| **Java** | `javac` + `java` | `javac -version` |
| **C** | `gcc` | `gcc --version` |
| **C++** | `g++` | `g++ --version` |
| **Rust** | `rustc` | `rustc --version` |
| **Go** | `go` | `go version` |
| **SQL** | Built-in SQLite (✓ included) | — |

### Auto-Approve Feature

If a teacher adds **test cases** to a question, the system will:
1. Automatically run the student's code against those test cases on submission
2. If **all test cases pass**, the submission is **auto-approved** (no teacher review needed)
3. If some tests fail, the submission goes to **PENDING** for teacher review

---

## 12. Managing Users & Departments

### Logging In for the First Time

| Role | How to Login | Credentials |
|------|-------------|-------------|
| **Admin** | Email | `admin@amc.edu` / `password123` |
| **Teacher** | Email | `teacher@amc.edu` / `password123` |
| **Student** | Roll Number | `1AM25MC001` / `password123` |

### Creating Users (Admin Panel)

1. Login as **admin** → go to `/admin/users`
2. Click **Add User**
3. Fill in details — for students, leave password blank to **auto-generate** a secure one
4. Copy the generated password — it will only be shown once!

### Bulk Import Students

1. Go to `/admin/users` → **Bulk Import**
2. Download the sample CSV template
3. Prepare your file with columns: `RollNumber, Name, Email, DepartmentCode, Semester`
4. Upload the file
5. The system will create all students and show their generated passwords

### Creating Departments

1. Go to `/admin/departments`
2. Click **Add Department**
3. Enter name (e.g., "Master of Computer Applications") and code (e.g., "MC")

---

## 13. Data Backup

### What to Back Up

The entire application data is stored in:
```
vpl-system\dev.db
```

This is a single SQLite database file. **Back up this file regularly.**

### Backup Methods

#### Manual Backup
```bash
copy vpl-system\dev.db vpl-system\backup\dev-2026-07-08.db
```

#### Create a backup batch file (optional)
Create a file called `backup-database.bat` in the `vpl-system` folder with:
```batch
@echo off
set BACKUP_DIR=backups
if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%
set FILENAME=dev-%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%.db
copy dev.db %BACKUP_DIR%\%FILENAME%
echo Backed up to %BACKUP_DIR%\%FILENAME%
pause
```

### Restoring from Backup
```bash
copy vpl-system\backup\dev-2026-07-08.db vpl-system\dev.db
```
Then restart the server.

---

## 14. Troubleshooting

### Other PCs can't connect to the server

| Cause | Solution |
|-------|----------|
| **Server bound to localhost** | Use `npm run lab` or `npm run lab:dev` instead of `npm run dev` |
| **Firewall blocking** | Run `setup-firewall.bat` as Administrator |
| **Wrong IP address** | Run `ipconfig` to find the correct IP, update `.env` |
| **Server not running** | Check `.\check-server-health.ps1` — start the server if down |
| **Router blocking** | Some networks isolate clients; connect all PCs to the same switch/router |

### Login errors ("Invalid credentials")

| Cause | Solution |
|-------|----------|
| **Wrong login method** | Students use **roll number**, teachers/admins use **email** |
| **Wrong password** | Use the admin panel to change the password |
| **NEXTAUTH_URL wrong** | Must be set to the server's LAN IP in `.env` |

### Code execution fails

| Cause | Solution |
|-------|----------|
| **Runtime not installed** | Install the required compiler/interpreter on the **server PC** |
| **Timeout** | The 5-second timeout may be too short for complex programs |
| **Temp directory issues** | Ensure the server PC has free disk space |

### "The datasource.url property is required"

The `.env` file is missing or doesn't have `DATABASE_URL`. Run:
```bash
npm run build
```

### Server won't start

```bash
# Clear Next.js cache
rmdir /s .next
# Try again
npm run lab
```

### Port 3000 already in use

```bash
# Find what's using the port
netstat -ano | findstr :3000
# Kill the process (replace 1234 with the PID)
taskkill /PID 1234 /F
```

### Database errors

```bash
# Regenerate Prisma client
npx prisma generate
# Reset database (WARNING: deletes all data!)
npx prisma migrate reset --force
npx tsx prisma/seed.ts
```

---

## 15. Scripts Reference

All scripts are located in the `vpl-system/` directory:

| Script | Purpose | How to Run |
|--------|---------|-----------|
| `start-lab.bat` | Quick start — build + launch server | **Double-click** |
| `start-lab.ps1` | Advanced start — detects IP, configures .env, builds, launches | Right-click → Run with PowerShell |
| `setup-firewall.bat` | Open port 3000 in Windows Firewall | **Right-click → Run as administrator** |
| `setup-autostart.ps1` | Make server start automatically on boot | **Right-click → Run as administrator** |
| `check-server-health.ps1` | Check if server is running and healthy | `.\check-server-health.ps1` |

### npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode (localhost only) |
| `npm run dev:network` | Start development mode (all interfaces) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lab` | **Build + start production** (recommended for lab) |
| `npm run lab:dev` | Start development mode on all interfaces |
| `npm run lint` | Run ESLint |

### Quick Reference — First-Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Initialize database
npx prisma migrate dev --name init
npx tsx prisma/seed.ts

# 3. Configure firewall (run once)
# Right-click setup-firewall.bat → Run as administrator

# 4. Build and start
npm run lab

# 5. Share this URL with students:
#    http://192.168.68.106:3000
```

### Quick Reference — Daily Startup

```
Option A: Double-click start-lab.bat
Option B: cd vpl-system && npm run lab
Option C: .\start-lab.ps1
```

### Quick Reference — Shutdown

```
Press Ctrl+C in the server window, or close the window.
```

---

## Need Help?

- **Check the health:** `.\check-server-health.ps1`
- **View activity logs:** Login as admin → `/admin/activity`
- **Database GUI:** `npx prisma studio`
- **Reset database:** `npx prisma migrate reset --force` then re-seed

---

*Document generated for AMC Engineering College VPL System*
