import { Request, Response } from 'express';
import { query } from '../db.js';
import { WishlistAuthRequest } from '../types/index.js';
import { scrapeProduct } from '../services/scraperService.js';
import { downloadAndSaveImage } from '../utils/imageDownloader.js';
import { parseClientFetchedHtml } from '../services/policyScraperService.js';
import crypto from 'crypto';

/**
 * Generate or regenerate bookmarklet token for authenticated user
 */
export const generateBookmarkletToken = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const createdAt = new Date();

    // Update user's bookmarklet token
    await query(
      'UPDATE users SET bookmarklet_token = $1, bookmarklet_token_created_at = $2 WHERE id = $3',
      [token, createdAt, userId]
    );

    res.json({
      token,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + 90 * 24 * 60 * 60 * 1000), // 90 days
    });
  } catch (error) {
    console.error('Error generating bookmarklet token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
};

/**
 * Get user's wishlists by bookmarklet token (public endpoint)
 */
export const getWishlistsByToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Find user by token and check expiration
    const userResult = await query(
      `SELECT id, bookmarklet_token_created_at FROM users WHERE bookmarklet_token = $1`,
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid bookmarklet token' });
    }

    const user = userResult.rows[0];
    const tokenAge = Date.now() - new Date(user.bookmarklet_token_created_at).getTime();
    const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;

    if (tokenAge > ninetyDaysInMs) {
      return res.status(401).json({
        error: 'Bookmarklet token expired. Please regenerate from your dashboard.',
      });
    }

    // Get user's wishlists
    const wishlistsResult = await query(
      'SELECT id, name FROM wishlists WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    res.json({ wishlists: wishlistsResult.rows });
  } catch (error) {
    console.error('Error fetching wishlists by token:', error);
    res.status(500).json({ error: 'Failed to fetch wishlists' });
  }
};

/**
 * Add item to wishlist via bookmarklet (public endpoint)
 */
export const addItemViaBookmarklet = async (req: Request, res: Response) => {
  try {
    const { token, url, wishlist_id, scraped_data } = req.body;

    if (!token || !url || !wishlist_id) {
      return res.status(400).json({
        error: 'Token, URL, and wishlist_id are required',
      });
    }

    // Find user by token and check expiration
    const userResult = await query(
      'SELECT id, bookmarklet_token_created_at FROM users WHERE bookmarklet_token = $1',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid bookmarklet token' });
    }

    const user = userResult.rows[0];
    const tokenAge = Date.now() - new Date(user.bookmarklet_token_created_at).getTime();
    const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;

    if (tokenAge > ninetyDaysInMs) {
      return res.status(401).json({
        error: 'Bookmarklet token expired. Please regenerate from your dashboard.',
      });
    }

    // Verify wishlist belongs to user
    const wishlistResult = await query(
      'SELECT * FROM wishlists WHERE id = $1 AND user_id = $2',
      [wishlist_id, user.id]
    );

    if (wishlistResult.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }

    let itemData: any = {
      product_name: null,
      brand: null,
      price: null,
      sale_price: null,
      currency: 'USD',
      site_name: null,
      image_path: null,
    };

    // Use client-scraped data if provided (from bookmarklet running in browser)
    // This bypasses anti-bot protections like Amazon's CAPTCHA
    if (scraped_data && (scraped_data.product_name || scraped_data.image_url)) {
      itemData = {
        product_name: scraped_data.product_name || 'Unknown Product',
        brand: scraped_data.brand || null,
        price: scraped_data.price || null,
        sale_price: scraped_data.sale_price || null,
        currency: scraped_data.currency || 'USD',
        site_name: new URL(url).hostname.replace(/^www\./, ''),
        image_path: null,
      };

      // Download and save image from client-provided URL
      if (scraped_data.image_url) {
        try {
          const savedImagePath = await downloadAndSaveImage(scraped_data.image_url);
          if (savedImagePath) {
            itemData.image_path = savedImagePath;
          }
        } catch (imgError) {
          console.error('Image download failed:', imgError);
        }
      }
    } else {
      // Fallback to server-side scraping for sites that don't block it
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
        };

        // Download and save image
        if (scrapedData.image_url) {
          const savedImagePath = await downloadAndSaveImage(scrapedData.image_url);
          if (savedImagePath) {
            itemData.image_path = savedImagePath;
          }
        }
      } catch (scrapeError) {
        console.error('Scraping failed:', scrapeError);
        // Continue with default values if scraping fails
        itemData.product_name = 'Product from ' + new URL(url).hostname;
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
        'Added via bookmarklet',
      ]
    );

    const item = itemResult.rows[0];

    res.status(201).json({
      success: true,
      item: {
        id: item.id,
        product_name: item.product_name,
        brand: item.brand,
        price: item.price,
        image_path: item.image_path,
      },
    });
  } catch (error) {
    console.error('Error adding item via bookmarklet:', error);
    res.status(500).json({ error: 'Failed to add item' });
  }
};

/**
 * Capture policy HTML via bookmarklet (public endpoint)
 * The bookmarklet captures the page's HTML and sends it here for parsing
 */
export const capturePolicyViaBookmarklet = async (req: Request, res: Response) => {
  try {
    const { token, html, url, policy_type } = req.body;

    if (!token || !html || !url) {
      return res.status(400).json({
        error: 'Token, HTML, and URL are required',
      });
    }

    // Validate policy_type
    const validTypes = ['return', 'price_match', 'both'];
    const type = policy_type || 'return';
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid policy_type. Must be: return, price_match, or both',
      });
    }

    // Validate HTML size (limit to 2MB)
    if (html.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'HTML content too large' });
    }

    // Find user by token and check expiration
    const userResult = await query(
      'SELECT id, bookmarklet_token_created_at FROM users WHERE bookmarklet_token = $1',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid bookmarklet token' });
    }

    const user = userResult.rows[0];
    const tokenAge = Date.now() - new Date(user.bookmarklet_token_created_at).getTime();
    const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;

    if (tokenAge > ninetyDaysInMs) {
      return res.status(401).json({
        error: 'Bookmarklet token expired. Please regenerate from your dashboard.',
      });
    }

    // Parse the HTML based on policy type
    let result;
    if (type === 'return') {
      result = parseClientFetchedHtml(html, url, null, null);
    } else if (type === 'price_match') {
      result = parseClientFetchedHtml(null, null, html, url);
    } else {
      // 'both' - assume the page has both return and price match info
      result = parseClientFetchedHtml(html, url, html, url);
    }

    // Generate a unique session ID for this capture
    // This allows the frontend to poll for results
    const sessionId = crypto.randomBytes(16).toString('hex');

    // Store the result temporarily (in-memory cache, 5 minute TTL)
    policyCaptureCache.set(sessionId, {
      result,
      url,
      userId: user.id,
      timestamp: Date.now(),
    });

    // Clean up old cache entries
    cleanupPolicyCaptureCache();

    res.json({
      success: true,
      session_id: sessionId,
      result,
    });
  } catch (error) {
    console.error('Error capturing policy via bookmarklet:', error);
    res.status(500).json({ error: 'Failed to capture policy' });
  }
};

// In-memory cache for policy captures (session_id -> result)
const policyCaptureCache = new Map<string, {
  result: ReturnType<typeof parseClientFetchedHtml>;
  url: string;
  userId: number;
  timestamp: number;
}>();

const POLICY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cleanupPolicyCaptureCache() {
  const now = Date.now();
  for (const [key, value] of policyCaptureCache.entries()) {
    if (now - value.timestamp > POLICY_CACHE_TTL) {
      policyCaptureCache.delete(key);
    }
  }
}

/**
 * Create a new wishlist via bookmarklet (public endpoint)
 */
export const createListViaBookmarklet = async (req: Request, res: Response) => {
  try {
    const { token, name } = req.body;

    if (!token || !name) {
      return res.status(400).json({
        error: 'Token and name are required',
      });
    }

    // Validate name length
    if (name.trim().length === 0 || name.length > 255) {
      return res.status(400).json({
        error: 'List name must be between 1 and 255 characters',
      });
    }

    // Find user by token and check expiration
    const userResult = await query(
      'SELECT id, bookmarklet_token_created_at FROM users WHERE bookmarklet_token = $1',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid bookmarklet token' });
    }

    const user = userResult.rows[0];
    const tokenAge = Date.now() - new Date(user.bookmarklet_token_created_at).getTime();
    const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;

    if (tokenAge > ninetyDaysInMs) {
      return res.status(401).json({
        error: 'Bookmarklet token expired. Please regenerate from your dashboard.',
      });
    }

    // Create the new wishlist
    const wishlistResult = await query(
      'INSERT INTO wishlists (user_id, name) VALUES ($1, $2) RETURNING id, name',
      [user.id, name.trim()]
    );

    const wishlist = wishlistResult.rows[0];

    res.status(201).json({
      success: true,
      wishlist: {
        id: wishlist.id,
        name: wishlist.name,
      },
    });
  } catch (error) {
    console.error('Error creating wishlist via bookmarklet:', error);
    res.status(500).json({ error: 'Failed to create wishlist' });
  }
};

/**
 * Check if item with URL already exists for user (public endpoint)
 */
export const checkExistingItem = async (req: Request, res: Response) => {
  try {
    const { token, url } = req.query;

    if (!token || !url) {
      return res.status(400).json({ error: 'Token and URL are required' });
    }

    // Find user by token and check expiration
    const userResult = await query(
      'SELECT id, bookmarklet_token_created_at FROM users WHERE bookmarklet_token = $1',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid bookmarklet token' });
    }

    const user = userResult.rows[0];
    const tokenAge = Date.now() - new Date(user.bookmarklet_token_created_at).getTime();
    const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;

    if (tokenAge > ninetyDaysInMs) {
      return res.status(401).json({
        error: 'Bookmarklet token expired. Please regenerate from your dashboard.',
      });
    }

    // Check if item with this URL exists for this user (across all wishlists)
    const existingResult = await query(
      `SELECT i.*, w.name as wishlist_name
       FROM items i
       JOIN wishlists w ON i.wishlist_id = w.id
       WHERE w.user_id = $1 AND i.original_url = $2
       ORDER BY i.created_at DESC
       LIMIT 1`,
      [user.id, url]
    );

    if (existingResult.rows.length > 0) {
      const item = existingResult.rows[0];
      return res.json({
        exists: true,
        item: {
          id: item.id,
          product_name: item.product_name,
          brand: item.brand,
          price: item.price,
          sale_price: item.sale_price,
          currency: item.currency,
          image_path: item.image_path,
          wishlist_id: item.wishlist_id,
          wishlist_name: item.wishlist_name,
          original_url: item.original_url,
          created_at: item.created_at,
          updated_at: item.updated_at,
        },
      });
    }

    res.json({ exists: false });
  } catch (error) {
    console.error('Error checking existing item:', error);
    res.status(500).json({ error: 'Failed to check existing item' });
  }
};

/**
 * Update existing item via bookmarklet (public endpoint)
 */
export const updateItemViaBookmarklet = async (req: Request, res: Response) => {
  try {
    const { token, item_id, scraped_data, move_to_wishlist_id } = req.body;

    if (!token || !item_id) {
      return res.status(400).json({
        error: 'Token and item_id are required',
      });
    }

    // Find user by token and check expiration
    const userResult = await query(
      'SELECT id, bookmarklet_token_created_at FROM users WHERE bookmarklet_token = $1',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid bookmarklet token' });
    }

    const user = userResult.rows[0];
    const tokenAge = Date.now() - new Date(user.bookmarklet_token_created_at).getTime();
    const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;

    if (tokenAge > ninetyDaysInMs) {
      return res.status(401).json({
        error: 'Bookmarklet token expired. Please regenerate from your dashboard.',
      });
    }

    // Verify item belongs to user
    const itemResult = await query(
      `SELECT i.* FROM items i
       JOIN wishlists w ON i.wishlist_id = w.id
       WHERE i.id = $1 AND w.user_id = $2`,
      [item_id, user.id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const existingItem = itemResult.rows[0];

    // Build update fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (scraped_data) {
      if (scraped_data.product_name !== undefined) {
        updates.push(`product_name = $${paramCount++}`);
        values.push(scraped_data.product_name);
      }
      if (scraped_data.brand !== undefined) {
        updates.push(`brand = $${paramCount++}`);
        values.push(scraped_data.brand);
      }
      if (scraped_data.price !== undefined) {
        updates.push(`price = $${paramCount++}`);
        values.push(scraped_data.price);
      }
      if (scraped_data.sale_price !== undefined) {
        updates.push(`sale_price = $${paramCount++}`);
        values.push(scraped_data.sale_price);
      }
      if (scraped_data.currency !== undefined) {
        updates.push(`currency = $${paramCount++}`);
        values.push(scraped_data.currency);
      }

      // Handle image update
      if (scraped_data.image_url) {
        try {
          const savedImagePath = await downloadAndSaveImage(scraped_data.image_url);
          if (savedImagePath) {
            updates.push(`image_path = $${paramCount++}`);
            values.push(savedImagePath);
          }
        } catch (imgError) {
          console.error('Image download failed:', imgError);
        }
      }
    }

    // Handle wishlist move
    if (move_to_wishlist_id !== undefined) {
      // Verify target wishlist belongs to user
      const targetWishlistResult = await query(
        'SELECT id FROM wishlists WHERE id = $1 AND user_id = $2',
        [move_to_wishlist_id, user.id]
      );

      if (targetWishlistResult.rows.length === 0) {
        return res.status(404).json({ error: 'Target wishlist not found' });
      }

      updates.push(`wishlist_id = $${paramCount++}`);
      values.push(move_to_wishlist_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_at
    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    // Add item_id for WHERE clause
    values.push(item_id);

    const updateQuery = `UPDATE items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const updatedResult = await query(updateQuery, values);

    const updatedItem = updatedResult.rows[0];

    res.json({
      success: true,
      item: {
        id: updatedItem.id,
        product_name: updatedItem.product_name,
        brand: updatedItem.brand,
        price: updatedItem.price,
        sale_price: updatedItem.sale_price,
        image_path: updatedItem.image_path,
        wishlist_id: updatedItem.wishlist_id,
      },
    });
  } catch (error) {
    console.error('Error updating item via bookmarklet:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

/**
 * Get captured policy result by session ID (public endpoint)
 * Frontend polls this after user clicks bookmarklet
 */
export const getPolicyCaptureResult = async (req: Request, res: Response) => {
  try {
    const { session_id, token } = req.query;

    if (!session_id || !token) {
      return res.status(400).json({ error: 'session_id and token are required' });
    }

    // Verify token
    const userResult = await query(
      'SELECT id FROM users WHERE bookmarklet_token = $1',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const cached = policyCaptureCache.get(session_id as string);

    if (!cached) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    // Verify the session belongs to this user
    if (cached.userId !== userResult.rows[0].id) {
      return res.status(403).json({ error: 'Session does not belong to this user' });
    }

    res.json({
      success: true,
      result: cached.result,
      url: cached.url,
    });
  } catch (error) {
    console.error('Error getting policy capture result:', error);
    res.status(500).json({ error: 'Failed to get result' });
  }
};
