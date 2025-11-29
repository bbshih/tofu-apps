/**
 * Authentication Routes
 * Handles Discord OAuth callback, token refresh, and logout
 */

import { Router } from 'express';
import { prisma } from '../prisma.js';
import {
  exchangeCodeForToken,
  fetchDiscordUser,
  getAuthorizationUrl,
} from '../services/discord.js';
import { generateTokens, refreshAccessToken, revokeRefreshToken } from '../services/jwt.js';
import { asyncHandler, ErrorFactory } from '../middleware/errorHandler.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../middleware/logger.js';
import { Config } from '../config.js';

const router = Router();

/**
 * GET /api/auth/discord/url
 * Get Discord OAuth authorization URL
 */
router.get('/discord/url', (req, res) => {
  const state = req.query.state as string | undefined;
  const authUrl = getAuthorizationUrl(state);

  res.json({
    success: true,
    authUrl,
  });
});

/**
 * GET /api/auth/discord/callback
 * Discord OAuth callback handler
 */
router.get(
  '/discord/callback',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      throw ErrorFactory.badRequest('Authorization code required');
    }

    // Exchange code for Discord access token
    const tokenData = await exchangeCodeForToken(code);

    // Fetch Discord user profile
    const discordUser = await fetchDiscordUser(tokenData.access_token);

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { discordId: discordUser.id },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          discordId: discordUser.id,
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          avatar: discordUser.avatar,
          email: discordUser.email,
        },
      });
      logger.info('New user created', { userId: user.id, discordId: user.discordId });
    } else {
      // Update existing user info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: discordUser.username,
          discriminator: discordUser.discriminator,
          avatar: discordUser.avatar,
          email: discordUser.email || user.email,
        },
      });
      logger.info('User updated', { userId: user.id });
    }

    // Store Discord refresh token (encrypted in production)
    await prisma.discordToken.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });

    // Generate JWT tokens
    const tokens = await generateTokens({
      userId: user.id,
      discordId: user.discordId,
      email: user.email || undefined,
    });

    // Redirect to web app with tokens
    const redirectUrl = new URL('/auth/callback', Config.webAppUrl);
    redirectUrl.searchParams.set('token', tokens.accessToken);
    redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }

    res.redirect(redirectUrl.toString());
  })
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post(
  '/refresh',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw ErrorFactory.badRequest('Refresh token required');
    }

    // Generate new token pair
    const tokens = await refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: tokens,
    });
  })
);

/**
 * POST /api/auth/logout
 * Logout user and revoke refresh token
 */
router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  })
);

export default router;
