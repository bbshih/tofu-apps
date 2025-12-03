/**
 * Configuration for Wishlist App
 * Loads and validates environment variables
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables (in case not loaded yet)
dotenv.config();

// Environment variable schema with validation
const envSchema = z.object({
  // Database
  WISHLIST_DB_HOST: z.string().min(1, 'WISHLIST_DB_HOST is required'),
  WISHLIST_DB_PORT: z.string().transform((val) => {
    const port = parseInt(val, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new Error('WISHLIST_DB_PORT must be a valid port number');
    }
    return port;
  }),
  WISHLIST_DB_NAME: z.string().min(1, 'WISHLIST_DB_NAME is required'),
  WISHLIST_DB_USER: z.string().min(1, 'WISHLIST_DB_USER is required'),
  WISHLIST_DB_PASSWORD: z.string().min(1, 'WISHLIST_DB_PASSWORD is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Optional
  WISHLIST_UPLOAD_DIR: z.string().optional(),
  MAX_IMAGE_SIZE: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Parse and validate environment variables
let config: z.infer<typeof envSchema>;

try {
  config = envSchema.parse(process.env);
  console.log('✅ Wishlist configuration validated');
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid wishlist environment variables:');
    error.issues.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

// Export validated config
export const WishlistConfig = {
  db: {
    host: config.WISHLIST_DB_HOST,
    port: config.WISHLIST_DB_PORT,
    name: config.WISHLIST_DB_NAME,
    user: config.WISHLIST_DB_USER,
    password: config.WISHLIST_DB_PASSWORD,
  },
  jwt: {
    secret: config.JWT_SECRET,
  },
  upload: {
    dir: config.WISHLIST_UPLOAD_DIR || './uploads',
    maxSize: parseInt(config.MAX_IMAGE_SIZE || '5242880', 10),
  },
  nodeEnv: config.NODE_ENV,
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test',
};
