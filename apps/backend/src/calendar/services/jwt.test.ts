/**
 * JWT Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import * as jwtService from './jwt';
import { resetMockPrisma } from '../test/mockPrisma';
import { createMockUser, createMockRefreshToken } from '../test/testData';
import { prisma } from '../prisma.js';

describe('JWT Service', () => {
  beforeEach(() => {
    resetMockPrisma(prisma);
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const payload = {
        userId: 'user-123',
        discordId: '123456789',
        email: 'test@example.com',
      };

      vi.mocked(prisma.refreshToken.create).mockResolvedValue({
        id: 'refresh-123',
        token: 'mock-refresh-token',
        userId: payload.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
        createdAt: new Date(),
      });

      const tokens = await jwtService.generateTokens(payload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(tokens.expiresIn).toBe('15m');

      // Verify access token contains correct payload
      const decoded = jwt.verify(
        tokens.accessToken,
        process.env.JWT_SECRET!
      ) as jwtService.JwtPayload;
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.discordId).toBe(payload.discordId);
      expect(decoded.email).toBe(payload.email);

      // Verify refresh token was stored in database
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: expect.any(String),
          userId: payload.userId,
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should generate tokens without email', async () => {
      const payload = {
        userId: 'user-123',
        discordId: '123456789',
      };

      vi.mocked(prisma.refreshToken.create).mockResolvedValue({
        id: 'refresh-123',
        token: 'mock-refresh-token',
        userId: payload.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
        createdAt: new Date(),
      });

      const tokens = await jwtService.generateTokens(payload);

      const decoded = jwt.verify(
        tokens.accessToken,
        process.env.JWT_SECRET!
      ) as jwtService.JwtPayload;
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.discordId).toBe(payload.discordId);
      expect(decoded.email).toBeUndefined();
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const payload = {
        userId: 'user-123',
        discordId: '123456789',
        email: 'test@example.com',
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '15m' });
      const decoded = jwtService.verifyAccessToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.discordId).toBe(payload.discordId);
      expect(decoded.email).toBe(payload.email);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        jwtService.verifyAccessToken('invalid-token');
      }).toThrow('Invalid or expired token');
    });

    it('should throw error for expired token', () => {
      const payload = {
        userId: 'user-123',
        discordId: '123456789',
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '0s' });

      // Wait a tiny bit to ensure expiration
      setTimeout(() => {
        expect(() => {
          jwtService.verifyAccessToken(token);
        }).toThrow('Invalid or expired token');
      }, 100);
    });

    it('should throw error for token signed with wrong secret', () => {
      const payload = {
        userId: 'user-123',
        discordId: '123456789',
      };

      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '15m' });

      expect(() => {
        jwtService.verifyAccessToken(token);
      }).toThrow('Invalid or expired token');
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      const userId = 'user-123';
      const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET!, {
        expiresIn: '7d',
      });

      const mockRefreshToken = createMockRefreshToken(userId);
      const mockUser = createMockUser({ id: userId });

      vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue({
        ...mockRefreshToken,
        user: mockUser,
      });

      vi.mocked(prisma.refreshToken.create).mockResolvedValue({
        id: 'new-refresh-123',
        token: 'new-refresh-token',
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked: false,
        createdAt: new Date(),
      });

      vi.mocked(prisma.refreshToken.update).mockResolvedValue({
        ...mockRefreshToken,
        revoked: true,
      });

      const newTokens = await jwtService.refreshAccessToken(refreshToken);

      expect(newTokens).toHaveProperty('accessToken');
      expect(newTokens).toHaveProperty('refreshToken');

      // Verify old token was revoked
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: mockRefreshToken.id },
        data: { revoked: true },
      });
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(jwtService.refreshAccessToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw error for wrong token type', async () => {
      const token = jwt.sign({ userId: 'user-123', type: 'access' }, process.env.JWT_SECRET!, {
        expiresIn: '15m',
      });

      await expect(jwtService.refreshAccessToken(token)).rejects.toThrow('Invalid token type');
    });

    it('should throw error for revoked refresh token', async () => {
      const userId = 'user-123';
      const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET!, {
        expiresIn: '7d',
      });

      vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue(null);

      await expect(jwtService.refreshAccessToken(refreshToken)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });

    it('should throw error for expired stored refresh token', async () => {
      const userId = 'user-123';
      const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET!, {
        expiresIn: '7d',
      });

      // Mock database check to return null (expired token filtered out by query)
      vi.mocked(prisma.refreshToken.findFirst).mockResolvedValue(null);

      await expect(jwtService.refreshAccessToken(refreshToken)).rejects.toThrow(
        'Invalid or expired refresh token'
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a specific refresh token', async () => {
      const token = 'test-refresh-token';

      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 1 });

      await jwtService.revokeRefreshToken(token);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token },
        data: { revoked: true },
      });
    });

    it('should handle revoking non-existent token gracefully', async () => {
      const token = 'non-existent-token';

      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 0 });

      await expect(jwtService.revokeRefreshToken(token)).resolves.toBeUndefined();
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all refresh tokens for a user', async () => {
      const userId = 'user-123';

      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 3 });

      await jwtService.revokeAllUserTokens(userId);

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId, revoked: false },
        data: { revoked: true },
      });
    });

    it('should handle user with no active tokens', async () => {
      const userId = 'user-with-no-tokens';

      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 0 });

      await expect(jwtService.revokeAllUserTokens(userId)).resolves.toBeUndefined();
    });
  });
});
