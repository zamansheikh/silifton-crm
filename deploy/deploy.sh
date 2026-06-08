#!/usr/bin/env bash
# Silifton CRM — build + (re)start on the VPS.
#
# Invoked by .github/workflows/deploy.yml AFTER it has fetched the latest
# commit (git reset --hard origin/main). Runs as the non-root SSH/deploy user
# from inside $APP_DIR. Safe to run by hand too:  bash deploy/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Public build-time config for the frontend (compiled into the bundle).
# Override by exporting before running this script.
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://crmapi.silifton.com}"

echo "▸ Deploying Silifton CRM from $ROOT"
echo "    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"
echo "    node $(node -v), npm $(npm -v), pm2 $(pm2 -v)"

# --- 0. Secrets check ------------------------------------------------------
# backend/.env holds MONGODB_URI / JWT_SECRET / CLOUDINARY_URL. It is
# git-ignored, so `git reset --hard` never touches it. setup-vps.sh scaffolds
# it on first run; here we just fail loudly if it's missing.
if [ ! -f "$ROOT/backend/.env" ]; then
  echo "::error::backend/.env not found. Create it on the VPS (see deploy/setup-vps.sh) before deploying."
  exit 1
fi

# --- 1. Backend: install + compile TypeScript ------------------------------
echo "▸ Building backend…"
cd "$ROOT/backend"
npm ci
npm run build   # tsc → dist/

# --- 2. Frontend: install + Next production build --------------------------
echo "▸ Building frontend…"
cd "$ROOT/frontend"
npm ci
npm run build   # next build (reads NEXT_PUBLIC_API_URL exported above)

# --- 3. (Re)start both processes via PM2 -----------------------------------
echo "▸ Reloading PM2 processes…"
cd "$ROOT"
# startOrReload = zero-downtime reload if already running, else start fresh.
pm2 startOrReload deploy/ecosystem.config.cjs --update-env
pm2 save

echo "✓ Deploy complete."
pm2 status silifton-crm-api silifton-crm-web || true
