/**
 * Unified Backend Server
 * Combines Wishlist and Calendar applications with shared resources
 */

import express, { Express } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app: Express = express();
const server = http.createServer(app);

// Initialize Socket.io for Calendar real-time features
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CALENDAR_CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// Global middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow frontends to load resources
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow images to be loaded cross-origin
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://wishlist.billyeatstofu.com',
        'https://cal.billyeatstofu.com',
        ...(NODE_ENV === 'development' ? ['http://localhost:5173', 'http://localhost:5174'] : [])
      ];

      // Bookmarklet endpoints need special handling - allow any HTTPS origin in production
      const isBookmarkletRequest = origin && (
        origin.includes('/api/wishlist/bookmarklet') ||
        origin.includes('/api/wishlist/scrape')
      );

      if (isBookmarkletRequest) {
        // In production, only allow HTTPS origins for bookmarklet
        if (NODE_ENV === 'production' && origin && !origin.startsWith('https://')) {
          return callback(new Error('HTTPS required'));
        }
        return callback(null, true);
      }

      // For regular requests, check whitelist
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CSRF protection via Origin/Referer validation for state-changing requests
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://wishlist.billyeatstofu.com',
    'https://cal.billyeatstofu.com',
    ...(NODE_ENV === 'development' ? ['http://localhost:5173', 'http://localhost:5174'] : [])
  ];

  // Only check state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    // Skip CSRF check for bookmarklet endpoints
    if (req.path.includes('/bookmarklet') || req.path.includes('/scrape')) {
      return next();
    }

    const origin = req.get('origin') || req.get('referer');

    // Require origin/referer for state-changing requests
    if (!origin) {
      return res.status(403).json({
        error: 'Origin header required for state-changing requests'
      });
    }

    // Validate origin is in whitelist
    const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
    if (!isAllowed) {
      return res.status(403).json({
        error: 'Invalid origin for CSRF protection'
      });
    }
  }

  next();
});

// HTTPS enforcement in production
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.hostname}${req.url}`);
    }
    next();
  });
}

// Host header validation
const ALLOWED_HOSTS = [
  'wishlist.billyeatstofu.com',
  'cal.billyeatstofu.com',
  ...(NODE_ENV === 'development' ? ['localhost:3000', 'localhost:3001'] : [])
];

app.use((req, res, next) => {
  const host = req.hostname || req.get('host') || '';

  // Validate host is in whitelist
  if (!ALLOWED_HOSTS.some(allowed => host === allowed || host.startsWith(allowed + ':'))) {
    return res.status(400).json({
      error: 'Invalid host header',
    });
  }

  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Unified apps server running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    apps: ['wishlist', 'calendar'],
  });
});

// Serve security.txt for responsible disclosure
app.get('/.well-known/security.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, '../public/.well-known/security.txt'));
});

// Import and mount app-specific routes
import wishlistRoutes from './wishlist/routes.js';
import calendarRoutes from './calendar/routes.js';

app.use('/api/wishlist', wishlistRoutes);
app.use('/api/calendar', calendarRoutes);

// Serve static files for both frontends
const wishlistPublicPath = path.join(__dirname, '../public/wishlist');
const calendarPublicPath = path.join(__dirname, '../public/calendar');

// Static file caching middleware
const setStaticCacheHeaders = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const filePath = req.path;

  // index.html - Always revalidate (no-cache)
  if (filePath.endsWith('.html') || filePath === '/' || filePath.endsWith('/')) {
    res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }
  // Hashed assets (JS/CSS with content hash) - Cache for 1 year (immutable)
  else if (/\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|eot)$/i.test(filePath)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Other static assets (images, fonts without hash) - Cache for 1 week
  else if (/\.(jpg|jpeg|png|gif|svg|ico|woff2?|ttf|eot)$/i.test(filePath)) {
    res.set('Cache-Control', 'public, max-age=604800');
  }
  // Default for other files - Short cache with revalidation
  else {
    res.set('Cache-Control', 'public, max-age=3600, must-revalidate');
  }

  next();
};

// Host-based routing middleware - serve apps at root based on subdomain
app.use((req, res, next) => {
  const host = req.hostname || req.get('host') || '';

  // Serve Wishlist app at root for wishlist subdomain
  if (host.includes('wishlist.billyeatstofu.com')) {
    // Apply cache headers
    setStaticCacheHeaders(req, res, () => {
      // Serve static files from wishlist public directory
      express.static(wishlistPublicPath)(req, res, (err) => {
        if (err) return next(err);
        // If no static file found, serve index.html for SPA routing
        if (!res.headersSent) {
          res.set('Cache-Control', 'public, max-age=0, must-revalidate');
          res.sendFile(path.join(wishlistPublicPath, 'index.html'));
        }
      });
    });
    return;
  }

  // Serve Calendar app at root for cal subdomain
  if (host.includes('cal.billyeatstofu.com')) {
    // Apply cache headers
    setStaticCacheHeaders(req, res, () => {
      // Serve static files from calendar public directory
      express.static(calendarPublicPath)(req, res, (err) => {
        if (err) return next(err);
        // If no static file found, serve index.html for SPA routing
        if (!res.headersSent) {
          res.set('Cache-Control', 'public, max-age=0, must-revalidate');
          res.sendFile(path.join(calendarPublicPath, 'index.html'));
        }
      });
    });
    return;
  }

  next();
});

// Fallback routes for /wishlist and /calendar paths (for development/direct access)
app.use('/wishlist', setStaticCacheHeaders, express.static(wishlistPublicPath));
app.get('/wishlist/*', (req, res) => {
  res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  res.sendFile(path.join(wishlistPublicPath, 'index.html'));
});

app.use('/calendar', setStaticCacheHeaders, express.static(calendarPublicPath));
app.get('/calendar/*', (req, res) => {
  res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  res.sendFile(path.join(calendarPublicPath, 'index.html'));
});

// Root fallback
app.get('/', (req, res) => {
  const host = req.hostname || req.get('host') || '';

  if (host.includes('wishlist')) {
    res.sendFile(path.join(wishlistPublicPath, 'index.html'));
  } else if (host.includes('cal')) {
    res.sendFile(path.join(calendarPublicPath, 'index.html'));
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Unified Apps</title></head>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1>Unified Apps Server</h1>
          <ul>
            <li><a href="https://wishlist.billyeatstofu.com">Wishlist App</a></li>
            <li><a href="https://cal.billyeatstofu.com">Calendar App</a></li>
          </ul>
        </body>
      </html>
    `);
  }
});

// Initialize Socket.io handlers for Calendar
import { initializeSocketHandlers } from './calendar/sockets/index.js';
initializeSocketHandlers(io);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Log full error internally with context
  console.error('Request error:', {
    error: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Send appropriate error response based on environment
  const isDev = NODE_ENV === 'development';

  res.status(err.status || 500).json({
    success: false,
    error: isDev ? err.message : 'An error occurred processing your request',
    ...(isDev && { stack: err.stack }),
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, starting graceful shutdown...`);

  server.close(() => {
    console.log('HTTP server closed');
  });

  io.close(() => {
    console.log('Socket.io connections closed');
  });

  // Close database connections
  const { closeWishlistDb } = await import('./wishlist/db.js');
  const { prisma } = await import('./calendar/prisma.js');

  await closeWishlistDb();
  await prisma.$disconnect();

  console.log('Database connections closed');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 Unified Apps Server');
  console.log('='.repeat(60));
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Apps:');
  console.log(`  Wishlist: http://localhost:${PORT}/wishlist`);
  console.log(`  Calendar: http://localhost:${PORT}/calendar`);
  console.log('='.repeat(60));
});

export { app, server, io };
