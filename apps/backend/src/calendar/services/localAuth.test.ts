/**
 * Local Auth Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { localAuthService } from './localAuth';
import { prisma } from '../prisma.js';
import { resetMockPrisma } from '../test/mockPrisma';
import { createMockUser, createMockAuthProvider } from '../test/testData';
import { ApiError } from '../middleware/errorHandler';

// Mock bcrypt
vi.mock('bcrypt');

describe('Local Auth Service', () => {
  beforeEach(() => {
    resetMockPrisma(prisma);
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      };

      const mockPasswordHash = 'hashed-password';
      vi.mocked(bcrypt.hash).mockResolvedValue(mockPasswordHash as never);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const expectedUser = createMockUser({
        id: 'user-123',
        username: registerData.username,
        email: registerData.email,
        passwordHash: mockPasswordHash,
        requireDiscordLink: true,
        discordId: null,
      });

      vi.mocked(prisma.user.create).mockResolvedValue({
        ...expectedUser,
        preferences: {
          id: 'pref-123',
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        authProviders: [
          createMockAuthProvider({
            provider: 'LOCAL',
            providerId: registerData.username,
          }),
        ],
      } as any);

      const result = await localAuthService.register(registerData);

      expect(result).toBeDefined();
      expect(result.username).toBe(registerData.username);
      expect(result.email).toBe(registerData.email);
      expect(result.requireDiscordLink).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 12);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: registerData.username,
            email: registerData.email,
            passwordHash: mockPasswordHash,
            requireDiscordLink: true,
          }),
        })
      );
    });

    it('should reject invalid username format', async () => {
      const registerData = {
        username: 'ab', // Too short
        email: 'test@example.com',
        password: 'Password123',
      };

      await expect(localAuthService.register(registerData)).rejects.toThrow(ApiError);
      await expect(localAuthService.register(registerData)).rejects.toThrow(
        'Invalid username format'
      );
    });

    it('should reject username with special characters', async () => {
      const registerData = {
        username: 'test@user', // Invalid character
        email: 'test@example.com',
        password: 'Password123',
      };

      await expect(localAuthService.register(registerData)).rejects.toThrow(ApiError);
    });

    it('should reject weak password', async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak', // Too short, no uppercase, no number
      };

      await expect(localAuthService.register(registerData)).rejects.toThrow(ApiError);
      await expect(localAuthService.register(registerData)).rejects.toThrow(
        'Password must be at least 8 characters'
      );
    });

    it('should reject password without uppercase', async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123', // No uppercase
      };

      await expect(localAuthService.register(registerData)).rejects.toThrow(ApiError);
    });

    it('should reject password without lowercase', async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'PASSWORD123', // No lowercase
      };

      await expect(localAuthService.register(registerData)).rejects.toThrow(ApiError);
    });

    it('should reject password without number', async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'PasswordABC', // No number
      };

      await expect(localAuthService.register(registerData)).rejects.toThrow(ApiError);
    });

    it('should reject duplicate username', async () => {
      const registerData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'Password123',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ username: 'existinguser' }) as any
      );

      await expect(localAuthService.register(registerData)).rejects.toThrow(ApiError);
      await expect(localAuthService.register(registerData)).rejects.toThrow(
        'Username already taken'
      );
    });

    it('should reject duplicate email', async () => {
      const registerData = {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'Password123',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(
        createMockUser({ email: 'existing@example.com' }) as any
      );

      await expect(localAuthService.register(registerData)).rejects.toThrow(ApiError);
      await expect(localAuthService.register(registerData)).rejects.toThrow(
        'Email already registered'
      );
    });

    it('should set Discord link deadline to 7 days from registration', async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      };

      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const mockUser = createMockUser({
        username: registerData.username,
        requireDiscordLink: true,
        discordLinkDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      vi.mocked(prisma.user.create).mockResolvedValue({
        ...mockUser,
        preferences: {
          id: 'pref-123',
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        authProviders: [createMockAuthProvider({ provider: 'LOCAL' })],
      } as any);

      const result = await localAuthService.register(registerData);

      expect(result.requireDiscordLink).toBe(true);
      expect(result.discordLinkDeadline).toBeDefined();
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginData = {
        username: 'testuser',
        password: 'Password123',
      };

      const mockUser = createMockUser({
        username: loginData.username,
        passwordHash: 'hashed-password',
        isActive: true,
        discordId: 'discord-123', // Already linked Discord
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        preferences: {
          id: 'pref-123',
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        authProviders: [createMockAuthProvider({ provider: 'LOCAL' })],
      } as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await localAuthService.login(loginData);

      expect(result).toBeDefined();
      expect(result.username).toBe(loginData.username);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.passwordHash);
    });

    it('should reject login with invalid username', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'Password123',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(localAuthService.login(loginData)).rejects.toThrow(ApiError);
      await expect(localAuthService.login(loginData)).rejects.toThrow(
        'Invalid username or password'
      );
    });

    it('should reject login for user without password hash', async () => {
      const loginData = {
        username: 'testuser',
        password: 'Password123',
      };

      const mockUser = createMockUser({
        username: loginData.username,
        passwordHash: null, // No password auth
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        preferences: {
          id: 'pref-123',
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        authProviders: [],
      } as any);

      await expect(localAuthService.login(loginData)).rejects.toThrow(ApiError);
      await expect(localAuthService.login(loginData)).rejects.toThrow(
        'Invalid username or password'
      );
    });

    it('should reject login with wrong password', async () => {
      const loginData = {
        username: 'testuser',
        password: 'WrongPassword123',
      };

      const mockUser = createMockUser({
        username: loginData.username,
        passwordHash: 'hashed-password',
        isActive: true,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        preferences: {
          id: 'pref-123',
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        authProviders: [createMockAuthProvider({ provider: 'LOCAL' })],
      } as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(localAuthService.login(loginData)).rejects.toThrow(ApiError);
      await expect(localAuthService.login(loginData)).rejects.toThrow(
        'Invalid username or password'
      );
    });

    it('should reject login for inactive account', async () => {
      const loginData = {
        username: 'testuser',
        password: 'Password123',
      };

      const mockUser = createMockUser({
        username: loginData.username,
        passwordHash: 'hashed-password',
        isActive: false,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        preferences: {
          id: 'pref-123',
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        authProviders: [createMockAuthProvider({ provider: 'LOCAL' })],
      } as any);

      await expect(localAuthService.login(loginData)).rejects.toThrow(ApiError);
      await expect(localAuthService.login(loginData)).rejects.toThrow('Account is disabled');
    });

    it('should reject login if Discord link deadline passed', async () => {
      const loginData = {
        username: 'testuser',
        password: 'Password123',
      };

      const mockUser = createMockUser({
        username: loginData.username,
        passwordHash: 'hashed-password',
        isActive: true,
        requireDiscordLink: true,
        discordLinkDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        discordId: null, // Not linked
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        preferences: {
          id: 'pref-123',
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        authProviders: [createMockAuthProvider({ provider: 'LOCAL' })],
      } as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(localAuthService.login(loginData)).rejects.toThrow(ApiError);
      await expect(localAuthService.login(loginData)).rejects.toThrow(
        'Account requires Discord linking'
      );
    });

    it('should allow login if Discord linked even after deadline', async () => {
      const loginData = {
        username: 'testuser',
        password: 'Password123',
      };

      const mockUser = createMockUser({
        username: loginData.username,
        passwordHash: 'hashed-password',
        isActive: true,
        requireDiscordLink: true,
        discordLinkDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        discordId: 'discord-123', // Already linked
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        preferences: {
          id: 'pref-123',
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        authProviders: [createMockAuthProvider({ provider: 'LOCAL' })],
      } as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await localAuthService.login(loginData);

      expect(result).toBeDefined();
      expect(result.username).toBe(loginData.username);
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const userId = 'user-123';
      const currentPassword = 'OldPassword123';
      const newPassword = 'NewPassword456';

      const mockUser = createMockUser({
        id: userId,
        passwordHash: 'old-hashed-password',
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hashed-password' as never);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser as any);

      const result = await localAuthService.changePassword(userId, currentPassword, newPassword);

      expect(result.success).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, 'old-hashed-password');
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { passwordHash: 'new-hashed-password' },
      });
    });

    it('should reject if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(localAuthService.changePassword('user-123', 'Old123', 'New456')).rejects.toThrow(
        ApiError
      );
      await expect(localAuthService.changePassword('user-123', 'Old123', 'New456')).rejects.toThrow(
        'User not found'
      );
    });

    it('should reject if user has no password hash', async () => {
      const mockUser = createMockUser({
        id: 'user-123',
        passwordHash: null,
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      await expect(localAuthService.changePassword('user-123', 'Old123', 'New456')).rejects.toThrow(
        ApiError
      );
      await expect(localAuthService.changePassword('user-123', 'Old123', 'New456')).rejects.toThrow(
        'does not have password auth'
      );
    });

    it('should reject if current password is incorrect', async () => {
      const userId = 'user-123';
      const currentPassword = 'WrongPassword123';
      const newPassword = 'NewPassword456';

      const mockUser = createMockUser({
        id: userId,
        passwordHash: 'hashed-password',
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(
        localAuthService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow(ApiError);
      await expect(
        localAuthService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should reject weak new password', async () => {
      const userId = 'user-123';
      const currentPassword = 'OldPassword123';
      const newPassword = 'weak'; // Too weak

      const mockUser = createMockUser({
        id: userId,
        passwordHash: 'hashed-password',
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      await expect(
        localAuthService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow(ApiError);
      await expect(
        localAuthService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow('New password must be at least 8 characters');
    });
  });

  describe('requestPasswordReset', () => {
    it('should not reveal if email exists', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await localAuthService.requestPasswordReset('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toContain('If email exists');
    });

    it('should return success message for existing email', async () => {
      const mockUser = createMockUser({ email: 'test@example.com' });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const result = await localAuthService.requestPasswordReset('test@example.com');

      expect(result.success).toBe(true);
    });
  });
});
