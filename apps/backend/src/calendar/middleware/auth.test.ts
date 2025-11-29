/**
 * Authentication Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import * as authMiddleware from './auth';
import * as jwtService from '../services/jwt';
import { resetMockPrisma } from '../test/mockPrisma';
import { prisma } from '../prisma.js';
import { createMockUser, createMockPoll } from '../test/testData';
import jwt from 'jsonwebtoken';

describe('Authentication Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    resetMockPrisma(prisma);
    mockReq = {
      headers: {},
      params: {},
      user: undefined,
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe('requireAuth', () => {
    it('should authenticate user with valid token', async () => {
      const userId = 'user-123';
      const mockUser = createMockUser({ id: userId });
      const token = jwt.sign(
        { userId, discordId: mockUser.discordId, email: mockUser.email },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      await authMiddleware.requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe(userId);
      expect(mockReq.user?.discordId).toBe(mockUser.discordId);
      expect(mockReq.user?.username).toBe(mockUser.username);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject request with no token', async () => {
      mockReq.headers = {};

      await authMiddleware.requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'No token provided',
        })
      );
    });

    it('should reject request with invalid token format', async () => {
      mockReq.headers = {
        authorization: 'InvalidFormat token123',
      };

      await authMiddleware.requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
        })
      );
    });

    it('should reject request with invalid token', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token',
      };

      await authMiddleware.requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should reject request if user not found in database', async () => {
      const userId = 'user-123';
      const token = jwt.sign(
        { userId, discordId: '123456', email: 'test@example.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await authMiddleware.requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'User not found',
        })
      );
    });

    it('should reject request with expired token', async () => {
      const userId = 'user-123';
      const token = jwt.sign({ userId, discordId: '123456' }, process.env.JWT_SECRET!, {
        expiresIn: '0s',
      });

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      // Wait a bit to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      await authMiddleware.requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle authorization header without Bearer prefix', async () => {
      mockReq.headers = {
        authorization: 'some-token',
      };

      await authMiddleware.requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
        })
      );
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate user with valid token', async () => {
      const userId = 'user-123';
      const mockUser = createMockUser({ id: userId });
      const token = jwt.sign(
        { userId, discordId: mockUser.discordId, email: mockUser.email },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      await authMiddleware.optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe(userId);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user if no token provided', async () => {
      mockReq.headers = {};

      await authMiddleware.optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user if token is invalid', async () => {
      mockReq.headers = {
        authorization: 'Bearer invalid-token',
      };

      await authMiddleware.optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user if user not found in database', async () => {
      const userId = 'user-123';
      const token = jwt.sign({ userId, discordId: '123456' }, process.env.JWT_SECRET!, {
        expiresIn: '15m',
      });

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await authMiddleware.optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without user if token is expired', async () => {
      const userId = 'user-123';
      const token = jwt.sign({ userId, discordId: '123456' }, process.env.JWT_SECRET!, {
        expiresIn: '0s',
      });

      mockReq.headers = {
        authorization: `Bearer ${token}`,
      };

      await new Promise((resolve) => setTimeout(resolve, 100));

      await authMiddleware.optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requirePollOwnership', () => {
    it('should allow poll creator to proceed', async () => {
      const userId = 'user-123';
      const pollId = 'poll-123';

      mockReq.user = {
        id: userId,
        discordId: '123456',
        username: 'testuser',
        discriminator: '1234',
      };
      mockReq.params = { id: pollId };

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: userId,
      } as any);

      await authMiddleware.requirePollOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject if user is not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.params = { id: 'poll-123' };

      await authMiddleware.requirePollOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Authentication required',
        })
      );
    });

    it('should reject if poll ID is missing', async () => {
      mockReq.user = {
        id: 'user-123',
        discordId: '123456',
        username: 'testuser',
        discriminator: '1234',
      };
      mockReq.params = {};

      await authMiddleware.requirePollOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Poll ID required',
        })
      );
    });

    it('should reject if poll not found', async () => {
      const userId = 'user-123';
      const pollId = 'non-existent-poll';

      mockReq.user = {
        id: userId,
        discordId: '123456',
        username: 'testuser',
        discriminator: '1234',
      };
      mockReq.params = { id: pollId };

      vi.mocked(prisma.poll.findUnique).mockResolvedValue(null);

      await authMiddleware.requirePollOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Poll not found',
        })
      );
    });

    it('should reject if user is not poll creator', async () => {
      const userId = 'user-123';
      const pollId = 'poll-123';

      mockReq.user = {
        id: userId,
        discordId: '123456',
        username: 'testuser',
        discriminator: '1234',
      };
      mockReq.params = { id: pollId };

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: 'different-user',
      } as any);

      await authMiddleware.requirePollOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403,
          message: 'You do not have permission to modify this poll',
        })
      );
    });

    it('should support pollId param', async () => {
      const userId = 'user-123';
      const pollId = 'poll-123';

      mockReq.user = {
        id: userId,
        discordId: '123456',
        username: 'testuser',
        discriminator: '1234',
      };
      mockReq.params = { pollId }; // Using pollId instead of id

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: userId,
      } as any);

      await authMiddleware.requirePollOwnership(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
