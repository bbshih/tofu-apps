import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { URL } from 'url';

const UPLOAD_DIR = process.env.WISHLIST_UPLOAD_DIR || './uploads';
const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE || '5242880'); // 5MB default

// Image optimization settings
const MAIN_IMAGE_SIZE = 800;
const THUMBNAIL_SIZE = 200;
const WEBP_QUALITY = 82; // WebP is more efficient, can use slightly lower quality
const THUMBNAIL_QUALITY = 75;

// Allowed protocols and blocked hosts for SSRF prevention
const ALLOWED_PROTOCOLS = ['http:', 'https:'];
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254', // AWS metadata
  '::1',
];
const BLOCKED_NETWORKS = [
  /^10\./,        // Private network
  /^172\.(1[6-9]|2[0-9]|3[01])\./,  // Private network
  /^192\.168\./,  // Private network
  /^fd[0-9a-f]{2}:/i, // IPv6 ULA
  /^fe80:/i, // IPv6 link-local
];

export async function downloadAndSaveImage(imageUrl: string): Promise<string | null> {
  try {
    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      throw new Error('Invalid URL');
    }

    // Check protocol
    if (!ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol - only HTTP and HTTPS allowed');
    }

    // Check for blocked hosts/networks (SSRF prevention)
    const hostname = parsedUrl.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) {
      throw new Error('Access to internal resources not allowed');
    }

    for (const pattern of BLOCKED_NETWORKS) {
      if (pattern.test(hostname)) {
        throw new Error('Access to internal networks not allowed');
      }
    }

    // Create uploads directory if it doesn't exist
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Download image with validation
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: MAX_IMAGE_SIZE,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WishlistBot/1.0)',
      },
    });

    // Validate content-type
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error('Response is not an image');
    }

    // Generate unique filename
    const hash = crypto.randomBytes(16).toString('hex');
    const filename = `${hash}.webp`;
    const thumbFilename = `${hash}_thumb.webp`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const thumbFilepath = path.join(UPLOAD_DIR, thumbFilename);

    // Load image once for both operations
    const image = sharp(response.data);

    // Process and save main image as WebP
    await image
      .clone()
      .resize(MAIN_IMAGE_SIZE, MAIN_IMAGE_SIZE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: WEBP_QUALITY,
        effort: 4, // Balance between compression and speed
      })
      .toFile(filepath);

    // Generate and save thumbnail
    await image
      .clone()
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover', // Crop to fill for consistent thumbnail sizes
        position: 'centre',
      })
      .webp({
        quality: THUMBNAIL_QUALITY,
        effort: 4,
      })
      .toFile(thumbFilepath);

    return filename;
  } catch (_error) {
    console.error('Error downloading image:', _error);
    return null;
  }
}

/**
 * Get the thumbnail filename from a main image filename
 * Handles both old .jpg files and new .webp files
 */
export function getThumbnailPath(imagePath: string): string {
  if (imagePath.endsWith('.webp')) {
    return imagePath.replace('.webp', '_thumb.webp');
  }
  // For old .jpg files, just return the original (no thumbnail exists)
  return imagePath;
}
