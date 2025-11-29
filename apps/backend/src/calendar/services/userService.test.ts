/**
 * User Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userService from './userService';
import { PollStatus } from '../prisma.js';
import { prisma } from '../prisma.js';
import { resetMockPrisma } from '../test/mockPrisma';
import { createMockUser, createMockPoll } from '../test/testData';

describe('User Service', () => {
  beforeEach(() => {
    resetMockPrisma(prisma);
  });

  describe('getUser', () => {
    it('should get user by ID', async () => {
      const userId = 'user-123';
      const mockUser = createMockUser({ id: userId });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        preferences: null,
      } as any);

      const result = await userService.getUser(userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: { preferences: true },
      });
    });

    it('should throw error if user not found', async () => {
      const userId = 'non-existent-user';

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(userService.getUser(userId)).rejects.toThrow('User not found');
    });

    it('should include user preferences', async () => {
      const userId = 'user-123';
      const mockUser = createMockUser({ id: userId });
      const mockPreferences = {
        id: 'pref-123',
        userId,
        notifyViaDiscordDM: true,
        notifyViaEmail: false,
        notifyViaSMS: false,
        wantVoteReminders: true,
        wantEventReminders: true,
        showInStats: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        preferences: mockPreferences,
      } as any);

      const result = await userService.getUser(userId);

      expect(result.preferences).toBeDefined();
      expect(result.preferences?.notifyViaDiscordDM).toBe(true);
    });
  });

  describe('updateUser', () => {
    it('should update user profile', async () => {
      const userId = 'user-123';
      const updateData: userService.UpdateUserData = {
        email: 'newemail@example.com',
        phone: '+1234567890',
      };

      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null); // phone check

      const updatedUser = createMockUser({
        id: userId,
        email: updateData.email,
      });

      vi.mocked(prisma.user.update).mockResolvedValue({
        ...updatedUser,
        preferences: null,
      } as any);

      const result = await userService.updateUser(userId, updateData);

      expect(result.email).toBe(updateData.email);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
        include: { preferences: true },
      });
    });

    it('should throw error if email is already in use by another user', async () => {
      const userId = 'user-123';
      const updateData: userService.UpdateUserData = {
        email: 'taken@example.com',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ id: 'different-user', email: 'taken@example.com' }) as any
      );

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow(
        'Email is already in use'
      );
    });

    it('should allow updating email to same email', async () => {
      const userId = 'user-123';
      const updateData: userService.UpdateUserData = {
        email: 'same@example.com',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ id: userId, email: 'same@example.com' }) as any
      );

      const updatedUser = createMockUser({
        id: userId,
        email: updateData.email,
      });

      vi.mocked(prisma.user.update).mockResolvedValue({
        ...updatedUser,
        preferences: null,
      } as any);

      const result = await userService.updateUser(userId, updateData);

      expect(result.email).toBe(updateData.email);
    });

    it('should throw error if phone is already in use by another user', async () => {
      const userId = 'user-123';
      const updateData: userService.UpdateUserData = {
        phone: '+1234567890',
      };

      // When only phone is provided, only phone uniqueness is checked
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        createMockUser({ id: 'different-user' }) as any
      ); // phone check

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow(
        'Phone number is already in use'
      );
    });

    it('should allow updating phone to same phone', async () => {
      const userId = 'user-123';
      const updateData: userService.UpdateUserData = {
        phone: '+1234567890',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(createMockUser({ id: userId }) as any);

      const updatedUser = createMockUser({ id: userId });

      vi.mocked(prisma.user.update).mockResolvedValue({
        ...updatedUser,
        preferences: null,
      } as any);

      const result = await userService.updateUser(userId, updateData);

      expect(result).toBeDefined();
    });
  });

  describe('updateUserPreferences', () => {
    it('should create new preferences if not exist', async () => {
      const userId = 'user-123';
      const preferencesData: userService.UpdatePreferencesData = {
        notifyViaDiscordDM: true,
        notifyViaEmail: false,
        wantVoteReminders: true,
      };

      const mockPreferences = {
        id: 'pref-123',
        userId,
        notifyViaDiscordDM: true,
        notifyViaEmail: false,
        notifyViaSMS: false,
        wantVoteReminders: true,
        wantEventReminders: false,
        showInStats: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.userPreferences.upsert).mockResolvedValue(mockPreferences as any);

      const result = await userService.updateUserPreferences(userId, preferencesData);

      expect(result).toBeDefined();
      expect(result.notifyViaDiscordDM).toBe(true);
      expect(prisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: {
          userId,
          ...preferencesData,
        },
        update: preferencesData,
      });
    });

    it('should update existing preferences', async () => {
      const userId = 'user-123';
      const preferencesData: userService.UpdatePreferencesData = {
        wantEventReminders: true,
        showInStats: false,
      };

      const mockPreferences = {
        id: 'pref-123',
        userId,
        notifyViaDiscordDM: true,
        notifyViaEmail: false,
        notifyViaSMS: false,
        wantVoteReminders: true,
        wantEventReminders: true,
        showInStats: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.userPreferences.upsert).mockResolvedValue(mockPreferences as any);

      const result = await userService.updateUserPreferences(userId, preferencesData);

      expect(result.wantEventReminders).toBe(true);
      expect(result.showInStats).toBe(false);
    });

    it('should handle partial preference updates', async () => {
      const userId = 'user-123';
      const preferencesData: userService.UpdatePreferencesData = {
        notifyViaEmail: true,
      };

      const mockPreferences = {
        id: 'pref-123',
        userId,
        notifyViaDiscordDM: false,
        notifyViaEmail: true,
        notifyViaSMS: false,
        wantVoteReminders: true,
        wantEventReminders: true,
        showInStats: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.userPreferences.upsert).mockResolvedValue(mockPreferences as any);

      const result = await userService.updateUserPreferences(userId, preferencesData);

      expect(result.notifyViaEmail).toBe(true);
    });
  });

  describe('getUserPolls', () => {
    it('should get all polls created by user', async () => {
      const userId = 'user-123';
      const mockPolls = [
        createMockPoll({ id: 'poll-1', creatorId: userId }),
        createMockPoll({ id: 'poll-2', creatorId: userId }),
        createMockPoll({ id: 'poll-3', creatorId: userId }),
      ];

      vi.mocked(prisma.poll.findMany).mockResolvedValue(
        mockPolls.map((poll) => ({
          ...poll,
          options: [],
          votes: [],
          invites: [],
        })) as any
      );

      const result = await userService.getUserPolls(userId);

      expect(result).toHaveLength(3);
      expect(result[0].creatorId).toBe(userId);
      expect(prisma.poll.findMany).toHaveBeenCalledWith({
        where: { creatorId: userId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if user has no polls', async () => {
      const userId = 'user-with-no-polls';

      vi.mocked(prisma.poll.findMany).mockResolvedValue([]);

      const result = await userService.getUserPolls(userId);

      expect(result).toHaveLength(0);
    });

    it('should include poll options, votes, and invites', async () => {
      const userId = 'user-123';
      const mockPoll = {
        ...createMockPoll({ id: 'poll-1', creatorId: userId }),
        options: [
          {
            id: 'opt-1',
            pollId: 'poll-1',
            label: 'Option 1',
            description: null,
            date: null,
            timeStart: null,
            timeEnd: null,
            order: 0,
            createdAt: new Date(),
          },
        ],
        votes: [
          {
            id: 'vote-1',
            pollId: 'poll-1',
            voterId: 'user-456',
            availableOptionIds: ['opt-1'],
            maybeOptionIds: [],
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        invites: [{ id: 'invite-1', pollId: 'poll-1', userId: 'user-456', invitedAt: new Date() }],
      };

      vi.mocked(prisma.poll.findMany).mockResolvedValue([mockPoll] as any);

      const result = await userService.getUserPolls(userId);

      expect(result[0].options).toHaveLength(1);
      expect(result[0].votes).toHaveLength(1);
      expect(result[0].invites).toHaveLength(1);
    });
  });

  describe('getUserStats', () => {
    it('should calculate user statistics', async () => {
      const userId = 'user-123';

      vi.mocked(prisma.poll.count).mockResolvedValue(5); // totalPollsCreated
      vi.mocked(prisma.vote.count).mockResolvedValue(12); // totalVotes
      vi.mocked(prisma.pollInvite.count)
        .mockResolvedValueOnce(20) // totalInvites
        .mockResolvedValueOnce(15); // votedInvites

      vi.mocked(prisma.poll.groupBy).mockResolvedValue([
        { status: PollStatus.VOTING, _count: 2 },
        { status: PollStatus.FINALIZED, _count: 3 },
      ] as any);

      const result = await userService.getUserStats(userId);

      expect(result.totalPollsCreated).toBe(5);
      expect(result.totalVotes).toBe(12);
      expect(result.totalInvites).toBe(20);
      expect(result.votedInvites).toBe(15);
      expect(result.participationRate).toBe(75);
      expect(result.pollsByStatus).toEqual({
        [PollStatus.VOTING]: 2,
        [PollStatus.FINALIZED]: 3,
      });
    });

    it('should handle user with no activity', async () => {
      const userId = 'new-user';

      vi.mocked(prisma.poll.count).mockResolvedValue(0);
      vi.mocked(prisma.vote.count).mockResolvedValue(0);
      vi.mocked(prisma.pollInvite.count).mockResolvedValue(0);
      vi.mocked(prisma.poll.groupBy).mockResolvedValue([]);

      const result = await userService.getUserStats(userId);

      expect(result.totalPollsCreated).toBe(0);
      expect(result.totalVotes).toBe(0);
      expect(result.totalInvites).toBe(0);
      expect(result.participationRate).toBe(0);
      expect(result.pollsByStatus).toEqual({});
    });

    it('should calculate 100% participation rate', async () => {
      const userId = 'user-123';

      vi.mocked(prisma.poll.count).mockResolvedValue(3);
      vi.mocked(prisma.vote.count).mockResolvedValue(10);
      vi.mocked(prisma.pollInvite.count).mockResolvedValueOnce(10).mockResolvedValueOnce(10);
      vi.mocked(prisma.poll.groupBy).mockResolvedValue([]);

      const result = await userService.getUserStats(userId);

      expect(result.participationRate).toBe(100);
    });

    it('should handle various poll statuses', async () => {
      const userId = 'user-123';

      vi.mocked(prisma.poll.count).mockResolvedValue(10);
      vi.mocked(prisma.vote.count).mockResolvedValue(5);
      vi.mocked(prisma.pollInvite.count).mockResolvedValue(0);

      vi.mocked(prisma.poll.groupBy).mockResolvedValue([
        { status: PollStatus.DRAFT, _count: 1 },
        { status: PollStatus.VOTING, _count: 3 },
        { status: PollStatus.FINALIZED, _count: 5 },
        { status: PollStatus.CANCELLED, _count: 1 },
      ] as any);

      const result = await userService.getUserStats(userId);

      expect(result.pollsByStatus).toEqual({
        [PollStatus.DRAFT]: 1,
        [PollStatus.VOTING]: 3,
        [PollStatus.FINALIZED]: 5,
        [PollStatus.CANCELLED]: 1,
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user account', async () => {
      const userId = 'user-123';
      const mockUser = createMockUser({ id: userId });

      vi.mocked(prisma.user.delete).mockResolvedValue(mockUser as any);

      await userService.deleteUser(userId);

      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should handle deleting non-existent user', async () => {
      const userId = 'non-existent-user';

      vi.mocked(prisma.user.delete).mockRejectedValue(new Error('User not found'));

      await expect(userService.deleteUser(userId)).rejects.toThrow();
    });
  });
});
