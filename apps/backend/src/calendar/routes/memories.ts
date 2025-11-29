/**
 * Memory Routes
 * CRUD operations for event memories
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma.js';
import { MemoryType } from '@prisma/client';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { asyncHandler, ErrorFactory } from '../middleware/errorHandler.js';

const router = Router();

// Validation schemas
const createMemorySchema = z.object({
  pollId: z.string().uuid(),
  type: z.nativeEnum(MemoryType),
  content: z.string().max(2000).optional(),
  photoUrl: z.string().url().max(500).optional(),
});

const addReactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

/**
 * POST /api/memories
 * Create a new memory for an event
 */
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const validatedData = createMemorySchema.parse(req.body);
    const userId = req.user!.id;

    // Validate poll exists and is finalized
    const poll = await prisma.poll.findUnique({
      where: { id: validatedData.pollId },
    });

    if (!poll) {
      throw ErrorFactory.notFound('Poll not found');
    }

    if (poll.status !== 'FINALIZED') {
      throw ErrorFactory.badRequest('Can only add memories to finalized events');
    }

    // Create memory
    const memory = await prisma.eventMemory.create({
      data: {
        pollId: validatedData.pollId,
        userId,
        type: validatedData.type,
        content: validatedData.content,
        photoUrl: validatedData.photoUrl,
      },
    });

    res.status(201).json({
      success: true,
      data: memory,
    });
  })
);

/**
 * GET /api/memories/poll/:pollId
 * Get all memories for a poll
 */
router.get(
  '/poll/:pollId',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { pollId } = req.params;

    // Validate poll exists
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
    });

    if (!poll) {
      throw ErrorFactory.notFound('Poll not found');
    }

    // Get memories with reaction counts
    const memories = await prisma.eventMemory.findMany({
      where: { pollId },
      include: {
        reactions: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: memories,
    });
  })
);

/**
 * GET /api/memories/:id
 * Get a single memory by ID
 */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const memory = await prisma.eventMemory.findUnique({
      where: { id },
      include: {
        reactions: true,
      },
    });

    if (!memory) {
      throw ErrorFactory.notFound('Memory not found');
    }

    res.json({
      success: true,
      data: memory,
    });
  })
);

/**
 * DELETE /api/memories/:id
 * Delete a memory (only by author)
 */
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const memory = await prisma.eventMemory.findUnique({
      where: { id },
    });

    if (!memory) {
      throw ErrorFactory.notFound('Memory not found');
    }

    // Only allow deletion by author
    if (memory.userId !== userId) {
      throw ErrorFactory.forbidden('You can only delete your own memories');
    }

    await prisma.eventMemory.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Memory deleted',
    });
  })
);

/**
 * POST /api/memories/:id/reactions
 * Add a reaction to a memory
 */
router.post(
  '/:id/reactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { emoji } = addReactionSchema.parse(req.body);

    // Check memory exists
    const memory = await prisma.eventMemory.findUnique({
      where: { id },
    });

    if (!memory) {
      throw ErrorFactory.notFound('Memory not found');
    }

    // Upsert reaction (prevents duplicates)
    const reaction = await prisma.memoryReaction.upsert({
      where: {
        memoryId_userId_emoji: {
          memoryId: id,
          userId,
          emoji,
        },
      },
      update: {},
      create: {
        memoryId: id,
        userId,
        emoji,
      },
    });

    res.status(201).json({
      success: true,
      data: reaction,
    });
  })
);

/**
 * DELETE /api/memories/:id/reactions/:emoji
 * Remove a reaction from a memory
 */
router.delete(
  '/:id/reactions/:emoji',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id, emoji } = req.params;
    const userId = req.user!.id;

    await prisma.memoryReaction.deleteMany({
      where: {
        memoryId: id,
        userId,
        emoji,
      },
    });

    res.json({
      success: true,
      message: 'Reaction removed',
    });
  })
);

export default router;
