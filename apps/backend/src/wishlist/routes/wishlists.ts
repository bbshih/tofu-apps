import { Router } from 'express';
import {
  getAllWishlists,
  getWishlist,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  getWishlistItems,
  getAllItems,
} from '../controllers/wishlistController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', getAllWishlists);
router.post('/', createWishlist);
router.get('/items/all', getAllItems);
router.get('/:id', getWishlist);
router.put('/:id', updateWishlist);
router.delete('/:id', deleteWishlist);
router.get('/:id/items', getWishlistItems);

export default router;
