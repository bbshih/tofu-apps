/**
 * Poll Routes
 * CRUD operations for polls
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  createPoll,
  getPoll,
  updatePoll,
  cancelPoll,
  finalizePoll,
  reopenPoll,
  getUserPolls,
  getInvitedPolls,
} from '../services/pollService.js';
import { PollType, PollStatus, PollOptionType } from '@prisma/client';
import { requireAuth, optionalAuth, requirePollOwnership } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { pollCreationLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Validation schemas
const createPollSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.nativeEnum(PollType).optional(),
  votingDeadline: z.string().datetime().optional(),
  guildId: z.string().optional(),
  channelId: z.string().optional(),
  options: z
    .array(
      z.object({
        optionType: z.nativeEnum(PollOptionType).optional(),
        label: z.string().min(1).max(200),
        description: z.string().max(500).optional(),
        date: z
          .string()
          .refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid date format',
          })
          .optional(),
        timeStart: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        timeEnd: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
      })
    )
    .min(1)
    .max(30),
  invitedUserIds: z.array(z.string()).optional(),
});

const updatePollSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  votingDeadline: z.string().datetime().optional(),
  status: z.nativeEnum(PollStatus).optional(),
});

const finalizePollSchema = z.object({
  optionId: z.string().uuid(),
});

const reopenPollSchema = z.object({
  days: z.number().int().min(1).max(60).optional(),
});

/**
 * POST /api/polls
 * Create a new poll
 */
router.post(
  '/',
  requireAuth,
  pollCreationLimiter,
  asyncHandler(async (req, res) => {
    // Validate request body
    const validatedData = createPollSchema.parse(req.body);

    // Convert string dates to Date objects
    const pollData = {
      ...validatedData,
      votingDeadline: validatedData.votingDeadline
        ? new Date(validatedData.votingDeadline)
        : undefined,
      options: validatedData.options.map((opt) => ({
        ...opt,
        date: opt.date ? new Date(opt.date) : undefined,
      })),
    };

    const poll = await createPoll(req.user!.id, pollData);

    res.status(201).json({
      success: true,
      data: { poll },
    });
  })
);

/**
 * GET /api/polls/:id
 * Get poll details
 */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const poll = await getPoll(req.params.id, req.user?.id);

    res.json({
      success: true,
      data: { poll },
    });
  })
);

/**
 * PATCH /api/polls/:id
 * Update poll
 */
router.patch(
  '/:id',
  requireAuth,
  requirePollOwnership,
  asyncHandler(async (req, res) => {
    // Validate request body
    const validatedData = updatePollSchema.parse(req.body);

    // Convert string dates to Date objects
    const updateData = {
      ...validatedData,
      votingDeadline: validatedData.votingDeadline
        ? new Date(validatedData.votingDeadline)
        : undefined,
    };

    const poll = await updatePoll(req.params.id, req.user!.id, updateData);

    res.json({
      success: true,
      data: { poll },
    });
  })
);

/**
 * DELETE /api/polls/:id
 * Cancel poll
 */
router.delete(
  '/:id',
  requireAuth,
  requirePollOwnership,
  asyncHandler(async (req, res) => {
    const poll = await cancelPoll(req.params.id, req.user!.id);

    res.json({
      success: true,
      data: { poll },
      message: 'Poll cancelled successfully',
    });
  })
);

/**
 * POST /api/polls/:id/finalize
 * Finalize poll with winning option
 */
router.post(
  '/:id/finalize',
  requireAuth,
  requirePollOwnership,
  asyncHandler(async (req, res) => {
    const validatedData = finalizePollSchema.parse(req.body);

    const poll = await finalizePoll(req.params.id, req.user!.id, validatedData.optionId);

    res.json({
      success: true,
      data: { poll },
      message: 'Poll finalized successfully',
    });
  })
);

/**
 * POST /api/polls/:id/reopen
 * Reopen a closed poll for more voting
 */
router.post(
  '/:id/reopen',
  requireAuth,
  requirePollOwnership,
  asyncHandler(async (req, res) => {
    const validatedData = reopenPollSchema.parse(req.body);
    const extensionDays = validatedData.days || 7;

    const poll = await reopenPoll(req.params.id, req.user!.id, extensionDays);

    res.json({
      success: true,
      data: { poll },
      message: 'Poll reopened successfully',
    });
  })
);

/**
 * GET /api/polls/user/created
 * Get user's created polls
 */
router.get(
  '/user/created',
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = req.query.status as any;
    const polls = await getUserPolls(req.user!.id, status);

    res.json({
      success: true,
      data: { polls },
    });
  })
);

/**
 * GET /api/polls/user/invited
 * Get polls user is invited to
 */
router.get(
  '/user/invited',
  requireAuth,
  asyncHandler(async (req, res) => {
    const polls = await getInvitedPolls(req.user!.id);

    res.json({
      success: true,
      data: { polls },
    });
  })
);

export default router;
