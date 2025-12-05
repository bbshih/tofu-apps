import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getAllStores,
  getStore,
  getStoreByName,
  createStore,
  updateStore,
  deleteStore,
} from '../controllers/storeController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /stores - Get all stores for the user
router.get('/', getAllStores);

// GET /stores/by-name/:name - Get store by name
router.get('/by-name/:name', getStoreByName);

// GET /stores/:id - Get a single store
router.get('/:id', getStore);

// POST /stores - Create a new store
router.post('/', createStore);

// PUT /stores/:id - Update a store
router.put('/:id', updateStore);

// DELETE /stores/:id - Delete a store
router.delete('/:id', deleteStore);

export default router;
