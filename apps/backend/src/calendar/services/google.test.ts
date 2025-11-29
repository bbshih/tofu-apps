/**
 * Google OAuth Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { googleService } from './google';
import { prisma } from '../prisma.js';
import { resetMockPrisma } from '../test/mockPrisma';
import {
  createMockUser,
  createMockAuthProvider,
  createMockGoogleOAuthResponse,
  createMockGoogleUser,
} from '../test/testData';
import { ApiError } from '../middleware/errorHandler';
import { config } from '../config';

// Mock axios
vi.mock('axios');

describe('Google OAuth Service', () => {
  beforeEach(() => {
    resetMockPrisma(prisma);
    vi.clearAllMocks();
  });

  describe('getAuthUrl', () => {
    it('should generate OAuth URL with basic scopes', () => {
      const url = googleService.getAuthUrl();

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain(`client_id=${config.google.clientId}`);
      expect(url).toContain('scope=openid+email+profile');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
    });

    it('should include calendar scope when linkAccount is true', () => {
      const url = googleService.getAuthUrl(undefined, true);

      // Check for URL-encoded calendar scope
      expect(url).toContain(
        encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly')
      );
    });

    it('should include state parameter when provided', () => {
      const state = 'random-state-123';
      const url = googleService.getAuthUrl(state);

      expect(url).toContain(`state=${state}`);
    });

    it('should include redirect URI', () => {
      const url = googleService.getAuthUrl();

      expect(url).toContain(encodeURIComponent(config.google.redirectUri));
    });
  });

  describe('exchangeCode', () => {
    it('should successfully exchange code for tokens', async () => {
      const authCode = 'test-auth-code';
      const mockTokenResponse = createMockGoogleOAuthResponse();

      vi.mocked(axios.post).mockResolvedValue({ data: mockTokenResponse });

      const result = await googleService.exchangeCode(authCode);

      expect(result).toEqual(mockTokenResponse);
      expect(axios.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          code: authCode,
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          redirect_uri: config.google.redirectUri,
          grant_type: 'authorization_code',
        })
      );
    });

    it('should throw ApiError on token exchange failure', async () => {
      const authCode = 'invalid-code';

      vi.mocked(axios.post).mockRejectedValue({
        response: { data: { error: 'invalid_grant' } },
      });

      await expect(googleService.exchangeCode(authCode)).rejects.toThrow(ApiError);
      await expect(googleService.exchangeCode(authCode)).rejects.toThrow(
        'Failed to exchange Google authorization code'
      );
    });
  });

  describe('getUserInfo', () => {
    it('should successfully fetch user info', async () => {
      const accessToken = 'mock-access-token';
      const mockUserInfo = createMockGoogleUser();

      vi.mocked(axios.get).mockResolvedValue({ data: mockUserInfo });

      const result = await googleService.getUserInfo(accessToken);

      expect(result).toEqual(mockUserInfo);
      expect(axios.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      );
    });

    it('should throw ApiError on user info fetch failure', async () => {
      const accessToken = 'invalid-token';

      vi.mocked(axios.get).mockRejectedValue({
        response: { data: { error: 'invalid_token' } },
      });

      await expect(googleService.getUserInfo(accessToken)).rejects.toThrow(ApiError);
      await expect(googleService.getUserInfo(accessToken)).rejects.toThrow(
        'Failed to fetch Google user info'
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh access token', async () => {
      const refreshToken = 'mock-refresh-token';
      const mockTokenResponse = {
        ...createMockGoogleOAuthResponse(),
        refresh_token: undefined, // Refresh endpoint doesn't return new refresh token
      };

      vi.mocked(axios.post).mockResolvedValue({ data: mockTokenResponse });

      const result = await googleService.refreshAccessToken(refreshToken);

      expect(result).toEqual(mockTokenResponse);
      expect(axios.post).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          refresh_token: refreshToken,
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          grant_type: 'refresh_token',
        })
      );
    });

    it('should throw ApiError on refresh failure', async () => {
      const refreshToken = 'invalid-refresh-token';

      vi.mocked(axios.post).mockRejectedValue({
        response: { data: { error: 'invalid_grant' } },
      });

      await expect(googleService.refreshAccessToken(refreshToken)).rejects.toThrow(ApiError);
      await expect(googleService.refreshAccessToken(refreshToken)).rejects.toThrow(
        'Failed to refresh Google access token'
      );
    });
  });

  describe('createOrLinkAccount', () => {
    describe('creating new account', () => {
      it('should create new user with Google auth', async () => {
        const authCode = 'test-code';
        const mockTokens = createMockGoogleOAuthResponse();
        const mockGoogleUser = createMockGoogleUser();

        vi.mocked(axios.post).mockResolvedValue({ data: mockTokens });
        vi.mocked(axios.get).mockResolvedValue({ data: mockGoogleUser });

        vi.mocked(prisma.authProvider.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const newUser = createMockUser({
          username: 'test',
          email: mockGoogleUser.email,
          displayName: mockGoogleUser.name,
          requireDiscordLink: true,
        });

        vi.mocked(prisma.user.create).mockResolvedValue({
          ...newUser,
          preferences: {
            id: 'pref-123',
            userId: 'user-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          authProviders: [
            createMockAuthProvider({
              provider: 'GOOGLE',
              providerId: mockGoogleUser.id,
            }),
          ],
        } as any);

        const result = await googleService.createOrLinkAccount(authCode);

        expect(result.isNewUser).toBe(true);
        expect(result.user.email).toBe(mockGoogleUser.email);
        expect(result.user.requireDiscordLink).toBe(true);
        expect(prisma.user.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              email: mockGoogleUser.email,
              displayName: mockGoogleUser.name,
              emailVerified: mockGoogleUser.verified_email,
              requireDiscordLink: true,
            }),
          })
        );
      });

      it('should throw error if no refresh token received', async () => {
        const authCode = 'test-code';
        const mockTokens = {
          ...createMockGoogleOAuthResponse(),
          refresh_token: undefined, // Missing refresh token
        };

        vi.mocked(axios.post).mockResolvedValue({ data: mockTokens });

        await expect(googleService.createOrLinkAccount(authCode)).rejects.toThrow(ApiError);
        await expect(googleService.createOrLinkAccount(authCode)).rejects.toThrow(
          'No refresh token received'
        );
      });

      it('should generate unique username if collision occurs', async () => {
        const authCode = 'test-code';
        const mockTokens = createMockGoogleOAuthResponse();
        const mockGoogleUser = createMockGoogleUser();

        vi.mocked(axios.post).mockResolvedValue({ data: mockTokens });
        vi.mocked(axios.get).mockResolvedValue({ data: mockGoogleUser });

        vi.mocked(prisma.authProvider.findUnique).mockResolvedValue(null);

        // First call returns existing user, second call returns null
        vi.mocked(prisma.user.findUnique)
          .mockResolvedValueOnce(createMockUser({ username: 'test' }) as any)
          .mockResolvedValueOnce(null);

        const newUser = createMockUser({
          username: 'test1', // Should increment
          email: mockGoogleUser.email,
        });

        vi.mocked(prisma.user.create).mockResolvedValue({
          ...newUser,
          preferences: {
            id: 'pref-123',
            userId: 'user-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          authProviders: [createMockAuthProvider({ provider: 'GOOGLE' })],
        } as any);

        const result = await googleService.createOrLinkAccount(authCode);

        expect(result.isNewUser).toBe(true);
      });

      it('should return existing user if Google account already exists', async () => {
        const authCode = 'test-code';
        const mockTokens = createMockGoogleOAuthResponse();
        const mockGoogleUser = createMockGoogleUser();

        vi.mocked(axios.post).mockResolvedValue({ data: mockTokens });
        vi.mocked(axios.get).mockResolvedValue({ data: mockGoogleUser });

        const existingUser = createMockUser({
          email: mockGoogleUser.email,
        });

        const existingAuthProvider = createMockAuthProvider({
          provider: 'GOOGLE',
          providerId: mockGoogleUser.id,
          userId: existingUser.id,
        });

        vi.mocked(prisma.authProvider.findUnique).mockResolvedValue({
          ...existingAuthProvider,
          user: {
            ...existingUser,
            preferences: {
              id: 'pref-123',
              userId: 'user-123',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            authProviders: [existingAuthProvider],
          },
        } as any);

        vi.mocked(prisma.authProvider.update).mockResolvedValue(existingAuthProvider as any);

        const result = await googleService.createOrLinkAccount(authCode);

        expect(result.isNewUser).toBe(false);
        expect(result.user.email).toBe(existingUser.email);
        expect(prisma.authProvider.update).toHaveBeenCalled();
      });
    });

    describe('linking to existing account', () => {
      it('should link Google to existing user account', async () => {
        const authCode = 'test-code';
        const existingUserId = 'user-123';
        const mockTokens = createMockGoogleOAuthResponse();
        const mockGoogleUser = createMockGoogleUser();

        vi.mocked(axios.post).mockResolvedValue({ data: mockTokens });
        vi.mocked(axios.get).mockResolvedValue({ data: mockGoogleUser });

        vi.mocked(prisma.authProvider.findUnique).mockResolvedValue(null);

        const existingUser = createMockUser({ id: existingUserId });

        vi.mocked(prisma.authProvider.upsert).mockResolvedValue(
          createMockAuthProvider({
            provider: 'GOOGLE',
            providerId: mockGoogleUser.id,
            userId: existingUserId,
          }) as any
        );

        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          ...existingUser,
          preferences: {
            id: 'pref-123',
            userId: 'user-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          authProviders: [
            createMockAuthProvider({ provider: 'DISCORD', userId: existingUserId }),
            createMockAuthProvider({ provider: 'GOOGLE', userId: existingUserId }),
          ],
        } as any);

        const result = await googleService.createOrLinkAccount(authCode, existingUserId);

        expect(result.isNewUser).toBe(false);
        expect(result.user.id).toBe(existingUserId);
        expect(prisma.authProvider.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              userId_provider: {
                userId: existingUserId,
                provider: 'GOOGLE',
              },
            },
            create: expect.objectContaining({
              provider: 'GOOGLE',
              providerId: mockGoogleUser.id,
            }),
          })
        );
      });

      it('should throw error if Google account already linked to different user', async () => {
        const authCode = 'test-code';
        const existingUserId = 'user-123';
        const differentUserId = 'user-456';
        const mockTokens = createMockGoogleOAuthResponse();
        const mockGoogleUser = createMockGoogleUser();

        vi.mocked(axios.post).mockResolvedValue({ data: mockTokens });
        vi.mocked(axios.get).mockResolvedValue({ data: mockGoogleUser });

        // Google account already linked to different user
        vi.mocked(prisma.authProvider.findUnique).mockResolvedValue(
          createMockAuthProvider({
            provider: 'GOOGLE',
            providerId: mockGoogleUser.id,
            userId: differentUserId, // Different user!
          }) as any
        );

        await expect(googleService.createOrLinkAccount(authCode, existingUserId)).rejects.toThrow(
          ApiError
        );
        await expect(googleService.createOrLinkAccount(authCode, existingUserId)).rejects.toThrow(
          'already linked to another user'
        );
      });

      it('should update tokens if Google account already linked to same user', async () => {
        const authCode = 'test-code';
        const userId = 'user-123';
        const mockTokens = createMockGoogleOAuthResponse();
        const mockGoogleUser = createMockGoogleUser();

        vi.mocked(axios.post).mockResolvedValue({ data: mockTokens });
        vi.mocked(axios.get).mockResolvedValue({ data: mockGoogleUser });

        const existingAuthProvider = createMockAuthProvider({
          provider: 'GOOGLE',
          providerId: mockGoogleUser.id,
          userId,
        });

        vi.mocked(prisma.authProvider.findUnique).mockResolvedValue(existingAuthProvider as any);

        const updatedAuthProvider = {
          ...existingAuthProvider,
          accessToken: mockTokens.access_token,
          refreshToken: mockTokens.refresh_token,
        };

        vi.mocked(prisma.authProvider.upsert).mockResolvedValue(updatedAuthProvider as any);

        const user = createMockUser({ id: userId });
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          ...user,
          preferences: { id: 'pref-123', userId, createdAt: new Date(), updatedAt: new Date() },
          authProviders: [updatedAuthProvider],
        } as any);

        const result = await googleService.createOrLinkAccount(authCode, userId);

        expect(result.isNewUser).toBe(false);
        expect(result.user.id).toBe(userId);
        expect(prisma.authProvider.upsert).toHaveBeenCalled();
      });
    });

    describe('token expiration', () => {
      it('should calculate correct expiration time', async () => {
        const authCode = 'test-code';
        const mockTokens = createMockGoogleOAuthResponse();
        const mockGoogleUser = createMockGoogleUser();

        vi.mocked(axios.post).mockResolvedValue({ data: mockTokens });
        vi.mocked(axios.get).mockResolvedValue({ data: mockGoogleUser });

        vi.mocked(prisma.authProvider.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

        const beforeTime = Date.now();

        vi.mocked(prisma.user.create).mockResolvedValue({
          ...createMockUser(),
          preferences: {
            id: 'pref-123',
            userId: 'user-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          authProviders: [createMockAuthProvider({ provider: 'GOOGLE' })],
        } as any);

        await googleService.createOrLinkAccount(authCode);

        const afterTime = Date.now();

        expect(prisma.user.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              authProviders: expect.objectContaining({
                create: expect.objectContaining({
                  expiresAt: expect.any(Date),
                }),
              }),
            }),
          })
        );

        // Verify expiresAt is approximately now + expires_in
        const createCall = vi.mocked(prisma.user.create).mock.calls[0][0];
        const expiresAt = (createCall.data.authProviders as any).create.expiresAt;
        const expectedExpiry = beforeTime + mockTokens.expires_in * 1000;

        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(expiresAt.getTime()).toBeLessThanOrEqual(
          afterTime + mockTokens.expires_in * 1000 + 1000
        );
      });
    });
  });
});
