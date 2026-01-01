/**
 * Migration script to convert existing JPEG images to WebP format
 * and generate thumbnails for the dashboard
 *
 * Run with: npx tsx src/scripts/migrate-images-to-webp.ts
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { query, closeWishlistDb } from '../wishlist/db.js';

const UPLOAD_DIR = process.env.WISHLIST_UPLOAD_DIR || './uploads';

// Image optimization settings (match imageDownloader.ts)
const MAIN_IMAGE_SIZE = 800;
const THUMBNAIL_SIZE = 200;
const WEBP_QUALITY = 82;
const THUMBNAIL_QUALITY = 75;

interface MigrationStats {
  total: number;
  converted: number;
  skipped: number;
  errors: number;
}

async function convertImage(jpgPath: string): Promise<string | null> {
  try {
    const basename = path.basename(jpgPath, '.jpg');
    const webpFilename = `${basename}.webp`;
    const thumbFilename = `${basename}_thumb.webp`;
    const webpPath = path.join(UPLOAD_DIR, webpFilename);
    const thumbPath = path.join(UPLOAD_DIR, thumbFilename);

    // Check if already converted
    try {
      await fs.access(webpPath);
      console.log(`  Skipping ${basename}.jpg - already converted`);
      return null; // Already exists
    } catch {
      // File doesn't exist, proceed with conversion
    }

    // Load the original image
    const imageBuffer = await fs.readFile(jpgPath);
    const image = sharp(imageBuffer);

    // Convert to WebP (main image)
    await image
      .clone()
      .resize(MAIN_IMAGE_SIZE, MAIN_IMAGE_SIZE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: WEBP_QUALITY,
        effort: 4,
      })
      .toFile(webpPath);

    // Generate thumbnail
    await image
      .clone()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({
        quality: THUMBNAIL_QUALITY,
        effort: 4,
      })
      .toFile(thumbPath);

    console.log(`  Converted ${basename}.jpg -> ${webpFilename} + ${thumbFilename}`);
    return webpFilename;
  } catch (error) {
    console.error(`  Error converting ${jpgPath}:`, error);
    return null;
  }
}

async function updateDatabase(oldFilename: string, newFilename: string): Promise<boolean> {
  try {
    const result = await query(
      'UPDATE items SET image_path = $1 WHERE image_path = $2',
      [newFilename, oldFilename]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error(`  Error updating database for ${oldFilename}:`, error);
    return false;
  }
}

async function migrate(): Promise<void> {
  console.log('=== Image Migration: JPEG to WebP ===\n');
  console.log(`Upload directory: ${UPLOAD_DIR}\n`);

  const stats: MigrationStats = {
    total: 0,
    converted: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Get all .jpg files
    const files = await fs.readdir(UPLOAD_DIR);
    const jpgFiles = files.filter(f => f.endsWith('.jpg'));
    stats.total = jpgFiles.length;

    console.log(`Found ${jpgFiles.length} JPEG files to process\n`);

    if (jpgFiles.length === 0) {
      console.log('No JPEG files to convert. Done!');
      return;
    }

    // Process each file
    for (const jpgFile of jpgFiles) {
      const jpgPath = path.join(UPLOAD_DIR, jpgFile);
      const newFilename = await convertImage(jpgPath);

      if (newFilename) {
        // Update database
        const updated = await updateDatabase(jpgFile, newFilename);
        if (updated) {
          stats.converted++;
          console.log(`  Database updated: ${jpgFile} -> ${newFilename}`);
        } else {
          // Image converted but no DB entry (orphan file)
          stats.converted++;
          console.log(`  No database entry for ${jpgFile} (orphan file)`);
        }
      } else {
        stats.skipped++;
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Total files:  ${stats.total}`);
    console.log(`Converted:    ${stats.converted}`);
    console.log(`Skipped:      ${stats.skipped}`);
    console.log(`Errors:       ${stats.errors}`);

    // Ask about cleanup
    console.log('\nNote: Original .jpg files have been kept.');
    console.log('After verifying the migration, you can delete them manually:');
    console.log(`  rm ${UPLOAD_DIR}/*.jpg`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closeWishlistDb();
  }
}

// Run migration
migrate().catch(console.error);
