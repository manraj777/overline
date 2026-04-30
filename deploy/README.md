# EC2 Deployment

This directory contains the production deployment assets for the Overline backend
running on a single AWS EC2 instance, fronted by Caddy for HTTPS.

```
Internet ──HTTPS──▶ Caddy (:443) ──HTTP──▶ NestJS (PM2, :3001)
```

## Files

- `Caddyfile` — Caddy reverse proxy + auto-TLS config. Replace `api.overline.in`
  with the real domain pointing at the EC2 public IP.
- `deploy.sh` — One-shot redeploy script (pull, install, build, prisma, restart).
  Run it on the EC2 host inside the repo root.

## One-time EC2 setup

SSH into the instance, then:

```bash
# 1. Install Caddy (Ubuntu / Debian)
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# 2. Open firewall (Security Group too) for 80/443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 3. Drop the Caddyfile in place
sudo cp ~/overline/deploy/Caddyfile /etc/caddy/Caddyfile

# 4. Validate + reload
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy
```

After this, `https://api.overline.in` will serve your backend with a Let's
Encrypt cert, auto-renewed by Caddy.

## DNS

Create an `A` record:

```
api.overline.in  →  <EC2 public IP>   TTL 300
```

## Google Cloud Console

In **APIs & Services → Credentials → OAuth 2.0 Client → Web client**:

- **Authorized JavaScript origins:**
  - `https://api.overline.in`
  - `https://<user-vercel-domain>`
  - `https://<admin-vercel-domain>`
- **Authorized redirect URIs:**
  - `https://api.overline.in/api/v1/auth/google/callback`

Google rejects raw IPs and plain `http://` in production OAuth clients — that is
why HTTPS via Caddy is required.

## Backend `.env` (on EC2)

```bash
NODE_ENV=production
PORT=3001

BACKEND_URL=https://api.overline.in
API_URL=https://api.overline.in
APP_URL=https://<user-vercel-domain>
ADMIN_URL=https://<admin-vercel-domain>

USER_WEB_URL=https://<user-vercel-domain>
ADMIN_WEB_URL=https://<admin-vercel-domain>

GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://api.overline.in/api/v1/auth/google/callback

CORS_ORIGIN=https://<user-vercel-domain>,https://<admin-vercel-domain>

# Upstash REQUIRES TLS — note `rediss://` (double s)
REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379

DATABASE_URL=postgresql://...   # Supabase pooled URL
JWT_SECRET=<>=32 chars or base64-encoded buffer>
```

## Vercel envs (both `user-web` and `admin-web` projects)

```
NEXT_PUBLIC_BACKEND_URL=https://api.overline.in
NEXT_PUBLIC_API_URL=https://api.overline.in/api/v1
```

Redeploy each project after saving.

## Redeploying

After pushing to `main` from your laptop:

```bash
ssh ec2
cd ~/overline
./deploy/deploy.sh
```

Use `./deploy/deploy.sh --with-prisma` if you changed `schema.prisma`.
