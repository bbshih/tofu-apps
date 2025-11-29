# Fresh VPS Deployment Guide

Deploy the unified Tofu Apps monorepo to your VPS for the first time.

## Prerequisites

- VPS with Ubuntu/Debian (2GB+ RAM recommended)
- PostgreSQL 15+ installed
- Node.js 20+ installed
- PM2 installed globally (`npm install -g pm2`)
- Nginx (optional, for SSL/reverse proxy)
- Git installed

## Quick Start Deployment

### 1. Push Code to GitHub

```bash
# On your local machine (in unified-apps directory)
git push origin main
```

### 2. SSH into VPS

```bash
ssh your-username@your-vps-ip
```

### 3. Install System Dependencies (if not already installed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (optional, for SSL)
sudo apt install -y nginx
```

### 4. Set Up PostgreSQL Databases

```bash
# Switch to postgres user
sudo -u postgres psql

# Create wishlist database and user
CREATE DATABASE wishlist;
CREATE USER wishlist_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE wishlist TO wishlist_user;
\c wishlist
GRANT ALL ON SCHEMA public TO wishlist_user;

# Create calendar database and user (if using calendar app)
CREATE DATABASE calendar;
CREATE USER calendar_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE calendar TO calendar_user;
\c calendar
GRANT ALL ON SCHEMA public TO calendar_user;

# Exit psql
\q
```

### 5. Clone Repository

```bash
# Clone to /opt (recommended) or your home directory
cd /opt
sudo git clone https://github.com/bbshih/tofu-apps.git
sudo chown -R $USER:$USER tofu-apps
cd tofu-apps
```

### 6. Create Environment File

```bash
# Copy example env file
cp .env.example .env

# Edit with your credentials
nano .env
```

**Required environment variables:**

```bash
# Server
NODE_ENV=production
PORT=3000

# Wishlist Database
WISHLIST_DB_HOST=localhost
WISHLIST_DB_PORT=5432
WISHLIST_DB_NAME=wishlist
WISHLIST_DB_USER=wishlist_user
WISHLIST_DB_PASSWORD=your_secure_password

# Calendar Database (Prisma format)
DATABASE_URL="postgresql://calendar_user:your_secure_password@localhost:5432/calendar"

# Security
JWT_SECRET=your_very_long_random_secret_here
SEACALENDAR_SESSION_SECRET=another_very_long_random_secret

# Upload Directory
WISHLIST_UPLOAD_DIR=/opt/tofu-apps/apps/backend/uploads

# Discord (if using calendar)
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_WEBHOOK_URL=your_webhook_url

# Anthropic (for calendar AI features)
ANTHROPIC_API_KEY=your_anthropic_api_key

# CORS (for development)
WISHLIST_CORS_ORIGIN=http://localhost:5173,http://localhost:3000
CALENDAR_CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Calendar Settings
CALENDAR_WEB_APP_URL=https://your-domain.com/calendar
```

**Generate secure secrets:**

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 7. Install Dependencies

```bash
npm install
```

### 8. Create Upload Directory

```bash
mkdir -p apps/backend/uploads
chmod 755 apps/backend/uploads
```

### 9. Run Database Migrations

```bash
# Run wishlist migrations (includes bookmarklet feature!)
npm run migrate:wishlist

# Run calendar migrations (if using calendar)
npm run migrate:calendar

# Or run both
npm run migrate:all
```

You should see:
```
✅ Wishlist migrations completed successfully!
```

### 10. Generate Prisma Client (for Calendar)

```bash
npm run generate
```

### 11. Build Everything

```bash
npm run build:all
```

This will:
- Build backend (TypeScript → JavaScript)
- Build wishlist frontend (React → static files)
- Build calendar frontend (React → static files)
- Copy frontends to `apps/backend/public/`

### 12. Start with PM2

```bash
# Start all processes
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Set up PM2 to start on system boot
pm2 startup
# Run the command it outputs (usually starts with sudo)
```

### 13. Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs

# Test health endpoint
curl http://localhost:3000/health
curl http://localhost:3000/api/wishlist/health

# Test if frontends are accessible
curl http://localhost:3000/wishlist | head -20
```

### 14. Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 15. Set Up Nginx (Optional but Recommended)

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/tofu-apps
```

**Basic configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS (after setting up SSL)
    # return 301 https://$server_name$request_uri;

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

    # Increase upload size limit (for wishlist images)
    client_max_body_size 10M;
}
```

**Enable the site:**

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/tofu-apps /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 16. Set Up SSL with Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
# Test renewal:
sudo certbot renew --dry-run
```

### 17. Access Your Application

**Wishlist App:**
- Local: `http://localhost:3000/wishlist`
- Domain: `https://your-domain.com/wishlist`

**Calendar App:**
- Local: `http://localhost:3000/calendar`
- Domain: `https://your-domain.com/calendar`

### 18. Create First User

Visit `https://your-domain.com/wishlist/register` and create an account.

### 19. Test Bookmarklet Feature

1. Login to wishlist app
2. Click "📌 Bookmarklet" in header
3. Click "Generate Bookmarklet"
4. Drag "➕ Add to Wishlist" to your bookmarks bar
5. Visit any product page (Amazon, etc.)
6. Click the bookmarklet
7. Select a wishlist and add the item!

## Post-Deployment Configuration

### Set Up Discord Bot (Optional - for Calendar)

If you're using the Calendar app with Discord integration:

```bash
# The Discord bot starts automatically with PM2
# Check it's running
pm2 list

# View bot logs
pm2 logs discord-bot
```

### Monitor Application

```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs unified-backend
pm2 logs discord-bot

# Monitor resources
pm2 monit

# View detailed info
pm2 show unified-backend
```

### Set Up Log Rotation

PM2 has built-in log rotation, but you can configure it:

```bash
pm2 install pm2-logrotate

# Configure (optional)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Maintenance

### Update Application

```bash
cd /opt/tofu-apps

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Run migrations (if any)
npm run migrate:all

# Rebuild
npm run build:all

# Restart PM2
pm2 restart all
```

### Backup Databases

Set up automatic daily backups:

```bash
# Create backup script
sudo nano /usr/local/bin/backup-tofu-dbs.sh
```

**Backup script:**

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/tofu-apps"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup wishlist
pg_dump -U wishlist_user wishlist > $BACKUP_DIR/wishlist_$DATE.sql

# Backup calendar
pg_dump -U calendar_user calendar > $BACKUP_DIR/calendar_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: $DATE"
```

**Make executable and schedule:**

```bash
sudo chmod +x /usr/local/bin/backup-tofu-dbs.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add line:
0 2 * * * /usr/local/bin/backup-tofu-dbs.sh >> /var/log/tofu-backups.log 2>&1
```

### Monitor Memory Usage

```bash
# Check current memory
free -h

# Check PM2 memory limits (from ecosystem.config.cjs)
pm2 show unified-backend

# If needed, adjust memory limits in ecosystem.config.cjs
nano ecosystem.config.cjs
# Change max_memory_restart value
pm2 restart all
```

## Troubleshooting

### App Won't Start

```bash
# Check logs
pm2 logs unified-backend --err

# Try starting manually to see errors
cd /opt/tofu-apps
node apps/backend/dist/server.js
```

### Database Connection Errors

```bash
# Test PostgreSQL
systemctl status postgresql

# Test database connections
psql -U wishlist_user -d wishlist -c "SELECT 1"
psql -U calendar_user -d calendar -c "SELECT 1"

# Check .env has correct credentials
cat .env | grep DB
```

### Frontend Not Loading

```bash
# Check if built files exist
ls -la apps/backend/public/wishlist/
ls -la apps/backend/public/calendar/

# Rebuild if needed
npm run build:all

# Check Nginx (if using)
sudo nginx -t
sudo systemctl status nginx
```

### Port 3000 Already in Use

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill process if needed
sudo kill -9 <PID>

# Or change port in .env
nano .env
# Change PORT=3001
pm2 restart all
```

### Upload Directory Permission Issues

```bash
# Fix permissions
sudo chown -R $USER:$USER /opt/tofu-apps/apps/backend/uploads
chmod -R 755 /opt/tofu-apps/apps/backend/uploads
```

### SSL Certificate Issues

```bash
# Renew certificate manually
sudo certbot renew

# Check certificate expiration
sudo certbot certificates

# Test auto-renewal
sudo certbot renew --dry-run
```

## Security Best Practices

### 1. Secure PostgreSQL

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Ensure only local connections allowed
# host    all    all    127.0.0.1/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 2. Secure .env File

```bash
# Restrict permissions
chmod 600 /opt/tofu-apps/.env
```

### 3. Keep System Updated

```bash
# Regular updates
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
cd /opt/tofu-apps
npm update
```

### 4. Monitor Failed Login Attempts

```bash
# Install fail2ban
sudo apt install fail2ban

# Configure for SSH
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Performance Optimization

### 1. Enable PM2 Clustering (if needed)

If you need more performance:

```bash
# Edit ecosystem.config.cjs
nano ecosystem.config.cjs

# Change instances to use multiple cores
# instances: 2,  // Or 'max' for all cores
# exec_mode: 'cluster'

# Restart
pm2 reload ecosystem.config.cjs
```

### 2. Optimize PostgreSQL

For 2GB RAM VPS, your settings are already optimized in the migration script.
Check `/etc/postgresql/15/main/postgresql.conf`:

```
shared_buffers = 128MB
effective_cache_size = 256MB
max_connections = 50
work_mem = 4MB
```

### 3. Set Up CDN (Optional)

For faster image loading, consider using a CDN:
- Cloudflare (free tier available)
- AWS CloudFront
- Vercel Edge Network

## Monitoring & Alerts

### Set Up Basic Monitoring

```bash
# Install htop for real-time monitoring
sudo apt install htop

# Check resources
htop
```

### PM2 Monitoring

```bash
# Enable PM2 Plus (free monitoring)
pm2 link <secret_key> <public_key>

# Or use PM2 web interface
pm2 web
```

## Post-Deployment Checklist

- [ ] VPS provisioned (2GB+ RAM)
- [ ] PostgreSQL installed and configured
- [ ] Node.js 20+ installed
- [ ] PM2 installed globally
- [ ] Databases created (wishlist, calendar)
- [ ] Repository cloned to `/opt/tofu-apps`
- [ ] `.env` file configured with all credentials
- [ ] Dependencies installed (`npm install`)
- [ ] Migrations run successfully
- [ ] Application built (`npm run build:all`)
- [ ] PM2 processes started and saved
- [ ] PM2 startup configured for auto-restart
- [ ] Firewall configured (ufw)
- [ ] Nginx configured (optional)
- [ ] SSL certificate installed (optional)
- [ ] Application accessible via domain
- [ ] First user created
- [ ] Bookmarklet feature tested
- [ ] Database backups configured
- [ ] Monitoring set up

---

## What You Get

After deployment, your users can:

✅ **Wishlist App:**
- Create multiple wishlists
- Add items manually or via URL scraping
- 📌 **NEW: Use bookmarklet to add items from any website**
- Tag and organize items
- View item images and prices

✅ **Calendar App (if deployed):**
- Discord authentication
- Create polls for hangout planning
- Real-time voting
- Event memories
- QOTW (Question of the Week) feature

✅ **Single Deployment:**
- One backend serving both apps
- One database (PostgreSQL) with separate schemas
- Memory-optimized (400-600MB total)
- Room for development tools

---

## Need Help?

- Check logs: `pm2 logs`
- Review docs: `README.md`, `ARCHITECTURE.md`
- Test locally first before deploying to VPS
- Keep backups before making changes

**Your unified monorepo is production-ready!** 🚀
