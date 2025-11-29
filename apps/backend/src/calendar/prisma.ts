/**
 * SeaCalendar Prisma Client
 * Shared Prisma instance for SeaCalendar database
 */

import { PrismaClient } from '@prisma/client';

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
  .then(() => console.log('✅ SeaCalendar DB (Prisma) connected'))
  .catch((err) => console.error('❌ SeaCalendar DB connection error:', err));

export default prisma;
