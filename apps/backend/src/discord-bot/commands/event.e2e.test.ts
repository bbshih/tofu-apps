/**
 * E2E Tests for /event command
 * Tests the full flow of creating an event poll via Discord
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { prisma, PollType, PollStatus } from '@seacalendar/database';

describe('/event command E2E', () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;
  let mockReply: ReturnType<typeof vi.fn>;
  let mockFollowUp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReply = vi.fn();
    mockFollowUp = vi.fn();

    mockInteraction = {
      options: {
        getString: vi.fn((name: string) => {
          const values: Record<string, string> = {
            title: 'Weekend Dinner',
            description: "Let's grab dinner this weekend!",
            'date-option-1': '2025-11-01',
            'time-start-1': '18:00',
            'time-end-1': '21:00',
            'date-option-2': '2025-11-02',
            'time-start-2': '18:00',
            'time-end-2': '21:00',
          };
          return values[name] || null;
        }),
      } as any,
      user: {
        id: '123456789',
        username: 'testuser',
        discriminator: '0001',
      } as any,
      guild: {
        id: '987654321',
      } as any,
      channel: {
        id: '111222333',
      } as any,
      reply: mockReply,
      followUp: mockFollowUp,
      editReply: vi.fn(),
      deferReply: vi.fn(),
    };

    // Mock Prisma responses
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'user-uuid',
      discordId: '123456789',
      username: 'testuser',
      discriminator: '0001',
      avatar: null,
      email: null,
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.poll.create).mockResolvedValue({
      id: 'poll-uuid',
      type: PollType.EVENT,
      status: PollStatus.VOTING,
      title: 'Weekend Dinner',
      description: "Let's grab dinner this weekend!",
      creatorId: 'user-uuid',
      guildId: '987654321',
      channelId: '111222333',
      votingDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      closedAt: null,
      finalizedOptionId: null,
      venueId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
  });

  it('should create an event poll with valid inputs', async () => {
    const { execute } = await import('./event');

    await execute(mockInteraction as ChatInputCommandInteraction);

    // Verify database interactions
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { discordId: '123456789' },
        create: expect.objectContaining({
          discordId: '123456789',
          username: 'testuser',
        }),
      })
    );

    expect(prisma.poll.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Weekend Dinner',
          description: "Let's grab dinner this weekend!",
          type: PollType.EVENT,
          status: PollStatus.VOTING,
          guildId: '987654321',
          channelId: '111222333',
        }),
      })
    );

    // Verify Discord response
    expect(mockFollowUp).toHaveBeenCalled();
    const response = mockFollowUp.mock.calls[0][0];
    expect(response.embeds).toBeDefined();
    expect(response.embeds[0].data.title).toContain('Event Created');
  });

  it('should handle missing required title', async () => {
    mockInteraction.options!.getString = vi.fn((name: string) => {
      return name === 'title' ? null : 'some value';
    });

    const { execute } = await import('./event');

    await execute(mockInteraction as ChatInputCommandInteraction);

    expect(mockReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('title'),
        ephemeral: true,
      })
    );
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(prisma.poll.create).mockRejectedValue(new Error('Database connection failed'));

    const { execute } = await import('./event');

    await expect(execute(mockInteraction as ChatInputCommandInteraction)).rejects.toThrow();
  });

  it('should create poll with multiple date options', async () => {
    mockInteraction.options!.getString = vi.fn((name: string) => {
      const values: Record<string, string> = {
        title: 'Multi-day Event',
        'date-option-1': '2025-11-01',
        'date-option-2': '2025-11-02',
        'date-option-3': '2025-11-03',
        'time-start-1': '18:00',
        'time-start-2': '18:00',
        'time-start-3': '18:00',
      };
      return values[name] || null;
    });

    const { execute } = await import('./event');

    await execute(mockInteraction as ChatInputCommandInteraction);

    const createCall = vi.mocked(prisma.poll.create).mock.calls[0][0];
    expect(createCall.data.options?.create).toHaveLength(3);
  });

  it('should set appropriate voting deadline', async () => {
    const { execute } = await import('./event');

    await execute(mockInteraction as ChatInputCommandInteraction);

    const createCall = vi.mocked(prisma.poll.create).mock.calls[0][0];
    const deadline = createCall.data.votingDeadline;

    expect(deadline).toBeDefined();
    expect(deadline.getTime()).toBeGreaterThan(Date.now());
    // Default deadline is 14 days
    expect(deadline.getTime()).toBeLessThan(Date.now() + 15 * 24 * 60 * 60 * 1000);
  });
});
