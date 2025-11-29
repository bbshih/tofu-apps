# Unified Apps Architecture

## Overview

This document explains the architectural decisions and optimizations made to combine Wishlist and SeaCalendar into a single, memory-efficient backend.

## Problem Statement

**Before:** Two separate applications running in Docker containers
- Total memory: **1.3-1.6GB**
- Docker overhead per container: ~100-150MB
- Multiple isolated Node.js processes
- Separate database containers
- Separate Nginx containers
- No room left for development tools on a 2GB VPS

**After:** Unified Node.js application with shared resources
- Total memory: **400-600MB** (60-70% reduction)
- Single Express server handling both apps
- Shared PostgreSQL (no Docker)
- Static file serving from Node.js
- Leaves **~1GB free** for Claude Code and other tools

## Architecture Diagram

```
                    ┌─────────────────────────────────────┐
                    │         VPS Server (2GB RAM)        │
                    └─────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        │                            │                            │
   ┌────▼────┐              ┌────────▼────────┐         ┌────────▼────────┐
   │  Postgres │              │ Unified Backend │         │  Discord Bot    │
   │ 150-200MB │              │   200-300MB     │         │   100-150MB     │
   └──────────┘              └─────────────────┘         └─────────────────┘
        │                            │                            │
   ┌────┴─────┐              ┌──────┴──────┐                    │
   │ wishlist │              │             │                    │
   │ seacalendar│             │  Express    │              Uses Prisma
   │          │              │   Server    │                    │
   └──────────┘              │   :3000     │                    │
                             └──────┬──────┘                    │
                                    │                           │
                    ┌───────────────┼───────────────┐          │
                    │               │               │          │
            ┌───────▼──────┐ ┌─────▼──────┐ ┌──────▼─────┐   │
            │ Wishlist API │ │ SeaCal API │ │  WebSocket │   │
            │ /api/wishlist│ │ /api/seacal│ │  (Socket.io)│  │
            └──────────────┘ └────────────┘ └────────────┘   │
                    │               │               │          │
            ┌───────▼──────┐ ┌─────▼──────┐       │          │
            │ Static Files │ │Static Files│       │          │
            │  /wishlist   │ │ /seacalendar│      │          │
            └──────────────┘ └────────────┘       │          │
                                                   │          │
                                    Shares Prisma Client ─────┘
```

## Key Architectural Decisions

### 1. Single Express Server

**Decision:** Run both apps as separate route handlers within one Express instance.

**Benefits:**
- Shared middleware (CORS, helmet, body-parser)
- Single HTTP server
- Shared Socket.io instance
- ~200-300MB memory savings

**Implementation:**
```typescript
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/seacalendar', seacalendarRoutes);
```

### 2. No Docker

**Decision:** Run Node.js and PostgreSQL directly on the host OS.

**Benefits:**
- Eliminates container overhead (~100-150MB per container)
- Faster startup times
- Simpler resource management
- Direct access to system resources

**Trade-offs:**
- Less isolation
- Manual dependency management
- Need to manage PostgreSQL configuration directly

### 3. Shared PostgreSQL

**Decision:** Single PostgreSQL instance with separate databases.

**Benefits:**
- One process vs two containerized instances
- Shared memory buffers
- ~200-300MB memory savings

**Configuration:**
```ini
# Optimized for 1-2GB RAM VPS
shared_buffers = 128MB
effective_cache_size = 256MB
max_connections = 50
```

### 4. Static File Serving from Node.js

**Decision:** Use `express.static()` instead of Nginx containers.

**Benefits:**
- No Nginx container overhead (~64MB per container)
- Simpler deployment
- One less moving part

**Trade-offs:**
- Slightly less efficient than Nginx
- No built-in caching headers (but we add them)

**Implementation:**
```typescript
app.use('/wishlist', express.static(wishlistPublicPath));
app.use('/seacalendar', express.static(seacalendarPublicPath));
```

### 5. PM2 Process Management

**Decision:** Use PM2 instead of Docker Compose for process orchestration.

**Benefits:**
- Lower memory overhead
- Built-in log rotation
- Memory limits enforcement
- Auto-restart on crash
- Clustering support (if needed)

**Configuration:**
```javascript
{
  name: 'unified-backend',
  max_memory_restart: '384M',  // Hard memory limit
  instances: 1,
  autorestart: true
}
```

### 6. Separate Discord Bot Process

**Decision:** Keep Discord bot as separate PM2 process.

**Rationale:**
- Different lifecycle (cron jobs, event listeners)
- Easier to restart independently
- Memory isolation
- Can set different restart policies

### 7. Database Connection Pooling

**Decision:** Reduced pool sizes for both databases.

**Wishlist (pg):**
```typescript
const pool = new Pool({
  max: 10,  // Reduced from default 20
  idleTimeoutMillis: 30000
});
```

**SeaCalendar (Prisma):**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
// Prisma defaults to 10 connections, which is appropriate
```

## Memory Optimization Techniques

### 1. Node.js Memory Limits

Set via `NODE_OPTIONS` environment variable:
```bash
NODE_OPTIONS=--max-old-space-size=384
```

This prevents Node.js from using more than 384MB heap memory.

### 2. PostgreSQL Memory Tuning

Key settings in `postgresql.conf`:
- `shared_buffers = 128MB` - Shared memory for caching
- `work_mem = 4MB` - Memory per query operation
- `maintenance_work_mem = 32MB` - Memory for maintenance operations
- `effective_cache_size = 256MB` - Hint for query planner

### 3. PM2 Memory Monitoring

PM2 automatically restarts processes if they exceed `max_memory_restart`:
```javascript
max_memory_restart: '384M'  // Backend
max_memory_restart: '256M'  // Discord bot
```

### 4. Efficient Imports

Use ES modules with tree-shaking to reduce bundle size:
```typescript
import { specific, functions } from 'library';
// Instead of:
import * as library from 'library';
```

## Route Organization

### Wishlist Routes

```
/api/wishlist/
├── /auth
│   ├── POST /register
│   └── POST /login
├── /wishlists
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   ├── PUT /:id
│   ├── DELETE /:id
│   └── GET /:id/items
├── /items
│   ├── POST /
│   ├── GET /:id
│   ├── PUT /:id
│   └── DELETE /:id
└── /tags
    ├── GET /
    ├── POST /
    └── DELETE /:id
```

### SeaCalendar Routes

```
/api/seacalendar/
├── /auth
│   ├── POST /discord
│   └── GET /callback
├── /polls
│   ├── GET /
│   ├── POST /
│   ├── GET /:id
│   ├── PUT /:id
│   └── POST /:id/vote
└── /users
    └── GET /me
```

## Database Schema

### Wishlist (PostgreSQL with raw SQL)

- `users` - User accounts
- `wishlists` - User wishlists
- `items` - Wishlist items
- `tags` - User-defined tags
- `item_tags` - Many-to-many junction table

### SeaCalendar (PostgreSQL with Prisma)

- `User` - Discord users
- `Poll` - Event polls
- `PollOption` - Poll date/time options
- `Vote` - User votes on options
- `Memory` - Event memories
- `QOTWConfig` - Question of the week config
- `QOTWQuestion` - Weekly questions
- `QOTWResponse` - User responses

## Shared Components

### 1. Express Middleware

Both apps share:
- `helmet` - Security headers
- `cors` - Cross-origin requests
- `express.json()` - JSON body parsing
- Request logging

### 2. Error Handling

Centralized error handler catches errors from both apps:
```typescript
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});
```

### 3. Socket.io Instance

SeaCalendar uses WebSockets for real-time updates. The Socket.io instance is created once and shared:
```typescript
const io = new SocketIOServer(server, { /* config */ });
initializeSocketHandlers(io);  // SeaCalendar sockets
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│                    Internet                     │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │  Optional: Nginx      │
         │  Reverse Proxy        │
         │  SSL Termination      │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │    VPS (2GB RAM)      │
         │  Ubuntu/Debian        │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │     Firewall (ufw)    │
         │  Allow: 22, 80, 443   │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │    PM2 Process Mgr    │
         │  - unified-backend    │
         │  - discord-bot        │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   PostgreSQL 15       │
         │  - wishlist db        │
         │  - seacalendar db     │
         └───────────────────────┘
```

## Monitoring & Observability

### PM2 Monitoring

```bash
pm2 monit       # Real-time monitoring
pm2 list        # Process status
pm2 logs        # View logs
```

### Health Checks

- `GET /health` - Overall server health
- `GET /api/wishlist/health` - Wishlist app health
- `GET /api/seacalendar/health` - SeaCalendar app health

### Metrics Tracked

- Memory usage per process
- CPU usage
- Request count
- Error rate (via logs)
- Uptime

## Scalability Considerations

### Current Setup (Single Process)

Good for:
- 1-100 concurrent users
- Light to moderate traffic
- Small VPS (1-2GB RAM)

### Future Scaling Options

If you need more capacity:

1. **PM2 Cluster Mode:**
   ```javascript
   {
     instances: 'max',  // Use all CPU cores
     exec_mode: 'cluster'
   }
   ```

2. **Separate Servers:**
   - Split Wishlist and SeaCalendar to separate VPS instances
   - Horizontal scaling

3. **Database Replication:**
   - PostgreSQL read replicas
   - Connection pooling (PgBouncer)

4. **Caching Layer:**
   - Redis for session storage
   - Cache frequently accessed data

## Security Considerations

### 1. Environment Variables

All secrets in `.env` file:
- Not committed to git
- Restrictive file permissions (600)
- Different values per environment

### 2. Database Access

- PostgreSQL listens only on localhost
- Strong passwords
- Separate users per database
- Minimal privileges

### 3. API Security

- JWT authentication for Wishlist
- Discord OAuth for SeaCalendar
- Rate limiting on all API routes
- Helmet.js security headers

### 4. Process Isolation

- Non-root user for PM2 processes
- Memory limits prevent DoS
- Auto-restart prevents persistent crashes

## Performance Characteristics

### Response Times

- Static files: 5-20ms
- API endpoints: 20-100ms
- Database queries: 10-50ms
- WebSocket events: <10ms

### Throughput

- Requests/sec: 100-500 (depends on endpoint)
- Concurrent WebSocket connections: 100+
- Database connections: 20 (10 per app)

### Memory Profile

```
Startup:           ~350MB
After 1 hour:      ~400MB
After 24 hours:    ~450MB
After 1 week:      ~500MB (stable)
```

Discord bot restarts daily via cron to prevent memory leaks.

## Future Improvements

### Potential Optimizations

1. **Redis for session storage** - Reduce memory pressure on Node.js
2. **CDN for static files** - Offload static file serving
3. **Database query optimization** - Analyze slow queries
4. **Implement caching** - Cache expensive operations
5. **Compress responses** - Enable gzip compression
6. **Asset optimization** - Minify and compress frontend builds

### Monitoring Enhancements

1. **Application metrics** - Prometheus + Grafana
2. **Error tracking** - Sentry integration
3. **Performance monitoring** - New Relic or DataDog
4. **Database monitoring** - pg_stat_statements

## Conclusion

This unified architecture achieves:
- **60-70% memory reduction** compared to Docker setup
- **Simplified deployment** with fewer moving parts
- **Maintained functionality** of both applications
- **Room for development tools** like Claude Code

The key insight: **Sharing resources is more efficient than isolation** when you control all the code and trust the applications.

This architecture is ideal for:
- Small VPS hosting (1-2GB RAM)
- Personal projects
- Cost-conscious deployments
- Development-friendly environments

For production at scale, consider moving back to isolated containers with dedicated resources and proper orchestration (Kubernetes, etc.).
