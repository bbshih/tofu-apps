import { Response } from 'express';
import { query } from '../db.js';
import { WishlistAuthRequest } from '../types/index.js';
import { getThumbnailPath } from '../utils/imageDownloader.js';

export const getAllWishlists = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get wishlists with item count and preview images (up to 4)
    const result = await query(
      `SELECT
        w.*,
        COALESCE(item_counts.count, 0)::int as item_count,
        COALESCE(previews.images, '[]'::json) as preview_images
      FROM wishlists w
      LEFT JOIN (
        SELECT wishlist_id, COUNT(*) as count
        FROM items
        GROUP BY wishlist_id
      ) item_counts ON w.id = item_counts.wishlist_id
      LEFT JOIN LATERAL (
        SELECT json_agg(image_path) as images
        FROM (
          SELECT image_path
          FROM items
          WHERE wishlist_id = w.id AND image_path IS NOT NULL
          ORDER BY ranking DESC, created_at DESC
          LIMIT 4
        ) sub
      ) previews ON true
      WHERE w.user_id = $1
      ORDER BY w.updated_at DESC`,
      [userId]
    );

    // Convert preview images to thumbnail paths
    const wishlists = result.rows.map(wishlist => ({
      ...wishlist,
      preview_images: wishlist.preview_images
        ? wishlist.preview_images.map((img: string) => getThumbnailPath(img))
        : [],
    }));

    res.json(wishlists);
  } catch (_error) {
    console.error('Error fetching wishlists:', _error);
    res.status(500).json({ _error: 'Failed to fetch wishlists' });
  }
};

export const getWishlist = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query('SELECT * FROM wishlists WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ _error: 'Wishlist not found' });
    }

    res.json(result.rows[0]);
  } catch (_error) {
    console.error('Error fetching wishlist:', _error);
    res.status(500).json({ _error: 'Failed to fetch wishlist' });
  }
};

export const createWishlist = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({ _error: 'Name is required' });
    }

    const result = await query(
      'INSERT INTO wishlists (user_id, name) VALUES ($1, $2) RETURNING *',
      [userId, name]
    );

    res.status(201).json(result.rows[0]);
  } catch (_error) {
    console.error('Error creating wishlist:', _error);
    res.status(500).json({ _error: 'Failed to create wishlist' });
  }
};

export const updateWishlist = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({ _error: 'Name is required' });
    }

    const result = await query(
      'UPDATE wishlists SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
      [name, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ _error: 'Wishlist not found' });
    }

    res.json(result.rows[0]);
  } catch (_error) {
    console.error('Error updating wishlist:', _error);
    res.status(500).json({ _error: 'Failed to update wishlist' });
  }
};

export const deleteWishlist = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query('DELETE FROM wishlists WHERE id = $1 AND user_id = $2 RETURNING *', [
      id,
      userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ _error: 'Wishlist not found' });
    }

    res.json({ message: 'Wishlist deleted successfully' });
  } catch (_error) {
    console.error('Error deleting wishlist:', _error);
    res.status(500).json({ _error: 'Failed to delete wishlist' });
  }
};

export const getWishlistItems = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // First verify the wishlist belongs to the user
    const wishlistResult = await query('SELECT * FROM wishlists WHERE id = $1 AND user_id = $2', [
      id,
      userId,
    ]);

    if (wishlistResult.rows.length === 0) {
      return res.status(404).json({ _error: 'Wishlist not found' });
    }

    // Get all items with their tags
    const itemsResult = await query(
      `SELECT i.*,
              COALESCE(
                json_agg(
                  json_build_object('id', t.id, 'name', t.name)
                ) FILTER (WHERE t.id IS NOT NULL),
                '[]'
              ) as tags
       FROM items i
       LEFT JOIN item_tags it ON i.id = it.item_id
       LEFT JOIN tags t ON it.tag_id = t.id
       WHERE i.wishlist_id = $1
       GROUP BY i.id
       ORDER BY i.ranking DESC, i.created_at DESC`,
      [id]
    );

    res.json(itemsResult.rows);
  } catch (_error) {
    console.error('Error fetching wishlist items:', _error);
    res.status(500).json({ _error: 'Failed to fetch wishlist items' });
  }
};

export const getAllItems = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get all items from all wishlists belonging to the user with their tags and wishlist name
    const itemsResult = await query(
      `SELECT i.*,
              w.name as wishlist_name,
              COALESCE(
                json_agg(
                  json_build_object('id', t.id, 'name', t.name)
                ) FILTER (WHERE t.id IS NOT NULL),
                '[]'
              ) as tags
       FROM items i
       INNER JOIN wishlists w ON i.wishlist_id = w.id
       LEFT JOIN item_tags it ON i.id = it.item_id
       LEFT JOIN tags t ON it.tag_id = t.id
       WHERE w.user_id = $1
       GROUP BY i.id, w.name
       ORDER BY i.ranking DESC, i.created_at DESC`,
      [userId]
    );

    res.json(itemsResult.rows);
  } catch (_error) {
    console.error('Error fetching all items:', _error);
    res.status(500).json({ _error: 'Failed to fetch all items' });
  }
};
