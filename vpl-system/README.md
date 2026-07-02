# VPL System — Virtual Programming Lab

A full-stack web application for managing programming labs in educational institutions. Built with **Next.js 16**, **PostgreSQL**, **Prisma ORM**, and **NextAuth.js**.

## Features

- **Role-based access** — Admin, Teacher, and Student portals
- **Program Management** — Teachers create programming assignments (programs) with multiple questions
- **Code Editor** — Built-in Monaco Editor (the editor behind VS Code) with syntax highlighting
- **Code Execution** — Execute code locally in Python, JavaScript, TypeScript, Java, C++, C, Rust, and Go
- **Submission Review** — Teachers can review, approve, or reject student submissions with feedback
- **Department Management** — Admin manages departments and users
- **Piston API Integration** — Optional external code execution engine (via emkc.org)

## Tech Stack

| Technology  | Purpose                        |
|-------------|--------------------------------|
| Next.js 16  | React framework (App Router)   |
| Tailwind CSS v4 | Styling                    |
| shadcn/ui   | UI component library           |
| Prisma 7    | ORM + database migrations      |
| PostgreSQL  | Database                       |
| NextAuth.js | Authentication (credentials)    |
| Monaco Editor | Code editor widget          |
| Piston API  | Remote code execution (optional) |

## Prerequisites

Before you begin, ensure the following are installed:

- **Node.js** >= 20
- **npm** (or pnpm / yarn / bun)
- **PostgreSQL** 14+ running locally, **OR** Docker (to run PostgreSQL in a container)
- **Python 3** (for executing Python code — optional for development)
- **Node.js** (for executing JavaScript/TypeScript code — required by project)
- **Java JDK** (for executing Java code — optional)
- **GCC/G++** (for executing C/C++ code — optional)
- **Rust** (for executing Rust code — optional)
- **Go** (for executing Go code — optional)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd vpl-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

#### Option A: Using Docker (recommended)

If you have Docker installed but the daemon is not running, start Docker Desktop first, then:

```bash
docker run -d \
  --name vpl-postgres \
  -e POSTGRES_HOST_AUTH_METHOD=trust \
  -e POSTGRES_DB=vpl_system \
  -p 5432:5432 \
  postgres:16
```

#### Option B: Using a local PostgreSQL installation

1. Install PostgreSQL 14+ from [postgresql.org](https://www.postgresql.org/download/)
2. Create the database:

```bash
createdb vpl_system
```

Or via `psql`:

```sql
CREATE DATABASE vpl_system;
```

If your PostgreSQL requires a password, update the `DATABASE_URL` in `.env`:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/vpl_system
```

### 4. Configure environment variables

Create a `.env` file in the `vpl-system` directory:

```env
DATABASE_URL=postgresql://postgres@localhost:5432/vpl_system
NEXTAUTH_SECRET=your-secret-key-change-this-in-production
NEXTAUTH_URL=http://localhost:3000
PISTON_API_URL=https://emkc.org/api/v2/piston
```

| Variable          | Description                                                  |
|--------------------|--------------------------------------------------------------|
| `DATABASE_URL`     | PostgreSQL connection string                                 |
| `NEXTAUTH_SECRET`  | Secret key for NextAuth.js JWT encryption                    |
| `NEXTAUTH_URL`     | Your app's base URL (http://localhost:3000 in development)    |
| `PISTON_API_URL`   | Piston API endpoint for remote code execution (optional)      |

> **Note:** The `PISTON_API_URL` is optional and only used on the Admin Piston Health Check page. The app executes code locally by default.

### 5. Run database migrations

```bash
npx prisma migrate dev
```

This applies the existing migration found in `prisma/migrations/`.

### 6. Seed the database

```bash
npx tsx prisma/seed.ts
```

This creates the following default accounts:

| Role    | Credentials                       |
|---------|-----------------------------------|
| Admin   | `admin@vpl.com` / `password123`  |
| Teacher | `teacher@vpl.com` / `password123` |
| Student | Roll number: `1AM25MC001` / `password123` |

> Students log in using their **roll number** (not email). Admins and teachers log in with their **email address**.

### 7. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You will be redirected to the login page.

## How to Use

### Logging In

- **Admin** → Email: `admin@vpl.com`, Password: `password123`
- **Teacher** → Email: `teacher@vpl.com`, Password: `password123`
- **Student** → Roll Number: `1AM25MC001`, Password: `password123`

### Admin Dashboard

- View system-wide statistics (users, teachers, students, departments, programs, submissions)
- Manage departments (add/edit/delete)
- Manage users (view all users)
- Piston API health check to verify remote code execution

### Teacher Dashboard

- **Programs** — Create, edit, and manage programming assignments
- **Questions** — Add multiple questions to each program with descriptions and starter code
- **Submissions** — Review student submissions, provide feedback, approve or reject
- **Students** — View all students
- **Settings** — Manage account settings

### Student Dashboard

- **Programs** — Browse available programming assignments
- **Code Editor** — Write and execute code using the built-in Monaco Editor
- **Submissions** — Submit code for teacher review and view submission history
- **Supported languages:** Python, JavaScript, TypeScript, Java, C++, C, Rust, Go

## Project Structure

```
vpl-system/
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Database seed script
│   └── migrations/         # Prisma migrations
├── src/
│   ├── app/
│   │   ├── (auth)/         # Authentication pages (login)
│   │   ├── (dashboard)/
│   │   │   ├── admin/      # Admin dashboard pages
│   │   │   ├── teacher/    # Teacher dashboard pages
│   │   │   └── student/    # Student dashboard pages
│   │   └── api/            # API routes
│   │       ├── auth/       # NextAuth API
│   │       ├── admin/      # Admin API (stats, users, departments, piston)
│   │       ├── teacher/    # Teacher API (programs, questions, submissions)
│   │       ├── student/    # Student API (programs, submissions)
│   │       └── execute/    # Code execution API
│   ├── components/
│   │   ├── ui/             # shadcn/ui components
│   │   └── shared/         # Shared components
│   ├── lib/
│   │   ├── auth.ts         # NextAuth configuration
│   │   ├── prisma.ts       # Prisma client singleton
│   │   ├── redirect.ts     # Role-based redirect helpers
│   │   └── utils.ts        # Utility functions
│   ├── types/              # TypeScript type definitions
│   └── middleware.ts       # Next.js middleware (auth + role checks)
├── .env                    # Environment variables
└── package.json
```

## Available Scripts

| Command             | Description                     |
|---------------------|---------------------------------|
| `npm run dev`       | Start development server        |
| `npm run build`     | Build for production            |
| `npm start`         | Start production server         |
| `npm run lint`      | Run ESLint                      |
| `npx prisma studio` | Open Prisma database GUI        |
| `npx prisma migrate dev` | Apply database migrations  |
| `npx tsx prisma/seed.ts`  | Seed the database          |

## Code Execution

The app executes student code **locally** on the server. Supported languages and their requirements:

| Language    | Required Runtime       |
|-------------|------------------------|
| Python      | `python3`              |
| JavaScript  | `node`                 |
| TypeScript  | `npx tsx` (included)   |
| Java        | `javac` + `java`       |
| C++         | `g++`                  |
| C           | `gcc`                  |
| Rust        | `rustc`                |
| Go          | `go`                   |

Code is executed in temporary directories that are cleaned up immediately after execution, with a 5-second timeout.

The Admin dashboard also includes a **Piston API health check** to test the remote [Piston API](https://github.com/engineer-man/piston) for code execution (the default endpoint is `https://emkc.org/api/v2/piston`).

## Troubleshooting

### "The datasource.url property is required"

Make sure your `.env` file exists in the `vpl-system` directory and contains a valid `DATABASE_URL`.

### Dev server fails to start

```bash
# Clear Next.js cache and try again
rm -rf .next
npm run dev
```

### Database connection refused

Ensure PostgreSQL is running:

```bash
# Docker
docker start vpl-postgres
docker ps

# Or check local PostgreSQL status
pg_isready
```

### Prisma client errors

Regenerate the Prisma client:

```bash
npx prisma generate
```
