/**
 * Unit tests for /cancel command
 * Tests event cancellation with confirmation flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatInputCommandInteraction, ComponentType } from 'discord.js';
import { execute } from './cancel.js';
import * as pollService from '../services/pollService.js';

// Mock the service
vi.mock('../services/pollService.js');

describe('/cancel command', () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;
  let mockDeferReply: ReturnType<typeof vi.fn>;
  let mockEditReply: ReturnType<typeof vi.fn>;
  let mockReply: ReturnType<typeof vi.fn>;

  const mockGuildId = '987654321';
  const mockUserId = '123456789';
  const mockPollId = 'poll-123';

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeferReply = vi.fn().mockResolvedValue(undefined);
    mockEditReply = vi.fn().mockResolvedValue({
      awaitMessageComponent: vi.fn().mockRejectedValue(new Error('time')),
    });
    mockReply = vi.fn().mockResolvedValue(undefined);

    mockInteraction = {
      guildId: mockGuildId,
      user: {
        id: mockUserId,
        username: 'testuser',
      } as any,
      options: {
        getString: vi.fn().mockReturnValue(mockPollId),
      } as any,
      deferReply: mockDeferReply,
      editReply: mockEditReply,
      reply: mockReply,
      deferred: true,
    };
  });

  describe('command execution', () => {
    it('should defer reply with ephemeral flag', async () => {
      vi.mocked(pollService.getPollWithDetails).mockResolvedValue(null);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockDeferReply).toHaveBeenCalledWith({ ephemeral: true });
    });

    it('should extract poll ID from input', async () => {
      mockInteraction.options!.getString = vi.fn().mockReturnValue('poll-abc-123');

      vi.mocked(pollService.getPollWithDetails).mockResolvedValue(null);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(pollService.getPollWithDetails).toHaveBeenCalledWith('poll-abc-123');
    });

    it('should extract poll ID from URL', async () => {
      mockInteraction.options!.getString = vi
        .fn()
        .mockReturnValue('https://example.com/vote/poll-xyz-789');

      vi.mocked(pollService.getPollWithDetails).mockResolvedValue(null);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(pollService.getPollWithDetails).toHaveBeenCalledWith('poll-xyz-789');
    });

    it('should handle event URL patterns', async () => {
      const testCases = [
        { input: 'https://example.com/event/poll-123', expected: 'poll-123' },
        { input: 'https://example.com/results/poll-456', expected: 'poll-456' },
        { input: 'poll-direct', expected: 'poll-direct' },
      ];

      for (const { input, expected } of testCases) {
        vi.clearAllMocks();
        mockInteraction.options!.getString = vi.fn().mockReturnValue(input);
        vi.mocked(pollService.getPollWithDetails).mockResolvedValue(null);

        await execute(mockInteraction as ChatInputCommandInteraction);

        expect(pollService.getPollWithDetails).toHaveBeenCalledWith(expected);
      }
    });
  });

  describe('validation', () => {
    it('should handle poll not found', async () => {
      vi.mocked(pollService.getPollWithDetails).mockResolvedValue(null);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Event not found'),
        })
      );
    });

    it('should reject poll from different guild', async () => {
      vi.mocked(pollService.getPollWithDetails).mockResolvedValue({
        id: mockPollId,
        guildId: 'different-guild',
        creator: { discordId: mockUserId } as any,
        status: 'VOTING',
      } as any);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('different server'),
        })
      );
    });

    it('should reject non-creator', async () => {
      vi.mocked(pollService.getPollWithDetails).mockResolvedValue({
        id: mockPollId,
        guildId: mockGuildId,
        creator: { discordId: 'other-user' } as any,
        status: 'VOTING',
      } as any);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Only the event creator'),
        })
      );
    });

    it('should reject already cancelled poll', async () => {
      vi.mocked(pollService.getPollWithDetails).mockResolvedValue({
        id: mockPollId,
        guildId: mockGuildId,
        creator: { discordId: mockUserId } as any,
        status: 'CANCELLED',
      } as any);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('already been cancelled'),
        })
      );
    });

    it('should reject finalized poll', async () => {
      vi.mocked(pollService.getPollWithDetails).mockResolvedValue({
        id: mockPollId,
        guildId: mockGuildId,
        creator: { discordId: mockUserId } as any,
        status: 'FINALIZED',
      } as any);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Cannot cancel a finalized event'),
        })
      );
    });
  });

  describe('confirmation flow', () => {
    it('should show confirmation dialog for valid cancellation', async () => {
      vi.mocked(pollService.getPollWithDetails).mockResolvedValue({
        id: mockPollId,
        guildId: mockGuildId,
        creator: { discordId: mockUserId } as any,
        status: 'VOTING',
        title: 'Test Event',
        options: [{ id: '1' }, { id: '2' }] as any,
      } as any);

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Confirm Cancellation'),
              }),
            }),
          ]),
          components: expect.any(Array),
        })
      );
    });

    it('should handle confirmation timeout', async () => {
      vi.mocked(pollService.getPollWithDetails).mockResolvedValue({
        id: mockPollId,
        guildId: mockGuildId,
        creator: { discordId: mockUserId } as any,
        status: 'VOTING',
        title: 'Test Event',
        options: [{ id: '1' }] as any,
      } as any);

      mockEditReply.mockResolvedValueOnce({
        awaitMessageComponent: vi.fn().mockRejectedValue(new Error('time')),
      });

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('timed out'),
        })
      );
    });

    it('should handle abort confirmation', async () => {
      const mockConfirmation = {
        customId: 'cancel_abort',
        update: vi.fn().mockResolvedValue(undefined),
        user: { id: mockUserId },
      };

      vi.mocked(pollService.getPollWithDetails).mockResolvedValue({
        id: mockPollId,
        guildId: mockGuildId,
        creator: { discordId: mockUserId } as any,
        status: 'VOTING',
        title: 'Test Event',
        options: [{ id: '1' }] as any,
      } as any);

      mockEditReply.mockResolvedValueOnce({
        awaitMessageComponent: vi.fn().mockResolvedValue(mockConfirmation),
      });

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockConfirmation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('aborted'),
        })
      );
      expect(pollService.cancelPoll).not.toHaveBeenCalled();
    });

    it('should cancel poll on confirmation', async () => {
      const mockConfirmation = {
        customId: 'cancel_confirm',
        deferUpdate: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
        user: { id: mockUserId },
      };

      vi.mocked(pollService.getPollWithDetails).mockResolvedValue({
        id: mockPollId,
        guildId: mockGuildId,
        creator: { discordId: mockUserId } as any,
        status: 'VOTING',
        title: 'Test Event',
        options: [{ id: '1' }] as any,
      } as any);

      vi.mocked(pollService.cancelPoll).mockResolvedValue(undefined as any);

      mockEditReply.mockResolvedValueOnce({
        awaitMessageComponent: vi.fn().mockResolvedValue(mockConfirmation),
      });

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(pollService.cancelPoll).toHaveBeenCalledWith(mockPollId, mockUserId);
      expect(mockConfirmation.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining('Cancelled'),
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle service errors', async () => {
      vi.mocked(pollService.getPollWithDetails).mockRejectedValue(new Error('Database error'));

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Error cancelling event'),
        })
      );
    });

    it('should handle unknown errors gracefully', async () => {
      vi.mocked(pollService.getPollWithDetails).mockRejectedValue('Unknown');

      await execute(mockInteraction as ChatInputCommandInteraction);

      expect(mockEditReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Unknown error'),
        })
      );
    });
  });
});
