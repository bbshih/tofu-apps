/**
 * Poll service for Discord bot
 * Handles poll/event creation and management
 */

import { prisma, PollType, PollStatus, User, Poll, PollOption } from '../../calendar/prisma.js';
import { Config } from '../config.js';

export interface CreatePollInput {
  title: string;
  description?: string;
  guildId: string;
  channelId: string;
  creatorDiscordId: string;
  dateOptions: Date[];
  times?: string[];
  votingDeadline?: Date;
}

export interface PollWithDetails extends Poll {
  options: PollOption[];
  creator: User;
}

/**
 * Create a new event poll
 */
export async function createEventPoll(input: CreatePollInput): Promise<PollWithDetails> {
  // Get or create user
  const user = await prisma.user.upsert({
    where: { discordId: input.creatorDiscordId },
    update: {},
    create: {
      discordId: input.creatorDiscordId,
      username: 'Discord User', // Will be updated when we get full user data
      discriminator: '0000', // Default discriminator
    },
  });

  // Calculate voting deadline (default: 2 weeks from now)
  const deadline =
    input.votingDeadline ||
    new Date(Date.now() + Config.bot.defaultVotingDeadlineDays * 24 * 60 * 60 * 1000);

  // Create poll with options
  const poll = await prisma.poll.create({
    data: {
      type: PollType.EVENT,
      status: PollStatus.VOTING,
      title: input.title,
      description: input.description,
      guildId: input.guildId,
      channelId: input.channelId,
      creatorId: user.id,
      votingDeadline: deadline,
      options: {
        create: input.dateOptions.map((date, index) => ({
          date: date,
          label: formatDateOption(date, input.times?.[0]), // Use first time if available
          order: index,
          timeStart: input.times?.[0] || null,
          timeEnd: input.times?.[1] || null,
        })),
      },
    },
    include: {
      options: true,
      creator: true,
    },
  });

  return poll;
}

/**
 * Get poll by ID with all details
 */
export async function getPollWithDetails(pollId: string): Promise<PollWithDetails | null> {
  return prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        orderBy: { order: 'asc' },
      },
      creator: true,
    },
  });
}

/**
 * Get polls for a guild
 */
export async function getGuildPolls(
  guildId: string,
  status?: PollStatus
): Promise<PollWithDetails[]> {
  return prisma.poll.findMany({
    where: {
      guildId,
      ...(status && { status }),
    },
    include: {
      options: true,
      creator: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Get polls created by a user
 */
export async function getUserPolls(discordId: string): Promise<PollWithDetails[]> {
  const user = await prisma.user.findUnique({
    where: { discordId },
  });

  if (!user) {
    return [];
  }

  return prisma.poll.findMany({
    where: {
      creatorId: user.id,
    },
    include: {
      options: true,
      creator: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Cancel a poll
 */
export async function cancelPoll(pollId: string, discordId: string): Promise<boolean> {
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { creator: true },
  });

  if (!poll) {
    throw new Error('Poll not found');
  }

  if (poll.creator.discordId !== discordId) {
    throw new Error('Only the poll creator can cancel it');
  }

  await prisma.poll.update({
    where: { id: pollId },
    data: {
      status: PollStatus.CANCELLED,
    },
  });

  return true;
}

/**
 * Generate web voting URL for a poll
 */
export function generateVotingUrl(pollId: string): string {
  return `${Config.webAppUrl}/vote/${pollId}`;
}

/**
 * Format date option for display
 */
function formatDateOption(date: Date, time?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  let formatted = date.toLocaleDateString('en-US', options);

  if (time) {
    formatted += ` at ${time}`;
  }

  return formatted;
}

/**
 * Check if poll can use Discord emoji voting (≤5 options)
 */
export function canUseDiscordVoting(poll: PollWithDetails): boolean {
  return poll.options.length <= Config.bot.maxVotingOptions;
}
