import { Response } from 'express';
import { query } from '../db.js';
import { WishlistAuthRequest } from '../types/index.js';
import {
  scrapePolicies,
  parseClientFetchedHtml,
  RETURN_POLICY_PATHS,
  PRICE_MATCH_PATHS,
} from '../services/policyScraperService.js';

export interface CommunityPolicy {
  id: number;
  domain: string;
  name: string;
  return_window_days?: number;
  free_returns: boolean;
  free_return_shipping: boolean;
  paid_return_cost?: number;
  restocking_fee_percent?: number;
  exchange_only: boolean;
  store_credit_only: boolean;
  receipt_required: boolean;
  original_packaging_required: boolean;
  final_sale_items: boolean;
  return_policy_url?: string;
  return_policy_notes?: string;
  price_match_window_days?: number;
  price_match_competitors: boolean;
  price_match_own_sales: boolean;
  price_match_policy_url?: string;
  price_match_policy_notes?: string;
  contributed_by?: number;
  verified_count: number;
  report_count: number;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
}

// Search community policies
export const searchCommunityPolicies = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;
    const searchLimit = Math.min(Number(limit) || 20, 50);
    const searchOffset = Number(offset) || 0;

    let queryText: string;
    let queryParams: (string | number)[];

    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      queryText = `
        SELECT *, COUNT(*) OVER() as total_count
        FROM community_store_policies
        WHERE LOWER(domain) LIKE $1 OR LOWER(name) LIKE $1
        ORDER BY verified_count DESC, name ASC
        LIMIT $2 OFFSET $3
      `;
      queryParams = [searchTerm, searchLimit, searchOffset];
    } else {
      queryText = `
        SELECT *, COUNT(*) OVER() as total_count
        FROM community_store_policies
        ORDER BY verified_count DESC, name ASC
        LIMIT $1 OFFSET $2
      `;
      queryParams = [searchLimit, searchOffset];
    }

    const result = await query(queryText, queryParams);
    const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : 0;

    // Remove total_count from each row
    const policies = result.rows.map(({ total_count, ...policy }) => policy);

    res.json({ policies, total });
  } catch (error) {
    console.error('Error searching community policies:', error);
    res.status(500).json({ error: 'Failed to search community policies' });
  }
};

// Get community policy by domain
export const getCommunityPolicyByDomain = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { domain } = req.params;

    const result = await query(
      `SELECT * FROM community_store_policies WHERE LOWER(domain) = LOWER($1)`,
      [domain]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Community policy not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching community policy:', error);
    res.status(500).json({ error: 'Failed to fetch community policy' });
  }
};

// Create/contribute a new community policy
export const createCommunityPolicy = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      domain,
      name,
      return_window_days,
      free_returns,
      free_return_shipping,
      paid_return_cost,
      restocking_fee_percent,
      exchange_only,
      store_credit_only,
      receipt_required,
      original_packaging_required,
      final_sale_items,
      return_policy_url,
      return_policy_notes,
      price_match_window_days,
      price_match_competitors,
      price_match_own_sales,
      price_match_policy_url,
      price_match_policy_notes,
    } = req.body;

    if (!domain || !name) {
      return res.status(400).json({ error: 'Domain and name are required' });
    }

    // Normalize domain (lowercase, remove www.)
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, '');

    const result = await query(
      `INSERT INTO community_store_policies (
        domain, name, return_window_days, free_returns, free_return_shipping,
        paid_return_cost, restocking_fee_percent, exchange_only, store_credit_only,
        receipt_required, original_packaging_required, final_sale_items,
        return_policy_url, return_policy_notes, price_match_window_days,
        price_match_competitors, price_match_own_sales, price_match_policy_url,
        price_match_policy_notes, contributed_by, verified_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 1)
      RETURNING *`,
      [
        normalizedDomain,
        name,
        return_window_days || null,
        free_returns || false,
        free_return_shipping || false,
        paid_return_cost || null,
        restocking_fee_percent || null,
        exchange_only || false,
        store_credit_only || false,
        receipt_required || false,
        original_packaging_required || false,
        final_sale_items || false,
        return_policy_url || null,
        return_policy_notes || null,
        price_match_window_days || null,
        price_match_competitors || false,
        price_match_own_sales || false,
        price_match_policy_url || null,
        price_match_policy_notes || null,
        userId,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: unknown) {
    console.error('Error creating community policy:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return res.status(409).json({ error: 'A community policy for this domain already exists' });
    }
    res.status(500).json({ error: 'Failed to create community policy' });
  }
};

// Update a community policy
export const updateCommunityPolicy = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const {
      name,
      return_window_days,
      free_returns,
      free_return_shipping,
      paid_return_cost,
      restocking_fee_percent,
      exchange_only,
      store_credit_only,
      receipt_required,
      original_packaging_required,
      final_sale_items,
      return_policy_url,
      return_policy_notes,
      price_match_window_days,
      price_match_competitors,
      price_match_own_sales,
      price_match_policy_url,
      price_match_policy_notes,
    } = req.body;

    // Check if user is the original contributor or policy has enough verifications
    const existingPolicy = await query(
      `SELECT contributed_by, verified_count FROM community_store_policies WHERE id = $1`,
      [id]
    );

    if (existingPolicy.rows.length === 0) {
      return res.status(404).json({ error: 'Community policy not found' });
    }

    const policy = existingPolicy.rows[0];
    const isContributor = policy.contributed_by === userId;
    const hasEnoughVerifications = policy.verified_count >= 5;

    if (!isContributor && !hasEnoughVerifications) {
      return res.status(403).json({
        error: 'Only the original contributor or policies with 5+ verifications can be updated'
      });
    }

    const result = await query(
      `UPDATE community_store_policies SET
        name = COALESCE($1, name),
        return_window_days = $2,
        free_returns = COALESCE($3, free_returns),
        free_return_shipping = COALESCE($4, free_return_shipping),
        paid_return_cost = $5,
        restocking_fee_percent = $6,
        exchange_only = COALESCE($7, exchange_only),
        store_credit_only = COALESCE($8, store_credit_only),
        receipt_required = COALESCE($9, receipt_required),
        original_packaging_required = COALESCE($10, original_packaging_required),
        final_sale_items = COALESCE($11, final_sale_items),
        return_policy_url = $12,
        return_policy_notes = $13,
        price_match_window_days = $14,
        price_match_competitors = COALESCE($15, price_match_competitors),
        price_match_own_sales = COALESCE($16, price_match_own_sales),
        price_match_policy_url = $17,
        price_match_policy_notes = $18,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $19
      RETURNING *`,
      [
        name,
        return_window_days,
        free_returns,
        free_return_shipping,
        paid_return_cost,
        restocking_fee_percent,
        exchange_only,
        store_credit_only,
        receipt_required,
        original_packaging_required,
        final_sale_items,
        return_policy_url,
        return_policy_notes,
        price_match_window_days,
        price_match_competitors,
        price_match_own_sales,
        price_match_policy_url,
        price_match_policy_notes,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating community policy:', error);
    res.status(500).json({ error: 'Failed to update community policy' });
  }
};

// Verify a community policy
export const verifyCommunityPolicy = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { is_accurate, notes } = req.body;

    if (typeof is_accurate !== 'boolean') {
      return res.status(400).json({ error: 'is_accurate (boolean) is required' });
    }

    // Upsert verification
    await query(
      `INSERT INTO community_policy_verifications (policy_id, user_id, is_accurate, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (policy_id, user_id)
       DO UPDATE SET is_accurate = $3, notes = $4, created_at = CURRENT_TIMESTAMP`,
      [id, userId, is_accurate, notes || null]
    );

    // Update verified_count on the policy
    if (is_accurate) {
      await query(
        `UPDATE community_store_policies
         SET verified_count = (
           SELECT COUNT(*) FROM community_policy_verifications
           WHERE policy_id = $1 AND is_accurate = true
         ),
         last_verified_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );
    }

    res.json({ success: true, message: 'Verification recorded' });
  } catch (error) {
    console.error('Error verifying community policy:', error);
    res.status(500).json({ error: 'Failed to verify community policy' });
  }
};

// Report a community policy
export const reportCommunityPolicy = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { reason, details } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const validReasons = ['outdated', 'incorrect', 'spam', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ error: 'Invalid reason. Must be one of: ' + validReasons.join(', ') });
    }

    await query(
      `INSERT INTO community_policy_reports (policy_id, user_id, reason, details)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, reason, details || null]
    );

    // Update report_count on the policy
    await query(
      `UPDATE community_store_policies
       SET report_count = (
         SELECT COUNT(*) FROM community_policy_reports WHERE policy_id = $1
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    res.json({ success: true, message: 'Report submitted' });
  } catch (error) {
    console.error('Error reporting community policy:', error);
    res.status(500).json({ error: 'Failed to report community policy' });
  }
};

// Import community policy to user's store
export const importCommunityPolicyToStore = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const { storeId } = req.params;
    const userId = req.user?.id;
    const { community_policy_id, overwrite_existing = false } = req.body;

    if (!community_policy_id) {
      return res.status(400).json({ error: 'community_policy_id is required' });
    }

    // Verify the store belongs to the user
    const storeResult = await query(
      `SELECT * FROM stores WHERE id = $1 AND user_id = $2`,
      [storeId, userId]
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Get the community policy
    const policyResult = await query(
      `SELECT * FROM community_store_policies WHERE id = $1`,
      [community_policy_id]
    );

    if (policyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Community policy not found' });
    }

    const communityPolicy = policyResult.rows[0];
    const store = storeResult.rows[0];

    // Build update query based on overwrite setting
    let updateFields: string[] = [];
    let updateValues: (string | number | boolean | null)[] = [];
    let paramCount = 1;

    const fieldsToImport = [
      'return_window_days',
      'free_returns',
      'free_return_shipping',
      'paid_return_cost',
      'restocking_fee_percent',
      'exchange_only',
      'store_credit_only',
      'receipt_required',
      'original_packaging_required',
      'final_sale_items',
      'return_policy_url',
      'price_match_window_days',
      'price_match_competitors',
      'price_match_own_sales',
      'price_match_policy_url',
    ];

    for (const field of fieldsToImport) {
      const communityValue = communityPolicy[field];
      const storeValue = store[field];

      // Import if overwrite is true, or if store value is null/false/0
      const shouldImport = overwrite_existing ||
        storeValue === null ||
        storeValue === false ||
        storeValue === 0;

      if (shouldImport && communityValue !== null && communityValue !== undefined) {
        updateFields.push(`${field} = $${paramCount++}`);
        updateValues.push(communityValue);
      }
    }

    // Also import notes if not already set
    if (!store.return_policy && communityPolicy.return_policy_notes) {
      updateFields.push(`return_policy = $${paramCount++}`);
      updateValues.push(communityPolicy.return_policy_notes);
    }
    if (!store.price_match_policy && communityPolicy.price_match_policy_notes) {
      updateFields.push(`price_match_policy = $${paramCount++}`);
      updateValues.push(communityPolicy.price_match_policy_notes);
    }

    if (updateFields.length === 0) {
      return res.json({
        success: true,
        message: 'No new data to import',
        store: store
      });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(storeId);
    updateValues.push(userId);

    const updateResult = await query(
      `UPDATE stores SET ${updateFields.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount}
       RETURNING *`,
      updateValues
    );

    res.json({
      success: true,
      message: 'Community policy imported successfully',
      store: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Error importing community policy:', error);
    res.status(500).json({ error: 'Failed to import community policy' });
  }
};

// Rate limiting for scrape endpoint (in-memory, per user)
const scrapeRateLimits = new Map<number, { count: number; resetTime: number }>();
const SCRAPE_RATE_LIMIT = 10; // 10 scrapes per hour
const SCRAPE_RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkScrapeRateLimit(userId: number): boolean {
  const now = Date.now();
  const userLimit = scrapeRateLimits.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    scrapeRateLimits.set(userId, { count: 1, resetTime: now + SCRAPE_RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= SCRAPE_RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Scrape policies from a domain
export const scrapePolicyFromDomain = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;
    const cleanDomain = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

    if (!domainRegex.test(cleanDomain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    // Check rate limit
    if (userId && !checkScrapeRateLimit(userId)) {
      return res.status(429).json({
        error: 'Rate limit exceeded. You can scrape up to 10 domains per hour.',
        retry_after: 'Try again in an hour'
      });
    }

    // Perform the scrape
    const result = await scrapePolicies(cleanDomain);

    res.json(result);
  } catch (error) {
    console.error('Error scraping policy:', error);
    res.status(500).json({ error: 'Failed to scrape policy information' });
  }
};

// Get policy URL paths for client-side fetching
export const getPolicyPaths = async (_req: WishlistAuthRequest, res: Response) => {
  res.json({
    return_policy_paths: RETURN_POLICY_PATHS,
    price_match_paths: PRICE_MATCH_PATHS,
  });
};

// Parse HTML that was fetched client-side
export const parseClientHtml = async (req: WishlistAuthRequest, res: Response) => {
  try {
    const {
      return_policy_html,
      return_policy_url,
      price_match_policy_html,
      price_match_policy_url,
    } = req.body;

    if (!return_policy_html && !price_match_policy_html) {
      return res.status(400).json({ error: 'At least one HTML content is required' });
    }

    // Validate HTML size (limit to 1MB each)
    const MAX_HTML_SIZE = 1024 * 1024;
    if (return_policy_html && return_policy_html.length > MAX_HTML_SIZE) {
      return res.status(400).json({ error: 'Return policy HTML too large' });
    }
    if (price_match_policy_html && price_match_policy_html.length > MAX_HTML_SIZE) {
      return res.status(400).json({ error: 'Price match policy HTML too large' });
    }

    const result = parseClientFetchedHtml(
      return_policy_html || null,
      return_policy_url || null,
      price_match_policy_html || null,
      price_match_policy_url || null
    );

    res.json(result);
  } catch (error) {
    console.error('Error parsing client HTML:', error);
    res.status(500).json({ error: 'Failed to parse HTML content' });
  }
};
