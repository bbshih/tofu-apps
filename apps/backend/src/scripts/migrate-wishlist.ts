/**
 * Wishlist Database Migration Script
 * Creates all necessary tables for the Wishlist application
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query, closeWishlistDb } from '../wishlist/db.js';

// Load environment variables from apps/backend/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../.env');
console.log('Loading .env from:', envPath);
const result = config({ path: envPath });
if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('Environment loaded. WISHLIST_DB_USER:', process.env.WISHLIST_DB_USER);
}

const migrations = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add bookmarklet token columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='bookmarklet_token') THEN
    ALTER TABLE users ADD COLUMN bookmarklet_token TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='users' AND column_name='bookmarklet_token_created_at') THEN
    ALTER TABLE users ADD COLUMN bookmarklet_token_created_at TIMESTAMP;
  END IF;
END $$;

-- Wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Items table
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_name VARCHAR(500) NOT NULL,
  brand VARCHAR(255),
  price DECIMAL(10, 2),
  sale_price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  original_url TEXT NOT NULL,
  site_name VARCHAR(255),
  image_path VARCHAR(500),
  notes TEXT,
  ranking INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  UNIQUE(user_id, name)
);

-- Item tags junction table
CREATE TABLE IF NOT EXISTS item_tags (
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_items_wishlist_id ON items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);
`;

async function runMigrations() {
  try {
    console.log('Running Wishlist database migrations...');
    await query(migrations);
    console.log('✅ Wishlist migrations completed successfully!');
    await closeWishlistDb();
    process.exit(0);
  } catch (_error) {
    console.error('❌ Wishlist migration failed:', _error);
    process.exit(1);
  }
}

runMigrations();
