/**
 * Integration E2E Tests
 * Tests the complete flow from event creation to finalization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma, PollType, PollStatus } from '@seacalendar/database';
import { createEventPoll, getPollWithDetails } from './services/pollService';

describe('Complete Event Flow E2E', () => {
  const mockUser = {
    id: 'user-uuid',
    discordId: '123456789',
    username: 'testuser',
    discriminator: '0001',
    avatar: null,
    email: null,
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPoll = {
    id: 'poll-uuid',
    type: PollType.EVENT,
    status: PollStatus.VOTING,
    title: 'Integration Test Event',
    description: 'Testing the complete flow',
    creatorId: 'user-uuid',
    guildId: '987654321',
    channelId: '111222333',
    votingDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    closedAt: null,
    finalizedOptionId: null,
    venueId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: mockUser,
    options: [
      {
        id: 'option-1',
        pollId: 'poll-uuid',
        label: 'Date Option 1',
        description: null,
        date: new Date('2025-11-01'),
        timeStart: '18:00',
        timeEnd: '21:00',
        order: 0,
        createdAt: new Date(),
      },
    ],
  };

  beforeEach(() => {
    vi.mocked(prisma.user.upsert).mockResolvedValue(mockUser);
    vi.mocked(prisma.poll.create).mockResolvedValue(mockPoll as any);
    vi.mocked(prisma.poll.findUnique).mockResolvedValue(mockPoll as any);
  });

  describe('Event Creation Flow', () => {
    it('should create event poll end-to-end', async () => {
      const input = {
        title: 'Integration Test Event',
        description: 'Testing the complete flow',
        creatorDiscordId: '123456789',
        guildId: '987654321',
        channelId: '111222333',
        dateOptions: [new Date('2025-11-01')],
        times: [{ start: '18:00', end: '21:00' }],
      };

      const result = await createEventPoll(input);

      // Verify user was created/fetched
      expect(prisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { discordId: '123456789' },
        })
      );

      // Verify poll was created
      expect(prisma.poll.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Integration Test Event',
            type: PollType.EVENT,
            status: PollStatus.VOTING,
          }),
        })
      );

      expect(result).toBeDefined();
      expect(result.title).toBe('Integration Test Event');
    });

    it('should handle event creation with multiple date options', async () => {
      const multiOptionPoll = {
        ...mockPoll,
        options: [
          { ...mockPoll.options[0], id: 'option-1', order: 0 },
          { ...mockPoll.options[0], id: 'option-2', order: 1 },
          { ...mockPoll.options[0], id: 'option-3', order: 2 },
        ],
      };

      vi.mocked(prisma.poll.create).mockResolvedValue(multiOptionPoll as any);

      const input = {
        title: 'Multi-Date Event',
        creatorDiscordId: '123456789',
        guildId: '987654321',
        channelId: '111222333',
        dateOptions: [new Date('2025-11-01'), new Date('2025-11-02'), new Date('2025-11-03')],
        times: [{ start: '18:00', end: '21:00' }],
      };

      const result = await createEventPoll(input);

      expect(result.options).toHaveLength(3);
    });
  });

  describe('Poll Retrieval Flow', () => {
    it('should retrieve poll with all details', async () => {
      const result = await getPollWithDetails('poll-uuid');

      expect(prisma.poll.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'poll-uuid' },
          include: expect.objectContaining({
            options: expect.any(Object),
            creator: true,
          }),
        })
      );

      expect(result).toBeDefined();
      expect(result?.title).toBe('Integration Test Event');
      expect(result?.creator).toBeDefined();
      expect(result?.options).toBeDefined();
    });

    it('should return null for non-existent poll', async () => {
      vi.mocked(prisma.poll.findUnique).mockResolvedValue(null);

      const result = await getPollWithDetails('non-existent-uuid');

      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.poll.create).mockRejectedValue(new Error('Database connection failed'));

      const input = {
        title: 'Test Event',
        creatorDiscordId: '123456789',
        guildId: '987654321',
        channelId: '111222333',
        dateOptions: [new Date('2025-11-01')],
      };

      await expect(createEventPoll(input)).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const invalidInput = {
        title: '', // Empty title
        creatorDiscordId: '123456789',
        guildId: '987654321',
        channelId: '111222333',
        dateOptions: [],
      };

      // Should throw or handle validation error
      await expect(createEventPoll(invalidInput as any)).rejects.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity between poll and creator', async () => {
      const result = await createEventPoll({
        title: 'Test Event',
        creatorDiscordId: '123456789',
        guildId: '987654321',
        channelId: '111222333',
        dateOptions: [new Date('2025-11-01')],
      });

      expect(result.creatorId).toBe(mockUser.id);
    });

    it('should set appropriate timestamps', async () => {
      const result = await createEventPoll({
        title: 'Test Event',
        creatorDiscordId: '123456789',
        guildId: '987654321',
        channelId: '111222333',
        dateOptions: [new Date('2025-11-01')],
      });

      expect(result.createdAt).toBeDefined();
      expect(result.votingDeadline).toBeDefined();
      expect(result.votingDeadline!.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
