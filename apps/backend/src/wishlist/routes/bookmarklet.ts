import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken } from '../middleware/auth.js';
import {
  generateBookmarkletToken,
  getWishlistsByToken,
  addItemViaBookmarklet,
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

// Generate/regenerate bookmarklet token (requires authentication)
router.post('/generate-token', authenticateToken, generateBookmarkletToken);

// Public endpoints for bookmarklet (token-based auth)
router.get('/wishlists', bookmarkletLimiter, getWishlistsByToken);
router.post('/add-item', bookmarkletLimiter, addItemViaBookmarklet);

export default router;
