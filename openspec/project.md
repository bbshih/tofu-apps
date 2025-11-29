# Project Context

## Purpose

Tofu Apps is a memory-optimized monorepo combining **Wishlist** and **Calendar** (SeaCalendar) applications into a single unified deployment. The primary goal is to reduce memory consumption from 1.3-1.6GB (separate Docker deployments) to 400-600MB, enabling deployment on resource-constrained VPS environments (2GB RAM) while leaving room for development tools like Claude Code.

**Applications:**
- **Wishlist**: Personal wishlist management app with user authentication, item tracking, tagging, and sharing features
- **Calendar**: Friend group hangout organizer with Discord integration, event polling, voting, and real-time updates

## Tech Stack

### Backend
- **Node.js 20+** with TypeScript
- **Express.js** - Unified web server
- **PostgreSQL 15+** - Two separate databases (wishlist, calendar)
- **Prisma** - ORM for Calendar database
- **Raw SQL (pg)** - Direct PostgreSQL queries for Wishlist
- **Socket.io** - Real-time WebSocket communication for Calendar
- **Discord.js** - Discord bot integration
- **PM2** - Process management and monitoring

### Frontend
- **React 19** with TypeScript
- **Vite 7** - Build tool and dev server
- **React Router v7** - Client-side routing
- **Tailwind CSS** - Styling (Wishlist uses v3, Calendar uses v4)
- **Axios** - HTTP client (Wishlist)
- **TanStack Query** - Data fetching and state management (Wishlist)

### Development Tools
- **TypeScript 5.9** - Type checking
- **ESLint** - Linting with TypeScript support
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting
- **Vitest** - Unit and integration testing
- **Playwright** - E2E testing
- **MSW (Mock Service Worker)** - API mocking for tests

### Build & Deployment
- **npm workspaces** - Monorepo dependency management
- **PM2** - Production process manager
- **PostgreSQL** - Native installation (no Docker)

## Project Conventions

### Code Style

**Formatting (Prettier):**
- Single quotes for strings
- Semicolons required
- 2-space indentation
- 100-character line width
- ES5 trailing commas
- Arrow function parentheses

**Linting (ESLint):**
- TypeScript-first with `@typescript-eslint`
- Prettier integration via `eslint-config-prettier`
- Warns on unused variables
- Allows `console.log` (server-side debugging)
- React hooks rules enforced in frontends

**Naming Conventions:**
- Components: PascalCase (e.g., `QuickAddBuilder.tsx`)
- Files: kebab-case for utilities, PascalCase for components
- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE for true constants
- Database tables: snake_case
- API routes: kebab-case or snake_case

**File Organization:**
```
apps/backend/src/
├── server.ts                 # Main entry point
├── wishlist/                 # Wishlist domain
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   └── db.ts
├── calendar/                 # Calendar domain
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── websocket/
└── discord-bot/              # Discord bot code
```

### Architecture Patterns

**Unified Backend Pattern:**
- Single Express server with domain-scoped routes (`/api/wishlist`, `/api/calendar`)
- Shared middleware (CORS, Helmet, body-parser, rate limiting)
- Separate database connections per domain
- Static file serving from `backend/public/`

**Database Strategy:**
- Wishlist: Direct PostgreSQL with `pg` pool (10 max connections)
- Calendar: Prisma ORM with migrations
- No shared tables between apps
- Connection pooling with reduced limits for memory efficiency

**Frontend Architecture:**
- Single-page applications (SPAs)
- Client-side routing with React Router
- API communication via Axios (Wishlist) or fetch (Calendar)
- Build output copied to `backend/public/{app-name}/`

**Memory Optimization:**
- Node.js heap limit: 384MB (`--max-old-space-size=384`)
- PM2 memory restart threshold: 384MB (backend), 256MB (Discord bot)
- PostgreSQL shared buffers: 128MB
- Reduced connection pool sizes

### Testing Strategy

**Frontend Testing:**
- **Unit Tests**: Vitest with React Testing Library
  - Components, hooks, utilities
  - Run with: `npm run test` or `npm run test:unit`
- **Integration Tests**: Vitest with MSW for API mocking
  - Run with: `npm run test:integration`
- **E2E Tests**: Playwright
  - Run with: `npm run test:e2e` or `npm run test:e2e:ui`
  - Separate configs for UI and API tests (Calendar)

**Backend Testing:**
- Currently minimal backend testing
- Type checking with `npm run type-check`
- Manual API testing during development

**Test Files:**
- Unit tests: `tests/unit/*.test.tsx`
- Integration tests: `tests/integration/*.test.tsx`
- E2E tests: `e2e/*.spec.ts`
- Component tests: Co-located with components `*.test.tsx`

### Git Workflow

**Branching:**
- `main` - Primary branch (stable)
- Feature branches: Short-lived, merged directly to main
- No formal branch naming convention (personal project)

**Commits:**
- Conventional commits preferred but not enforced
- Pre-commit hooks run `lint-staged` automatically
- Auto-fixes ESLint errors and formats with Prettier

**Pre-commit Checks:**
- ESLint with auto-fix on `.ts` and `.js` files
- Prettier formatting on all staged files
- Configured in `.lintstagedrc.json`

**Deployment Workflow:**
1. Commit and push to main
2. Pull on VPS: `git pull`
3. Install dependencies: `npm install`
4. Build: `npm run build:all`
5. Run migrations: `npm run migrate:all`
6. Restart PM2: `pm2 restart all`

## Domain Context

### Wishlist Domain
- User authentication with JWT tokens
- Users create multiple wishlists
- Items have titles, descriptions, prices, URLs, images
- Tagging system for organization
- Privacy controls (public/private wishlists)
- Claim/reserve items functionality

### Calendar (SeaCalendar) Domain
- Discord OAuth authentication
- Friend groups organize hangouts via polls
- Poll creation with multiple date/time options
- Real-time voting updates via WebSocket
- Event memories and photo uploads
- "Question of the Week" (QOTW) feature
- AI-powered natural language date parsing (Anthropic Claude)
- Discord bot integration for notifications
- Cron jobs for scheduled tasks (daily bot restarts, QOTW)

### Shared Infrastructure
- Both apps run on single Express server
- Separate PostgreSQL databases (no cross-app queries)
- Static frontends served from `/wishlist` and `/calendar` paths
- Shared security headers, CORS, and rate limiting

## Important Constraints

### Memory Constraints
- **Critical**: Must run on 2GB RAM VPS with room for dev tools
- Backend limited to 384MB heap
- PM2 auto-restarts if processes exceed memory limits
- PostgreSQL tuned for low-memory environments (128MB shared buffers)

### Build Constraints
- TypeScript compilation may have type errors but should still build
- Backend build script: `tsc || echo 'Build completed with type errors'`
- Frontends must build successfully (production requirement)
- Post-build script automatically copies frontends to `backend/public/`

### Database Constraints
- No Docker - PostgreSQL runs natively on host OS
- Separate databases required (no schema sharing)
- Wishlist uses raw SQL (no ORM migration)
- Calendar uses Prisma with versioned migrations

### Security Constraints
- All secrets in `.env` (never committed)
- File permissions 600 on `.env`
- PostgreSQL listens only on localhost
- Rate limiting on all API routes
- Helmet.js security headers
- JWT for Wishlist auth, Discord OAuth for Calendar auth

### Deployment Constraints
- Single VPS deployment (no multi-server setup)
- PM2 for process management (no Docker/Kubernetes)
- Build must be performed on VPS (no CI/CD artifacts)
- Manual deployment process (git pull + build + restart)

## External Dependencies

### Required Services
- **PostgreSQL 15+**: Local installation required
- **Discord API**: Required for Calendar app
  - Discord bot token
  - Discord OAuth client ID and secret
  - Webhook URLs for notifications
- **Anthropic Claude API**: Used for AI-powered date parsing in Calendar
  - API key required in environment variables

### Optional Services
- **Nginx**: Can be used as reverse proxy (optional, Express serves static files)
- **SSL/TLS**: Recommended for production (Let's Encrypt)

### API Integrations
- **Discord REST API**: User authentication, bot commands
- **Discord Gateway**: WebSocket events, real-time notifications
- **Anthropic Claude API**: Natural language processing for date/time extraction
- **Google Calendar API**: Potential future integration (not yet implemented)

### Environment Variables
Key variables required (see `.env.example` for complete list):
```
NODE_ENV=production
PORT=3000
WISHLIST_DB_HOST=localhost
WISHLIST_DB_NAME=wishlist
DATABASE_URL=postgresql://user:pass@localhost/calendar
JWT_SECRET=<secure-secret>
SEACALENDAR_SESSION_SECRET=<secure-secret>
DISCORD_TOKEN=<bot-token>
DISCORD_CLIENT_ID=<oauth-client-id>
DISCORD_CLIENT_SECRET=<oauth-secret>
ANTHROPIC_API_KEY=<claude-api-key>
```

### Development Dependencies
- **tsx**: TypeScript execution for development
- **Husky**: Git hooks (optional, only if git is initialized)
- **PM2**: Production process manager (not needed for local dev)
