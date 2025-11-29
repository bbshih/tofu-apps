/**
 * SeaCalendar Routes
 * Aggregates all seacalendar-related routes
 */

import { Router } from 'express';

const router = Router();

// Import route modules
import authRoutes from './routes/auth.js';
import pollRoutes from './routes/polls.js';
import voteRoutes from './routes/votes.js';
import userRoutes from './routes/users.js';

// Mount routes
router.use('/auth', authRoutes);
router.use('/polls', pollRoutes);
router.use('/', voteRoutes); // Vote routes include /polls/:pollId/vote
router.use('/users', userRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    app: 'seacalendar',
    timestamp: new Date().toISOString(),
  });
});

export default router;
