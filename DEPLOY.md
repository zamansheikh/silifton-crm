# Deploying Silifton CRM

The CRM ships to a **VPS** via GitHub Actions (the same server that hosts the
portfolio). Two PM2 processes sit behind nginx + TLS:

| Subdomain | Serves | Process | Local port |
| --- | --- | --- | --- |
| `crm.silifton.com` | Next.js frontend | `silifton-crm-web` | 7010 |
| `crmapi.silifton.com` | Express API | `silifton-crm-api` | 7011 |

Database is **MongoDB Atlas** (unchanged). Auth uses an httpOnly session cookie
(`Secure` + `SameSite=None` in prod) plus a Bearer-token fallback — both work
across the shared `silifton.com` parent domain.

> Deploy artifacts live in [`deploy/`](./deploy) and
> [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). They mirror
> the portfolio's `appleboy/ssh-action` + PM2 pattern; the only differences are
> a separate `APP_DIR=/var/www/silifton-crm` and unique PM2 process names, so the
> two apps never collide.

---

## How it works

On every push to `main`, the workflow SSHes into the VPS and:

1. Bootstraps git/Node/pm2 via `deploy/setup-vps.sh` **only if missing** (a no-op
   on this box since the portfolio already installed them).
2. Clones the repo into `/var/www/silifton-crm` on first run.
3. `git reset --hard origin/main`, then runs `deploy/deploy.sh`, which:
   - `npm ci` + `npm run build` for **backend** (tsc → `dist/`)
   - `npm ci` + `npm run build` for **frontend** (`next build`, with
     `NEXT_PUBLIC_API_URL=https://crmapi.silifton.com` baked in)
   - `pm2 startOrReload deploy/ecosystem.config.cjs` (zero-downtime) + `pm2 save`

Non-secret runtime config (ports, `CORS_ORIGIN`, `NODE_ENV`) lives in
`deploy/ecosystem.config.cjs`. **Secrets** (`MONGODB_URI`, `JWT_SECRET`,
`CLOUDINARY_URL`) live in `backend/.env` on the server — git-ignored, never
committed, and untouched by `git reset --hard`.

---

## First-time setup (once)

### 1. GitHub secrets

In this repo → **Settings → Secrets and variables → Actions**, add the same
values your portfolio uses:

| Secret | Notes |
| --- | --- |
| `VPS_HOST` | server IP / hostname |
| `VPS_USER` | the deploy/SSH user |
| `VPS_SSH_KEY` | private key for that user |
| `VPS_SSH_PORT` | optional, defaults to `22` |

### 2. DNS

Point both subdomains at the VPS:

```
crm.silifton.com      A   <VPS_IP>
crmapi.silifton.com   A   <VPS_IP>
```

### 3. First deploy

Push to `main` (or run the workflow manually). It clones the repo and, because
`backend/.env` doesn't exist yet, `setup-vps.sh` scaffolds it with a random
`JWT_SECRET` and placeholders. The deploy then **fails on purpose** until you
fill in the secrets:

```bash
ssh <user>@<VPS_IP>
nano /var/www/silifton-crm/backend/.env     # paste MONGODB_URI + CLOUDINARY_URL
npm --prefix /var/www/silifton-crm/backend run seed   # seed Atlas once
```

Re-run the workflow → it builds and starts both PM2 processes.

### 4. nginx + TLS

```bash
cd /var/www/silifton-crm
sudo cp deploy/nginx/crm.silifton.com.conf    /etc/nginx/sites-available/
sudo cp deploy/nginx/crmapi.silifton.com.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/crm.silifton.com.conf    /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/crmapi.silifton.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d crm.silifton.com -d crmapi.silifton.com
```

---

## Verify

- `https://crmapi.silifton.com/api/health` → `{ "ok": true, … }`
- `https://crm.silifton.com` → sign in with `admin@silifton.com` / `silifton`
- `pm2 status` on the box shows `silifton-crm-api` + `silifton-crm-web` online.

## Handy commands (on the VPS)

```bash
pm2 logs silifton-crm-api        # tail API logs
pm2 logs silifton-crm-web        # tail frontend logs
pm2 restart silifton-crm-api     # manual restart
pm2 status                      # all processes (portfolio + CRM)
```

## Env var reference

**Backend** — secrets in `backend/.env`, the rest injected by PM2:

| var | where | example |
| --- | --- | --- |
| `MONGODB_URI` | `.env` (secret) | `mongodb+srv://…` |
| `JWT_SECRET` | `.env` (secret, auto-generated) | 32 random bytes |
| `CLOUDINARY_URL` | `.env` (secret) | `cloudinary://key:secret@cloud` |
| `PORT` | ecosystem.config.cjs | `7011` |
| `CORS_ORIGIN` | ecosystem.config.cjs | `https://crm.silifton.com` |
| `NODE_ENV` | ecosystem.config.cjs | `production` |

**Frontend** — compiled in at build time by `deploy.sh`:

| var | example |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://crmapi.silifton.com` |
