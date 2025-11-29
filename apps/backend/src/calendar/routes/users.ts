/**
 * User Routes
 * User profile and preferences management
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  getUser,
  updateUser,
  updateUserPreferences,
  getUserPolls,
  getUserStats,
  deleteUser,
} from '../services/userService.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Validation schemas
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/)
    .optional(),
});

const updatePreferencesSchema = z.object({
  notifyViaDiscordDM: z.boolean().optional(),
  notifyViaEmail: z.boolean().optional(),
  notifyViaSMS: z.boolean().optional(),
  wantVoteReminders: z.boolean().optional(),
  wantEventReminders: z.boolean().optional(),
  showInStats: z.boolean().optional(),
});

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUser(req.user!.id);

    res.json({
      success: true,
      data: { user },
    });
  })
);

/**
 * PATCH /api/users/me
 * Update current user profile
 */
router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const validatedData = updateUserSchema.parse(req.body);

    const user = await updateUser(req.user!.id, validatedData);

    res.json({
      success: true,
      data: { user },
      message: 'Profile updated successfully',
    });
  })
);

/**
 * DELETE /api/users/me
 * Delete current user account
 */
router.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    await deleteUser(req.user!.id);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  })
);

/**
 * GET /api/users/me/preferences
 * Get current user preferences
 */
router.get(
  '/me/preferences',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUser(req.user!.id);

    res.json({
      success: true,
      data: { preferences: user.preferences },
    });
  })
);

/**
 * PATCH /api/users/me/preferences
 * Update current user preferences
 */
router.patch(
  '/me/preferences',
  requireAuth,
  asyncHandler(async (req, res) => {
    const validatedData = updatePreferencesSchema.parse(req.body);

    const preferences = await updateUserPreferences(req.user!.id, validatedData);

    res.json({
      success: true,
      data: { preferences },
      message: 'Preferences updated successfully',
    });
  })
);

/**
 * GET /api/users/me/polls
 * Get current user's polls
 */
router.get(
  '/me/polls',
  requireAuth,
  asyncHandler(async (req, res) => {
    const polls = await getUserPolls(req.user!.id);

    res.json({
      success: true,
      data: { polls },
    });
  })
);

/**
 * GET /api/users/me/stats
 * Get current user's statistics
 */
router.get(
  '/me/stats',
  requireAuth,
  asyncHandler(async (req, res) => {
    const stats = await getUserStats(req.user!.id);

    res.json({
      success: true,
      data: { stats },
    });
  })
);

export default router;
