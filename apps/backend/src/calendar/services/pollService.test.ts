/**
 * Poll Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as pollService from './pollService';
import { PollType, PollStatus } from '../prisma.js';
import { prisma } from '../prisma.js';
import { resetMockPrisma } from '../test/mockPrisma';
import { createMockPoll, createMockUser, createMockPollWithOptions } from '../test/testData';

describe('Poll Service', () => {
  beforeEach(() => {
    resetMockPrisma(prisma);
  });

  describe('createPoll', () => {
    it('should create a poll with options', async () => {
      const userId = 'user-123';
      const pollData: pollService.CreatePollData = {
        title: 'Test Poll',
        description: 'Test description',
        type: PollType.DATE,
        options: [
          { label: 'Option 1', date: new Date('2024-06-15'), timeStart: '18:00', timeEnd: '21:00' },
          { label: 'Option 2', date: new Date('2024-06-16'), timeStart: '18:00', timeEnd: '21:00' },
        ],
      };

      const mockPoll = createMockPoll({
        creatorId: userId,
        title: pollData.title,
        description: pollData.description,
        type: pollData.type,
      });

      vi.mocked(prisma.poll.create).mockResolvedValue({
        ...mockPoll,
        options: [
          {
            id: 'opt-1',
            pollId: mockPoll.id,
            label: 'Option 1',
            description: null,
            date: new Date('2024-06-15'),
            timeStart: '18:00',
            timeEnd: '21:00',
            order: 0,
            createdAt: new Date(),
          },
          {
            id: 'opt-2',
            pollId: mockPoll.id,
            label: 'Option 2',
            description: null,
            date: new Date('2024-06-16'),
            timeStart: '18:00',
            timeEnd: '21:00',
            order: 1,
            createdAt: new Date(),
          },
        ],
        invites: [],
        creator: createMockUser({ id: userId }),
      } as any);

      const result = await pollService.createPoll(userId, pollData);

      expect(result).toBeDefined();
      expect(result.title).toBe(pollData.title);
      expect(result.options).toHaveLength(2);
      expect(prisma.poll.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: pollData.title,
          description: pollData.description,
          type: pollData.type,
          creatorId: userId,
          status: PollStatus.VOTING,
          options: {
            create: expect.arrayContaining([
              expect.objectContaining({ label: 'Option 1', order: 0 }),
              expect.objectContaining({ label: 'Option 2', order: 1 }),
            ]),
          },
        }),
        include: expect.any(Object),
      });
    });

    it('should create a poll with invited users', async () => {
      const userId = 'user-123';
      const invitedUserIds = ['user-456', 'user-789'];
      const pollData: pollService.CreatePollData = {
        title: 'Test Poll',
        options: [{ label: 'Option 1' }],
        invitedUserIds,
      };

      const mockPoll = createMockPoll({ creatorId: userId });

      vi.mocked(prisma.poll.create).mockResolvedValue({
        ...mockPoll,
        options: [
          {
            id: 'opt-1',
            pollId: mockPoll.id,
            label: 'Option 1',
            description: null,
            date: null,
            timeStart: null,
            timeEnd: null,
            order: 0,
            createdAt: new Date(),
          },
        ],
        invites: invitedUserIds.map((id, idx) => ({
          id: `invite-${idx}`,
          pollId: mockPoll.id,
          userId: id,
          invitedAt: new Date(),
          user: createMockUser({ id }),
        })),
        creator: createMockUser({ id: userId }),
      } as any);

      const result = await pollService.createPoll(userId, pollData);

      expect(result.invites).toHaveLength(2);
      expect(prisma.poll.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          invites: {
            create: expect.arrayContaining([{ userId: 'user-456' }, { userId: 'user-789' }]),
          },
        }),
        include: expect.any(Object),
      });
    });

    it('should throw error if no options provided', async () => {
      const userId = 'user-123';
      const pollData: pollService.CreatePollData = {
        title: 'Test Poll',
        options: [],
      };

      await expect(pollService.createPoll(userId, pollData)).rejects.toThrow(
        'At least one poll option is required'
      );
    });

    it('should throw error if too many options provided', async () => {
      const userId = 'user-123';
      const pollData: pollService.CreatePollData = {
        title: 'Test Poll',
        options: Array.from({ length: 31 }, (_, i) => ({ label: `Option ${i + 1}` })),
      };

      await expect(pollService.createPoll(userId, pollData)).rejects.toThrow(
        'Maximum 30 poll options allowed'
      );
    });

    it('should use default type EVENT if not specified', async () => {
      const userId = 'user-123';
      const pollData: pollService.CreatePollData = {
        title: 'Test Poll',
        options: [{ label: 'Option 1' }],
      };

      const mockPoll = createMockPoll({ creatorId: userId, type: PollType.EVENT });

      vi.mocked(prisma.poll.create).mockResolvedValue({
        ...mockPoll,
        options: [
          {
            id: 'opt-1',
            pollId: mockPoll.id,
            label: 'Option 1',
            description: null,
            date: null,
            timeStart: null,
            timeEnd: null,
            order: 0,
            createdAt: new Date(),
          },
        ],
        invites: [],
        creator: createMockUser({ id: userId }),
      } as any);

      await pollService.createPoll(userId, pollData);

      expect(prisma.poll.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: PollType.EVENT,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('getPoll', () => {
    it('should get poll by ID', async () => {
      const pollId = 'poll-123';
      const mockPoll = createMockPoll({ id: pollId });

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        ...mockPoll,
        options: [],
        votes: [],
        invites: [],
        creator: createMockUser(),
        venue: null,
      } as any);

      const result = await pollService.getPoll(pollId);

      expect(result).toBeDefined();
      expect(result.id).toBe(pollId);
      expect(prisma.poll.findUnique).toHaveBeenCalledWith({
        where: { id: pollId },
        include: expect.any(Object),
      });
    });

    it('should throw error if poll not found', async () => {
      const pollId = 'non-existent-poll';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue(null);

      await expect(pollService.getPoll(pollId)).rejects.toThrow('Poll not found');
    });

    it('should allow creator to view poll', async () => {
      const userId = 'user-123';
      const pollId = 'poll-123';
      const mockPoll = createMockPoll({ id: pollId, creatorId: userId });

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        ...mockPoll,
        options: [],
        votes: [],
        invites: [],
        creator: createMockUser({ id: userId }),
        venue: null,
      } as any);

      const result = await pollService.getPoll(pollId, userId);

      expect(result).toBeDefined();
      expect(result.creatorId).toBe(userId);
    });

    it('should allow invited user to view poll', async () => {
      const userId = 'user-456';
      const pollId = 'poll-123';
      const mockPoll = createMockPoll({ id: pollId, creatorId: 'user-123' });

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        ...mockPoll,
        options: [],
        votes: [],
        invites: [
          {
            id: 'invite-1',
            pollId,
            userId,
            invitedAt: new Date(),
            user: createMockUser({ id: userId }),
          },
        ],
        creator: createMockUser({ id: 'user-123' }),
        venue: null,
      } as any);

      const result = await pollService.getPoll(pollId, userId);

      expect(result).toBeDefined();
    });
  });

  describe('updatePoll', () => {
    it('should update poll by creator', async () => {
      const userId = 'user-123';
      const pollId = 'poll-123';
      const updateData: pollService.UpdatePollData = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: userId,
        status: PollStatus.VOTING,
      } as any);

      const updatedPoll = createMockPoll({
        id: pollId,
        creatorId: userId,
        title: updateData.title,
        description: updateData.description,
      });

      vi.mocked(prisma.poll.update).mockResolvedValue({
        ...updatedPoll,
        options: [],
        votes: [],
        invites: [],
      } as any);

      const result = await pollService.updatePoll(pollId, userId, updateData);

      expect(result).toBeDefined();
      expect(result.title).toBe(updateData.title);
      expect(prisma.poll.update).toHaveBeenCalledWith({
        where: { id: pollId },
        data: updateData,
        include: expect.any(Object),
      });
    });

    it('should throw error if poll not found', async () => {
      const userId = 'user-123';
      const pollId = 'non-existent-poll';
      const updateData: pollService.UpdatePollData = { title: 'Updated Title' };

      vi.mocked(prisma.poll.findUnique).mockResolvedValue(null);

      await expect(pollService.updatePoll(pollId, userId, updateData)).rejects.toThrow(
        'Poll not found'
      );
    });

    it('should throw error if user is not creator', async () => {
      const userId = 'user-456';
      const pollId = 'poll-123';
      const updateData: pollService.UpdatePollData = { title: 'Updated Title' };

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: 'user-123',
        status: PollStatus.VOTING,
      } as any);

      await expect(pollService.updatePoll(pollId, userId, updateData)).rejects.toThrow(
        'Only poll creator can update the poll'
      );
    });

    it('should throw error if poll is finalized', async () => {
      const userId = 'user-123';
      const pollId = 'poll-123';
      const updateData: pollService.UpdatePollData = { title: 'Updated Title' };

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: userId,
        status: PollStatus.FINALIZED,
      } as any);

      await expect(pollService.updatePoll(pollId, userId, updateData)).rejects.toThrow(
        'Cannot update finalized or cancelled polls'
      );
    });

    it('should throw error if poll is cancelled', async () => {
      const userId = 'user-123';
      const pollId = 'poll-123';
      const updateData: pollService.UpdatePollData = { title: 'Updated Title' };

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: userId,
        status: PollStatus.CANCELLED,
      } as any);

      await expect(pollService.updatePoll(pollId, userId, updateData)).rejects.toThrow(
        'Cannot update finalized or cancelled polls'
      );
    });
  });

  describe('cancelPoll', () => {
    it('should cancel poll by creator', async () => {
      const userId = 'user-123';
      const pollId = 'poll-123';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: userId,
        status: PollStatus.VOTING,
      } as any);

      const cancelledPoll = createMockPoll({
        id: pollId,
        creatorId: userId,
        status: PollStatus.CANCELLED,
      });

      vi.mocked(prisma.poll.update).mockResolvedValue(cancelledPoll as any);

      const result = await pollService.cancelPoll(pollId, userId);

      expect(result).toBeDefined();
      expect(result.status).toBe(PollStatus.CANCELLED);
      expect(prisma.poll.update).toHaveBeenCalledWith({
        where: { id: pollId },
        data: expect.objectContaining({
          status: PollStatus.CANCELLED,
          closedAt: expect.any(Date),
        }),
      });
    });

    it('should throw error if poll not found', async () => {
      const userId = 'user-123';
      const pollId = 'non-existent-poll';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue(null);

      await expect(pollService.cancelPoll(pollId, userId)).rejects.toThrow('Poll not found');
    });

    it('should throw error if user is not creator', async () => {
      const userId = 'user-456';
      const pollId = 'poll-123';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: 'user-123',
        status: PollStatus.VOTING,
      } as any);

      await expect(pollService.cancelPoll(pollId, userId)).rejects.toThrow(
        'Only poll creator can cancel the poll'
      );
    });

    it('should throw error if poll is already finalized', async () => {
      const userId = 'user-123';
      const pollId = 'poll-123';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: userId,
        status: PollStatus.FINALIZED,
      } as any);

      await expect(pollService.cancelPoll(pollId, userId)).rejects.toThrow(
        'Cannot cancel finalized polls'
      );
    });
  });

  describe('finalizePoll', () => {
    it('should finalize poll with valid option', async () => {
      const userId = 'user-123';
      const pollId = 'poll-123';
      const optionId = 'option-1';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: userId,
        status: PollStatus.VOTING,
        options: [
          {
            id: optionId,
            pollId,
            label: 'Option 1',
            description: null,
            date: null,
            timeStart: null,
            timeEnd: null,
            order: 0,
            createdAt: new Date(),
          },
        ],
      } as any);

      const finalizedPoll = createMockPoll({
        id: pollId,
        creatorId: userId,
        status: PollStatus.FINALIZED,
      });

      vi.mocked(prisma.poll.update).mockResolvedValue({
        ...finalizedPoll,
        options: [],
        votes: [],
      } as any);

      const result = await pollService.finalizePoll(pollId, userId, optionId);

      expect(result).toBeDefined();
      expect(result.status).toBe(PollStatus.FINALIZED);
      expect(prisma.poll.update).toHaveBeenCalledWith({
        where: { id: pollId },
        data: expect.objectContaining({
          status: PollStatus.FINALIZED,
          finalizedOptionId: optionId,
          closedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('should throw error if poll not found', async () => {
      const userId = 'user-123';
      const pollId = 'non-existent-poll';
      const optionId = 'option-1';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue(null);

      await expect(pollService.finalizePoll(pollId, userId, optionId)).rejects.toThrow(
        'Poll not found'
      );
    });

    it('should throw error if user is not creator', async () => {
      const userId = 'user-456';
      const pollId = 'poll-123';
      const optionId = 'option-1';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: 'user-123',
        status: PollStatus.VOTING,
        options: [
          {
            id: optionId,
            pollId,
            label: 'Option 1',
            description: null,
            date: null,
            timeStart: null,
            timeEnd: null,
            order: 0,
            createdAt: new Date(),
          },
        ],
      } as any);

      await expect(pollService.finalizePoll(pollId, userId, optionId)).rejects.toThrow(
        'Only poll creator can finalize the poll'
      );
    });

    it('should throw error if poll is already finalized', async () => {
      const userId = 'user-123';
      const pollId = 'poll-123';
      const optionId = 'option-1';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: userId,
        status: PollStatus.FINALIZED,
        options: [
          {
            id: optionId,
            pollId,
            label: 'Option 1',
            description: null,
            date: null,
            timeStart: null,
            timeEnd: null,
            order: 0,
            createdAt: new Date(),
          },
        ],
      } as any);

      await expect(pollService.finalizePoll(pollId, userId, optionId)).rejects.toThrow(
        'Poll is already finalized'
      );
    });

    it('should throw error if invalid option ID', async () => {
      const userId = 'user-123';
      const pollId = 'poll-123';
      const optionId = 'invalid-option';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: userId,
        status: PollStatus.VOTING,
        options: [
          {
            id: 'option-1',
            pollId,
            label: 'Option 1',
            description: null,
            date: null,
            timeStart: null,
            timeEnd: null,
            order: 0,
            createdAt: new Date(),
          },
        ],
      } as any);

      await expect(pollService.finalizePoll(pollId, userId, optionId)).rejects.toThrow(
        'Invalid option ID'
      );
    });
  });

  describe('getUserPolls', () => {
    it('should get all polls for a user', async () => {
      const userId = 'user-123';
      const mockPolls = [
        createMockPoll({ id: 'poll-1', creatorId: userId }),
        createMockPoll({ id: 'poll-2', creatorId: userId }),
      ];

      vi.mocked(prisma.poll.findMany).mockResolvedValue(
        mockPolls.map((poll) => ({
          ...poll,
          options: [],
          votes: [],
          invites: [],
        })) as any
      );

      const result = await pollService.getUserPolls(userId);

      expect(result).toHaveLength(2);
      expect(prisma.poll.findMany).toHaveBeenCalledWith({
        where: { creatorId: userId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter polls by status', async () => {
      const userId = 'user-123';
      const mockPolls = [
        createMockPoll({ id: 'poll-1', creatorId: userId, status: PollStatus.VOTING }),
      ];

      vi.mocked(prisma.poll.findMany).mockResolvedValue(
        mockPolls.map((poll) => ({
          ...poll,
          options: [],
          votes: [],
          invites: [],
        })) as any
      );

      const result = await pollService.getUserPolls(userId, PollStatus.VOTING);

      expect(result).toHaveLength(1);
      expect(prisma.poll.findMany).toHaveBeenCalledWith({
        where: { creatorId: userId, status: PollStatus.VOTING },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getInvitedPolls', () => {
    it('should get polls user is invited to', async () => {
      const userId = 'user-456';
      const mockInvites = [
        {
          id: 'invite-1',
          pollId: 'poll-1',
          userId,
          invitedAt: new Date(),
          poll: {
            ...createMockPoll({ id: 'poll-1', creatorId: 'user-123' }),
            options: [],
            votes: [],
            creator: createMockUser({ id: 'user-123' }),
          },
        },
        {
          id: 'invite-2',
          pollId: 'poll-2',
          userId,
          invitedAt: new Date(),
          poll: {
            ...createMockPoll({ id: 'poll-2', creatorId: 'user-123' }),
            options: [],
            votes: [],
            creator: createMockUser({ id: 'user-123' }),
          },
        },
      ];

      vi.mocked(prisma.pollInvite.findMany).mockResolvedValue(mockInvites as any);

      const result = await pollService.getInvitedPolls(userId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('poll-1');
      expect(result[1].id).toBe('poll-2');
      expect(prisma.pollInvite.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: expect.any(Object),
        orderBy: { invitedAt: 'desc' },
      });
    });

    it('should return empty array if no invites', async () => {
      const userId = 'user-456';

      vi.mocked(prisma.pollInvite.findMany).mockResolvedValue([]);

      const result = await pollService.getInvitedPolls(userId);

      expect(result).toHaveLength(0);
    });
  });
});
