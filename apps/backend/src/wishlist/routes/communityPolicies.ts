import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  searchCommunityPolicies,
  getCommunityPolicyByDomain,
  createCommunityPolicy,
  updateCommunityPolicy,
  verifyCommunityPolicy,
  reportCommunityPolicy,
  importCommunityPolicyToStore,
  scrapePolicyFromDomain,
  getPolicyPaths,
  parseClientHtml,
} from '../controllers/communityPolicyController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /community-policies - Search community policies
router.get('/', searchCommunityPolicies);

// GET /community-policies/domain/:domain - Get policy by domain
router.get('/domain/:domain', getCommunityPolicyByDomain);

// POST /community-policies - Create a new community policy
router.post('/', createCommunityPolicy);

// PUT /community-policies/:id - Update a community policy
router.put('/:id', updateCommunityPolicy);

// POST /community-policies/:id/verify - Verify a community policy
router.post('/:id/verify', verifyCommunityPolicy);

// POST /community-policies/:id/report - Report a community policy
router.post('/:id/report', reportCommunityPolicy);

// POST /community-policies/import/:storeId - Import community policy to user's store
router.post('/import/:storeId', importCommunityPolicyToStore);

// POST /community-policies/scrape - Scrape policies from a domain (server-side)
router.post('/scrape', scrapePolicyFromDomain);

// GET /community-policies/policy-paths - Get URL paths for client-side fetching
router.get('/policy-paths', getPolicyPaths);

// POST /community-policies/parse-html - Parse HTML fetched by client
router.post('/parse-html', parseClientHtml);

export default router;
