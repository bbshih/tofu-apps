# Monorepo Guide

This document explains how the unified-apps monorepo is structured and how to work with it.

## What is a Monorepo?

A monorepo (monolithic repository) contains multiple projects/packages in a single Git repository. In this case:

- **Backend** (unified Node.js server)
- **Wishlist Frontend** (React app)
- **SeaCalendar Frontend** (React app)
- **Discord Bot** (included in backend)

All managed together with **npm workspaces**.

## Directory Structure

```
unified-apps/
├── apps/
│   ├── backend/              # Backend workspace
│   │   ├── src/
│   │   ├── dist/            # Built output (gitignored)
│   │   ├── public/          # Built frontends copied here
│   │   ├── prisma/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── wishlist-web/        # Wishlist frontend workspace
│   │   ├── src/
│   │   ├── dist/           # Built output (gitignored)
│   │   ├── package.json
│   │   └── vite.config.ts
│   ├── seacalendar-web/    # SeaCalendar frontend workspace
│   │   ├── src/
│   │   ├── dist/           # Built output (gitignored)
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── discord-bot/        # Discord bot (placeholder)
│       └── package.json
├── scripts/
│   └── copy-frontends.js   # Copies built frontends to backend
├── node_modules/           # Shared dependencies
├── package.json            # Root workspace config
└── package-lock.json       # Lockfile for all workspaces
```

## How npm Workspaces Work

### Single Installation

```bash
# Install all dependencies for all workspaces
npm install
```

This creates:

- Root `node_modules/` with shared dependencies
- Individual `apps/*/node_modules/` with workspace-specific dependencies
- Single `package-lock.json` for the entire monorepo

### Shared Dependencies

If multiple workspaces use the same package (e.g., `react`), npm installs it once at the root and symlinks it to the workspaces. This saves disk space and ensures version consistency.

### Workspace Commands

```bash
# Run a script in a specific workspace
npm run <script> -w <workspace-name>

# Examples:
npm run dev -w backend
npm run build -w wishlist-web
npm run test -w seacalendar-web

# Run a script in ALL workspaces (if the script exists)
npm run build --workspaces --if-present
```

## Development Workflow

### 1. Initial Setup

```bash
# Clone repo
git clone <your-repo> unified-apps
cd unified-apps

# Install all dependencies
npm install

# Generate Prisma client
npm run generate

# Setup databases and run migrations
npm run migrate:all
```

### 2. Development (Hot Reload)

**Option A: Backend only**

```bash
npm run dev
# or
npm run dev:backend
```

**Option B: Full stack development**

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Wishlist frontend
npm run dev:wishlist

# Terminal 3: SeaCalendar frontend
npm run dev:seacalendar
```

In this mode:

- Backend runs on <http://localhost:3000>
- Wishlist frontend runs on <http://localhost:5173> (Vite dev server)
- SeaCalendar frontend runs on <http://localhost:5174> (Vite dev server)
- Frontend dev servers proxy API requests to backend

### 3. Building for Production

```bash
# Build everything at once
npm run build:all
```

This runs:

1. `npm run build -w backend` → Compiles TypeScript to `apps/backend/dist/`
2. `npm run build -w wishlist-web` → Builds React to `apps/wishlist-web/dist/`
3. `npm run build -w seacalendar-web` → Builds React to `apps/seacalendar-web/dist/`
4. `npm run copy-frontends` → Copies built frontends to `apps/backend/public/`

### 4. Running Production Build

```bash
npm run start
# Starts: apps/backend/dist/server.js
# Serves:
# - http://localhost:3000/wishlist
# - http://localhost:3000/seacalendar
```

## Common Tasks

### Adding Dependencies

```bash
# Add to backend
npm install express -w backend

# Add to wishlist frontend
npm install axios -w wishlist-web

# Add to seacalendar frontend
npm install @tabler/icons-react -w seacalendar-web

# Add dev dependency
npm install --save-dev typescript -w backend
```

### Removing Dependencies

```bash
npm uninstall <package> -w <workspace-name>
```

### Updating Dependencies

```bash
# Update all workspaces
npm update --workspaces

# Update specific workspace
npm update -w backend
```

### Running Tests

```bash
# Run tests in all workspaces
npm run test --workspaces --if-present

# Run tests in specific workspace
npm run test -w wishlist-web
npm run test:e2e -w seacalendar-web
```

### Cleaning Build Artifacts

```bash
# Clean everything
npm run clean

# This removes:
# - apps/*/dist/
# - apps/*/node_modules/
# - node_modules/
# - apps/backend/public/*
```

## Build Pipeline

### What Happens During `npm run build:all`

1. **Backend Build**

   ```bash
   cd apps/backend
   tsc  # Compiles src/ → dist/
   ```

   Output: `apps/backend/dist/server.js` and all other .js files

2. **Wishlist Build**

   ```bash
   cd apps/wishlist-web
   tsc -b && vite build  # Type check + bundle
   ```

   Output: `apps/wishlist-web/dist/index.html` + assets

3. **SeaCalendar Build**

   ```bash
   cd apps/seacalendar-web
   vite build  # Bundle for production
   ```

   Output: `apps/seacalendar-web/dist/index.html` + assets

4. **Copy Frontends**

   ```bash
   node scripts/copy-frontends.js
   ```

   Copies:
   - `apps/wishlist-web/dist/*` → `apps/backend/public/wishlist/`
   - `apps/seacalendar-web/dist/*` → `apps/backend/public/seacalendar/`

### Why Copy Frontends?

The backend serves static files from `apps/backend/public/`. In production, this allows a single Node.js process to serve both the API and the frontend files, reducing memory usage.

## Deployment

### Local Deployment

```bash
npm run build:all
npm run start
```

### VPS Deployment

```bash
# On VPS
git pull
npm install
npm run build:all
pm2 restart all
```

### First-Time VPS Setup

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete instructions.

## Troubleshooting

### "Module not found" errors

```bash
# Reinstall all dependencies
npm run clean
npm install
```

### Frontend not loading in production

```bash
# Check if built
ls -la apps/wishlist-web/dist
ls -la apps/seacalendar-web/dist

# Check if copied
ls -la apps/backend/public/wishlist
ls -la apps/backend/public/seacalendar

# Manually rebuild and copy
npm run build:wishlist
npm run build:seacalendar
npm run copy-frontends
```

### Changes not reflected after build

```bash
# Clean and rebuild
npm run clean
npm install
npm run build:all
```

### Workspace dependency issues

```bash
# Sometimes npm workspaces get confused. Clean and reinstall:
rm -rf node_modules apps/*/node_modules package-lock.json
npm install
```

## Best Practices

### 1. Always Use Workspace Commands

```bash
# ✅ Good
npm run dev -w backend

# ❌ Bad
cd apps/backend && npm run dev
```

The second approach bypasses workspace features and can cause issues.

### 2. Install Dependencies at Root

```bash
# ✅ Good
npm install express -w backend

# ❌ Bad
cd apps/backend && npm install express
```

Always use `-w` flag from the root to maintain proper workspace structure.

### 3. Commit Lock File

Always commit `package-lock.json`. This ensures everyone uses the same dependency versions.

### 4. Build Before Deploy

```bash
# ✅ Always build before committing deployment
npm run build:all
git add apps/backend/dist  # If you commit dist (not recommended)

# ✅ Better: Build on server
git push
# On VPS:
git pull
npm run build:all
pm2 restart all
```

### 5. Test Locally First

```bash
# Test production build locally before deploying
npm run build:all
npm run start
# Visit http://localhost:3000/wishlist and /seacalendar
```

## Advantages of This Monorepo

1. **Single Source of Truth** - All code in one place
2. **Atomic Commits** - Change backend + frontend together
3. **Shared Dependencies** - Saves disk space
4. **Easier Refactoring** - Change API, update frontend in same commit
5. **Simplified Deployment** - One repo to clone, one build command
6. **No Copying Files** - Frontends are part of the repo

## Disadvantages (and Mitigations)

1. **Larger Repo** - More files to clone
   - _Mitigation:_ Still smaller than managing 3 separate repos

2. **Longer Build Times** - Building all apps takes longer
   - _Mitigation:_ Use `npm run build:backend` etc. to build individually

3. **Complex Workspace Setup** - npm workspaces can be confusing
   - _Mitigation:_ This guide + clear scripts in package.json

## Migrating from Separate Repos

If you have separate repos and want to migrate:

1. **Create new unified-apps repo** (already done)
2. **Copy code:**
   - wishlist/backend → apps/backend/src/wishlist
   - wishlist/frontend → apps/wishlist-web
   - seacalendar → apps/seacalendar-web
3. **Update imports** in backend code
4. **Test locally** with `npm run build:all`
5. **Deploy** to VPS

## References

- [npm workspaces docs](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- [DEPLOYMENT.md](./DEPLOYMENT.md) - VPS deployment guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture decisions
- [README.md](./README.md) - Quick start guide

---

**Questions?** Check the troubleshooting section or open an issue.
