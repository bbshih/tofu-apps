/**
 * Wishlist PostgreSQL Database Connection
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env'); // Go up from dist/wishlist to backend root
console.log('[Wishlist DB] Loading .env from:', envPath);
const result = config({ path: envPath });
if (result.error) {
  console.error('[Wishlist DB] Error loading .env:', result.error);
}
console.log('[Wishlist DB] WISHLIST_DB_USER after load:', process.env.WISHLIST_DB_USER);

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.WISHLIST_DB_HOST || 'localhost',
  port: parseInt(process.env.WISHLIST_DB_PORT || '5432', 10),
  database: process.env.WISHLIST_DB_NAME || 'wishlist',
  user: process.env.WISHLIST_DB_USER || 'wishlist_user',
  password: process.env.WISHLIST_DB_PASSWORD,
  max: 10, // Reduced from default 20 for memory efficiency
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Wishlist DB connection error:', err.stack);
  } else {
    console.log('✅ Wishlist DB connected');
    release();
  }
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const closeWishlistDb = async () => {
  await pool.end();
  console.log('Wishlist DB pool closed');
};

export default pool;
