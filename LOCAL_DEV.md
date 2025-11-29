# Local Development Guide

Quick guide to get everything running on your local machine for development.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (running locally)
3. **npm** (comes with Node.js)

## Quick Start

### 1. Create your .env file

```bash
cp .env.example apps/backend/.env
```

Edit `apps/backend/.env` with your local settings:

```bash
# Minimal local dev configuration
NODE_ENV=development
PORT=3001

# Wishlist Database
WISHLIST_DB_HOST=localhost
WISHLIST_DB_PORT=5432
WISHLIST_DB_NAME=wishlist_dev
WISHLIST_DB_USER=postgres
WISHLIST_DB_PASSWORD=postgres

# SeaCalendar Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/seacalendar_dev

# JWT (use any random string for dev)
JWT_SECRET=local-dev-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# SeaCalendar Session
SEACALENDAR_SESSION_SECRET=local-session-secret-change-in-production

# CORS - allow local dev servers
WISHLIST_CORS_ORIGIN=http://localhost:5173
SEACALENDAR_CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# SeaCalendar Frontend
SEACALENDAR_FRONTEND_URL=http://localhost:3000

# Optional: Discord OAuth (only if testing auth)
SEACALENDAR_DISCORD_CLIENT_ID=your_discord_client_id
SEACALENDAR_DISCORD_CLIENT_SECRET=your_discord_client_secret
SEACALENDAR_DISCORD_REDIRECT_URI=http://localhost:3001/api/seacalendar/auth/callback

# Optional: Discord Bot (only if testing bot features)
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_GUILD_ID=your_discord_guild_id
```

### 2. Create PostgreSQL Databases

```bash
# Connect to PostgreSQL
psql -U postgres

# Create databases
CREATE DATABASE wishlist_dev;
CREATE DATABASE seacalendar_dev;

# Exit psql
\q
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Build Shared Package

The seacalendar shared package needs to be built first:

```bash
cd apps/backend/src/seacalendar/shared
npm run build
cd ../../../../..
```

### 5. Generate Prisma Client

```bash
npm run generate
```

### 6. Run Database Migrations

```bash
# Wishlist migrations
npm run migrate:wishlist

# SeaCalendar migrations
npm run migrate:seacalendar
```

### 7. Start Development Servers

You'll need **3 terminal windows** for full-stack development:

#### Terminal 1: Backend Server
```bash
npm run dev:backend
```
Backend runs on `http://localhost:3001`

#### Terminal 2: Wishlist Frontend (Optional)
```bash
npm run dev:wishlist
```
Wishlist runs on `http://localhost:5173`

#### Terminal 3: SeaCalendar Frontend
```bash
npm run dev:seacalendar
```
SeaCalendar runs on `http://localhost:3000`

## Accessing the Apps

- **SeaCalendar**: http://localhost:3000
- **Wishlist**: http://localhost:5173
- **API Backend**: http://localhost:3001

## Common Development Tasks

### Rebuild Everything
```bash
npm run build:all
```

### Run Linting
```bash
npm run lint
```

### Auto-fix Linting Issues
```bash
npm run lint:fix
```

### Type Check
```bash
npm run type-check
```

### Update Database Schema (SeaCalendar)
```bash
# After modifying schema.prisma
npm run generate
npm run migrate:seacalendar
```

### Watch Shared Package Changes
If you're actively developing the shared package:
```bash
cd apps/backend/src/seacalendar/shared
npm run dev  # Watches for changes
```

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```bash
# Find process using port 3001 (backend)
lsof -i :3001
kill -9 <PID>

# Find process using port 3000 (seacalendar)
lsof -i :3000
kill -9 <PID>

# Find process using port 5173 (wishlist)
lsof -i :5173
kill -9 <PID>
```

### Database Connection Issues
```bash
# Check if PostgreSQL is running
pg_isready

# Check connection
psql -U postgres -d wishlist_dev -c "SELECT 1;"
psql -U postgres -d seacalendar_dev -c "SELECT 1;"
```

### Module Not Found Errors
```bash
# Clean install
npm run clean
npm install
npm run build:all
```

### Shared Package Issues
```bash
# Rebuild shared package
cd apps/backend/src/seacalendar/shared
npm run build
cd ../../../../..

# Reinstall to relink workspace
npm install
```

## Development Workflow

1. **Start backend** first (Terminal 1)
2. **Start frontend** you want to work on (Terminal 2 or 3)
3. Make your changes
4. Frontend hot-reloads automatically
5. Backend restarts automatically (if using nodemon/tsx)

## Testing

### Run Tests
```bash
# All tests
npm run test --workspaces

# Specific workspace
npm run test -w wishlist-web
npm run test -w seacalendar-web
```

### E2E Tests
```bash
# SeaCalendar E2E
npm run test:e2e -w seacalendar-web

# Wishlist E2E
npm run test:e2e -w wishlist-web
```

## Notes

- The backend serves both APIs on port 3001
  - Wishlist API: `/api/wishlist/*`
  - SeaCalendar API: `/api/seacalendar/*`
- Frontend dev servers proxy API requests to backend
- In production, the backend serves static frontend files
- Discord bot is optional for local dev (only needed for Discord integration features)

## Next Steps

- See [README.md](./README.md) for project overview
- See [MONOREPO.md](./MONOREPO.md) for monorepo structure
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
