# Deployment Checklist

Use this checklist when deploying the unified apps to your VPS.

## Pre-Deployment (On Local Machine)

- [ ] Build Wishlist frontend
  ```bash
  cd /path/to/wishlist/frontend
  npm run build
  ```

- [ ] Build SeaCalendar frontend
  ```bash
  cd /path/to/seacalendar/packages/web
  npm run build
  ```

- [ ] Commit and push unified-apps code
  ```bash
  git add .
  git commit -m "Deploy unified apps"
  git push
  ```

## VPS Setup (First Time Only)

- [ ] Update system packages
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

- [ ] Install Node.js 20
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
  ```

- [ ] Install PostgreSQL
  ```bash
  sudo apt install -y postgresql postgresql-contrib
  ```

- [ ] Install PM2 globally
  ```bash
  sudo npm install -g pm2
  ```

- [ ] Install build tools
  ```bash
  sudo apt install -y build-essential python3
  ```

- [ ] Configure PostgreSQL for low memory
  - Edit `/etc/postgresql/15/main/postgresql.conf`
  - Set `shared_buffers = 128MB`
  - Set `effective_cache_size = 256MB`
  - Restart: `sudo systemctl restart postgresql`

## Database Setup (First Time Only)

- [ ] Create Wishlist database
  ```sql
  sudo -u postgres psql
  CREATE DATABASE wishlist;
  CREATE USER wishlist_user WITH ENCRYPTED PASSWORD 'your_password';
  GRANT ALL PRIVILEGES ON DATABASE wishlist TO wishlist_user;
  \c wishlist
  GRANT ALL ON SCHEMA public TO wishlist_user;
  ```

- [ ] Create SeaCalendar database
  ```sql
  CREATE DATABASE seacalendar;
  CREATE USER seacalendar WITH ENCRYPTED PASSWORD 'your_password';
  GRANT ALL PRIVILEGES ON DATABASE seacalendar TO seacalendar;
  \c seacalendar
  GRANT ALL ON SCHEMA public TO seacalendar;
  \q
  ```

## Application Deployment

- [ ] Clone repository
  ```bash
  sudo mkdir -p /opt/unified-apps
  sudo chown $USER:$USER /opt/unified-apps
  cd /opt/unified-apps
  git clone <your-repo> .
  ```

- [ ] Copy .env file and configure
  ```bash
  cp .env.example .env
  nano .env
  ```

- [ ] Run setup script
  ```bash
  chmod +x setup.sh
  ./setup.sh
  ```

- [ ] Copy frontend builds from local machine
  ```bash
  # On local machine
  rsync -avz /path/to/wishlist/frontend/dist/ user@vps:/opt/unified-apps/public/wishlist/
  rsync -avz /path/to/seacalendar/packages/web/dist/ user@vps:/opt/unified-apps/public/seacalendar/
  ```

- [ ] Start applications with PM2
  ```bash
  cd /opt/unified-apps
  pm2 start ecosystem.config.cjs
  pm2 save
  pm2 startup  # Follow instructions
  ```

## Post-Deployment Verification

- [ ] Check PM2 status
  ```bash
  pm2 status
  ```

- [ ] Check logs for errors
  ```bash
  pm2 logs --lines 50
  ```

- [ ] Test health endpoint
  ```bash
  curl http://localhost:3000/health
  ```

- [ ] Test Wishlist API
  ```bash
  curl http://localhost:3000/api/wishlist/health
  ```

- [ ] Test SeaCalendar API
  ```bash
  curl http://localhost:3000/api/seacalendar/health
  ```

- [ ] Test Wishlist frontend
  - Open: http://your-vps-ip:3000/wishlist

- [ ] Test SeaCalendar frontend
  - Open: http://your-vps-ip:3000/seacalendar

- [ ] Check Discord bot status
  ```bash
  pm2 logs discord-bot
  ```

## Memory Verification

- [ ] Check overall memory usage
  ```bash
  free -h
  ```

- [ ] Check PM2 app memory
  ```bash
  pm2 list
  ```

- [ ] Check PostgreSQL memory
  ```bash
  ps aux | grep postgres | grep -v grep
  ```

- [ ] Verify total usage < 700MB
  ```bash
  pm2 monit  # Should show unified-backend + discord-bot < 500MB
  ```

## Security Hardening

- [ ] Configure firewall
  ```bash
  sudo ufw allow 22/tcp    # SSH
  sudo ufw allow 3000/tcp  # App (or 80/443 if using reverse proxy)
  sudo ufw enable
  ```

- [ ] Verify .env permissions
  ```bash
  chmod 600 .env
  ```

- [ ] Review .env for strong passwords
  - JWT_SECRET (random, 32+ chars)
  - Database passwords (strong)
  - Discord tokens (correct)

- [ ] Setup automatic security updates (optional)
  ```bash
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure -plow unattended-upgrades
  ```

## Optional: Reverse Proxy

- [ ] Install Nginx (if using domain)
  ```bash
  sudo apt install nginx
  ```

- [ ] Configure Nginx reverse proxy
  - Create `/etc/nginx/sites-available/unified-apps`
  - Proxy to `http://localhost:3000`
  - Enable site: `sudo ln -s /etc/nginx/sites-available/unified-apps /etc/nginx/sites-enabled/`
  - Test: `sudo nginx -t`
  - Restart: `sudo systemctl restart nginx`

- [ ] Setup SSL with Let's Encrypt
  ```bash
  sudo apt install certbot python3-certbot-nginx
  sudo certbot --nginx -d yourdomain.com
  ```

## Backup Setup

- [ ] Create backup script
  ```bash
  nano ~/backup-databases.sh
  ```
  ```bash
  #!/bin/bash
  DATE=$(date +%Y%m%d_%H%M%S)
  pg_dump -U wishlist_user wishlist > /opt/backups/wishlist_$DATE.sql
  pg_dump -U seacalendar seacalendar > /opt/backups/seacalendar_$DATE.sql
  find /opt/backups -name "*.sql" -mtime +7 -delete
  ```

- [ ] Make backup script executable
  ```bash
  chmod +x ~/backup-databases.sh
  ```

- [ ] Setup daily backup cron
  ```bash
  sudo mkdir -p /opt/backups
  sudo chown $USER:$USER /opt/backups
  crontab -e
  # Add: 0 2 * * * /home/youruser/backup-databases.sh
  ```

## Monitoring Setup

- [ ] Setup PM2 monitoring
  ```bash
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 10M
  pm2 set pm2-logrotate:retain 7
  ```

- [ ] Create monitoring script (optional)
  ```bash
  nano ~/check-health.sh
  ```
  ```bash
  #!/bin/bash
  if ! curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "Health check failed, restarting apps..."
    pm2 restart all
  fi
  ```

## Updating Application

- [ ] Pull latest changes
  ```bash
  cd /opt/unified-apps
  git pull
  ```

- [ ] Install new dependencies
  ```bash
  npm install
  ```

- [ ] Rebuild application
  ```bash
  npm run build
  npm run generate
  ```

- [ ] Run new migrations (if any)
  ```bash
  npm run migrate:wishlist
  npm run migrate:seacalendar
  ```

- [ ] Restart apps
  ```bash
  pm2 restart all
  ```

- [ ] Verify deployment
  ```bash
  pm2 logs --lines 50
  curl http://localhost:3000/health
  ```

## Rollback Procedure (If Needed)

- [ ] Revert to previous git commit
  ```bash
  git log  # Find previous commit hash
  git checkout <previous-commit-hash>
  ```

- [ ] Rebuild and restart
  ```bash
  npm install
  npm run build
  pm2 restart all
  ```

- [ ] Restore database backup (if migrations broke something)
  ```bash
  psql -U wishlist_user wishlist < /opt/backups/wishlist_YYYYMMDD.sql
  psql -U seacalendar seacalendar < /opt/backups/seacalendar_YYYYMMDD.sql
  ```

---

## Success Criteria

✅ Both apps accessible via browser
✅ PM2 shows both processes running
✅ Total memory usage < 700MB
✅ No errors in PM2 logs
✅ Discord bot responds to commands
✅ API endpoints return valid responses
✅ Databases accepting connections

**You're done! Your unified apps are now running efficiently on your VPS.**
