/**
 * Configuration for SeaCalendar Discord Bot
 * Loads and validates environment variables
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from workspace root
let rootDir = process.cwd();
while (rootDir !== '/') {
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg.workspaces) break;
  }
  rootDir = path.dirname(rootDir);
}

// Load .env files in order of priority (later overrides earlier)
const env = process.env.NODE_ENV || 'development';
const envFiles = [
  path.join(rootDir, '.env'),
  path.join(rootDir, `.env.${env}`),
  path.join(rootDir, `.env.${env}.local`),
];

console.log('🔍 Loading env files from root:', rootDir);
envFiles.forEach((filePath) => {
  dotenv.config({ path: filePath, override: true });
  const exists = fs.existsSync(filePath);
  console.log(
    `  ${exists ? '✅' : '❌'} ${path.basename(filePath)} - ${exists ? 'loaded' : 'not found'}`
  );
});
console.log('');

// Environment variable schema with validation
const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Discord Bot
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_GUILD_ID: z.string().optional(), // For faster command deployment in dev

  // Web App
  WEB_APP_URL: z.string().url('WEB_APP_URL must be a valid URL'),

  // Optional: Cron schedule overrides
  VOTE_REMINDER_CRON: z.string().default('0 10 * * *'), // Daily at 10 AM
  EVENT_REMINDER_CRON: z.string().default('0 10 * * *'), // Daily at 10 AM
});

// Parse and validate environment variables
let config: z.infer<typeof envSchema>;

try {
  config = envSchema.parse(process.env);
} catch (_error) {
  if (_error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    _error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw _error;
}

// Export validated config
export const Config = {
  // Environment
  nodeEnv: config.NODE_ENV,
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test',

  // Database
  databaseUrl: config.DATABASE_URL,

  // Discord
  discord: {
    token: config.DISCORD_TOKEN,
    clientId: config.DISCORD_CLIENT_ID,
    testGuildId: config.DISCORD_GUILD_ID,
  },

  // Web App
  webAppUrl: config.WEB_APP_URL,

  // Cron schedules
  cron: {
    voteReminder: config.VOTE_REMINDER_CRON,
    eventReminder: config.EVENT_REMINDER_CRON,
  },

  // Bot settings
  bot: {
    maxVotingOptions: 5, // Max options for Discord emoji voting
    defaultVotingDeadlineDays: 14, // Default voting period: 2 weeks
    voteReminderDays: [3, 1], // Remind 3 days and 1 day before deadline
    eventReminderDays: [7, 1], // Remind 1 week and 1 day before event
  },
};

// Log configuration on startup (hide secrets)
if (!Config.isTest) {
  console.log('Discord Bot Configuration:');
  console.log(`  Environment: ${Config.nodeEnv}`);
  console.log(`  Database: ${Config.databaseUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`  Discord Token: ${Config.discord.token.substring(0, 20)}...`);
  console.log(`  Discord Client ID: ${Config.discord.clientId}`);
  if (Config.discord.testGuildId) {
    console.log(`  Test Guild ID: ${Config.discord.testGuildId}`);
  }
  console.log(`  Web App URL: ${Config.webAppUrl}`);
}
