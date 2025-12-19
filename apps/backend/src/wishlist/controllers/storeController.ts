import { Response } from 'express';
import { query } from '../db.js';
import { WishlistAuthRequest } from '../types/index.js';

// Get all stores for the current user
export const getAllStores = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await query(
      `SELECT * FROM stores WHERE user_id = $1 ORDER BY name ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (_error) {
    console.error('Error fetching stores:', _error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
};

// Get a single store by ID
export const getStore = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      `SELECT * FROM stores WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json(result.rows[0]);
  } catch (_error) {
    console.error('Error fetching store:', _error);
    res.status(500).json({ error: 'Failed to fetch store' });
  }
};

// Get store by name (for looking up policies when viewing items)
export const getStoreByName = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const userId = req.user?.id;

    const result = await query(
      `SELECT * FROM stores WHERE LOWER(name) = LOWER($1) AND user_id = $2`,
      [name, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json(result.rows[0]);
  } catch (_error) {
    console.error('Error fetching store by name:', _error);
    res.status(500).json({ error: 'Failed to fetch store' });
  }
};

// Create a new store
export const createStore = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      name,
      domain,
      return_policy,
      return_policy_url,
      return_window_days,
      price_match_policy,
      price_match_policy_url,
      price_match_window_days,
      notes,
      // Structured return policy fields
      free_returns,
      free_return_shipping,
      paid_return_cost,
      restocking_fee_percent,
      exchange_only,
      store_credit_only,
      receipt_required,
      original_packaging_required,
      final_sale_items,
      // Structured price match fields
      price_match_competitors,
      price_match_own_sales,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Store name is required' });
    }

    const result = await query(
      `INSERT INTO stores (user_id, name, domain, return_policy, return_policy_url, return_window_days, price_match_policy, price_match_policy_url, price_match_window_days, notes,
        free_returns, free_return_shipping, paid_return_cost, restocking_fee_percent, exchange_only, store_credit_only,
        receipt_required, original_packaging_required, final_sale_items, price_match_competitors, price_match_own_sales)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING *`,
      [
        userId,
        name,
        domain || null,
        return_policy || null,
        return_policy_url || null,
        return_window_days || null,
        price_match_policy || null,
        price_match_policy_url || null,
        price_match_window_days || null,
        notes || null,
        free_returns || false,
        free_return_shipping || false,
        paid_return_cost || null,
        restocking_fee_percent || null,
        exchange_only || false,
        store_credit_only || false,
        receipt_required || false,
        original_packaging_required || false,
        final_sale_items || false,
        price_match_competitors || false,
        price_match_own_sales || false,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    console.error('Error creating store:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return res.status(409).json({ error: 'Store with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create store' });
  }
};

// Update a store
export const updateStore = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const {
      name,
      domain,
      return_policy,
      return_policy_url,
      return_window_days,
      price_match_policy,
      price_match_policy_url,
      price_match_window_days,
      notes,
      // Structured return policy fields
      free_returns,
      free_return_shipping,
      paid_return_cost,
      restocking_fee_percent,
      exchange_only,
      store_credit_only,
      receipt_required,
      original_packaging_required,
      final_sale_items,
      // Structured price match fields
      price_match_competitors,
      price_match_own_sales,
    } = req.body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (domain !== undefined) {
      updates.push(`domain = $${paramCount++}`);
      values.push(domain || null);
    }
    if (return_policy !== undefined) {
      updates.push(`return_policy = $${paramCount++}`);
      values.push(return_policy || null);
    }
    if (return_policy_url !== undefined) {
      updates.push(`return_policy_url = $${paramCount++}`);
      values.push(return_policy_url || null);
    }
    if (return_window_days !== undefined) {
      updates.push(`return_window_days = $${paramCount++}`);
      values.push(return_window_days || null);
    }
    if (price_match_policy !== undefined) {
      updates.push(`price_match_policy = $${paramCount++}`);
      values.push(price_match_policy || null);
    }
    if (price_match_policy_url !== undefined) {
      updates.push(`price_match_policy_url = $${paramCount++}`);
      values.push(price_match_policy_url || null);
    }
    if (price_match_window_days !== undefined) {
      updates.push(`price_match_window_days = $${paramCount++}`);
      values.push(price_match_window_days || null);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes || null);
    }
    // Structured return policy fields
    if (free_returns !== undefined) {
      updates.push(`free_returns = $${paramCount++}`);
      values.push(free_returns);
    }
    if (free_return_shipping !== undefined) {
      updates.push(`free_return_shipping = $${paramCount++}`);
      values.push(free_return_shipping);
    }
    if (paid_return_cost !== undefined) {
      updates.push(`paid_return_cost = $${paramCount++}`);
      values.push(paid_return_cost || null);
    }
    if (restocking_fee_percent !== undefined) {
      updates.push(`restocking_fee_percent = $${paramCount++}`);
      values.push(restocking_fee_percent || null);
    }
    if (exchange_only !== undefined) {
      updates.push(`exchange_only = $${paramCount++}`);
      values.push(exchange_only);
    }
    if (store_credit_only !== undefined) {
      updates.push(`store_credit_only = $${paramCount++}`);
      values.push(store_credit_only);
    }
    if (receipt_required !== undefined) {
      updates.push(`receipt_required = $${paramCount++}`);
      values.push(receipt_required);
    }
    if (original_packaging_required !== undefined) {
      updates.push(`original_packaging_required = $${paramCount++}`);
      values.push(original_packaging_required);
    }
    if (final_sale_items !== undefined) {
      updates.push(`final_sale_items = $${paramCount++}`);
      values.push(final_sale_items);
    }
    // Structured price match fields
    if (price_match_competitors !== undefined) {
      updates.push(`price_match_competitors = $${paramCount++}`);
      values.push(price_match_competitors);
    }
    if (price_match_own_sales !== undefined) {
      updates.push(`price_match_own_sales = $${paramCount++}`);
      values.push(price_match_own_sales);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    values.push(userId);

    const result = await query(
      `UPDATE stores SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json(result.rows[0]);
  } catch (error: unknown) {
    console.error('Error updating store:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return res.status(409).json({ error: 'Store with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update store' });
  }
};

// Delete a store
export const deleteStore = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await query(
      `DELETE FROM stores WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json({ message: 'Store deleted successfully' });
  } catch (_error) {
    console.error('Error deleting store:', _error);
    res.status(500).json({ error: 'Failed to delete store' });
  }
};
