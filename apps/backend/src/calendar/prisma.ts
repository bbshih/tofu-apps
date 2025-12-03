/**
 * TofuBot Prisma Client
 * Shared Prisma instance for TofuBot database
 */

import { PrismaClient } from '@prisma/client';

// Re-export Prisma types and enums for use in other modules
export type {
  Poll,
  PollOption,
  Vote,
  User,
  PollOptionType,
  EventLocationType,
  QotwQuestion,
  QotwHistory,
  QotwConfig,
  EventMemory,
  EventFollowup,
} from '@prisma/client';

// Export enums as both types and values
export { PollType, PollStatus, MemoryType } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Test connection
prisma
  .$connect()
  .then(() => console.log('✅ TofuBot DB (Prisma) connected'))
  .catch((err) => console.error('❌ TofuBot DB connection error:', err));

export default prisma;
