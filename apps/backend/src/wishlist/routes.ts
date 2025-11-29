/**
 * Wishlist Routes
 * Aggregates all wishlist-related routes
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Serve uploaded images (before rate limiting)
const uploadDir = process.env.WISHLIST_UPLOAD_DIR || path.resolve(__dirname, '../../uploads');
console.log('Wishlist upload directory:', uploadDir);
console.log('Upload directory exists:', fs.existsSync(uploadDir));
router.use('/uploads', express.static(uploadDir));

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

// Mount routes
router.use('/auth', authRoutes);
router.use('/wishlists', wishlistRoutes);
router.use('/items', itemRoutes);
router.use('/tags', tagRoutes);
router.use('/bookmarklet', bookmarkletRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    app: 'wishlist',
    timestamp: new Date().toISOString(),
  });
});

export default router;
