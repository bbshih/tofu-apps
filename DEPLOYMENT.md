# Unified Apps Deployment Guide

This guide walks through deploying the unified Wishlist and SeaCalendar applications to your VPS with optimized memory usage.

## Architecture Overview

**Before:** ~1.3-1.6GB memory usage
- 2 PostgreSQL containers (512MB)
- 2-3 Node.js containers (600-800MB)
- 2 Nginx containers (128MB)

**After:** ~400-600MB memory usage
- 1 PostgreSQL process (150-200MB)
- 1 Unified Node.js backend (200-300MB)
- 1 Discord bot process (100-150MB)
- Static files served from Node.js (no Nginx)

## Prerequisites

1. **VPS with 1-2GB RAM** (Ubuntu/Debian recommended)
2. **Node.js 20+** installed
3. **PostgreSQL 15+** installed (not containerized)
4. **PM2** for process management
5. **Git** for deployment

## Step 1: Install Dependencies on VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 globally
sudo npm install -g pm2

# Install build tools (for native dependencies)
sudo apt install -y build-essential python3
```

## Step 2: Setup PostgreSQL Databases

```bash
# Switch to postgres user
sudo -u postgres psql

# Create Wishlist database
CREATE DATABASE wishlist;
CREATE USER wishlist_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE wishlist TO wishlist_user;
\c wishlist
GRANT ALL ON SCHEMA public TO wishlist_user;

# Create SeaCalendar database
CREATE DATABASE seacalendar;
CREATE USER seacalendar WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE seacalendar TO seacalendar;
\c seacalendar
GRANT ALL ON SCHEMA public TO seacalendar;

# Exit psql
\q
```

## Step 3: Clone and Build Application

```bash
# Create app directory
sudo mkdir -p /opt/unified-apps
sudo chown $USER:$USER /opt/unified-apps
cd /opt/unified-apps

# Clone your repository (or copy files via scp/rsync)
git clone <your-repo-url> .

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
nano .env  # Edit with your actual values

# Build TypeScript
npm run build

# Generate Prisma client
npm run generate

# Create logs and uploads directories
mkdir -p logs uploads/wishlist
```

## Step 4: Run Database Migrations

```bash
# Run Wishlist migrations
npm run migrate:wishlist

# Run SeaCalendar migrations
npm run migrate:seacalendar
```

## Step 5: Build and Deploy Frontends

```bash
# On your local machine, build the frontends

# Build Wishlist frontend
cd /path/to/wishlist/frontend
npm run build
# Copy dist/ to VPS at /opt/unified-apps/public/wishlist

# Build SeaCalendar frontend
cd /path/to/seacalendar/packages/web
npm run build
# Copy dist/ to VPS at /opt/unified-apps/public/seacalendar

# Using rsync (from local machine)
rsync -avz /path/to/wishlist/frontend/dist/ user@your-vps:/opt/unified-apps/public/wishlist/
rsync -avz /path/to/seacalendar/packages/web/dist/ user@your-vps:/opt/unified-apps/public/seacalendar/
```

## Step 6: Start Applications with PM2

```bash
cd /opt/unified-apps

# Start both apps (backend + Discord bot)
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown

# Check status
pm2 status

# View logs
pm2 logs
```

## Step 7: Configure Firewall (Optional)

```bash
# Allow port 3000
sudo ufw allow 3000/tcp

# If using nginx as reverse proxy
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Step 8: Setup Reverse Proxy (Optional)

If you want to use a domain name, set up Nginx or Caddy as a reverse proxy:

```nginx
# /etc/nginx/sites-available/unified-apps
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Managing the Applications

### Common PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs
pm2 logs unified-backend
pm2 logs discord-bot

# Restart apps
pm2 restart all
pm2 restart unified-backend
pm2 restart discord-bot

# Stop apps
pm2 stop all

# Monitor resources
pm2 monit
```

### Deploying Updates

```bash
cd /opt/unified-apps

# Pull latest changes
git pull

# Install any new dependencies
npm install

# Rebuild
npm run build
npm run generate

# Restart apps
pm2 restart all
```

### Database Backups

```bash
# Backup Wishlist database
pg_dump -U wishlist_user wishlist > wishlist_backup_$(date +%Y%m%d).sql

# Backup SeaCalendar database
pg_dump -U seacalendar seacalendar > seacalendar_backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U wishlist_user wishlist < wishlist_backup.sql
psql -U seacalendar seacalendar < seacalendar_backup.sql
```

## Monitoring Memory Usage

```bash
# Check overall memory
free -h

# Check PostgreSQL memory
ps aux | grep postgres

# Check PM2 apps memory
pm2 list
```

## Troubleshooting

### High Memory Usage

If memory usage is still high:

1. Reduce PostgreSQL `shared_buffers` in `/etc/postgresql/15/main/postgresql.conf`:
   ```
   shared_buffers = 128MB
   effective_cache_size = 256MB
   ```

2. Restart PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

3. Check for memory leaks:
   ```bash
   pm2 monit
   ```

### Application Won't Start

```bash
# Check logs
pm2 logs unified-backend --lines 50

# Check environment variables
cat .env

# Test database connections
psql -U wishlist_user -d wishlist -c "SELECT 1;"
psql -U seacalendar -d seacalendar -c "SELECT 1;"
```

### Discord Bot Not Responding

```bash
# Check bot logs
pm2 logs discord-bot

# Verify Discord token
echo $DISCORD_TOKEN

# Restart bot
pm2 restart discord-bot
```

## Performance Tuning

### PostgreSQL Configuration

Edit `/etc/postgresql/15/main/postgresql.conf`:

```ini
# Memory settings for 1-2GB RAM VPS
shared_buffers = 128MB
effective_cache_size = 256MB
maintenance_work_mem = 32MB
work_mem = 4MB
max_connections = 50

# Logging (reduce for production)
log_statement = 'none'
log_duration = off
```

Restart PostgreSQL after changes:
```bash
sudo systemctl restart postgresql
```

### Node.js Memory Limits

Already configured in `ecosystem.config.cjs`:
- Backend: 384MB max
- Discord bot: 256MB max

Adjust if needed based on your VPS capacity.

## Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Use strong JWT secret
- [ ] Configure firewall (ufw)
- [ ] Keep PostgreSQL local-only (not exposed to internet)
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Setup SSL/TLS with Let's Encrypt if using domain
- [ ] Restrict SSH access (use SSH keys, disable password auth)

## Accessing Your Apps

- **Wishlist:** http://your-vps-ip:3000/wishlist
- **SeaCalendar:** http://your-vps-ip:3000/seacalendar
- **Health Check:** http://your-vps-ip:3000/health

## Expected Memory Usage

```
PROCESS              MEMORY
PostgreSQL           150-200MB
unified-backend      200-300MB
discord-bot          100-150MB
Total                450-650MB
```

This leaves **700MB-1.5GB free** for:
- System processes (~200MB)
- File caching
- Running Claude Code (~500MB-1GB)

---

**Success!** Your unified apps should now be running efficiently on your VPS with plenty of room for Claude Code.
