/**
 * Engagement Tracking Service
 * Tracks user engagement for friendship health monitoring
 */

import { prisma } from '../../seacalendar/prisma.js';
import { DateTime } from 'luxon';

export interface UserEngagement {
  userId: string;
  username: string;
  lastVotedAt: Date | null;
  lastAttendedAt: Date | null;
  lastMemorySharedAt: Date | null;
  lastInteractionAt: Date | null;
  totalEventsCreated: number;
  totalEventsAttended: number;
  totalVirtualEvents: number;
  totalVotesCast: number;
  totalMemoriesShared: number;
  daysSinceLastVote: number | null;
  daysSinceLastAttended: number | null;
  daysSinceLastInteraction: number | null;
  driftRisk: 'low' | 'medium' | 'high';
  roles: string[]; // Discord role names
}

export interface GuildEngagementStats {
  guildId: string;
  totalUsers: number;
  activeUsers: number; // Voted or attended in last 30 days
  driftingUsers: number; // 30-60 days since last activity
  inactiveUsers: number; // 60+ days since last activity
  topEngaged: UserEngagement[];
  needsAttention: UserEngagement[];
}

/**
 * Track attendance when event is finalized
 */
export async function trackAttendance(pollId: string, attendeeIds: string[]): Promise<void> {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Create attendance records
    for (const userId of attendeeIds) {
      await tx.eventAttendance.create({
        data: {
          pollId,
          userId,
          attendedAt: now,
        },
      });

      // Update user stats
      await tx.user.update({
        where: { id: userId },
        data: {
          lastAttendedAt: now,
          totalEventsAttended: { increment: 1 },
        },
      });
    }
  });
}

/**
 * Get engagement for all users in a guild
 * @param roleFilter Optional role ID to filter by (e.g., "Local" role)
 */
export async function getGuildEngagement(
  guildId: string,
  roleFilter?: string
): Promise<UserEngagement[]> {
  // Get all users who have interacted with polls in this guild
  const polls = await prisma.poll.findMany({
    where: { guildId },
    select: { id: true },
  });

  const pollIds = polls.map((p) => p.id);

  // Get users who voted or were invited
  const userIds = new Set<string>();

  const votes = await prisma.vote.findMany({
    where: { pollId: { in: pollIds } },
    select: { voterId: true },
  });

  const invites = await prisma.pollInvite.findMany({
    where: { pollId: { in: pollIds } },
    select: { userId: true },
  });

  votes.forEach((v) => userIds.add(v.voterId));
  invites.forEach((i) => userIds.add(i.userId));

  // Filter by role if specified
  if (roleFilter) {
    const roleMembers = await prisma.guildMemberRole.findMany({
      where: {
        guildId,
        roleId: roleFilter,
      },
      select: { userId: true },
    });

    const roleUserIds = new Set(roleMembers.map((m) => m.userId));
    userIds.forEach((uid) => {
      if (!roleUserIds.has(uid)) {
        userIds.delete(uid);
      }
    });
  }

  // Get user stats
  const users = await prisma.user.findMany({
    where: { id: { in: Array.from(userIds) } },
    select: {
      id: true,
      username: true,
      discordId: true,
      lastVotedAt: true,
      lastAttendedAt: true,
      lastMemorySharedAt: true,
      lastInteractionAt: true,
      totalEventsCreated: true,
      totalEventsAttended: true,
      totalVirtualEvents: true,
      totalVotesCast: true,
      totalMemoriesShared: true,
    },
  });

  // Get roles for each user
  const userRoles = await prisma.guildMemberRole.findMany({
    where: {
      guildId,
      userId: { in: Array.from(userIds) },
    },
    select: {
      userId: true,
      roleName: true,
    },
  });

  const rolesByUser = new Map<string, string[]>();
  userRoles.forEach((ur) => {
    if (!rolesByUser.has(ur.userId)) {
      rolesByUser.set(ur.userId, []);
    }
    rolesByUser.get(ur.userId)!.push(ur.roleName);
  });

  const now = DateTime.now();

  return users.map((user) => {
    const daysSinceLastVote = user.lastVotedAt
      ? now.diff(DateTime.fromJSDate(user.lastVotedAt), 'days').days
      : null;

    const daysSinceLastAttended = user.lastAttendedAt
      ? now.diff(DateTime.fromJSDate(user.lastAttendedAt), 'days').days
      : null;

    const daysSinceLastInteraction = user.lastInteractionAt
      ? now.diff(DateTime.fromJSDate(user.lastInteractionAt), 'days').days
      : null;

    // Use lastInteractionAt for drift risk (includes votes, attendance, memories)
    const daysSinceActivity =
      daysSinceLastInteraction ??
      Math.min(daysSinceLastVote ?? Infinity, daysSinceLastAttended ?? Infinity);

    let driftRisk: 'low' | 'medium' | 'high' = 'low';
    if (daysSinceActivity > 60 || daysSinceActivity === Infinity) {
      driftRisk = 'high';
    } else if (daysSinceActivity > 30) {
      driftRisk = 'medium';
    }

    return {
      userId: user.id,
      username: user.username,
      lastVotedAt: user.lastVotedAt,
      lastAttendedAt: user.lastAttendedAt,
      lastMemorySharedAt: user.lastMemorySharedAt,
      lastInteractionAt: user.lastInteractionAt,
      totalEventsCreated: user.totalEventsCreated,
      totalEventsAttended: user.totalEventsAttended,
      totalVirtualEvents: user.totalVirtualEvents,
      totalVotesCast: user.totalVotesCast,
      totalMemoriesShared: user.totalMemoriesShared,
      daysSinceLastVote,
      daysSinceLastAttended,
      daysSinceLastInteraction,
      driftRisk,
      roles: rolesByUser.get(user.discordId || '') || [],
    };
  });
}

/**
 * Get summary stats for a guild
 * @param roleFilter Optional role ID to filter by
 */
export async function getGuildEngagementStats(
  guildId: string,
  roleFilter?: string
): Promise<GuildEngagementStats> {
  const engagement = await getGuildEngagement(guildId, roleFilter);

  const activeUsers = engagement.filter((u) => {
    const days = Math.min(u.daysSinceLastVote ?? Infinity, u.daysSinceLastAttended ?? Infinity);
    return days <= 30;
  });

  const driftingUsers = engagement.filter((u) => u.driftRisk === 'medium');
  const inactiveUsers = engagement.filter((u) => u.driftRisk === 'high');

  // Top engaged: most events attended + votes cast
  const topEngaged = engagement
    .slice()
    .sort((a, b) => {
      const scoreA = a.totalEventsAttended * 2 + a.totalVotesCast;
      const scoreB = b.totalEventsAttended * 2 + b.totalVotesCast;
      return scoreB - scoreA;
    })
    .slice(0, 5);

  // Needs attention: medium/high drift risk, sorted by risk
  const needsAttention = engagement
    .filter((u) => u.driftRisk !== 'low')
    .sort((a, b) => {
      const scoreA = a.driftRisk === 'high' ? 2 : 1;
      const scoreB = b.driftRisk === 'high' ? 2 : 1;
      return scoreB - scoreA;
    })
    .slice(0, 10);

  return {
    guildId,
    totalUsers: engagement.length,
    activeUsers: activeUsers.length,
    driftingUsers: driftingUsers.length,
    inactiveUsers: inactiveUsers.length,
    topEngaged,
    needsAttention,
  };
}

/**
 * Update streak when event is finalized
 */
export async function updateRecurringStreak(
  recurringGroupId: string,
  eventDate: DateTime
): Promise<void> {
  const group = await prisma.recurringEventGroup.findUnique({
    where: { id: recurringGroupId },
  });

  if (!group) return;

  const now = eventDate;
  const lastOccurrence = group.lastOccurrence ? DateTime.fromJSDate(group.lastOccurrence) : null;

  let newStreak = group.currentStreak;

  if (lastOccurrence) {
    // Check if this continues the streak (within reasonable timeframe)
    // For weekly events: within 10 days
    // For monthly events: within 35 days
    const daysSince = now.diff(lastOccurrence, 'days').days;

    if (daysSince <= 10) {
      // Weekly-ish streak continues
      newStreak += 1;
    } else if (daysSince <= 35) {
      // Monthly-ish streak continues
      newStreak += 1;
    } else {
      // Streak broken, restart
      newStreak = 1;
    }
  } else {
    // First event
    newStreak = 1;
  }

  const longestStreak = Math.max(group.longestStreak, newStreak);

  await prisma.recurringEventGroup.update({
    where: { id: recurringGroupId },
    data: {
      currentStreak: newStreak,
      longestStreak,
      lastOccurrence: now.toJSDate(),
      totalOccurrences: { increment: 1 },
    },
  });
}

/**
 * Get or create recurring group for a poll title pattern
 */
export async function getOrCreateRecurringGroup(
  guildId: string,
  title: string
): Promise<string | null> {
  // Simple pattern matching: strip dates/numbers from title
  const normalizedTitle = title
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '') // Remove dates
    .replace(/\d{1,2}\/\d{1,2}/g, '')
    .replace(/#\d+/g, '') // Remove numbers like #42
    .replace(/\s+/g, ' ')
    .trim();

  if (normalizedTitle.length < 5) {
    return null; // Too short to be meaningful
  }

  // Find existing group with similar name
  const existingGroup = await prisma.recurringEventGroup.findFirst({
    where: {
      guildId,
      name: {
        contains: normalizedTitle,
        mode: 'insensitive',
      },
    },
  });

  if (existingGroup) {
    return existingGroup.id;
  }

  // Create new group
  const group = await prisma.recurringEventGroup.create({
    data: {
      guildId,
      name: normalizedTitle,
    },
  });

  return group.id;
}
