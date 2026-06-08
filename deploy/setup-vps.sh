#!/usr/bin/env bash
# Silifton CRM — one-time VPS bootstrap.
#
# Installs git + Node + pm2 (if missing), clones the repo into $APP_DIR,
# and scaffolds backend/.env so the first deploy can run. Idempotent: safe
# to re-run. Designed to be invoked as root by the deploy workflow:
#
#   sudo env APP_DIR=/var/www/silifton-crm REPO_URL=… BRANCH=main RUN_USER=deploy \
#     bash deploy/setup-vps.sh
#
# …or by hand on the box. Most fields fall back to sensible defaults.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/silifton-crm}"
BRANCH="${BRANCH:-main}"
RUN_USER="${RUN_USER:-${SUDO_USER:-$USER}}"
REPO_URL="${REPO_URL:-}"
NODE_MAJOR="${NODE_MAJOR:-22}"

echo "▸ setup-vps.sh  APP_DIR=$APP_DIR  BRANCH=$BRANCH  RUN_USER=$RUN_USER"

# --- 1. System packages ----------------------------------------------------
if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y curl ca-certificates git build-essential
fi

# --- 2. Node.js (NodeSource) -----------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "▸ Installing Node.js ${NODE_MAJOR}.x via NodeSource…"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

# --- 3. pm2 ----------------------------------------------------------------
if ! command -v pm2 >/dev/null 2>&1; then
  echo "▸ Installing pm2 globally…"
  npm install -g pm2
fi

# --- 4. Clone repo ---------------------------------------------------------
if [ ! -d "$APP_DIR/.git" ]; then
  if [ -z "$REPO_URL" ]; then
    echo "::error::REPO_URL not set and $APP_DIR has no clone yet."
    exit 1
  fi
  echo "▸ Cloning $REPO_URL → $APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

# --- 5. Scaffold backend/.env (secrets) ------------------------------------
# Generated with a random JWT_SECRET; the operator fills in MONGODB_URI and
# CLOUDINARY_URL once. Never overwritten on subsequent runs.
ENV_FILE="$APP_DIR/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "▸ Scaffolding $ENV_FILE (FILL IN THE SECRETS)…"
  JWT="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
  cat > "$ENV_FILE" <<EOF
# Silifton CRM — backend secrets (this file is git-ignored).
# Production runtime config (PORT, CORS_ORIGIN, NODE_ENV…) is set by PM2 in
# deploy/ecosystem.config.cjs, so you only need the secrets here.
MONGODB_URI="PASTE_YOUR_ATLAS_URI_HERE"
JWT_SECRET="$JWT"
CLOUDINARY_URL="PASTE_YOUR_CLOUDINARY_URL_HERE"
EOF
  echo "::warning::Edit $ENV_FILE — set MONGODB_URI and CLOUDINARY_URL, then run: npm --prefix $APP_DIR/backend run seed"
fi

# --- 6. Ownership + pm2 startup --------------------------------------------
if id "$RUN_USER" >/dev/null 2>&1; then
  chown -R "$RUN_USER:$RUN_USER" "$APP_DIR"
  # Make pm2 resurrect on reboot under the deploy user.
  env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$RUN_USER" --hp "$(eval echo "~$RUN_USER")" >/dev/null 2>&1 || true
fi

echo "✓ setup-vps.sh complete. node $(node -v), pm2 $(pm2 -v)"
