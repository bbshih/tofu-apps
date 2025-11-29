# Migration Guide: Replacing Old Unified App with New Monorepo

This guide helps you migrate from your existing unified app deployment to this new monorepo structure.

## Pre-Migration Checklist

### 1. Backup Everything

**CRITICAL: Do this before making any changes!**

```bash
# SSH into your VPS
ssh your-username@your-vps-ip

# Backup databases
pg_dump wishlist > ~/backups/wishlist_backup_$(date +%Y%m%d_%H%M%S).sql
pg_dump calendar > ~/backups/calendar_backup_$(date +%Y%m%d_%H%M%S).sql

# Backup current application directory
tar -czf ~/backups/tofu-apps-old_$(date +%Y%m%d_%H%M%S).tar.gz /opt/tofu-apps/
# Or wherever your current app is located

# Backup PM2 configuration
pm2 save
cp ~/.pm2/dump.pm2 ~/backups/pm2_dump_$(date +%Y%m%d_%H%M%S).pm2

# Backup environment file
cp /opt/tofu-apps/.env ~/backups/.env.backup
```

### 2. Identify Your Current Setup

```bash
# Check current directory location
pm2 list
# Look for the "cwd" column to see where your app is running

# Common locations:
# - /opt/tofu-apps
# - /home/your-user/tofu-apps
# - /var/www/tofu-apps

# Check current PM2 processes
pm2 list
pm2 describe unified-backend
pm2 describe discord-bot  # if you have this
```

## Migration Strategy

You have two options:

### Option A: Clean Replacement (Recommended)

Replace the old app entirely with the new monorepo.

**Pros:**
- Clean slate
- No conflicts
- Fresh monorepo structure

**Cons:**
- Need to reconfigure everything
- Brief downtime during migration

### Option B: Side-by-Side Migration

Deploy the new app alongside the old one temporarily.

**Pros:**
- Can test before switching
- Easy rollback
- Minimal downtime

**Cons:**
- Uses more disk space
- Two apps running temporarily

---

## Option A: Clean Replacement (Step-by-Step)

### Step 1: Stop the Old Application

```bash
# Stop PM2 processes
pm2 stop all
pm2 list  # Verify everything is stopped
```

### Step 2: Move Old App (Don't Delete Yet!)

```bash
# Move old app to backup location
sudo mv /opt/tofu-apps /opt/tofu-apps-old-$(date +%Y%m%d)

# Or if in home directory:
mv ~/tofu-apps ~/tofu-apps-old-$(date +%Y%m%d)
```

### Step 3: Clone New Monorepo

```bash
# Clone from your repository
cd /opt
sudo git clone <your-repo-url> tofu-apps

# Or if you don't have a remote yet:
# 1. On local machine: git push origin main
# 2. On VPS: git clone <your-repo-url>

# Set ownership (if using /opt)
sudo chown -R your-username:your-username /opt/tofu-apps
```

### Step 4: Copy Environment Configuration

```bash
# Copy .env from old app
cp /opt/tofu-apps-old-*/.env /opt/tofu-apps/.env

# Verify all required variables are present
nano /opt/tofu-apps/.env

# Make sure you have:
# - All database credentials
# - JWT secrets
# - Discord tokens (if using Calendar)
# - Port configurations
# - Upload directory paths
```

### Step 5: Install Dependencies

```bash
cd /opt/tofu-apps
npm install
```

### Step 6: Run Migrations

**Important:** This includes the new bookmarklet columns!

```bash
# Run wishlist migration (includes bookmarklet columns)
npm run migrate:wishlist

# Run calendar migration (if you use calendar)
npm run migrate:calendar

# Or run both
npm run migrate:all
```

### Step 7: Build Everything

```bash
npm run build:all
```

This will:
- Build backend (TypeScript → JavaScript)
- Build wishlist frontend
- Build calendar frontend (if exists)
- Copy frontends to `apps/backend/public/`

### Step 8: Verify Uploads Directory

```bash
# Check if uploads directory exists
ls -la apps/backend/uploads/

# If you have images from old app, copy them:
cp -r /opt/tofu-apps-old-*/uploads/* /opt/tofu-apps/apps/backend/uploads/
# Or wherever your old uploads were

# Set permissions
chmod -R 755 apps/backend/uploads/
```

### Step 9: Update PM2 Configuration

The new monorepo has `ecosystem.config.cjs` at the root.

```bash
# View the new PM2 config
cat ecosystem.config.cjs

# Delete old PM2 processes
pm2 delete all

# Start new configuration
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Ensure PM2 restarts on reboot
pm2 startup
# Follow the command it outputs (usually starts with sudo)
```

### Step 10: Verify Deployment

```bash
# Check PM2 status
pm2 status
pm2 logs

# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:3000/api/wishlist/health

# Check if frontend is accessible
curl http://localhost:3000/wishlist
curl http://localhost:3000/calendar
```

### Step 11: Update Nginx (if using)

If you have Nginx as a reverse proxy, verify the configuration still works:

```bash
# Test Nginx configuration
sudo nginx -t

# If using Nginx, config should look like:
# server {
#     listen 80;
#     server_name your-domain.com;
#
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# }

# Reload Nginx if needed
sudo systemctl reload nginx
```

### Step 12: Test the Application

1. **Visit your domain:** `https://your-domain.com/wishlist`
2. **Login** with existing credentials
3. **Verify wishlists and items** are still there
4. **Test new bookmarklet feature:**
   - Click "📌 Bookmarklet" in header
   - Generate token
   - Test adding an item

### Step 13: Monitor for Issues

```bash
# Watch logs for errors
pm2 logs --lines 100

# Monitor resources
pm2 monit

# Check for any database connection errors
pm2 logs unified-backend | grep -i error
```

### Step 14: Remove Old App (After Verification)

**Only do this after confirming everything works!**

```bash
# After 1-2 days of stable operation:
sudo rm -rf /opt/tofu-apps-old-*

# Keep database backups for at least a month
# Keep .env backup permanently
```

---

## Option B: Side-by-Side Migration

### Step 1: Deploy New App to Different Directory

```bash
# Clone to new location
cd /opt
sudo git clone <your-repo-url> tofu-apps-new
sudo chown -R your-username:your-username /opt/tofu-apps-new
```

### Step 2: Configure New App

```bash
cd /opt/tofu-apps-new

# Copy and modify .env
cp /opt/tofu-apps/.env .env

# IMPORTANT: Use different port to avoid conflicts
nano .env
# Change: PORT=3001 (or any unused port)
```

### Step 3: Install and Build

```bash
npm install
npm run migrate:all  # Runs on same databases
npm run build:all
```

### Step 4: Start New App

```bash
# Start on different port
PORT=3001 pm2 start ecosystem.config.cjs --name unified-backend-new
pm2 save
```

### Step 5: Test New App

```bash
# Test on new port
curl http://localhost:3001/health
curl http://localhost:3001/api/wishlist/health

# Test bookmarklet feature
# Visit http://localhost:3001/wishlist in browser
```

### Step 6: Switch Over

Once verified:

```bash
# Stop old app
pm2 stop unified-backend

# Update Nginx to point to new port
sudo nano /etc/nginx/sites-available/your-domain
# Change proxy_pass to http://localhost:3001

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Clean Up

After confirming new app works:

```bash
# Delete old PM2 process
pm2 delete unified-backend

# Rename new process
pm2 delete unified-backend-new
cd /opt/tofu-apps-new
pm2 start ecosystem.config.cjs
pm2 save

# Update directory
sudo rm -rf /opt/tofu-apps-old
sudo mv /opt/tofu-apps /opt/tofu-apps-old
sudo mv /opt/tofu-apps-new /opt/tofu-apps
```

---

## Key Differences in New Monorepo

### Directory Structure Changes:

**Old structure:**
```
tofu-apps/
├── backend/
├── wishlist-web/
├── calendar-web/
└── discord-bot/
```

**New structure:**
```
tofu-apps/
├── apps/
│   ├── backend/
│   ├── wishlist-web/
│   ├── calendar-web/
│   └── discord-bot/
├── scripts/
├── openspec/
└── package.json (root with workspaces)
```

### New Features in This Monorepo:

1. **npm workspaces** - Dependencies managed at root
2. **OpenSpec** - Structured change proposals and documentation
3. **Bookmarklet feature** - New wishlist item addition method
4. **Project documentation** - `openspec/project.md` for AI context
5. **Build scripts** - Simplified `npm run build:all`

### Environment Variables:

No changes needed! Same .env variables as before:
- `PORT`, `NODE_ENV`
- Database credentials (WISHLIST_DB_*, DATABASE_URL)
- JWT secrets
- Discord credentials (if using calendar)

---

## Troubleshooting

### Database Connection Errors

```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connections
psql -U wishlist_user -d wishlist -c "SELECT 1"
psql -U calendar -d calendar -c "SELECT 1"

# Check .env has correct credentials
cat .env | grep DB
```

### Migration Fails

```bash
# Check which migrations have run
psql -U wishlist_user -d wishlist -c "\d users"
# Should show bookmarklet_token columns

# Re-run migration if needed
npm run migrate:wishlist
```

### Frontend Not Loading

```bash
# Check if frontends were built and copied
ls -la apps/backend/public/wishlist/
ls -la apps/backend/public/calendar/

# Rebuild if needed
npm run build:all
```

### PM2 Process Won't Start

```bash
# Check logs
pm2 logs --err

# Try starting manually
cd /opt/tofu-apps
node apps/backend/dist/server.js

# Check for errors, then fix and restart PM2
```

### Port Already in Use

```bash
# Find what's using the port
sudo lsof -i :3000

# Kill old process if needed
pm2 delete all
sudo killall node
```

## Rollback Plan

If something goes wrong:

```bash
# 1. Stop new app
pm2 stop all
pm2 delete all

# 2. Restore old app
sudo mv /opt/tofu-apps /opt/tofu-apps-failed
sudo mv /opt/tofu-apps-old-* /opt/tofu-apps

# 3. Start old app
cd /opt/tofu-apps
pm2 resurrect  # Restore old PM2 config
# Or manually start your old PM2 processes

# 4. Restore databases from backup (if needed)
psql -U wishlist_user -d wishlist < ~/backups/wishlist_backup_*.sql
```

## Post-Migration Checklist

- [ ] Old app stopped successfully
- [ ] New app deployed and running
- [ ] All PM2 processes healthy (`pm2 status`)
- [ ] Database migrations applied
- [ ] Wishlists and items visible in UI
- [ ] Can login with existing credentials
- [ ] Can create new wishlist items
- [ ] Bookmarklet feature working
- [ ] No errors in logs (`pm2 logs`)
- [ ] Nginx (if used) proxying correctly
- [ ] Old app backed up and can be removed
- [ ] Database backups stored safely

---

## Need Help?

If you encounter issues:

1. **Check logs:** `pm2 logs unified-backend --lines 100`
2. **Review backups:** Ensure you have backups before proceeding
3. **Test locally:** Try running the new app locally first
4. **Incremental approach:** Use Option B (side-by-side) if unsure

**Remember:** Keep backups for at least a month before deleting old app!
