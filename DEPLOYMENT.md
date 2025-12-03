# Deployment Guide

This guide covers how to deploy the unified-apps monorepo to production.

## Production Server Details

- **VPS Path**: `/opt/tofu-apps/`
- **User**: `deploy`
- **Server**: `100.76.160.26`
- **Process Manager**: PM2

## Quick Deploy

To deploy all apps to production:

```bash
# 1. Build all frontends and backend
npm run build:all

# 2. Deploy to VPS (from project root)
./scripts/deploy.sh
```

## Manual Deployment Steps

### 1. Build Applications

```bash
# Build wishlist-web (production mode uses /api/wishlist)
cd apps/wishlist-web
npm run build

# Build calendar-web (production mode uses /api/calendar)
cd ../calendar-web
npm run build

# Build backend
cd ../backend
npm run build
```

### 2. Deploy Files

```bash
# Deploy wishlist frontend
rsync -avz --delete apps/backend/public/wishlist/ deploy@100.76.160.26:/opt/tofu-apps/apps/backend/public/wishlist/

# Deploy calendar frontend
rsync -avz --delete apps/backend/public/calendar/ deploy@100.76.160.26:/opt/tofu-apps/apps/backend/public/calendar/

# Deploy backend code
rsync -avz apps/backend/dist/ deploy@100.76.160.26:/opt/tofu-apps/apps/backend/dist/
```

### 3. Restart Services

```bash
ssh deploy@100.76.160.26 'pm2 restart unified-backend'
```

### 4. Verify Deployment

After deployment, test the applications:
- `https://wishlist.billyeatstofu.com/`
- `https://cal.billyeatstofu.com/`

**Note**: Cloudflare cache purging is no longer necessary as cache headers ensure immediate updates.

## Environment Variables

### Development (Local)

Wishlist app uses `.env.development`:
```env
VITE_API_URL=http://localhost:3000/api/wishlist
```

Calendar app uses `.env.development`:
```env
VITE_API_URL=http://localhost:3000/api/calendar
```

### Production (VPS)

Wishlist app uses `.env.production`:
```env
VITE_API_URL=/api/wishlist
```

Calendar app uses `.env.production`:
```env
VITE_API_URL=/api/calendar
```

**Note**: Environment variables are baked into the build at **build time**, not runtime.

## Cache Strategy

The server implements smart caching headers:

### HTML Files (`index.html`)
- `Cache-Control: public, max-age=0, must-revalidate`
- Always checks for updates
- Ensures users get new deployments immediately

### Hashed Assets (JS/CSS with content hash)
- `Cache-Control: public, max-age=31536000, immutable`
- Cached for 1 year
- Filenames include content hash (e.g., `index-B1bHBMbf.js`)
- New builds = new filenames = automatic cache bust

### Other Assets (images, fonts)
- `Cache-Control: public, max-age=604800`
- Cached for 1 week

## Troubleshooting

### Site shows old version after deployment

1. **Hard refresh browser**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Verify correct files on server**:
   ```bash
   ssh deploy@100.76.160.26 'cat /opt/tofu-apps/apps/backend/public/wishlist/index.html'
   ```
3. **Check build artifacts**: Ensure the local build has the latest changes before deploying

### API calls hitting localhost

This means an old build is deployed. The build must be done with `.env.production` settings:
```bash
cd apps/wishlist-web
rm -rf dist
NODE_ENV=production npm run build
```

### Wrong deployment location

Always deploy to `/opt/tofu-apps/`, NOT `/home/deploy/unified-apps/`.

The PM2 process runs from `/opt/tofu-apps/`.

## Deployment Checklist

- [ ] Built with production environment variables
- [ ] Deployed to `/opt/tofu-apps/` (correct location)
- [ ] Restarted PM2 process (if backend changed)
- [ ] Verified in browser (hard refresh)
- [ ] Checked API calls are hitting production endpoints

## Related Files

- `scripts/copy-frontends.js` - Copies built frontends to backend public folder
- `apps/backend/src/server.ts` - Server with caching headers
- `ARCHITECTURE.md` - Overall system architecture
