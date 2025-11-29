/**
 * Poll Service
 * Business logic for poll operations
 */

import { prisma } from '../prisma.js';
import { PollType, PollStatus, PollOptionType } from '@prisma/client';
import { ErrorFactory } from '../middleware/errorHandler.js';
import { logger } from '../middleware/logger.js';
import { postEventToDiscord } from './discord.js';
import { Config } from '../config.js';

export interface CreatePollData {
  title: string;
  description?: string;
  type?: PollType;
  votingDeadline?: Date;
  guildId?: string;
  channelId?: string;
  options: {
    optionType?: 'DATE' | 'TEXT';
    label: string;
    description?: string;
    date?: Date;
    timeStart?: string;
    timeEnd?: string;
  }[];
  invitedUserIds?: string[];
}

export interface UpdatePollData {
  title?: string;
  description?: string;
  votingDeadline?: Date;
  status?: PollStatus;
}

/**
 * Create a new poll
 */
export const createPoll = async (userId: string, data: CreatePollData) => {
  try {
    // Validate options
    if (!data.options || data.options.length === 0) {
      throw ErrorFactory.badRequest('At least one poll option is required');
    }

    if (data.options.length > 30) {
      throw ErrorFactory.badRequest('Maximum 30 poll options allowed');
    }

    // Create poll with options
    const poll = await prisma.poll.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type || PollType.EVENT,
        votingDeadline: data.votingDeadline,
        guildId: data.guildId,
        channelId: data.channelId,
        creatorId: userId,
        status: PollStatus.VOTING,
        options: {
          create: data.options.map((option, index) => ({
            optionType: option.optionType === 'TEXT' ? PollOptionType.TEXT : PollOptionType.DATE,
            label: option.label,
            description: option.description,
            date: option.date,
            timeStart: option.timeStart,
            timeEnd: option.timeEnd,
            order: index,
          })),
        },
        invites: data.invitedUserIds
          ? {
              create: data.invitedUserIds.map((userId) => ({
                userId,
              })),
            }
          : undefined,
      },
      include: {
        options: true,
        invites: {
          include: {
            user: true,
          },
        },
        creator: true,
      },
    });

    logger.info('Poll created', { pollId: poll.id, creatorId: userId });

    // Post to Discord if channelId is provided or default is configured
    const channelId = data.channelId || Config.discord.defaultChannelId;
    if (channelId && poll.creator.discordId) {
      await postEventToDiscord(channelId, {
        pollId: poll.id,
        title: poll.title,
        description: poll.description || undefined,
        optionsCount: poll.options.length,
        votingDeadline: poll.votingDeadline || undefined,
        creatorDiscordId: poll.creator.discordId,
      }).catch((error) => {
        // Log but don't fail the poll creation
        logger.error('Failed to post event to Discord', {
          error,
          pollId: poll.id,
        });
      });
    }

    return poll;
  } catch (_error) {
    logger.error('Failed to create poll', { _error, userId });
    throw _error;
  }
};

/**
 * Get poll by ID with all related data
 */
export const getPoll = async (pollId: string, userId?: string) => {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        orderBy: { order: 'asc' },
      },
      votes: {
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
      },
      invites: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              discriminator: true,
              avatar: true,
            },
          },
        },
      },
      creator: {
        select: {
          id: true,
          username: true,
          discriminator: true,
          avatar: true,
        },
      },
      venue: true,
    },
  });

  if (!poll) {
    throw ErrorFactory.notFound('Poll not found');
  }

  // Check if user has access to view this poll
  // Public polls can be viewed by anyone, private polls only by invited users
  const isCreator = userId === poll.creatorId;
  const isInvited = userId && poll.invites.some((invite) => invite.userId === userId);

  if (!isCreator && !isInvited && poll.guildId) {
    // If it's a guild poll, we'll allow viewing (Discord bot will handle permissions)
    // For now, allow all authenticated users to view
  }

  return poll;
};

/**
 * Update poll
 */
export const updatePoll = async (pollId: string, userId: string, data: UpdatePollData) => {
  // Verify ownership
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: { creatorId: true, status: true },
  });

  if (!poll) {
    throw ErrorFactory.notFound('Poll not found');
  }

  if (poll.creatorId !== userId) {
    throw ErrorFactory.forbidden('Only poll creator can update the poll');
  }

  // Don't allow updates to finalized or cancelled polls
  if (poll.status === PollStatus.FINALIZED || poll.status === PollStatus.CANCELLED) {
    throw ErrorFactory.badRequest('Cannot update finalized or cancelled polls');
  }

  // Update poll
  const updatedPoll = await prisma.poll.update({
    where: { id: pollId },
    data,
    include: {
      options: true,
      votes: true,
      invites: true,
    },
  });

  logger.info('Poll updated', { pollId, userId });

  return updatedPoll;
};

/**
 * Cancel poll (soft delete)
 */
export const cancelPoll = async (pollId: string, userId: string) => {
  // Verify ownership
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: { creatorId: true, status: true },
  });

  if (!poll) {
    throw ErrorFactory.notFound('Poll not found');
  }

  if (poll.creatorId !== userId) {
    throw ErrorFactory.forbidden('Only poll creator can cancel the poll');
  }

  if (poll.status === PollStatus.FINALIZED) {
    throw ErrorFactory.badRequest('Cannot cancel finalized polls');
  }

  // Cancel poll
  const cancelledPoll = await prisma.poll.update({
    where: { id: pollId },
    data: {
      status: PollStatus.CANCELLED,
      closedAt: new Date(),
    },
  });

  logger.info('Poll cancelled', { pollId, userId });

  return cancelledPoll;
};

/**
 * Finalize poll (set winning option)
 */
export const finalizePoll = async (pollId: string, userId: string, optionId: string) => {
  // Verify ownership
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: true,
      votes: true,
    },
  });

  if (!poll) {
    throw ErrorFactory.notFound('Poll not found');
  }

  if (poll.creatorId !== userId) {
    throw ErrorFactory.forbidden('Only poll creator can finalize the poll');
  }

  if (poll.status === PollStatus.FINALIZED) {
    throw ErrorFactory.badRequest('Poll is already finalized');
  }

  // Verify option belongs to this poll
  const option = poll.options.find((opt) => opt.id === optionId);
  if (!option) {
    throw ErrorFactory.badRequest('Invalid option ID');
  }

  // Get all users who voted "available" for the winning option
  const attendees = poll.votes
    .filter((vote) => vote.availableOptionIds.includes(optionId))
    .map((vote) => vote.voterId);

  // Finalize poll and track engagement
  const finalizedPoll = await prisma.$transaction(async (tx) => {
    // Update poll status
    const updated = await tx.poll.update({
      where: { id: pollId },
      data: {
        status: PollStatus.FINALIZED,
        finalizedOptionId: optionId,
        closedAt: new Date(),
      },
      include: {
        options: true,
        votes: true,
      },
    });

    // Update creator stats
    await tx.user.update({
      where: { id: userId },
      data: {
        totalEventsCreated: { increment: 1 },
      },
    });

    // Track attendance for all attendees
    const now = new Date();
    for (const attendeeId of attendees) {
      await tx.eventAttendance.create({
        data: {
          pollId,
          userId: attendeeId,
          attendedAt: now,
        },
      });

      await tx.user.update({
        where: { id: attendeeId },
        data: {
          lastAttendedAt: now,
          totalEventsAttended: { increment: 1 },
        },
      });
    }

    return updated;
  });

  logger.info('Poll finalized', { pollId, userId, optionId, attendees: attendees.length });

  return finalizedPoll;
};

/**
 * Get user's polls
 */
export const getUserPolls = async (userId: string, status?: PollStatus) => {
  const polls = await prisma.poll.findMany({
    where: {
      creatorId: userId,
      ...(status && { status }),
    },
    include: {
      options: true,
      votes: true,
      invites: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return polls;
};

/**
 * Get polls user is invited to
 */
export const getInvitedPolls = async (userId: string) => {
  const invites = await prisma.pollInvite.findMany({
    where: {
      userId,
    },
    include: {
      poll: {
        include: {
          options: true,
          votes: true,
          creator: {
            select: {
              id: true,
              username: true,
              discriminator: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: {
      invitedAt: 'desc',
    },
  });

  return invites.map((invite) => invite.poll);
};

/**
 * Reopen a closed poll for more voting
 */
export const reopenPoll = async (pollId: string, userId: string, extensionDays: number = 7) => {
  // Verify ownership
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: { creatorId: true, status: true },
  });

  if (!poll) {
    throw ErrorFactory.notFound('Poll not found');
  }

  if (poll.creatorId !== userId) {
    throw ErrorFactory.forbidden('Only poll creator can reopen the poll');
  }

  if (poll.status === PollStatus.VOTING) {
    throw ErrorFactory.badRequest('Poll is already open for voting');
  }

  // Calculate new deadline
  const newDeadline = new Date(Date.now() + extensionDays * 24 * 60 * 60 * 1000);

  // Reopen poll
  const reopenedPoll = await prisma.poll.update({
    where: { id: pollId },
    data: {
      status: PollStatus.VOTING,
      votingDeadline: newDeadline,
      closedAt: null,
      finalizedOptionId: null,
    },
    include: {
      options: true,
      votes: true,
      creator: true,
    },
  });

  logger.info('Poll reopened', { pollId, userId, extensionDays });

  return reopenedPoll;
};
