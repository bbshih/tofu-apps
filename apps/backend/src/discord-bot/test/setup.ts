/**
 * Test setup for Discord bot tests
 */

import { vi } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.DISCORD_BOT_TOKEN = 'test_bot_token_for_testing_purposes_only';
process.env.DISCORD_CLIENT_ID = 'test_client_id';
process.env.WEB_APP_URL = 'http://localhost:5173';

// Mock Prisma client
vi.mock('@seacalendar/database', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    poll: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    vote: {
      findMany: vi.fn(),
    },
  },
  PollType: {
    DATE: 'DATE',
    VENUE: 'VENUE',
    GENERIC: 'GENERIC',
    EVENT: 'EVENT',
  },
  PollStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    VOTING: 'VOTING',
    FINALIZED: 'FINALIZED',
    CANCELLED: 'CANCELLED',
  },
  PollOptionType: {
    DATE: 'DATE',
    TEXT: 'TEXT',
  },
}));

// Mock Discord.js Client
vi.mock('discord.js', async () => {
  const actual = await vi.importActual('discord.js');
  return {
    ...actual,
    Client: vi.fn(() => ({
      login: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      commands: new Map(),
    })),
  };
});
