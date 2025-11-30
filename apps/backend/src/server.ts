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
      // Allow all origins for bookmarklet endpoints (they run in third-party contexts)
      // This will be checked in the request handler
      callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Import and mount app-specific routes
import wishlistRoutes from './wishlist/routes.js';
import calendarRoutes from './calendar/routes.js';

app.use('/api/wishlist', wishlistRoutes);
app.use('/api/calendar', calendarRoutes);

// Serve static files for both frontends
const wishlistPublicPath = path.join(__dirname, '../public/wishlist');
const calendarPublicPath = path.join(__dirname, '../public/calendar');

// Host-based routing middleware - serve apps at root based on subdomain
app.use((req, res, next) => {
  const host = req.hostname || req.get('host') || '';

  // Serve Wishlist app at root for wishlist subdomain
  if (host.includes('wishlist.billyeatstofu.com')) {
    // Serve static files from wishlist public directory
    express.static(wishlistPublicPath)(req, res, (err) => {
      if (err) return next(err);
      // If no static file found, serve index.html for SPA routing
      if (!res.headersSent) {
        res.sendFile(path.join(wishlistPublicPath, 'index.html'));
      }
    });
    return;
  }

  // Serve Calendar app at root for cal subdomain
  if (host.includes('cal.billyeatstofu.com')) {
    // Serve static files from calendar public directory
    express.static(calendarPublicPath)(req, res, (err) => {
      if (err) return next(err);
      // If no static file found, serve index.html for SPA routing
      if (!res.headersSent) {
        res.sendFile(path.join(calendarPublicPath, 'index.html'));
      }
    });
    return;
  }

  next();
});

// Fallback routes for /wishlist and /calendar paths (for development/direct access)
app.use('/wishlist', express.static(wishlistPublicPath));
app.get('/wishlist/*', (req, res) => {
  res.sendFile(path.join(wishlistPublicPath, 'index.html'));
});

app.use('/calendar', express.static(calendarPublicPath));
app.get('/calendar/*', (req, res) => {
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
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
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
