/**
 * Vote Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as voteService from './voteService';
import { PollStatus } from '../prisma.js';
import { prisma } from '../prisma.js';
import { resetMockPrisma } from '../test/mockPrisma';
import {
  createMockPoll,
  createMockPollOption,
  createMockVote,
  createMockUser,
} from '../test/testData';

describe('Vote Service', () => {
  beforeEach(() => {
    resetMockPrisma(prisma);
  });

  describe('submitVote', () => {
    it('should submit a new vote', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';
      const optionIds = ['option-1', 'option-2'];
      const voteData: voteService.SubmitVoteData = {
        availableOptionIds: optionIds,
        notes: 'Test notes',
      };

      const mockPoll = createMockPoll({ id: pollId, status: PollStatus.VOTING });
      const mockOptions = [
        createMockPollOption({ id: 'option-1', pollId }),
        createMockPollOption({ id: 'option-2', pollId }),
        createMockPollOption({ id: 'option-3', pollId }),
      ];

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        ...mockPoll,
        options: mockOptions,
        invites: [],
      } as any);

      const mockVote = {
        id: 'vote-123',
        pollId,
        voterId: userId,
        availableOptionIds: optionIds,
        maybeOptionIds: [],
        notes: 'Test notes',
        createdAt: new Date(),
        updatedAt: new Date(),
        voter: createMockUser({ id: userId }),
      };

      vi.mocked(prisma.vote.upsert).mockResolvedValue(mockVote as any);
      vi.mocked(prisma.pollInvite.updateMany).mockResolvedValue({ count: 1 });

      const result = await voteService.submitVote(pollId, userId, voteData);

      expect(result).toBeDefined();
      expect(result.availableOptionIds).toEqual(optionIds);
      expect(result.notes).toBe('Test notes');
      expect(prisma.vote.upsert).toHaveBeenCalledWith({
        where: {
          pollId_voterId: { pollId, voterId: userId },
        },
        create: expect.objectContaining({
          pollId,
          voterId: userId,
          availableOptionIds: optionIds,
          notes: 'Test notes',
        }),
        update: expect.any(Object),
        include: expect.any(Object),
      });
    });

    it('should submit vote with maybe options', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';
      const voteData: voteService.SubmitVoteData = {
        availableOptionIds: ['option-1'],
        maybeOptionIds: ['option-2'],
      };

      const mockPoll = createMockPoll({ id: pollId, status: PollStatus.VOTING });
      const mockOptions = [
        createMockPollOption({ id: 'option-1', pollId }),
        createMockPollOption({ id: 'option-2', pollId }),
      ];

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        ...mockPoll,
        options: mockOptions,
        invites: [],
      } as any);

      const mockVote = {
        id: 'vote-123',
        pollId,
        voterId: userId,
        availableOptionIds: ['option-1'],
        maybeOptionIds: ['option-2'],
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        voter: createMockUser({ id: userId }),
      };

      vi.mocked(prisma.vote.upsert).mockResolvedValue(mockVote as any);
      vi.mocked(prisma.pollInvite.updateMany).mockResolvedValue({ count: 1 });

      const result = await voteService.submitVote(pollId, userId, voteData);

      expect(result.availableOptionIds).toEqual(['option-1']);
      expect(result.maybeOptionIds).toEqual(['option-2']);
    });

    it('should throw error if poll not found', async () => {
      const pollId = 'non-existent-poll';
      const userId = 'user-123';
      const voteData: voteService.SubmitVoteData = {
        availableOptionIds: ['option-1'],
      };

      vi.mocked(prisma.poll.findUnique).mockResolvedValue(null);

      await expect(voteService.submitVote(pollId, userId, voteData)).rejects.toThrow(
        'Poll not found'
      );
    });

    it('should throw error if poll is not accepting votes', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';
      const voteData: voteService.SubmitVoteData = {
        availableOptionIds: ['option-1'],
      };

      const mockPoll = createMockPoll({ id: pollId, status: PollStatus.FINALIZED });

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        ...mockPoll,
        options: [],
        invites: [],
      } as any);

      await expect(voteService.submitVote(pollId, userId, voteData)).rejects.toThrow(
        'Poll is not accepting votes'
      );
    });

    it('should throw error if voting deadline has passed', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';
      const voteData: voteService.SubmitVoteData = {
        availableOptionIds: ['option-1'],
      };

      const pastDate = new Date('2020-01-01');
      const mockPoll = createMockPoll({
        id: pollId,
        status: PollStatus.VOTING,
        votingDeadline: pastDate,
      });

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        ...mockPoll,
        options: [],
        invites: [],
      } as any);

      await expect(voteService.submitVote(pollId, userId, voteData)).rejects.toThrow(
        'Voting deadline has passed'
      );
    });

    it('should throw error if invalid option IDs provided', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';
      const voteData: voteService.SubmitVoteData = {
        availableOptionIds: ['invalid-option'],
      };

      const mockPoll = createMockPoll({ id: pollId, status: PollStatus.VOTING });
      const mockOptions = [createMockPollOption({ id: 'option-1', pollId })];

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        ...mockPoll,
        options: mockOptions,
        invites: [],
      } as any);

      await expect(voteService.submitVote(pollId, userId, voteData)).rejects.toThrow(
        'Invalid option IDs provided'
      );
    });

    it('should throw error if option is both available and maybe', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';
      const voteData: voteService.SubmitVoteData = {
        availableOptionIds: ['option-1'],
        maybeOptionIds: ['option-1'],
      };

      const mockPoll = createMockPoll({ id: pollId, status: PollStatus.VOTING });
      const mockOptions = [createMockPollOption({ id: 'option-1', pollId })];

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        ...mockPoll,
        options: mockOptions,
        invites: [],
      } as any);

      await expect(voteService.submitVote(pollId, userId, voteData)).rejects.toThrow(
        'Options cannot be both available and maybe'
      );
    });

    it('should update existing vote', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';
      const voteData: voteService.SubmitVoteData = {
        availableOptionIds: ['option-2'],
        notes: 'Updated notes',
      };

      const mockPoll = createMockPoll({ id: pollId, status: PollStatus.VOTING });
      const mockOptions = [
        createMockPollOption({ id: 'option-1', pollId }),
        createMockPollOption({ id: 'option-2', pollId }),
      ];

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        ...mockPoll,
        options: mockOptions,
        invites: [],
      } as any);

      const updatedVote = {
        id: 'vote-123',
        pollId,
        voterId: userId,
        availableOptionIds: ['option-2'],
        maybeOptionIds: [],
        notes: 'Updated notes',
        createdAt: new Date(),
        updatedAt: new Date(),
        voter: createMockUser({ id: userId }),
      };

      vi.mocked(prisma.vote.upsert).mockResolvedValue(updatedVote as any);
      vi.mocked(prisma.pollInvite.updateMany).mockResolvedValue({ count: 1 });

      const result = await voteService.submitVote(pollId, userId, voteData);

      expect(result.availableOptionIds).toEqual(['option-2']);
      expect(result.notes).toBe('Updated notes');
    });
  });

  describe('getVoteResults', () => {
    it('should calculate vote results correctly', async () => {
      const pollId = 'poll-123';
      const mockPoll = createMockPoll({ id: pollId });
      const mockOptions = [
        createMockPollOption({ id: 'option-1', pollId, label: 'Option 1' }),
        createMockPollOption({ id: 'option-2', pollId, label: 'Option 2' }),
      ];
      const mockVotes = [
        {
          id: 'vote-1',
          pollId,
          voterId: 'user-1',
          availableOptionIds: ['option-1'],
          maybeOptionIds: ['option-2'],
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'vote-2',
          pollId,
          voterId: 'user-2',
          availableOptionIds: ['option-1'],
          maybeOptionIds: [],
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        ...mockPoll,
        options: mockOptions,
        votes: mockVotes,
        invites: [{ id: 'invite-1' }, { id: 'invite-2' }, { id: 'invite-3' }] as any,
      } as any);

      const results = await voteService.getVoteResults(pollId);

      expect(results.pollId).toBe(pollId);
      expect(results.totalVoters).toBe(2);
      expect(results.totalInvited).toBe(3);
      expect(results.optionResults).toHaveLength(2);

      // Option 1: 2 available, 0 maybe
      expect(results.optionResults[0].optionId).toBe('option-1');
      expect(results.optionResults[0].availableCount).toBe(2);
      expect(results.optionResults[0].maybeCount).toBe(0);
      expect(results.optionResults[0].availablePercentage).toBe(100);
      expect(results.optionResults[0].maybePercentage).toBe(0);

      // Option 2: 0 available, 1 maybe
      expect(results.optionResults[1].optionId).toBe('option-2');
      expect(results.optionResults[1].availableCount).toBe(0);
      expect(results.optionResults[1].maybeCount).toBe(1);
      expect(results.optionResults[1].availablePercentage).toBe(0);
      expect(results.optionResults[1].maybePercentage).toBe(50);
    });

    it('should handle poll with no votes', async () => {
      const pollId = 'poll-123';
      const mockPoll = createMockPoll({ id: pollId });
      const mockOptions = [createMockPollOption({ id: 'option-1', pollId })];

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        ...mockPoll,
        options: mockOptions,
        votes: [],
        invites: [],
      } as any);

      const results = await voteService.getVoteResults(pollId);

      expect(results.totalVoters).toBe(0);
      expect(results.optionResults[0].availableCount).toBe(0);
      expect(results.optionResults[0].availablePercentage).toBe(0);
    });

    it('should throw error if poll not found', async () => {
      const pollId = 'non-existent-poll';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue(null);

      await expect(voteService.getVoteResults(pollId)).rejects.toThrow('Poll not found');
    });
  });

  describe('getVoterDetails', () => {
    it('should return voter details for poll creator', async () => {
      const pollId = 'poll-123';
      const creatorId = 'user-123';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId,
        invites: [],
      } as any);

      const mockVotes = [
        {
          id: 'vote-1',
          pollId,
          voterId: 'user-456',
          availableOptionIds: ['option-1'],
          maybeOptionIds: [],
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          voter: createMockUser({ id: 'user-456' }),
        },
      ];

      vi.mocked(prisma.vote.findMany).mockResolvedValue(mockVotes as any);

      const result = await voteService.getVoterDetails(pollId, creatorId);

      expect(result).toHaveLength(1);
      expect(result[0].voterId).toBe('user-456');
    });

    it('should return voter details for invited user', async () => {
      const pollId = 'poll-123';
      const userId = 'user-456';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: 'user-123',
        invites: [{ id: 'invite-1', userId, pollId, invitedAt: new Date() }],
      } as any);

      const mockVotes = [
        {
          id: 'vote-1',
          pollId,
          voterId: userId,
          availableOptionIds: ['option-1'],
          maybeOptionIds: [],
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          voter: createMockUser({ id: userId }),
        },
      ];

      vi.mocked(prisma.vote.findMany).mockResolvedValue(mockVotes as any);

      const result = await voteService.getVoterDetails(pollId, userId);

      expect(result).toHaveLength(1);
    });

    it('should throw error if poll not found', async () => {
      const pollId = 'non-existent-poll';
      const userId = 'user-123';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue(null);

      await expect(voteService.getVoterDetails(pollId, userId)).rejects.toThrow('Poll not found');
    });

    it('should throw error if user has no access', async () => {
      const pollId = 'poll-123';
      const userId = 'user-789';

      vi.mocked(prisma.poll.findUnique).mockResolvedValue({
        creatorId: 'user-123',
        invites: [],
      } as any);

      await expect(voteService.getVoterDetails(pollId, userId)).rejects.toThrow(
        'You do not have access to this poll'
      );
    });
  });

  describe('getUserVote', () => {
    it('should return user vote if exists', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';
      const mockVote = {
        id: 'vote-123',
        pollId,
        voterId: userId,
        availableOptionIds: ['option-1'],
        maybeOptionIds: [],
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        voter: createMockUser({ id: userId }),
      };

      vi.mocked(prisma.vote.findUnique).mockResolvedValue(mockVote as any);

      const result = await voteService.getUserVote(pollId, userId);

      expect(result).toBeDefined();
      expect(result?.voterId).toBe(userId);
      expect(result?.pollId).toBe(pollId);
    });

    it('should return null if vote does not exist', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';

      vi.mocked(prisma.vote.findUnique).mockResolvedValue(null);

      const result = await voteService.getUserVote(pollId, userId);

      expect(result).toBeNull();
    });
  });

  describe('deleteVote', () => {
    it('should delete user vote', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';
      const mockVote = createMockVote({ pollId, userId });

      vi.mocked(prisma.vote.findUnique).mockResolvedValue(mockVote as any);
      vi.mocked(prisma.vote.delete).mockResolvedValue(mockVote as any);
      vi.mocked(prisma.pollInvite.updateMany).mockResolvedValue({ count: 1 });

      await voteService.deleteVote(pollId, userId);

      expect(prisma.vote.delete).toHaveBeenCalledWith({
        where: {
          pollId_voterId: { pollId, voterId: userId },
        },
      });

      expect(prisma.pollInvite.updateMany).toHaveBeenCalledWith({
        where: { pollId, userId },
        data: { hasVoted: false },
      });
    });

    it('should throw error if vote not found', async () => {
      const pollId = 'poll-123';
      const userId = 'user-123';

      vi.mocked(prisma.vote.findUnique).mockResolvedValue(null);

      await expect(voteService.deleteVote(pollId, userId)).rejects.toThrow('Vote not found');
    });
  });

  describe('getUserVoteStats', () => {
    it('should calculate user voting statistics', async () => {
      const userId = 'user-123';

      vi.mocked(prisma.vote.count).mockResolvedValue(10);
      vi.mocked(prisma.pollInvite.count)
        .mockResolvedValueOnce(15) // totalInvites
        .mockResolvedValueOnce(8); // votedInvites

      const stats = await voteService.getUserVoteStats(userId);

      expect(stats.totalVotes).toBe(10);
      expect(stats.totalInvites).toBe(15);
      expect(stats.votedInvites).toBe(8);
      expect(stats.participationRate).toBeCloseTo(53.3, 1);
    });

    it('should handle user with no invites', async () => {
      const userId = 'user-123';

      vi.mocked(prisma.vote.count).mockResolvedValue(0);
      vi.mocked(prisma.pollInvite.count).mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const stats = await voteService.getUserVoteStats(userId);

      expect(stats.totalVotes).toBe(0);
      expect(stats.totalInvites).toBe(0);
      expect(stats.participationRate).toBe(0);
    });

    it('should calculate 100% participation rate', async () => {
      const userId = 'user-123';

      vi.mocked(prisma.vote.count).mockResolvedValue(5);
      vi.mocked(prisma.pollInvite.count).mockResolvedValueOnce(5).mockResolvedValueOnce(5);

      const stats = await voteService.getUserVoteStats(userId);

      expect(stats.participationRate).toBe(100);
    });
  });
});
