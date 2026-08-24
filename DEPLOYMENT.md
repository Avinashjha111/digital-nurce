# Deployment Guide — Digital Nurse

This file is written so that Claude Code (or a human) can set this project up on a **brand-new, fresh VPS** from scratch, without any prior context about this project. Follow the steps in order.

The app is a single Next.js 16 (App Router) application — one process handles both the UI and all API routes (including the WhatsApp webhook and cron endpoints). There is no separate frontend/backend split. The database is Supabase and is never self-hosted — only the app server itself is self-hosted.

## What you need before starting

- A VPS running **Ubuntu 22.04 or 24.04 LTS**, with root SSH access
- A domain name you can edit DNS records for
- The GitHub repo URL: `https://github.com/Avinashjha111/digital-nurce`
- Your Supabase project's URL + keys (same Supabase project keeps being used — never self-hosted, never changes)
- Your Meta WhatsApp Cloud API credentials (entered later through the app's own "Connect WhatsApp" UI, not into this file)

## Step 1 — Connect to the VPS

From your own machine, generate a dedicated SSH key for this server (don't reuse a personal key):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/digitalnurse_vps -N "" -C "digitalnurse-vps-deploy"
```

Add the **public** key (`~/.ssh/digitalnurse_vps.pub` — safe to share, it's not a secret) to the VPS via your hosting provider's panel ("SSH Keys" section), or by pasting it into `~/.ssh/authorized_keys` on the server through their web-based browser terminal.

Then connect:

```bash
ssh -i ~/.ssh/digitalnurse_vps root@YOUR_SERVER_IP
```

Never share the VPS root password with anyone (including an AI assistant) — SSH keys avoid ever needing to.

## Step 2 — Install required software

Run on the VPS:

```bash
# Node.js 22 LTS (Supabase's client libraries require Node >= 22)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install nodejs -y

# PM2 (keeps the app running 24/7, restarts on crash/reboot)
npm install -g pm2

# Nginx (reverse proxy) + Certbot (free SSL)
apt install nginx certbot python3-certbot-nginx git -y
```

Verify: `node --version` should show v22.x, `pm2 --version`, `nginx -v`, `certbot --version`, `git --version` should all print something.

## Step 3 — Clone the repo

```bash
mkdir -p /var/www/digital-nurse
git clone https://github.com/Avinashjha111/digital-nurce.git /var/www/digital-nurse
cd /var/www/digital-nurse
```

## Step 4 — Set up the single `.env.local` file

**All configuration lives in one file: `/var/www/digital-nurse/.env.local`.** Nothing is hardcoded anywhere else in the code. Create it:

```bash
nano /var/www/digital-nurse/.env.local
```

Paste this, filling in real values (see `.env.example` in the repo root for the authoritative list if this file has drifted):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
GEMINI_API_KEY=
WHATSAPP_WEBHOOK_SECRET=
WHATSAPP_APP_SECRET=
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN
CRON_SECRET=
```

- **Supabase values**: from your Supabase project's Settings → API. This is the SAME Supabase project every time — never create a new one for a new server.
- **CRON_SECRET**: any random string, e.g. generate one with `openssl rand -hex 32`. Used to authenticate the cron requests below.
- **WHATSAPP_APP_SECRET**: optional — only needed for webhook signature verification.
- Never commit this file to git. It's already in `.gitignore`.

Lock down permissions: `chmod 600 /var/www/digital-nurse/.env.local`

## Step 5 — Install dependencies and build

```bash
cd /var/www/digital-nurse
npm install
npm run build
```

If `npm ci` is used instead and fails with a lock-file-out-of-sync error, use `npm install` instead and commit the regenerated `package-lock.json` back to the repo.

## Step 6 — Start with PM2

The repo already includes `ecosystem.config.js` (a single, portable process definition — no ad-hoc flags to remember):

```bash
cd /var/www/digital-nurse
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the one printed command to enable auto-start on reboot, if not already set up
```

The app now runs on `localhost:3000`.

## Step 7 — Nginx reverse proxy

```bash
nano /etc/nginx/sites-available/YOUR_DOMAIN
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -sf /etc/nginx/sites-available/YOUR_DOMAIN /etc/nginx/sites-enabled/YOUR_DOMAIN
nginx -t
systemctl reload nginx
```

## Step 8 — Point DNS at the server

At your domain registrar's DNS settings, add:

| Type | Name | Value |
|---|---|---|
| A | `@` | your server's IP |
| A | `www` | your server's IP |

Wait for propagation (usually minutes, can take up to a couple hours). Check with `nslookup YOUR_DOMAIN 8.8.8.8` — it should return the server's IP.

## Step 9 — SSL via Certbot

Once DNS has propagated:

```bash
certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN --non-interactive --agree-tos -m YOUR_EMAIL --redirect
```

This gets a free certificate, edits the Nginx config to serve HTTPS, redirects HTTP → HTTPS, and sets up auto-renewal. Verify: `curl -I https://YOUR_DOMAIN` should return `200 OK`.

## Step 10 — Cron jobs (replaces Vercel Cron)

The app has two scheduled routes that used to be triggered by Vercel Cron (`/api/cron/reminders` every 15 minutes, `/api/cron/follow-ups` daily). On a VPS, replicate this with a real crontab hitting the live domain, authenticated with `CRON_SECRET`.

Create a small helper script so the secret is read from `.env.local` rather than pasted into crontab in plain text:

```bash
nano /usr/local/bin/dn-cron.sh
```

```bash
#!/bin/bash
ENV_FILE=/var/www/digital-nurse/.env.local
SECRET=$(grep '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2-)
STATUS=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $SECRET" "https://YOUR_DOMAIN$1")
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $1 -> HTTP $STATUS" >> /var/log/dn-cron.log
```

```bash
chmod +x /usr/local/bin/dn-cron.sh
crontab -e
```

Add these two lines:

```
*/15 * * * * /usr/local/bin/dn-cron.sh /api/cron/reminders
0 3 * * * /usr/local/bin/dn-cron.sh /api/cron/follow-ups
```

Check `/var/log/dn-cron.log` to confirm they're firing with `HTTP 200`.

## Step 11 — Webhook URLs

The WhatsApp webhook route is `https://YOUR_DOMAIN/api/webhooks/whatsapp`. If the domain is unchanged from a previous deployment, no action is needed in the Meta App dashboard. If the domain changed, update the webhook Callback URL under Meta App Dashboard → WhatsApp → Configuration to the new URL, using the same `WHATSAPP_WEBHOOK_SECRET` as the Verify Token.

## Deploying updates later

```bash
cd /var/www/digital-nurse
git pull origin main
npm install       # only if package.json changed
npm run build
pm2 restart digital-nurse
```

## Migrating to a different VPS provider in the future

1. Follow Steps 1–3 on the new server.
2. Copy `.env.local` from the old server to the new one directly (`scp`), so no secret is ever retyped.
3. Follow Steps 5–11 on the new server.
4. Update DNS to the new server's IP.
5. Once confirmed working, decommission the old server.

Everything the app needs to run lives in `.env.local` + this file + `ecosystem.config.js` — nothing else should ever need to be reconstructed from memory.
