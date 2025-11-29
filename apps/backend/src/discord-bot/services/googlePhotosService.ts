/**
 * Google Photos service
 * Create shared albums for event memories
 */

import { google } from 'googleapis';

// Initialize Google Photos API client

let photosClient: any | null = null;

/**
 * Initialize Google Photos API client with service account
 * Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON
 */

function getPhotosClient(): any {
  if (photosClient) return photosClient;

  try {
    const auth = new google.auth.GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/photoslibrary',
        'https://www.googleapis.com/auth/photoslibrary.sharing',
      ],
    });

    photosClient = (google as any).photoslibrary({
      version: 'v1',
      auth,
    });

    return photosClient;
  } catch (_error) {
    console.error('Failed to initialize Google Photos client:', _error);
    throw new Error('Google Photos API not configured');
  }
}

/**
 * Check if Google Photos is configured
 */
export function isConfigured(): boolean {
  return !!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.GOOGLE_PHOTOS_ENABLED;
}

export interface CreateAlbumResult {
  albumId: string;
  shareUrl: string;
  title: string;
}

/**
 * Create a shared Google Photos album
 *
 * @param title - Album title (e.g., "Beach Day - June 15, 2024")
 * @returns Album ID and shareable URL
 */
export async function createSharedAlbum(title: string): Promise<CreateAlbumResult> {
  if (!isConfigured()) {
    throw new Error(
      'Google Photos API not configured. Set GOOGLE_APPLICATION_CREDENTIALS env var.'
    );
  }

  const photos = getPhotosClient();

  try {
    // Create album
    const createResponse = await photos.albums.create({
      requestBody: {
        album: {
          title: title.substring(0, 500), // Google Photos limit
        },
      },
    });

    const albumId = createResponse.data.id;
    if (!albumId) {
      throw new Error('Failed to create album - no ID returned');
    }

    // Share album with collaboration enabled
    const shareResponse = await photos.albums.share({
      albumId,
      requestBody: {
        sharedAlbumOptions: {
          isCollaborative: true, // Allow others to add photos
          isCommentable: true, // Allow comments
        },
      },
    });

    const shareUrl = shareResponse.data.shareInfo?.shareableUrl;
    if (!shareUrl) {
      throw new Error('Failed to get shareable URL');
    }

    return {
      albumId,
      shareUrl,
      title,
    };
  } catch (_error) {
    console.error('Error creating Google Photos album:', _error);
    throw new Error(
      `Failed to create album: ${_error instanceof Error ? _error.message : 'Unknown _error'}`
    );
  }
}

/**
 * Get album details by ID
 */
export async function getAlbum(albumId: string) {
  if (!isConfigured()) {
    return null;
  }

  try {
    const photos = getPhotosClient();
    const response = await photos.albums.get({ albumId });
    return response.data;
  } catch (_error) {
    console.error('Error fetching album:', _error);
    return null;
  }
}

/**
 * Get media items count in album (for stats)
 */
export async function getAlbumPhotoCount(albumId: string): Promise<number> {
  if (!isConfigured()) {
    return 0;
  }

  try {
    const photos = getPhotosClient();
    const response = await photos.mediaItems.search({
      requestBody: {
        albumId,
        pageSize: 1, // Just need the count
      },
    });

    // totalMediaItemsCount might not be available, estimate from pagination
    return parseInt(response.data.nextPageToken ? '100+' : '0') || 0;
  } catch (_error) {
    console.error('Error getting photo count:', _error);
    return 0;
  }
}
