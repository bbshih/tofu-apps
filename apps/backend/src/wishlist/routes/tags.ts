import { Router } from 'express';
import { getAllTags, createTag, deleteTag } from '../controllers/tagController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', getAllTags);
router.post('/', createTag);
router.delete('/:id', deleteTag);

export default router;
