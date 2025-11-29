import { Request, Response } from 'express';
import { query } from '../db.js';
import { WishlistAuthRequest } from '../types/index.js';
import { scrapeProduct } from '../services/scraperService.js';
import { downloadAndSaveImage } from '../utils/imageDownloader.js';
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
    const { token, url, wishlist_id } = req.body;

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

    // Scrape product data from URL
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
