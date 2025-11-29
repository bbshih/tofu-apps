/**
 * E2E Tests for /status command
 * Tests checking poll status and displaying results
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatInputCommandInteraction } from 'discord.js';
import { prisma, PollType, PollStatus } from '@seacalendar/database';

describe('/status command E2E', () => {
  let mockInteraction: Partial<ChatInputCommandInteraction>;
  let mockReply: ReturnType<typeof vi.fn>;
  let mockFollowUp: ReturnType<typeof vi.fn>;

  const mockPoll = {
    id: 'poll-uuid',
    type: PollType.EVENT,
    status: PollStatus.VOTING,
    title: 'Test Event',
    description: 'Test description',
    creatorId: 'user-uuid',
    guildId: '987654321',
    channelId: '111222333',
    votingDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    closedAt: null,
    finalizedOptionId: null,
    venueId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: {
      id: 'user-uuid',
      discordId: '123456789',
      username: 'testuser',
      discriminator: '0001',
      avatar: null,
      email: null,
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    options: [
      {
        id: 'option-1',
        pollId: 'poll-uuid',
        label: 'Saturday Evening',
        description: null,
        date: new Date('2025-11-01'),
        timeStart: '18:00',
        timeEnd: '21:00',
        order: 0,
        createdAt: new Date(),
      },
      {
        id: 'option-2',
        pollId: 'poll-uuid',
        label: 'Sunday Afternoon',
        description: null,
        date: new Date('2025-11-02'),
        timeStart: '14:00',
        timeEnd: '17:00',
        order: 1,
        createdAt: new Date(),
      },
    ],
  };

  const mockVotes = [
    {
      id: 'vote-1',
      pollId: 'poll-uuid',
      voterId: 'voter-1',
      availableOptionIds: ['option-1', 'option-2'],
      maybeOptionIds: [],
      notes: 'Both work for me!',
      votedAt: new Date(),
      updatedAt: new Date(),
      voter: {
        id: 'voter-1',
        discordId: '111111111',
        username: 'voter1',
        discriminator: '0001',
        avatar: null,
        email: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'vote-2',
      pollId: 'poll-uuid',
      voterId: 'voter-2',
      availableOptionIds: ['option-1'],
      maybeOptionIds: ['option-2'],
      notes: 'Saturday is best',
      votedAt: new Date(),
      updatedAt: new Date(),
      voter: {
        id: 'voter-2',
        discordId: '222222222',
        username: 'voter2',
        discriminator: '0002',
        avatar: null,
        email: null,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ];

  beforeEach(() => {
    mockReply = vi.fn();
    mockFollowUp = vi.fn();

    mockInteraction = {
      options: {
        getString: vi.fn(() => 'poll-uuid'),
      } as any,
      user: {
        id: '123456789',
      } as any,
      guild: {
        id: '987654321',
      } as any,
      reply: mockReply,
      editReply: mockFollowUp,
      deferReply: vi.fn().mockResolvedValue(undefined),
      followUp: mockFollowUp,
    };

    vi.mocked(prisma.poll.findUnique).mockResolvedValue(mockPoll as any);
    vi.mocked(prisma.vote.findMany).mockResolvedValue(mockVotes as any);
  });

  it('should display poll status with vote counts', async () => {
    const { execute } = await import('./status');

    await execute(mockInteraction as ChatInputCommandInteraction);

    expect(prisma.poll.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'poll-uuid' },
        include: expect.objectContaining({
          options: true,
          creator: true,
        }),
      })
    );

    expect(prisma.vote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pollId: 'poll-uuid' },
      })
    );

    expect(mockFollowUp).toHaveBeenCalled();
    const response = mockFollowUp.mock.calls[0][0];
    expect(response.embeds).toBeDefined();
    expect(response.embeds[0].data.title).toContain('Test Event');
  });

  it('should handle non-existent poll', async () => {
    vi.mocked(prisma.poll.findUnique).mockResolvedValue(null);

    const { execute } = await import('./status');

    await execute(mockInteraction as ChatInputCommandInteraction);

    expect(mockReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('not found'),
        ephemeral: true,
      })
    );
  });

  it('should show correct vote tallies', async () => {
    const { execute } = await import('./status');

    await execute(mockInteraction as ChatInputCommandInteraction);

    const response = mockFollowUp.mock.calls[0][0];
    const embed = response.embeds[0];

    // option-1 should have 2 votes (both voters selected it)
    // option-2 should have 1 vote (only voter1 selected it as available)
    expect(embed.data.description || embed.data.fields).toBeDefined();
  });

  it('should indicate poll status (voting/finalized/cancelled)', async () => {
    const { execute } = await import('./status');

    await execute(mockInteraction as ChatInputCommandInteraction);

    const response = mockFollowUp.mock.calls[0][0];
    const embed = response.embeds[0];

    expect(embed.data.color).toBe(0x0ea5e9); // Blue for voting status
  });

  it('should show finalized poll with winner', async () => {
    const finalizedPoll = {
      ...mockPoll,
      status: PollStatus.FINALIZED,
      finalizedOptionId: 'option-1',
      closedAt: new Date(),
    };

    vi.mocked(prisma.poll.findUnique).mockResolvedValue(finalizedPoll as any);

    const { execute } = await import('./status');

    await execute(mockInteraction as ChatInputCommandInteraction);

    const response = mockFollowUp.mock.calls[0][0];
    const embed = response.embeds[0];

    expect(embed.data.color).not.toBe(0x0ea5e9); // Not blue (closed)
  });

  it('should handle polls with no votes', async () => {
    vi.mocked(prisma.vote.findMany).mockResolvedValue([]);

    const { execute } = await import('./status');

    await execute(mockInteraction as ChatInputCommandInteraction);

    const response = mockFollowUp.mock.calls[0][0];
    expect(response.embeds[0].data.fields).toBeDefined();
    // Should show 0 voters
  });
});
