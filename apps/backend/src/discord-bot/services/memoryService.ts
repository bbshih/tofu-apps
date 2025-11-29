/**
 * Event Memory service
 * Handles post-event followups and memory collection
 */

import { prisma, Poll, EventMemory, EventFollowup, MemoryType } from '../../seacalendar/prisma.js';
import { DateTime } from 'luxon';
import * as googlePhotos from './googlePhotosService.js';

export interface CreateMemoryInput {
  pollId: string;
  userId: string;
  type: MemoryType;
  content?: string;
  photoUrl?: string;
}

export interface AddReactionInput {
  memoryId: string;
  userId: string;
  emoji: string;
}

/**
 * Create event followup when poll is finalized
 * Optionally creates Google Photos album
 */
export async function scheduleFollowup(
  poll: Poll,
  finalizedDate: DateTime
): Promise<EventFollowup> {
  // Schedule followup for 24 hours after event
  const scheduledFor = finalizedDate.plus({ hours: 24 }).toJSDate();

  // Try to create Google Photos album
  let photoAlbumUrl: string | undefined;
  let photoAlbumId: string | undefined;

  if (googlePhotos.isConfigured()) {
    try {
      const album = await googlePhotos.createSharedAlbum(
        `${poll.title} - ${finalizedDate.toFormat('MMM dd, yyyy')}`
      );
      photoAlbumUrl = album.shareUrl;
      photoAlbumId = album.albumId;
      console.log(`✅ Created Google Photos album for poll ${poll.id}: ${album.shareUrl}`);
    } catch (_error) {
      console.error(`⚠️  Failed to create Google Photos album for poll ${poll.id}:`, _error);
      // Continue without album - not critical
    }
  }

  return prisma.eventFollowup.create({
    data: {
      pollId: poll.id,
      scheduledFor,
      channelId: poll.channelId || undefined,
      photoAlbumUrl,
      photoAlbumId,
    },
  });
}

/**
 * Get pending followups that need to be sent
 */
export async function getPendingFollowups(): Promise<EventFollowup[]> {
  const now = new Date();

  return prisma.eventFollowup.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: {
        lte: now,
      },
    },
    take: 10, // Process in batches
  });
}

/**
 * Mark followup as sent
 */
export async function markFollowupSent(
  followupId: string,
  messageId: string
): Promise<EventFollowup> {
  return prisma.eventFollowup.update({
    where: { id: followupId },
    data: {
      status: 'SENT',
      sentAt: new Date(),
      messageId,
    },
  });
}

/**
 * Mark followup as failed
 */
export async function markFollowupFailed(followupId: string): Promise<EventFollowup> {
  return prisma.eventFollowup.update({
    where: { id: followupId },
    data: {
      status: 'FAILED',
    },
  });
}

/**
 * Skip followup (e.g., event cancelled)
 */
export async function skipFollowup(followupId: string): Promise<EventFollowup> {
  return prisma.eventFollowup.update({
    where: { id: followupId },
    data: {
      status: 'SKIPPED',
    },
  });
}

/**
 * Create a memory for an event
 */
export async function createMemory(input: CreateMemoryInput): Promise<EventMemory> {
  // Validate poll exists and is finalized
  const poll = await prisma.poll.findUnique({
    where: { id: input.pollId },
  });

  if (!poll) {
    throw new Error('Poll not found');
  }

  if (poll.status !== 'FINALIZED') {
    throw new Error('Can only add memories to finalized events');
  }

  return prisma.eventMemory.create({
    data: {
      pollId: input.pollId,
      userId: input.userId,
      type: input.type,
      content: input.content,
      photoUrl: input.photoUrl,
    },
  });
}

/**
 * Get memories for an event
 */
export async function getEventMemories(pollId: string): Promise<EventMemory[]> {
  return prisma.eventMemory.findMany({
    where: { pollId },
    orderBy: {
      submittedAt: 'desc',
    },
  });
}

/**
 * Add reaction to memory
 */
export async function addReaction(input: AddReactionInput): Promise<void> {
  await prisma.memoryReaction.upsert({
    where: {
      memoryId_userId_emoji: {
        memoryId: input.memoryId,
        userId: input.userId,
        emoji: input.emoji,
      },
    },
    update: {},
    create: {
      memoryId: input.memoryId,
      userId: input.userId,
      emoji: input.emoji,
    },
  });
}

/**
 * Remove reaction from memory
 */
export async function removeReaction(input: AddReactionInput): Promise<void> {
  await prisma.memoryReaction.deleteMany({
    where: {
      memoryId: input.memoryId,
      userId: input.userId,
      emoji: input.emoji,
    },
  });
}

/**
 * Get poll with followup info
 */
export async function getPollWithFollowup(pollId: string) {
  return prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: true,
      votes: true,
      invites: true,
    },
  });
}

/**
 * Cancel all pending followups for a poll (e.g., when poll is cancelled)
 */
export async function cancelPollFollowups(pollId: string): Promise<void> {
  await prisma.eventFollowup.updateMany({
    where: {
      pollId,
      status: 'PENDING',
    },
    data: {
      status: 'SKIPPED',
    },
  });
}
