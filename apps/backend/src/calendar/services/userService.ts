/**
 * User Service
 * Business logic for user operations
 */

import { prisma } from '../prisma.js';
import { ErrorFactory } from '../middleware/errorHandler.js';
import { logger } from '../middleware/logger.js';

export interface UpdateUserData {
  email?: string;
  phone?: string;
}

export interface UpdatePreferencesData {
  notifyViaDiscordDM?: boolean;
  notifyViaEmail?: boolean;
  notifyViaSMS?: boolean;
  wantVoteReminders?: boolean;
  wantEventReminders?: boolean;
  showInStats?: boolean;
}

/**
 * Get user by ID
 */
export const getUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preferences: true,
    },
  });

  if (!user) {
    throw ErrorFactory.notFound('User not found');
  }

  return user;
};

/**
 * Update user profile
 */
export const updateUser = async (userId: string, data: UpdateUserData) => {
  // Validate email uniqueness if provided
  if (data.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser && existingUser.id !== userId) {
      throw ErrorFactory.conflict('Email is already in use');
    }
  }

  // Validate phone uniqueness if provided
  if (data.phone) {
    const existingUser = await prisma.user.findUnique({
      where: { phone: data.phone },
    });

    if (existingUser && existingUser.id !== userId) {
      throw ErrorFactory.conflict('Phone number is already in use');
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: {
      preferences: true,
    },
  });

  logger.info('User updated', { userId });

  return user;
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (userId: string, data: UpdatePreferencesData) => {
  // Create or update preferences
  const preferences = await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
    },
    update: data,
  });

  logger.info('User preferences updated', { userId });

  return preferences;
};

/**
 * Get user's polls
 */
export const getUserPolls = async (userId: string) => {
  const polls = await prisma.poll.findMany({
    where: { creatorId: userId },
    include: {
      options: true,
      votes: true,
      invites: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return polls;
};

/**
 * Get user statistics
 */
export const getUserStats = async (userId: string) => {
  // Total polls created
  const totalPollsCreated = await prisma.poll.count({
    where: { creatorId: userId },
  });

  // Total votes cast
  const totalVotes = await prisma.vote.count({
    where: { voterId: userId },
  });

  // Total poll invites
  const totalInvites = await prisma.pollInvite.count({
    where: { userId },
  });

  // Polls by status
  const pollsByStatus = await prisma.poll.groupBy({
    by: ['status'],
    where: { creatorId: userId },
    _count: true,
  });

  // Participation rate
  const votedInvites = await prisma.pollInvite.count({
    where: { userId, hasVoted: true },
  });

  const participationRate =
    totalInvites > 0 ? ((votedInvites / totalInvites) * 100).toFixed(1) : '0';

  return {
    totalPollsCreated,
    totalVotes,
    totalInvites,
    votedInvites,
    participationRate: parseFloat(participationRate),
    pollsByStatus: pollsByStatus.reduce(
      (acc, { status, _count }) => {
        acc[status] = _count;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
};

/**
 * Delete user account
 */
export const deleteUser = async (userId: string) => {
  // Note: This is a hard delete. In production, you might want soft delete.
  // Cascading deletes are handled by Prisma schema (onDelete: Cascade)

  await prisma.user.delete({
    where: { id: userId },
  });

  logger.info('User deleted', { userId });
};
