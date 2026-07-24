#!/bin/sh
set -e

echo "=========================================="
echo "  VPL System — Starting up..."
echo "=========================================="

# ── Step 1: Run database migrations ────────────────────────────
echo "[1/3] Running database migrations..."
npx prisma migrate deploy
echo "      Migrations complete."

# ── Step 2: Seed the database (skip if already seeded) ─────────
echo "[2/3] Seeding database..."
npx prisma db seed || echo "      Seed skipped (already seeded or error — continuing)."
echo "      Seed step complete."

# ── Step 3: Start the Next.js production server ────────────────
echo "[3/3] Starting Next.js server on port 3000..."
echo "=========================================="
exec npm start
