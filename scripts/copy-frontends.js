#!/usr/bin/env node

/**
 * Copy Frontend Builds Script
 * Copies built frontend assets to backend public directory
 */

import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const backendPublic = join(rootDir, 'apps/backend/public');
const wishlistDist = join(rootDir, 'apps/wishlist-web/dist');
const seacalendarDist = join(rootDir, 'apps/seacalendar-web/dist');

/**
 * Recursively copy directory
 */
function copyRecursive(src, dest) {
  mkdirSync(dest, { recursive: true });

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📦 Copying frontend builds to backend public directory...\n');

try {
  // Ensure backend public directory exists
  mkdirSync(backendPublic, { recursive: true });

  // Copy Wishlist frontend
  console.log('Copying wishlist-web/dist → backend/public/wishlist');
  const wishlistTarget = join(backendPublic, 'wishlist');
  copyRecursive(wishlistDist, wishlistTarget);
  console.log('✅ Wishlist frontend copied\n');

  // Copy SeaCalendar frontend
  console.log('Copying seacalendar-web/dist → backend/public/seacalendar');
  const seacalendarTarget = join(backendPublic, 'seacalendar');
  copyRecursive(seacalendarDist, seacalendarTarget);
  console.log('✅ SeaCalendar frontend copied\n');

  console.log('✅ All frontends copied successfully!');
} catch (error) {
  console.error('❌ Error copying frontends:', error.message);
  process.exit(1);
}
