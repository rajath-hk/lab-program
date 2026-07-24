# 🚀 Running the Virtual Programming Lab (VPL)

Detailed step-by-step guide to set up and run the project **from scratch**.

---

## 📋 Prerequisites

| Software     | Version   | Check Command          |
|-------------|-----------|------------------------|
| Node.js     | >= 20     | `node --version`       |
| npm         | >= 9      | `npm --version`        |
| Python 3    | >= 3.8    | `python --version`     |

> **Note:** Python is only needed if you want to run Python code in the code editor.  
> Other runtimes (Node.js, Java, GCC, Rust, Go) are optional for executing code in those languages.

---

## 🛠 Step 1 — Install Dependencies

Open a terminal in the `vpl-system` directory and run:

```bash
cd vpl-system
npm install
```

This installs all dependencies and automatically runs `prisma generate` (via the `postinstall` script) to generate the Prisma client.

**If `prisma generate` fails**, run it manually:

```bash
npx prisma generate
```

---

## ⚙️ Step 2 — Configure Environment Variables

Create a `.env` file in the `vpl-system` directory with the following content:

```env
DATABASE_URL=file:./dev.db
NEXTAUTH_SECRET=vpl-lab-system-2026-secure-key-x9k2m4n7p1q3r5t8
NEXTAUTH_URL=http://localhost:3000
```

| Variable          | Description                                    |
|-------------------|------------------------------------------------|
| `DATABASE_URL`    | SQLite database file path                      |
| `NEXTAUTH_SECRET` | Secret key for NextAuth.js JWT encryption      |
| `NEXTAUTH_URL`    | Your app's base URL (change for LAN deployment)|

> For LAN access from lab computers, change `NEXTAUTH_URL` to your server's IP, e.g. `http://192.168.1.100:3000`.

---

## 🗄️ Step 3 — Run Database Migrations

Apply the existing migrations to create/update the SQLite database:

```bash
npx prisma migrate dev
```

If the database is already up to date, you'll see:

```
Already in sync, no schema change or pending migration was found.
```

Alternatively, if you just want to apply migrations without opening the Prisma studio prompt:

```bash
npx prisma migrate deploy
```

---

## 🌱 Step 4 — Seed the Database

Populate the database with default users and sample programs:

```bash
npx prisma db seed
```

This creates the following default accounts:

| Role    | Credentials                              |
|---------|------------------------------------------|
| Admin   | `admin@amc.edu` / `password123`          |
| Teacher | `teacher@amc.edu` / `password123`        |
| Student | Roll number: `1AM25MC001` / `password123`|

> **Important:** Students log in using their **roll number**, not email.  
> Admins and teachers log in using their **email address**.

---

## 🖥️ Step 5 — Start the Development Server

```bash
npm run dev
```

The server will start at **http://127.0.0.1:3000**.

You should see output like:

```
✓ Ready in ~2s
▲ Next.js 16.2.9 (Turbopack)
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) in your browser.  
You will be redirected to the login page.

---

## 🌐 Step 6 — (Optional) Expose to LAN

If you want students in a lab to access the server via their browsers:

1. Find your server's LAN IP:
   - **Windows:** Run `ipconfig` in PowerShell, look for `IPv4 Address`
   - **Linux/macOS:** Run `ip addr` or `ifconfig`

2. Start the server with network access:

```bash
npm run dev:network
```

3. Update `NEXTAUTH_URL` in `.env` to match your server IP, e.g.:

```env
NEXTAUTH_URL=http://192.168.1.100:3000
```

4. Students can now access the app at `http://<your-ip>:3000` from their lab computers.

---

## ✅ Verifying Everything Works

After starting the server, test each role:

1. **Admin login** → `admin@amc.edu` / `password123`
   - See system stats, manage departments & users

2. **Teacher login** → `teacher@amc.edu` / `password123`
   - Create programs, manage questions, review submissions

3. **Student login** → Roll: `1AM25MC001` / `password123`
   - View programs, write & submit code, check results

---

## 🔁 Quick Start (If Already Set Up)

If you already have a database (`dev.db`) and just want to run the app:

```bash
cd vpl-system
npm install          # Install any new deps + generate Prisma client
npm run dev          # Start the server
```

---

## 🧹 Troubleshooting

### "The datasource.url property is required"

Make sure your `.env` file exists in `vpl-system/` and contains `DATABASE_URL=file:./dev.db`.

### Dev server crashes on startup

Clear the Next.js cache and retry:

```bash
rm -rf .next
npm run dev
```

### Prisma client errors

Regenerate the Prisma client:

```bash
npx prisma generate
```

### Database is corrupted or needs a reset

Delete the database and re-migrate + re-seed:

```bash
del dev.db
npx prisma migrate dev
npx prisma db seed
```

### "port 3000 is already in use"

Either:
- Kill the existing process (find it with `netstat -ano | findstr :3000`)
- Or use a different port: `next dev -p 3001`

---

## 📦 Useful Scripts

| Command                          | Description                           |
|----------------------------------|---------------------------------------|
| `npm run dev`                    | Start development server              |
| `npm run dev:network`            | Start dev server on all network interfaces |
| `npm run build`                  | Build for production                  |
| `npm start`                      | Start production server               |
| `npm run lint`                   | Run ESLint                            |
| `npx prisma studio`              | Open Prisma Studio (database GUI)     |
| `npx prisma migrate dev`         | Apply new migrations                  |
| `npx prisma db seed`             | Seed the database                     |
| `npx prisma generate`            | Regenerate Prisma client              |
| `npx tsx prisma/seed.ts`         | Run seed script directly              |
| `npx tsc --noEmit`               | Type-check the entire project         |

---

## 🗂️ Project Structure Quick Reference

```
vpl-system/
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Database seed script
│   └── migrations/         # Database migrations
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login page
│   │   ├── (dashboard)/    # Admin, Teacher, Student dashboards
│   │   └── api/            # All API routes
│   ├── components/         # UI and shared components
│   ├── lib/                # Auth, Prisma, utilities
│   └── middleware.ts       # Route protection
├── .env                    # Environment variables
├── dev.db                  # SQLite database file
└── package.json
```
