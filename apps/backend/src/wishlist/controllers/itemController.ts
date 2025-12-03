import { Response } from 'express';
import { query } from '../db.js';
import { WishlistAuthRequest } from '../types/index.js';
import { scrapeProduct } from '../services/scraperService.js';
import { downloadAndSaveImage } from '../utils/imageDownloader.js';

export const createItem = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { wishlist_id, url, product_name, brand, price, sale_price, currency, notes, tags, force_add } =
      req.body;

    const userId = req.user?.id;

    if (!wishlist_id || !url) {
      return res.status(400).json({ error: 'Wishlist ID and URL are required' });
    }

    // Verify wishlist belongs to user
    const wishlistResult = await query('SELECT * FROM wishlists WHERE id = $1 AND user_id = $2', [
      wishlist_id,
      userId,
    ]);

    if (wishlistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    let itemData: any = {
      product_name,
      brand,
      price,
      sale_price,
      currency: currency || 'USD',
      site_name: null,
      image_path: null,
      image_url: null,
    };

    // If not all data provided, scrape it first (before duplicate check)
    if (!product_name) {
      try {
        const scrapedData = await scrapeProduct(url);
        itemData = {
          product_name: scrapedData.product_name || 'Unknown Product',
          brand: scrapedData.brand,
          price: scrapedData.price,
          sale_price: scrapedData.sale_price,
          currency: scrapedData.currency || 'USD',
          site_name: scrapedData.site_name,
          image_path: null,
          image_url: scrapedData.image_url, // Keep temp URL for duplicate comparison
        };
      } catch (_error) {
        console.error('Scraping failed:', _error);
        return res.status(400).json({
          _error: 'Failed to scrape product. Please provide product details manually.',
        });
      }
    }

    // Skip duplicate check if force_add is true
    if (!force_add) {
      // Check for exact URL match
      const exactMatch = await query(
        'SELECT id, product_name, brand, price, sale_price, currency, image_path, original_url FROM items WHERE wishlist_id = $1 AND original_url = $2',
        [wishlist_id, url]
      );

      if (exactMatch.rows.length > 0) {
        return res.status(409).json({
          error: 'This item is already in your wishlist',
          duplicates: exactMatch.rows,
          duplicate_type: 'exact',
          new_item: itemData, // Send scraped data for comparison
        });
      }

      // Check for similar URLs (same domain and path, different query strings)
      // Extract base URL without query string
      let baseUrl: string;
      try {
        const urlObj = new URL(url);
        baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      } catch {
        baseUrl = url;
      }

      const similarUrlCheck = await query(
        `SELECT id, product_name, brand, price, sale_price, currency, image_path, original_url
         FROM items
         WHERE wishlist_id = $1
         AND original_url LIKE $2`,
        [wishlist_id, `${baseUrl}%`]
      );

      if (similarUrlCheck.rows.length > 0) {
        return res.status(409).json({
          error: 'Similar item(s) found in your wishlist',
          duplicates: similarUrlCheck.rows,
          duplicate_type: 'similar_url',
          new_item: itemData, // Send scraped data for comparison
        });
      }
    }

    // Download and save image
    if (itemData.image_url) {
      const savedImagePath = await downloadAndSaveImage(itemData.image_url);
      if (savedImagePath) {
        itemData.image_path = savedImagePath;
      }
    }

    // Insert item
    const itemResult = await query(
      `INSERT INTO items (
        wishlist_id, product_name, brand, price, sale_price, currency,
        original_url, site_name, image_path, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        wishlist_id,
        itemData.product_name,
        itemData.brand,
        itemData.price,
        itemData.sale_price,
        itemData.currency,
        url,
        itemData.site_name,
        itemData.image_path,
        notes,
      ]
    );

    const item = itemResult.rows[0];

    // Handle tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        // Get or create tag
        let tagResult = await query('SELECT * FROM tags WHERE user_id = $1 AND name = $2', [
          userId,
          tagName,
        ]);

        if (tagResult.rows.length === 0) {
          tagResult = await query('INSERT INTO tags (user_id, name) VALUES ($1, $2) RETURNING *', [
            userId,
            tagName,
          ]);
        }

        const tag = tagResult.rows[0];

        // Associate tag with item
        await query(
          'INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [item.id, tag.id]
        );
      }
    }

    // Return item with tags
    const finalResult = await query(
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
       WHERE i.id = $1
       GROUP BY i.id`,
      [item.id]
    );

    res.status(201).json(finalResult.rows[0]);
  } catch (_error) {
    console.error('Error creating item:', _error);
    res.status(500).json({ _error: 'Failed to create item' });
  }
};

export const updateItem = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { product_name, brand, price, sale_price, notes, ranking, tags } = req.body;
    const userId = req.user?.id;

    // Verify item belongs to user's wishlist
    const checkResult = await query(
      `SELECT i.* FROM items i
       JOIN wishlists w ON i.wishlist_id = w.id
       WHERE i.id = $1 AND w.user_id = $2`,
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ _error: 'Item not found' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (product_name !== undefined) {
      updates.push(`product_name = $${paramCount++}`);
      values.push(product_name);
    }
    if (brand !== undefined) {
      updates.push(`brand = $${paramCount++}`);
      values.push(brand);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }
    if (sale_price !== undefined) {
      updates.push(`sale_price = $${paramCount++}`);
      values.push(sale_price);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }
    if (ranking !== undefined) {
      updates.push(`ranking = $${paramCount++}`);
      values.push(ranking);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length > 1) {
      values.push(id);
      const updateQuery = `UPDATE items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
      await query(updateQuery, values);
    }

    // Update tags if provided
    if (tags !== undefined && Array.isArray(tags)) {
      // Remove existing tags
      await query('DELETE FROM item_tags WHERE item_id = $1', [id]);

      // Add new tags
      for (const tagName of tags) {
        let tagResult = await query('SELECT * FROM tags WHERE user_id = $1 AND name = $2', [
          userId,
          tagName,
        ]);

        if (tagResult.rows.length === 0) {
          tagResult = await query('INSERT INTO tags (user_id, name) VALUES ($1, $2) RETURNING *', [
            userId,
            tagName,
          ]);
        }

        const tag = tagResult.rows[0];
        await query('INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2)', [id, tag.id]);
      }
    }

    // Return updated item with tags
    const finalResult = await query(
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
       WHERE i.id = $1
       GROUP BY i.id`,
      [id]
    );

    res.json(finalResult.rows[0]);
  } catch (_error) {
    console.error('Error updating item:', _error);
    res.status(500).json({ _error: 'Failed to update item' });
  }
};

export const deleteItem = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      `DELETE FROM items i
       USING wishlists w
       WHERE i.id = $1 AND i.wishlist_id = w.id AND w.user_id = $2
       RETURNING i.*`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ _error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (_error) {
    console.error('Error deleting item:', _error);
    res.status(500).json({ _error: 'Failed to delete item' });
  }
};

export const getItem = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      `SELECT i.*,
              COALESCE(
                json_agg(
                  json_build_object('id', t.id, 'name', t.name)
                ) FILTER (WHERE t.id IS NOT NULL),
                '[]'
              ) as tags
       FROM items i
       JOIN wishlists w ON i.wishlist_id = w.id
       LEFT JOIN item_tags it ON i.id = it.item_id
       LEFT JOIN tags t ON it.tag_id = t.id
       WHERE i.id = $1 AND w.user_id = $2
       GROUP BY i.id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ _error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (_error) {
    console.error('Error fetching item:', _error);
    res.status(500).json({ _error: 'Failed to fetch item' });
  }
};
