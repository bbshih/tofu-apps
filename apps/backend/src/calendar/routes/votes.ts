/**
 * Vote Routes
 * Vote submission and results
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  submitVote,
  getVoteResults,
  getVoterDetails,
  getUserVote,
  deleteVote,
  getUserVoteStats,
} from '../services/voteService.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { voteLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Validation schemas
const submitVoteSchema = z.object({
  availableOptionIds: z.array(z.string().uuid()).min(0),
  maybeOptionIds: z.array(z.string().uuid()).optional(),
  notes: z.string().max(500).optional(),
});

/**
 * POST /api/polls/:pollId/vote
 * Submit or update vote (authenticated users)
 */
router.post(
  '/:pollId/vote',
  requireAuth,
  voteLimiter,
  asyncHandler(async (req, res) => {
    const validatedData = submitVoteSchema.parse(req.body);

    const vote = await submitVote(req.params.pollId, req.user!.id, validatedData);

    res.json({
      success: true,
      data: { vote },
      message: 'Vote submitted successfully',
    });
  })
);

/**
 * GET /api/polls/:pollId/vote
 * Get current user's vote
 */
router.get(
  '/:pollId/vote',
  requireAuth,
  asyncHandler(async (req, res) => {
    const vote = await getUserVote(req.params.pollId, req.user!.id);

    res.json({
      success: true,
      data: { vote },
    });
  })
);

/**
 * DELETE /api/polls/:pollId/vote
 * Delete current user's vote
 */
router.delete(
  '/:pollId/vote',
  requireAuth,
  asyncHandler(async (req, res) => {
    await deleteVote(req.params.pollId, req.user!.id);

    res.json({
      success: true,
      message: 'Vote deleted successfully',
    });
  })
);

/**
 * GET /api/polls/:pollId/results
 * Get vote results
 */
router.get(
  '/:pollId/results',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const results = await getVoteResults(req.params.pollId);

    res.json({
      success: true,
      data: { results },
    });
  })
);

/**
 * GET /api/polls/:pollId/voters
 * Get detailed voter information (who voted for what)
 */
router.get(
  '/:pollId/voters',
  requireAuth,
  asyncHandler(async (req, res) => {
    const voters = await getVoterDetails(req.params.pollId, req.user!.id);

    res.json({
      success: true,
      data: { voters },
    });
  })
);

/**
 * GET /api/votes/stats
 * Get current user's voting statistics
 */
router.get(
  '/stats',
  requireAuth,
  asyncHandler(async (req, res) => {
    const stats = await getUserVoteStats(req.user!.id);

    res.json({
      success: true,
      data: { stats },
    });
  })
);

export default router;
