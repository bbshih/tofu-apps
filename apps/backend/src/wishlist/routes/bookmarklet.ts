import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import {
  generateBookmarkletToken,
  getWishlistsByToken,
  addItemViaBookmarklet,
  capturePolicyViaBookmarklet,
  getPolicyCaptureResult,
} from '../controllers/bookmarkletController.js';

const router = express.Router();

// Rate limiter for bookmarklet endpoints (10 requests per minute per IP)
const bookmarkletLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Rate limit exceeded. Please wait before adding more items.',
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS middleware for public bookmarklet endpoints (allow any origin)
const bookmarkletCors = cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
});

// Generate/regenerate bookmarklet token (requires authentication)
router.post('/generate-token', authenticateToken, generateBookmarkletToken);

// Public endpoints for bookmarklet (token-based auth, allow any origin)
router.get('/wishlists', bookmarkletCors, bookmarkletLimiter, getWishlistsByToken);
router.post('/add-item', bookmarkletCors, bookmarkletLimiter, addItemViaBookmarklet);

// Policy capture endpoints
router.post('/capture-policy', bookmarkletCors, bookmarkletLimiter, capturePolicyViaBookmarklet);
router.get('/policy-result', bookmarkletCors, bookmarkletLimiter, getPolicyCaptureResult);

export default router;
