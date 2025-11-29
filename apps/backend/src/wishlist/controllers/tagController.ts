import { Response } from 'express';
import { query } from '../db.js';
import { WishlistAuthRequest } from '../types/index.js';

export const getAllTags = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await query(
      `SELECT t.*, COUNT(it.item_id) as item_count
       FROM tags t
       LEFT JOIN item_tags it ON t.id = it.tag_id
       WHERE t.user_id = $1
       GROUP BY t.id
       ORDER BY t.name`,
      [userId]
    );

    res.json(result.rows);
  } catch (_error) {
    console.error('Error fetching tags:', _error);
    res.status(500).json({ _error: 'Failed to fetch tags' });
  }
};

export const createTag = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({ _error: 'Tag name is required' });
    }

    // Check if tag already exists
    const existingTag = await query('SELECT * FROM tags WHERE user_id = $1 AND name = $2', [
      userId,
      name,
    ]);

    if (existingTag.rows.length > 0) {
      return res.status(409).json({ _error: 'Tag already exists' });
    }

    const result = await query('INSERT INTO tags (user_id, name) VALUES ($1, $2) RETURNING *', [
      userId,
      name,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (_error) {
    console.error('Error creating tag:', _error);
    res.status(500).json({ _error: 'Failed to create tag' });
  }
};

export const deleteTag = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query('DELETE FROM tags WHERE id = $1 AND user_id = $2 RETURNING *', [
      id,
      userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ _error: 'Tag not found' });
    }

    res.json({ message: 'Tag deleted successfully' });
  } catch (_error) {
    console.error('Error deleting tag:', _error);
    res.status(500).json({ _error: 'Failed to delete tag' });
  }
};
