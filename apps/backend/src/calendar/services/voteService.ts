/**
 * Vote Service
 * Business logic for voting operations
 */

import { prisma } from '../prisma.js';
import { PollStatus } from '@prisma/client';
import { ErrorFactory } from '../middleware/errorHandler.js';
import { logger } from '../middleware/logger.js';

export interface SubmitVoteData {
  availableOptionIds: string[];
  maybeOptionIds?: string[];
  notes?: string;
}

export interface VoteResults {
  pollId: string;
  totalVoters: number;
  totalInvited: number;
  optionResults: {
    optionId: string;
    label: string;
    availableCount: number;
    maybeCount: number;
    availablePercentage: number;
    maybePercentage: number;
  }[];
}

/**
 * Submit or update vote
 */
export const submitVote = async (pollId: string, userId: string, data: SubmitVoteData) => {
  // Verify poll exists and is accepting votes
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: true,
      invites: true,
    },
  });

  if (!poll) {
    throw ErrorFactory.notFound('Poll not found');
  }

  if (poll.status !== PollStatus.VOTING) {
    throw ErrorFactory.badRequest('Poll is not accepting votes');
  }

  // Check voting deadline
  if (poll.votingDeadline && new Date() > poll.votingDeadline) {
    throw ErrorFactory.badRequest('Voting deadline has passed');
  }

  // Validate option IDs belong to this poll
  const validOptionIds = new Set(poll.options.map((opt) => opt.id));
  const invalidAvailable = data.availableOptionIds.some((id) => !validOptionIds.has(id));
  const invalidMaybe = data.maybeOptionIds?.some((id) => !validOptionIds.has(id)) || false;

  if (invalidAvailable || invalidMaybe) {
    throw ErrorFactory.badRequest('Invalid option IDs provided');
  }

  // Check for overlaps between available and maybe
  const maybeSet = new Set(data.maybeOptionIds || []);
  const hasOverlap = data.availableOptionIds.some((id) => maybeSet.has(id));

  if (hasOverlap) {
    throw ErrorFactory.badRequest('Options cannot be both available and maybe');
  }

  // Create or update vote and track engagement
  const vote = await prisma.$transaction(async (tx) => {
    // Update user's lastVotedAt and totalVotesCast
    await tx.user.update({
      where: { id: userId },
      data: {
        lastVotedAt: new Date(),
        totalVotesCast: { increment: 1 },
      },
    });

    // Upsert vote
    const voteResult = await tx.vote.upsert({
      where: {
        pollId_voterId: {
          pollId,
          voterId: userId,
        },
      },
      create: {
        pollId,
        voterId: userId,
        availableOptionIds: data.availableOptionIds,
        maybeOptionIds: data.maybeOptionIds || [],
        notes: data.notes,
      },
      update: {
        availableOptionIds: data.availableOptionIds,
        maybeOptionIds: data.maybeOptionIds || [],
        notes: data.notes,
        updatedAt: new Date(),
      },
      include: {
        voter: {
          select: {
            id: true,
            username: true,
            discriminator: true,
            avatar: true,
          },
        },
      },
    });

    // Update poll invite status
    await tx.pollInvite.updateMany({
      where: {
        pollId,
        userId,
      },
      data: {
        hasVoted: true,
      },
    });

    return voteResult;
  });

  logger.info('Vote submitted', { pollId, userId, voteId: vote.id });

  return vote;
};

/**
 * Get vote results for a poll
 */
export const getVoteResults = async (pollId: string): Promise<VoteResults> => {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        orderBy: { order: 'asc' },
      },
      votes: true,
      invites: true,
    },
  });

  if (!poll) {
    throw ErrorFactory.notFound('Poll not found');
  }

  const totalVoters = poll.votes.length;
  const totalInvited = poll.invites.length;

  // Calculate results for each option
  const optionResults = poll.options.map((option) => {
    const availableCount = poll.votes.filter((vote) =>
      vote.availableOptionIds.includes(option.id)
    ).length;

    const maybeCount = poll.votes.filter((vote) => vote.maybeOptionIds.includes(option.id)).length;

    return {
      optionId: option.id,
      label: option.label,
      date: option.date,
      timeStart: option.timeStart,
      timeEnd: option.timeEnd,
      availableCount,
      maybeCount,
      availablePercentage: totalVoters > 0 ? (availableCount / totalVoters) * 100 : 0,
      maybePercentage: totalVoters > 0 ? (maybeCount / totalVoters) * 100 : 0,
    };
  });

  return {
    pollId: poll.id,
    totalVoters,
    totalInvited,
    optionResults,
  };
};

/**
 * Get who voted for each option
 */
export const getVoterDetails = async (pollId: string, userId: string) => {
  // Verify user has access (creator or invited)
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: {
      creatorId: true,
      invites: {
        where: { userId },
      },
    },
  });

  if (!poll) {
    throw ErrorFactory.notFound('Poll not found');
  }

  const isCreator = poll.creatorId === userId;
  const isInvited = poll.invites.length > 0;

  if (!isCreator && !isInvited) {
    throw ErrorFactory.forbidden('You do not have access to this poll');
  }

  // Get all votes with voter details
  const votes = await prisma.vote.findMany({
    where: { pollId },
    include: {
      voter: {
        select: {
          id: true,
          username: true,
          discriminator: true,
          avatar: true,
        },
      },
    },
  });

  return votes;
};

/**
 * Get user's vote for a poll
 */
export const getUserVote = async (pollId: string, userId: string) => {
  const vote = await prisma.vote.findUnique({
    where: {
      pollId_voterId: {
        pollId,
        voterId: userId,
      },
    },
    include: {
      voter: {
        select: {
          id: true,
          username: true,
          discriminator: true,
          avatar: true,
        },
      },
    },
  });

  return vote;
};

/**
 * Delete user's vote
 */
export const deleteVote = async (pollId: string, userId: string) => {
  // Verify vote exists
  const vote = await prisma.vote.findUnique({
    where: {
      pollId_voterId: {
        pollId,
        voterId: userId,
      },
    },
  });

  if (!vote) {
    throw ErrorFactory.notFound('Vote not found');
  }

  // Delete vote
  await prisma.vote.delete({
    where: {
      pollId_voterId: {
        pollId,
        voterId: userId,
      },
    },
  });

  // Update invite status
  await prisma.pollInvite.updateMany({
    where: {
      pollId,
      userId,
    },
    data: {
      hasVoted: false,
    },
  });

  logger.info('Vote deleted', { pollId, userId });
};

/**
 * Get voting stats for a user
 */
export const getUserVoteStats = async (userId: string) => {
  const totalVotes = await prisma.vote.count({
    where: { voterId: userId },
  });

  const totalInvites = await prisma.pollInvite.count({
    where: { userId },
  });

  const votedInvites = await prisma.pollInvite.count({
    where: { userId, hasVoted: true },
  });

  const participationRate =
    totalInvites > 0 ? ((votedInvites / totalInvites) * 100).toFixed(1) : '0';

  return {
    totalVotes,
    totalInvites,
    votedInvites,
    participationRate: parseFloat(participationRate),
  };
};
