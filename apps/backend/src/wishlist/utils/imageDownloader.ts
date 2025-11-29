import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE || '5242880'); // 5MB default

export async function downloadAndSaveImage(imageUrl: string): Promise<string | null> {
  try {
    // Create uploads directory if it doesn't exist
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Download image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: MAX_IMAGE_SIZE,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    // Generate unique filename
    const hash = crypto.randomBytes(16).toString('hex');
    const ext = '.jpg'; // We'll convert everything to JPEG
    const filename = `${hash}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Process and optimize image
    await sharp(response.data)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toFile(filepath);

    return filename;
  } catch (_error) {
    console.error('Error downloading image:', _error);
    return null;
  }
}
