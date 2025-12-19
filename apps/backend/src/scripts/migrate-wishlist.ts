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

-- Stores table for return and price matching policies
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  return_policy TEXT,
  return_window_days INTEGER,
  price_match_policy TEXT,
  price_match_window_days INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Add structured policy columns to stores table if they don't exist
DO $$
BEGIN
  -- Return policy structured fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='free_returns') THEN
    ALTER TABLE stores ADD COLUMN free_returns BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='free_return_shipping') THEN
    ALTER TABLE stores ADD COLUMN free_return_shipping BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='paid_return_cost') THEN
    ALTER TABLE stores ADD COLUMN paid_return_cost DECIMAL(10, 2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='restocking_fee_percent') THEN
    ALTER TABLE stores ADD COLUMN restocking_fee_percent INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='exchange_only') THEN
    ALTER TABLE stores ADD COLUMN exchange_only BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='store_credit_only') THEN
    ALTER TABLE stores ADD COLUMN store_credit_only BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='receipt_required') THEN
    ALTER TABLE stores ADD COLUMN receipt_required BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='original_packaging_required') THEN
    ALTER TABLE stores ADD COLUMN original_packaging_required BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='final_sale_items') THEN
    ALTER TABLE stores ADD COLUMN final_sale_items BOOLEAN DEFAULT false;
  END IF;
  -- Price match structured fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='price_match_competitors') THEN
    ALTER TABLE stores ADD COLUMN price_match_competitors BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='price_match_own_sales') THEN
    ALTER TABLE stores ADD COLUMN price_match_own_sales BOOLEAN DEFAULT false;
  END IF;
  -- Policy URL fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='return_policy_url') THEN
    ALTER TABLE stores ADD COLUMN return_policy_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stores' AND column_name='price_match_policy_url') THEN
    ALTER TABLE stores ADD COLUMN price_match_policy_url TEXT;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_items_wishlist_id ON items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_stores_name ON stores(name);

-- Community Store Policies table (shared across all users)
CREATE TABLE IF NOT EXISTS community_store_policies (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,

  -- Return policy fields
  return_window_days INTEGER,
  free_returns BOOLEAN DEFAULT false,
  free_return_shipping BOOLEAN DEFAULT false,
  paid_return_cost DECIMAL(10, 2),
  restocking_fee_percent INTEGER,
  exchange_only BOOLEAN DEFAULT false,
  store_credit_only BOOLEAN DEFAULT false,
  receipt_required BOOLEAN DEFAULT false,
  original_packaging_required BOOLEAN DEFAULT false,
  final_sale_items BOOLEAN DEFAULT false,
  return_policy_url TEXT,
  return_policy_notes TEXT,

  -- Price match policy fields
  price_match_window_days INTEGER,
  price_match_competitors BOOLEAN DEFAULT false,
  price_match_own_sales BOOLEAN DEFAULT false,
  price_match_policy_url TEXT,
  price_match_policy_notes TEXT,

  -- Metadata
  contributed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_community_policies_domain ON community_store_policies(domain);
CREATE INDEX IF NOT EXISTS idx_community_policies_name ON community_store_policies(name);

-- Community Policy Verifications table
CREATE TABLE IF NOT EXISTS community_policy_verifications (
  id SERIAL PRIMARY KEY,
  policy_id INTEGER NOT NULL REFERENCES community_store_policies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_accurate BOOLEAN NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(policy_id, user_id)
);

-- Community Policy Reports table
CREATE TABLE IF NOT EXISTS community_policy_reports (
  id SERIAL PRIMARY KEY,
  policy_id INTEGER NOT NULL REFERENCES community_store_policies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_policy_reports_status ON community_policy_reports(status);
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
