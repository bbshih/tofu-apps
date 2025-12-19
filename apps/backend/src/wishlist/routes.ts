/**
 * Wishlist Routes
 * Aggregates all wishlist-related routes
 */

import './config.js'; // Validate environment variables on startup
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Import authentication middleware
import { authenticateToken } from './middleware/auth.js';

// Serve uploaded images with authentication and rate limiting
const uploadDir = process.env.WISHLIST_UPLOAD_DIR || path.resolve(__dirname, '../../uploads');
console.log('Wishlist upload directory:', uploadDir);
console.log('Upload directory exists:', fs.existsSync(uploadDir));

const imageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
});

router.use('/uploads', imageLimiter, (req, res, next) => {
  // Validate filename to prevent path traversal
  const filename = path.basename(req.path);
  if (!/^[a-f0-9]{32}\.jpg$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  // Set security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=86400', // 24 hours for public images
  });

  express.static(uploadDir, {
    index: false,
    dotfiles: 'deny',
  })(req, res, next);
});

// Debug endpoint to check upload dir
router.get('/uploads-debug', (req, res) => {
  res.json({
    uploadDir,
    exists: fs.existsSync(uploadDir),
    files: fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [],
  });
});

// Rate limiting for wishlist API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
router.use(limiter);

// Import route modules
import authRoutes from './routes/auth.js';
import wishlistRoutes from './routes/wishlists.js';
import itemRoutes from './routes/items.js';
import tagRoutes from './routes/tags.js';
import bookmarkletRoutes from './routes/bookmarklet.js';
import storeRoutes from './routes/stores.js';
import communityPolicyRoutes from './routes/communityPolicies.js';

// Mount routes
router.use('/auth', authRoutes);
router.use('/wishlists', wishlistRoutes);
router.use('/items', itemRoutes);
router.use('/tags', tagRoutes);
router.use('/bookmarklet', bookmarkletRoutes);
router.use('/stores', storeRoutes);
router.use('/community-policies', communityPolicyRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    app: 'wishlist',
    timestamp: new Date().toISOString(),
  });
});

export default router;
