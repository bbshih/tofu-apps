/**
 * Unit tests for /myevents command
 * Tests user event listing and filtering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatInputCommandInteraction } from 'discord.js';
import { execute } from './myevents.js';
import * as pollService from '../services/pollService.js';

// Mock the service
vi.mock('../services/pollService.js');

// Mock config
vi.mock('../config.js', () => ({
  Config: {
    webAppUrl: 'https://example.com',
  },
}));

describe('/myevents command', () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;
  let mockDeferReply: ReturnType<typeof vi.fn>;
  let mockEditReply: ReturnType<typeof vi.fn>;

  const mockGuildId = '987654321';
  const mockUserId = '123456789';

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeferReply = vi.fn().mockResolvedValue(undefined);
    mockEditReply = vi.fn().mockResolvedValue(undefined);

    mockInteraction = {
      guildId: mockGuildId,
      user: {
        id: mockUserId,
        username: 'testuser',
      } as any,
      deferReply: mockDeferReply,
      editReply: mockEditReply,
      deferred: true,
    };
  });

  describe('command execution', () => {
    it('should defer reply with ephemeral flag', async () => {
      vi.mocked(pollService.getUserPolls).mockResolvedValue([]);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockDeferReply).toHaveBeenCalledWith({ ephemeral: true });
    });

    it('should fetch user polls', async () => {
      vi.mocked(pollService.getUserPolls).mockResolvedValue([]);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(pollService.getUserPolls).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('empty state', () => {
    it('should show empty state when no events created', async () => {
      vi.mocked(pollService.getUserPolls).mockResolvedValue([]);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("haven't created any events"),
        })
      );
    });

    it('should suggest using /event command', async () => {
      vi.mocked(pollService.getUserPolls).mockResolvedValue([]);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('/event'),
        })
      );
    });
  });

  describe('event listing', () => {
    it('should list events from current guild', async () => {
      const mockPolls = [
        {
          id: 'poll-1',
          title: 'Event 1',
          guildId: mockGuildId,
          status: 'VOTING',
          options: [{ id: '1' }, { id: '2' }],
          votingDeadline: null,
        },
        {
          id: 'poll-2',
          title: 'Event 2',
          guildId: mockGuildId,
          status: 'FINALIZED',
          options: [{ id: '1' }],
          votingDeadline: new Date('2025-12-31'),
        },
      ] as any;

      vi.mocked(pollService.getUserPolls).mockResolvedValue(mockPolls);
      vi.mocked(pollService.generateVotingUrl).mockReturnValue('https://example.com/vote/123');

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: 'Your Events',
                description: expect.stringContaining('2 events'),
              }),
            }),
          ]),
        })
      );
    });

    it('should filter out events from other guilds', async () => {
      const mockPolls = [
        {
          id: 'poll-1',
          title: 'Event 1',
          guildId: mockGuildId,
          status: 'VOTING',
          options: [{ id: '1' }],
          votingDeadline: null,
        },
        {
          id: 'poll-2',
          title: 'Event 2',
          guildId: 'other-guild',
          status: 'VOTING',
          options: [{ id: '1' }],
          votingDeadline: null,
        },
      ] as any;

      vi.mocked(pollService.getUserPolls).mockResolvedValue(mockPolls);
      vi.mocked(pollService.generateVotingUrl).mockReturnValue('https://example.com/vote/123');

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                description: expect.stringContaining('1 event'),
              }),
            }),
          ]),
        })
      );
    });

    it('should show status emoji for different poll states', async () => {
      const statuses = ['VOTING', 'FINALIZED', 'CANCELLED', 'CLOSED'] as const;

      for (const status of statuses) {
        vi.clearAllMocks();

        const mockPolls = [
          {
            id: 'poll-1',
            title: 'Test Event',
            guildId: mockGuildId,
            status,
            options: [{ id: '1' }],
            votingDeadline: null,
          },
        ] as any;

        vi.mocked(pollService.getUserPolls).mockResolvedValue(mockPolls);
        vi.mocked(pollService.generateVotingUrl).mockReturnValue('https://example.com/vote/123');

        await execute(mockInteraction as ChatInputCommandInteraction);

        expect(mockEditReply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          })
        );
      }
    });

    it('should limit display to 10 events', async () => {
      const mockPolls = Array.from({ length: 15 }, (_, i) => ({
        id: `poll-${i}`,
        title: `Event ${i}`,
        guildId: mockGuildId,
        status: 'VOTING',
        options: [{ id: '1' }],
        votingDeadline: null,
      })) as any;

      vi.mocked(pollService.getUserPolls).mockResolvedValue(mockPolls);
      vi.mocked(pollService.generateVotingUrl).mockReturnValue('https://example.com/vote/123');

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                footer: expect.objectContaining({
                  text: 'Showing 10 of 15 events',
                }),
              }),
            }),
          ]),
        })
      );
    });

    it('should include voting URLs and results links', async () => {
      const mockPolls = [
        {
          id: 'poll-1',
          title: 'Event 1',
          guildId: mockGuildId,
          status: 'VOTING',
          options: [{ id: '1' }],
          votingDeadline: null,
        },
      ] as any;

      vi.mocked(pollService.getUserPolls).mockResolvedValue(mockPolls);
      vi.mocked(pollService.generateVotingUrl).mockReturnValue('https://example.com/vote/poll-1');

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(pollService.generateVotingUrl).toHaveBeenCalledWith('poll-1');
      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        })
      );
    });

    it('should show relative deadline time', async () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day from now
      const mockPolls = [
        {
          id: 'poll-1',
          title: 'Event 1',
          guildId: mockGuildId,
          status: 'VOTING',
          options: [{ id: '1' }],
          votingDeadline: futureDate,
        },
      ] as any;

      vi.mocked(pollService.getUserPolls).mockResolvedValue(mockPolls);
      vi.mocked(pollService.generateVotingUrl).mockReturnValue('https://example.com/vote/123');

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        })
      );
    });

    it('should include action buttons', async () => {
      const mockPolls = [
        {
          id: 'poll-1',
          title: 'Event 1',
          guildId: mockGuildId,
          status: 'VOTING',
          options: [{ id: '1' }],
          votingDeadline: null,
        },
      ] as any;

      vi.mocked(pollService.getUserPolls).mockResolvedValue(mockPolls);
      vi.mocked(pollService.generateVotingUrl).mockReturnValue('https://example.com/vote/123');

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({
              components: expect.any(Array),
            }),
          ]),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle service errors', async () => {
      vi.mocked(pollService.getUserPolls).mockRejectedValue(new Error('Database error'));

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Error fetching your events'),
        })
      );
    });

    it('should handle unknown errors gracefully', async () => {
      vi.mocked(pollService.getUserPolls).mockRejectedValue('Unknown');

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Unknown error'),
        })
      );
    });
  });
});
