import axios from 'axios';
import { config } from '../config.js';
import { ErrorFactory } from '../middleware/errorHandler.js';
import { prisma } from '../prisma.js';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name?: string;
  picture: string;
  locale?: string;
  [key: string]: unknown;
}

export const googleService = {
  /**
   * Get Google OAuth authorization URL
   */
  getAuthUrl(state?: string, linkAccount?: boolean): string {
    const params = new URLSearchParams({
      client_id: config.google.clientId,
      redirect_uri: config.google.redirectUri,
      response_type: 'code',
      scope: linkAccount
        ? 'openid email profile https://www.googleapis.com/auth/calendar.readonly'
        : 'openid email profile',
      access_type: 'offline', // Get refresh token
      prompt: 'consent', // Force consent to get refresh token
      ...(state && { state }),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  /**
   * Exchange authorization code for access token
   */
  async exchangeCode(code: string): Promise<GoogleTokenResponse> {
    try {
      const response = await axios.post<GoogleTokenResponse>(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          redirect_uri: config.google.redirectUri,
          grant_type: 'authorization_code',
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Google token exchange error:', error.response?.data || error.message);
      throw ErrorFactory.internal('Failed to exchange Google authorization code');
    }
  },

  /**
   * Get Google user info from access token
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get<GoogleUserInfo>(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Google user info error:', error.response?.data || error.message);
      throw ErrorFactory.internal('Failed to fetch Google user info');
    }
  },

  /**
   * Refresh Google access token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
    try {
      const response = await axios.post<GoogleTokenResponse>(
        'https://oauth2.googleapis.com/token',
        {
          refresh_token: refreshToken,
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          grant_type: 'refresh_token',
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Google token refresh error:', error.response?.data || error.message);
      throw ErrorFactory.internal('Failed to refresh Google access token');
    }
  },

  /**
   * Create or link Google account
   */
  async createOrLinkAccount(
    code: string,
    existingUserId?: string
  ): Promise<{ user: any; isNewUser: boolean }> {
    // Exchange code for tokens
    const tokens = await this.exchangeCode(code);

    if (!tokens.refresh_token) {
      throw ErrorFactory.badRequest('No refresh token received. User may need to re-authorize.');
    }

    // Get user info
    const googleUser = await this.getUserInfo(tokens.access_token);

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // If linking to existing account
    if (existingUserId) {
      // Check if Google account already linked to another user
      const existingProvider = await prisma.authProvider.findUnique({
        where: {
          provider_providerId: {
            provider: 'GOOGLE',
            providerId: googleUser.id,
          },
        },
      });

      if (existingProvider && existingProvider.userId !== existingUserId) {
        throw ErrorFactory.badRequest('This Google account is already linked to another user');
      }

      // Create or update Google auth provider
      await prisma.authProvider.upsert({
        where: {
          userId_provider: {
            userId: existingUserId,
            provider: 'GOOGLE',
          },
        },
        create: {
          userId: existingUserId,
          provider: 'GOOGLE',
          providerId: googleUser.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          scope: tokens.scope,
          providerData: googleUser as any,
        },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          scope: tokens.scope,
          providerData: googleUser as any,
        },
      });

      // Get updated user
      const user = await prisma.user.findUnique({
        where: { id: existingUserId },
        include: {
          preferences: true,
          authProviders: true,
        },
      });

      return { user: user!, isNewUser: false };
    }

    // Check if Google account already exists
    const existingProvider = await prisma.authProvider.findUnique({
      where: {
        provider_providerId: {
          provider: 'GOOGLE',
          providerId: googleUser.id,
        },
      },
      include: {
        user: {
          include: {
            preferences: true,
            authProviders: true,
          },
        },
      },
    });

    if (existingProvider) {
      // Update tokens
      await prisma.authProvider.update({
        where: { id: existingProvider.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt,
          scope: tokens.scope,
        },
      });

      return { user: existingProvider.user, isNewUser: false };
    }

    // Create new user
    const username = googleUser.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_');

    // Ensure unique username
    let finalUsername = username;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
      finalUsername = `${username}${counter}`;
      counter++;
    }

    const user = await prisma.user.create({
      data: {
        username: finalUsername,
        displayName: googleUser.name,
        email: googleUser.email,
        emailVerified: googleUser.verified_email,
        avatar: googleUser.picture,
        requireDiscordLink: true,
        discordLinkDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        preferences: {
          create: {},
        },
        authProviders: {
          create: {
            provider: 'GOOGLE',
            providerId: googleUser.id,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt,
            scope: tokens.scope,
            providerData: googleUser as any,
          },
        },
      },
      include: {
        preferences: true,
        authProviders: true,
      },
    });

    return { user, isNewUser: true };
  },
};
