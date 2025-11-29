# Tofu Apps

A memory-optimized monorepo combining **Wishlist** and **Calendar** applications into a single deployment, designed for resource-constrained VPS environments.

## Why This Monorepo?

**Problem:** Running both apps separately with Docker consumed **1.3-1.6GB** of RAM on a small VPS, leaving no room for development tools like Claude Code.

**Solution:** This unified architecture reduces memory usage to **400-600MB**, freeing up space while maintaining all functionality.

## Monorepo Structure

```
tofu-apps/
├── apps/
│   ├── backend/                     # Unified Node.js backend
│   │   ├── src/
│   │   │   ├── server.ts           # Main Express server
│   │   │   ├── wishlist/           # Wishlist routes & controllers
│   │   │   ├── calendar/        # Calendar routes & controllers
│   │   │   └── discord-bot/        # Discord bot code
│   │   ├── prisma/                 # Calendar Prisma schema
│   │   └── public/                 # Built frontends go here (auto-copied)
│   ├── wishlist-web/               # Wishlist React frontend
│   ├── calendar-web/            # Calendar React frontend
│   └── discord-bot/                # Discord bot (placeholder)
├── scripts/
│   └── copy-frontends.js           # Auto-copy built frontends
├── ecosystem.config.cjs            # PM2 configuration
└── Documentation:
    ├── DEPLOYMENT.md               # VPS deployment guide
    ├── ARCHITECTURE.md             # Architecture decisions
    └── CHECKLIST.md                # Deployment checklist
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm 10+

### Setup

```bash
# Install all dependencies (root + all workspaces)
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Create databases (in psql)
CREATE DATABASE wishlist;
CREATE DATABASE calendar;

# Generate Prisma client
npm run generate

# Run migrations
npm run migrate:all

# Start development
npm run dev              # Starts backend only
# OR
npm run dev:backend      # Backend
npm run dev:wishlist     # Wishlist frontend
npm run dev:calendar  # Calendar frontend
```

### Development URLs

- **Backend API:** http://localhost:3000
- **Wishlist Frontend:** http://localhost:5173 (Vite dev server)
- **Calendar Frontend:** http://localhost:5174 (Vite dev server)

## Building for Production

```bash
# Build everything at once
npm run build:all

# This runs:
# 1. Build backend (TypeScript → JavaScript)
# 2. Build wishlist-web (React → static files)
# 3. Build calendar-web (React → static files)
# 4. Copy frontends to backend/public/
```

After building, the backend serves both frontends:
- **Wishlist:** http://localhost:3000/wishlist
- **Calendar:** http://localhost:3000/calendar

## Available Scripts

### Root Level

```bash
npm run dev                # Start backend dev server
npm run dev:backend        # Start backend dev server
npm run dev:wishlist       # Start wishlist frontend dev server
npm run dev:calendar    # Start calendar frontend dev server

npm run build              # Build all workspaces
npm run build:all          # Build everything + copy frontends
npm run build:backend      # Build backend only
npm run build:wishlist     # Build wishlist-web only
npm run build:calendar  # Build calendar-web only

npm run start              # Start production server
npm run migrate:all        # Run all database migrations
npm run generate           # Generate Prisma client
npm run clean              # Clean all build artifacts
```

### Individual Workspaces

```bash
# Backend
cd apps/backend
npm run dev                # Dev server with hot reload
npm run build              # Build TypeScript
npm run start              # Start production server

# Wishlist Frontend
cd apps/wishlist-web
npm run dev                # Vite dev server
npm run build              # Build for production
npm run test               # Run tests

# Calendar Frontend
cd apps/calendar-web
npm run dev                # Vite dev server
npm run build              # Build for production
npm run test               # Run tests
```

## Memory Usage

| Component | Memory | Notes |
|-----------|--------|-------|
| PostgreSQL | 150-200MB | Shared between both apps |
| Unified Backend | 200-300MB | Combined Wishlist + Calendar |
| Discord Bot | 100-150MB | Separate PM2 process |
| **Total** | **450-650MB** | Leaves 700MB-1.5GB free on 2GB VPS |

## Production Deployment

### Quick Deploy

```bash
# On VPS
git clone <your-repo> /opt/tofu-apps
cd /opt/tofu-apps

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env

# Build everything
npm run build:all

# Run migrations
npm run migrate:all

# Start with PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Detailed Instructions

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive VPS setup guide including:
- PostgreSQL installation and configuration
- Database setup
- PM2 configuration
- Security hardening
- Troubleshooting

## Monorepo Workflow

### Adding Dependencies

```bash
# Add to root
npm install <package> -w root

# Add to specific workspace
npm install <package> -w backend
npm install <package> -w wishlist-web
npm install <package> -w calendar-web

# Add to all workspaces
npm install <package> --workspaces
```

### Running Commands in Workspaces

```bash
# Run script in specific workspace
npm run <script> -w <workspace-name>

# Run script in all workspaces (if present)
npm run <script> --workspaces --if-present
```

### Making Changes

1. **Backend changes:** Edit files in `apps/backend/src/`
2. **Frontend changes:** Edit files in `apps/wishlist-web/` or `apps/calendar-web/`
3. **Build:** Run `npm run build:all`
4. **Test locally:** `npm run start`
5. **Deploy:** Push to git, pull on VPS, run `npm run build:all`, restart PM2

## API Routes

### Wishlist (`/api/wishlist`)

- `POST /api/wishlist/auth/register` - Register user
- `POST /api/wishlist/auth/login` - Login user
- `GET /api/wishlist/wishlists` - Get all wishlists
- `POST /api/wishlist/wishlists` - Create wishlist
- `GET /api/wishlist/items` - Get items
- `POST /api/wishlist/items` - Create item

### Calendar (`/api/calendar`)

- `POST /api/calendar/auth/discord` - Discord OAuth
- `GET /api/calendar/polls` - Get polls
- `POST /api/calendar/polls` - Create poll
- `POST /api/calendar/polls/:id/vote` - Vote on poll

## Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Server
NODE_ENV=production
PORT=3000

# Databases
WISHLIST_DB_HOST=localhost
WISHLIST_DB_NAME=wishlist
DATABASE_URL=postgresql://user:pass@localhost/calendar

# Security
JWT_SECRET=your_secret
SEACALENDAR_SESSION_SECRET=your_secret

# Discord
DISCORD_TOKEN=your_token
```

## Monitoring

```bash
# PM2 status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Restart apps
pm2 restart all
```

## Troubleshooting

### Build Issues

```bash
# Clean everything and rebuild
npm run clean
npm install
npm run build:all
```

### Frontend Not Loading

```bash
# Check if frontends were copied
ls -la apps/backend/public/wishlist
ls -la apps/backend/public/calendar

# Manually copy if needed
npm run copy-frontends
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test connections
psql -U wishlist_user -d wishlist
psql -U calendar -d calendar
```

## Migrating from Original Repos

If you have existing Wishlist and Calendar deployments:

1. **Backup databases:**
   ```bash
   pg_dump wishlist > wishlist_backup.sql
   pg_dump calendar > calendar_backup.sql
   ```

2. **Deploy unified monorepo** (see DEPLOYMENT.md)

3. **Restore databases:**
   ```bash
   psql -U wishlist_user wishlist < wishlist_backup.sql
   psql -U calendar calendar < calendar_backup.sql
   ```

4. **Update frontend API endpoints** if needed

## Development Tips

### Hot Reload During Development

Run multiple terminals:
```bash
# Terminal 1: Backend with hot reload
npm run dev:backend

# Terminal 2: Wishlist frontend with hot reload
npm run dev:wishlist

# Terminal 3: Calendar frontend with hot reload
npm run dev:calendar
```

### Testing Production Build Locally

```bash
npm run build:all
npm run start
# Visit http://localhost:3000/wishlist and http://localhost:3000/calendar
```

### Updating One Frontend

```bash
# Build just wishlist
npm run build:wishlist
npm run copy-frontends
# Restart backend
```

## Architecture

This monorepo uses:
- **npm workspaces** for dependency management
- **TypeScript** for backend
- **React + Vite** for frontends
- **Express** for unified backend server
- **PostgreSQL** for both app databases
- **Prisma** for Calendar ORM
- **PM2** for process management

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture decisions.

## Contributing

This is a personal monorepo. If adapting for your use:
1. Update package.json names and descriptions
2. Adjust database configurations
3. Modify CORS origins for your domains
4. Update PM2 memory limits as needed

## License

MIT

---

**One repo, one build, one deploy** 🚀
