/**
 * Socket.io Event Handlers
 * Real-time updates for polls and votes
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../services/jwt.js';
import { logger } from '../middleware/logger.js';
import { prisma } from '../prisma.js';

// Extend Socket with user info
interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

/**
 * Authenticate socket connection
 */
const authenticateSocket = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const token =
      socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const payload = verifyAccessToken(token);

    // Attach user info to socket
    socket.userId = payload.userId;
    socket.username = `${payload.discordId}`;

    logger.debug('Socket authenticated', { userId: payload.userId, socketId: socket.id });

    next();
  } catch (_error) {
    logger.warn('Socket authentication failed', { _error, socketId: socket.id });
    next(new Error('Invalid token'));
  }
};

/**
 * Initialize Socket.io event handlers
 */
export const initializeSocketHandlers = (io: SocketIOServer) => {
  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('Client connected', { userId: socket.userId, socketId: socket.id });

    /**
     * Join a poll room for real-time updates
     */
    socket.on('poll:subscribe', async (pollId: string) => {
      try {
        // Verify poll exists and user has access
        const poll = await prisma.poll.findUnique({
          where: { id: pollId },
          include: {
            invites: {
              where: { userId: socket.userId },
            },
          },
        });

        if (!poll) {
          socket.emit('_error', { message: 'Poll not found' });
          return;
        }

        // Check if user is creator or invited
        const isCreator = poll.creatorId === socket.userId;
        const isInvited = poll.invites.length > 0;

        if (!isCreator && !isInvited && poll.guildId) {
          // For guild polls, allow anyone (Discord bot will handle permissions)
        } else if (!isCreator && !isInvited) {
          socket.emit('_error', { message: 'Access denied' });
          return;
        }

        // Join poll room
        socket.join(`poll:${pollId}`);
        logger.debug('User joined poll room', { userId: socket.userId, pollId });

        socket.emit('poll:subscribed', { pollId });
      } catch (_error) {
        logger.error('Failed to subscribe to poll', { _error, pollId, userId: socket.userId });
        socket.emit('_error', { message: 'Failed to subscribe to poll' });
      }
    });

    /**
     * Leave a poll room
     */
    socket.on('poll:unsubscribe', (pollId: string) => {
      socket.leave(`poll:${pollId}`);
      logger.debug('User left poll room', { userId: socket.userId, pollId });
      socket.emit('poll:unsubscribed', { pollId });
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      logger.info('Client disconnected', { userId: socket.userId, socketId: socket.id });
    });
  });

  logger.info('Socket.io handlers initialized');
};

/**
 * Emit poll update event
 */
export const emitPollUpdate = (io: SocketIOServer, pollId: string, event: string, data: any) => {
  io.to(`poll:${pollId}`).emit(event, data);
  logger.debug('Poll event emitted', { pollId, event });
};

/**
 * Emit vote submitted event
 */
export const emitVoteSubmitted = (io: SocketIOServer, pollId: string, vote: any) => {
  emitPollUpdate(io, pollId, 'poll:vote_submitted', {
    pollId,
    vote,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit poll finalized event
 */
export const emitPollFinalized = (io: SocketIOServer, pollId: string, poll: any) => {
  emitPollUpdate(io, pollId, 'poll:finalized', {
    pollId,
    poll,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit poll updated event
 */
export const emitPollUpdated = (io: SocketIOServer, pollId: string, poll: any) => {
  emitPollUpdate(io, pollId, 'poll:updated', {
    pollId,
    poll,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Emit poll cancelled event
 */
export const emitPollCancelled = (io: SocketIOServer, pollId: string) => {
  emitPollUpdate(io, pollId, 'poll:cancelled', {
    pollId,
    timestamp: new Date().toISOString(),
  });
};
