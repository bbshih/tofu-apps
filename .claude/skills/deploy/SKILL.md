---
name: deploy
description: Deploy Wishlist and Calendar apps to production VPS. Use this skill when the user asks to deploy, push to production, or update the live site.
---

# Deploy Unified Apps Skill

You are a deployment assistant for the unified-apps monorepo. Your job is to deploy the Wishlist and Calendar applications to the production VPS.

## Project Information

**Production Server:**
- Host: `deploy@100.76.160.26`
- Path: `/opt/tofu-apps/`
- Process Manager: PM2
- Backend process: `unified-backend`

**Applications:**
- Wishlist: https://wishlist.billyeatstofu.com
- Calendar: https://cal.billyeatstofu.com

**CDN:** Cloudflare (caching must be purged after deployment)

## Deployment Steps

When the user asks you to deploy, follow these steps:

### 1. Build Applications

Build all applications with production environment variables:

```bash
# Build wishlist frontend (uses .env.production with VITE_API_URL=/api/wishlist)
cd apps/wishlist-web
npm run build

# Build calendar frontend (uses .env.production with VITE_API_URL=/api/calendar)
cd ../calendar-web
npm run build

# Build backend
cd ../backend
npm run build

# Or build everything at once from project root:
npm run build:all
```

### 2. Copy Frontends to Backend Public Folder

```bash
# From project root
npm run copy-frontends
```

This copies:
- `apps/wishlist-web/dist/` → `apps/backend/public/wishlist/`
- `apps/calendar-web/dist/` → `apps/backend/public/calendar/`

### 3. Deploy to VPS

Deploy the built files to production:

```bash
# Deploy wishlist frontend
rsync -avz --delete apps/backend/public/wishlist/ deploy@100.76.160.26:/opt/tofu-apps/apps/backend/public/wishlist/

# Deploy calendar frontend
rsync -avz --delete apps/backend/public/calendar/ deploy@100.76.160.26:/opt/tofu-apps/apps/backend/public/calendar/

# Deploy backend code (if backend changed)
rsync -avz apps/backend/dist/ deploy@100.76.160.26:/opt/tofu-apps/apps/backend/dist/
```

**IMPORTANT:** Always deploy to `/opt/tofu-apps/`, NOT `~/unified-apps/`

### 4. Restart PM2 Process

```bash
ssh deploy@100.76.160.26 'pm2 restart unified-backend'
```

### 5. Verify Deployment

Check that the server is running:

```bash
# Check PM2 status
ssh deploy@100.76.160.26 'pm2 status'

# Check logs for errors
ssh deploy@100.76.160.26 'pm2 logs unified-backend --lines 20 --nostream'

# Verify correct files are deployed
ssh deploy@100.76.160.26 'cat /opt/tofu-apps/apps/backend/public/wishlist/index.html | grep index-'
```

Verify the API URL in the deployed JS bundle:

```bash
ssh deploy@100.76.160.26 "node -e \"const fs=require('fs'); const content=fs.readFileSync('/opt/tofu-apps/apps/backend/public/wishlist/assets/index-*.js','utf8'); const match=content.match(/h1=\\\"([^\\\"]+)\\\"/); console.log('API URL:', match ? match[1] : 'not found');\""
```

Expected: `API URL: /api/wishlist` (NOT localhost)

### 6. Clear Cloudflare Cache

**CRITICAL:** After deployment, you MUST clear Cloudflare's cache:

Tell the user to:
1. Go to Cloudflare Dashboard
2. Navigate to **Caching** → **Configuration**
3. Click **Purge Everything**

Or purge specific URLs:
- `https://wishlist.billyeatstofu.com/`
- `https://wishlist.billyeatstofu.com/assets/*`
- `https://cal.billyeatstofu.com/`
- `https://cal.billyeatstofu.com/assets/*`

**Why this is critical:** Cloudflare caches both HTML and assets. Without purging, users will see old code.

### 7. Test in Browser

Instruct the user to:
1. Open incognito/private window
2. Visit https://wishlist.billyeatstofu.com
3. Open DevTools → Network tab
4. Check that API calls go to `/api/wishlist` (NOT localhost)
5. Try logging in and using the app

## Quick Deploy Command

For convenience, use the automated deploy script:

```bash
./scripts/deploy.sh
```

This script will:
- Build all apps
- Copy frontends to backend public folder
- Deploy to VPS via rsync
- Restart PM2 process
- Remind you to purge Cloudflare cache

## Troubleshooting

### Problem: Site shows old version

**Cause:** Cloudflare cache not purged

**Solution:**
1. Purge Cloudflare cache (see step 6)
2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### Problem: API calls hitting localhost

**Cause:** App was built with `.env` instead of `.env.production`

**Solution:**
1. Verify `.env.production` exists with `VITE_API_URL=/api/wishlist`
2. Delete dist folder: `rm -rf apps/wishlist-web/dist`
3. Rebuild: `cd apps/wishlist-web && NODE_ENV=production npm run build`
4. Redeploy

### Problem: 404 errors for static files

**Cause:** Files deployed to wrong location

**Solution:**
1. Check files are in `/opt/tofu-apps/` (NOT `~/unified-apps/`)
2. Verify with: `ssh deploy@100.76.160.26 'ls -la /opt/tofu-apps/apps/backend/public/wishlist/'`

### Problem: PM2 process not running

**Solution:**
```bash
ssh deploy@100.76.160.26 'pm2 list'
ssh deploy@100.76.160.26 'pm2 logs unified-backend --err --lines 30'
```

Check logs for errors, fix, then restart.

## Pre-Deployment Checklist

Before deploying, verify:

- [ ] `.env.production` files exist with correct API URLs
- [ ] All code changes are committed to git
- [ ] Backend builds without errors
- [ ] Frontend builds without errors
- [ ] You're deploying to `/opt/tofu-apps/` (correct location)

## Post-Deployment Checklist

After deploying, verify:

- [ ] PM2 process restarted successfully
- [ ] No errors in PM2 logs
- [ ] Cloudflare cache purged
- [ ] Site loads in incognito mode
- [ ] API calls use production endpoints (not localhost)
- [ ] Login and core features work

## Important Notes

1. **Environment Variables:** Vite bakes environment variables into the build at **build time**, not runtime. Always build with production env vars.

2. **Cache Strategy:** The server uses smart caching:
   - HTML: `max-age=0, must-revalidate` (always fresh)
   - Hashed assets (JS/CSS): `max-age=31536000, immutable` (1 year)
   - This means new deployments need cache purging for HTML

3. **Deployment Path:** Always use `/opt/tofu-apps/`, never `~/unified-apps/`

4. **Cloudflare:** Always purge cache after deployment - this is not optional

## Example Deployment Session

```bash
# 1. Build everything
npm run build:all

# 2. Deploy using automated script
./scripts/deploy.sh

# 3. Verify
curl -I https://wishlist.billyeatstofu.com/

# 4. Remind user to purge Cloudflare cache
echo "⚠️  Don't forget to purge Cloudflare cache!"
```

## Related Documentation

- `DEPLOYMENT.md` - Full deployment guide
- `ARCHITECTURE.md` - System architecture
- `scripts/deploy.sh` - Automated deployment script
- `scripts/copy-frontends.js` - Frontend copy script

## When to Use This Skill

Use this skill when the user asks to:
- "Deploy to production"
- "Push to VPS"
- "Update the live site"
- "Deploy changes"
- "Deploy wishlist/calendar"

Always follow ALL steps, especially cache purging, to ensure successful deployment.
