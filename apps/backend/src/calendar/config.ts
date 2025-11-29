/**
 * Configuration for SeaCalendar API Server
 * Loads and validates environment variables
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from workspace root
import path from 'path';
import fs from 'fs';

// Find workspace root by looking for package.json with workspaces
let rootDir = process.cwd();
while (rootDir !== '/') {
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg.workspaces) break;
  }
  rootDir = path.dirname(rootDir);
}

// Load .development.local first, then .development (dotenv doesn't override existing vars)
// This way .local takes precedence
dotenv.config({ path: path.join(rootDir, '.env.development.local') });
dotenv.config({ path: path.join(rootDir, '.env.development') });

// Environment variable schema with validation
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.string().default('3001').transform(Number),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // Discord OAuth
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_CLIENT_SECRET: z.string().min(1, 'DISCORD_CLIENT_SECRET is required'),
  DISCORD_REDIRECT_URI: z.string().url('DISCORD_REDIRECT_URI must be a valid URL'),

  // Discord Bot
  DISCORD_TOKEN: z.string().optional(), // Bot token for posting to Discord
  DEFAULT_DISCORD_CHANNEL_ID: z.string().optional(), // Default channel for web-created events

  // Google OAuth (optional for now)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  // Web App
  WEB_APP_URL: z.string().url('WEB_APP_URL must be a valid URL'),

  // Optional: Email (future)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

// Parse and validate environment variables
let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
} catch (_error) {
  if (_error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:');
    _error.issues.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw _error;
}

// Export validated config
export const config = {
  // Server
  nodeEnv: env.NODE_ENV,
  port: env.API_PORT,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  // Database
  databaseUrl: env.DATABASE_URL,

  // JWT
  jwtSecret: env.JWT_SECRET,
  jwtExpiresIn: env.JWT_EXPIRES_IN,
  refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN,

  // Discord
  discord: {
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    redirectUri: env.DISCORD_REDIRECT_URI,
    botToken: env.DISCORD_TOKEN,
    defaultChannelId: env.DEFAULT_DISCORD_CHANNEL_ID,
    authUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userUrl: 'https://discord.com/api/users/@me',
    apiUrl: 'https://discord.com/api/v10',
    scopes: ['identify', 'email'],
  },

  // Google
  google: {
    clientId: env.GOOGLE_CLIENT_ID || '',
    clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: env.GOOGLE_REDIRECT_URI || `${env.WEB_APP_URL}/api/auth/google/callback`,
    scopes: {
      basic: ['openid', 'email', 'profile'],
      calendar: ['https://www.googleapis.com/auth/calendar.readonly'],
    },
  },

  // Web App
  webAppUrl: env.WEB_APP_URL,

  // CORS
  corsOrigins: [
    env.WEB_APP_URL,
    ...(env.NODE_ENV === 'development' ? ['http://localhost:5173'] : []),
  ],

  // Rate Limiting
  rateLimit: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Logging
  logging: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
};

// Log configuration on startup (hide secrets)
if (!config.isTest) {
  console.log('📋 Configuration loaded:');
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Database: ${config.databaseUrl.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`  JWT Secret: ${config.jwtSecret.substring(0, 8)}...`);
  console.log(`  Discord Client ID: ${config.discord.clientId}`);
  console.log(`  Web App URL: ${config.webAppUrl}`);
}

// Backwards compatibility
export const Config = config;
