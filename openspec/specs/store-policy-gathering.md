# Store Policy Gathering Feature Specification

## Overview

Add intelligent store policy gathering to the Wishlist application, enabling users to quickly populate store return and price match policies through multiple methods: a crowdsourced community database, web scraping, and LLM-powered extraction.

## Goals

1. **Community Database**: Build a shared repository of store policies that all users contribute to and benefit from
2. **Web Scraping**: Automatically fetch and parse policy pages from store websites
3. **LLM Extraction**: Use AI to extract structured policy data from unstructured text or URLs
4. **Accuracy**: Ensure policy data is accurate with user verification and freshness tracking
5. **Ease of Use**: Make policy gathering as simple as pasting a URL or clicking "Import"

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Community   │  │ Auto-Import │  │ Manual Paste + LLM      │  │
│  │ Database    │  │ (Scraper)   │  │ Extraction              │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend API Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Community   │  │ Scraper     │  │ LLM Service             │  │
│  │ Policy API  │  │ Service     │  │ (Claude/OpenAI)         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Storage                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ community_store_policies (shared across all users)         │ │
│  │ stores (user-specific, can override community data)        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 1: Community Database

### User Stories
- As a user, I want to see if a store's policies already exist in the community database
- As a user, I want to import community policies into my store with one click
- As a user, I want to contribute my store policies back to the community
- As a user, I want to see when community policies were last updated
- As a user, I want to report outdated or incorrect community policies

### Data Model

#### `community_store_policies` Table
```sql
CREATE TABLE community_store_policies (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,

  -- Return policy fields
  return_window_days INTEGER,
  free_returns BOOLEAN DEFAULT false,
  free_return_shipping BOOLEAN DEFAULT false,
  paid_return_cost DECIMAL(10, 2),
  restocking_fee_percent INTEGER,
  exchange_only BOOLEAN DEFAULT false,
  store_credit_only BOOLEAN DEFAULT false,
  receipt_required BOOLEAN DEFAULT false,
  original_packaging_required BOOLEAN DEFAULT false,
  final_sale_items BOOLEAN DEFAULT false,
  return_policy_url TEXT,
  return_policy_notes TEXT,

  -- Price match policy fields
  price_match_window_days INTEGER,
  price_match_competitors BOOLEAN DEFAULT false,
  price_match_own_sales BOOLEAN DEFAULT false,
  price_match_policy_url TEXT,
  price_match_policy_notes TEXT,

  -- Metadata
  contributed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  last_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_community_policies_domain ON community_store_policies(domain);
```

#### `community_policy_verifications` Table
```sql
CREATE TABLE community_policy_verifications (
  id SERIAL PRIMARY KEY,
  policy_id INTEGER NOT NULL REFERENCES community_store_policies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_accurate BOOLEAN NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(policy_id, user_id)
);
```

#### `community_policy_reports` Table
```sql
CREATE TABLE community_policy_reports (
  id SERIAL PRIMARY KEY,
  policy_id INTEGER NOT NULL REFERENCES community_store_policies(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL, -- 'outdated', 'incorrect', 'spam', 'other'
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

#### `GET /api/wishlist/community-policies`
Search community policies by domain or name.

**Query Parameters:**
- `search`: Search term (matches domain or name)
- `limit`: Max results (default 20)
- `offset`: Pagination offset

**Response:**
```json
{
  "policies": [
    {
      "id": 1,
      "domain": "amazon.com",
      "name": "Amazon",
      "return_window_days": 30,
      "free_returns": true,
      "free_return_shipping": false,
      "paid_return_cost": null,
      "price_match_window_days": null,
      "price_match_competitors": false,
      "verified_count": 45,
      "report_count": 2,
      "last_verified_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-10T08:00:00Z"
    }
  ],
  "total": 1
}
```

#### `GET /api/wishlist/community-policies/:domain`
Get community policy for a specific domain.

#### `POST /api/wishlist/community-policies`
Contribute a new community policy (requires authentication).

**Request:**
```json
{
  "domain": "target.com",
  "name": "Target",
  "return_window_days": 90,
  "free_returns": true,
  "free_return_shipping": true,
  "return_policy_url": "https://www.target.com/returns",
  "price_match_window_days": 14,
  "price_match_competitors": true,
  "price_match_own_sales": true,
  "price_match_policy_url": "https://www.target.com/price-match"
}
```

#### `PUT /api/wishlist/community-policies/:id`
Update a community policy (must be original contributor or have sufficient verifications).

#### `POST /api/wishlist/community-policies/:id/verify`
Verify a community policy is accurate.

**Request:**
```json
{
  "is_accurate": true,
  "notes": "Confirmed on their website today"
}
```

#### `POST /api/wishlist/community-policies/:id/report`
Report an issue with a community policy.

**Request:**
```json
{
  "reason": "outdated",
  "details": "Return window changed from 30 to 15 days"
}
```

#### `POST /api/wishlist/stores/:id/import-community`
Import community policy data into user's store.

**Request:**
```json
{
  "community_policy_id": 1,
  "overwrite_existing": false
}
```

### Frontend Components

#### `CommunityPolicySearch.tsx`
Modal/drawer component for searching and importing community policies:
- Search input with debounced search
- Results list showing store name, domain, key policy highlights
- Verification count badge
- "Last updated" timestamp
- "Import" button for each result
- "Report" link for outdated policies

#### `ContributePolicyModal.tsx`
Modal for contributing policies to community:
- Pre-fills from user's store data
- Checkbox to opt-in to contribution
- Terms of sharing agreement

#### `PolicyVerificationPrompt.tsx`
Small prompt shown after user imports community data:
- "Is this policy still accurate?"
- Quick yes/no buttons
- Option to add notes

### UI Flow

1. **On Store Creation/Edit:**
   - After entering domain, show "Check community database" link
   - If match found, show preview with "Import" button
   - If no match, show "Be the first to contribute!"

2. **On Import:**
   - Show confirmation with data preview
   - User can toggle which fields to import
   - After import, prompt for verification

3. **On Contribution:**
   - From store edit page, "Share with community" button
   - Confirmation modal with preview
   - Thank you message with verification count

---

## Phase 2: Web Scraping

### User Stories
- As a user, I want to auto-fetch policies by entering a store's URL
- As a user, I want the system to find the return/price match policy pages
- As a user, I want to review scraped data before saving

### Technical Approach

#### Scraper Service Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ URL Input       │ ──▶ │ Page Fetcher    │ ──▶ │ Content Parser  │
│ (store domain)  │     │ (Puppeteer/     │     │ (Cheerio +      │
└─────────────────┘     │  Playwright)    │     │  heuristics)    │
                        └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐              │
                        │ Structured      │ ◀────────────┘
                        │ Policy Data     │
                        └─────────────────┘
```

#### Policy Page Discovery
1. Try common policy URLs:
   - `/return-policy`
   - `/returns`
   - `/return-exchange`
   - `/customer-service/returns`
   - `/help/returns`
   - `/price-match`
   - `/price-match-guarantee`
   - `/price-adjustment`

2. Search site for policy links:
   - Find footer links containing "return", "policy", "price match"
   - Search sitemap if available

3. Google site search fallback:
   - `site:example.com return policy`

#### Content Extraction Heuristics
- Look for numbers followed by "day" (return window)
- Look for currency amounts (return fees)
- Look for percentages (restocking fees)
- Look for keywords: "free", "no cost", "prepaid label", "exchange only"
- Look for negative keywords: "final sale", "non-returnable"

### API Endpoints

#### `POST /api/wishlist/scrape-policy`
Scrape policy information from a store website.

**Request:**
```json
{
  "domain": "bestbuy.com",
  "include_price_match": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "return_policy": {
      "url": "https://www.bestbuy.com/return-policy",
      "return_window_days": 15,
      "free_returns": true,
      "extracted_text": "Most products can be returned within 15 days...",
      "confidence": 0.85
    },
    "price_match_policy": {
      "url": "https://www.bestbuy.com/price-match-guarantee",
      "price_match_competitors": true,
      "price_match_window_days": 15,
      "extracted_text": "We'll match the product prices of competitors...",
      "confidence": 0.90
    }
  },
  "warnings": ["Could not determine restocking fee information"]
}
```

### Backend Implementation

#### `scraperService.ts`
```typescript
interface ScrapedPolicy {
  url: string;
  return_window_days?: number;
  free_returns?: boolean;
  free_return_shipping?: boolean;
  paid_return_cost?: number;
  restocking_fee_percent?: number;
  exchange_only?: boolean;
  store_credit_only?: boolean;
  receipt_required?: boolean;
  original_packaging_required?: boolean;
  final_sale_items?: boolean;
  price_match_window_days?: number;
  price_match_competitors?: boolean;
  price_match_own_sales?: boolean;
  extracted_text: string;
  confidence: number;
}

interface ScraperResult {
  success: boolean;
  data?: {
    return_policy?: ScrapedPolicy;
    price_match_policy?: ScrapedPolicy;
  };
  warnings?: string[];
  error?: string;
}
```

### Rate Limiting & Caching
- Cache scraped results for 24 hours per domain
- Rate limit: 10 scrapes per user per hour
- Queue system for concurrent scrape requests
- Respect robots.txt where possible

### Frontend Integration

#### `AutoImportButton.tsx`
Button component that triggers scraping:
- Loading state with progress indicator
- Shows "Checking [domain]..."
- On success, opens review modal
- On failure, shows error with manual fallback option

#### `ScrapedPolicyReview.tsx`
Modal for reviewing scraped data:
- Shows extracted data in form fields
- Highlights confidence levels (green/yellow/red)
- Shows source URL with link to verify
- Shows relevant extracted text snippets
- User can edit before saving

---

## Phase 3: LLM-Powered Extraction

### User Stories
- As a user, I want to paste policy text and have it automatically parsed
- As a user, I want to paste a policy URL and have it extracted via AI
- As a user, I want to review AI-extracted data before saving
- As a user, I want the AI to handle various policy formats intelligently

### Technical Approach

#### LLM Service Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ User Input      │ ──▶ │ Content         │ ──▶ │ LLM API         │
│ (URL or text)   │     │ Preprocessor    │     │ (Claude/OpenAI) │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐              │
                        │ Structured      │ ◀────────────┘
                        │ JSON Response   │
                        └─────────────────┘
```

#### LLM Prompt Strategy

**System Prompt:**
```
You are an expert at extracting store return and price match policy information.
Given policy text, extract structured data in JSON format.

Extract the following fields if present:
- return_window_days: number of days for returns (null if not found)
- free_returns: boolean, true if returns are free
- free_return_shipping: boolean, true if return shipping is free/prepaid
- paid_return_cost: decimal cost for returns (null if free or not found)
- restocking_fee_percent: integer percentage (null if none or not found)
- exchange_only: boolean, true if only exchanges allowed (no refunds)
- store_credit_only: boolean, true if refunds are store credit only
- receipt_required: boolean, true if receipt/proof of purchase required
- original_packaging_required: boolean, true if original packaging required
- final_sale_items: boolean, true if store has final sale/non-returnable items
- price_match_window_days: number of days for price matching after purchase
- price_match_competitors: boolean, true if they match competitor prices
- price_match_own_sales: boolean, true if they match their own sales/price drops

Return ONLY valid JSON. Use null for fields that cannot be determined.
Be conservative - only set true/false if explicitly stated.
```

**User Prompt Template:**
```
Extract policy information from the following text:

---
{policy_text}
---

Return the extracted data as JSON.
```

### API Endpoints

#### `POST /api/wishlist/extract-policy`
Extract policy using LLM.

**Request:**
```json
{
  "input_type": "text", // or "url"
  "content": "Returns accepted within 30 days of purchase. Free returns with prepaid label. Restocking fee of 15% on opened electronics...",
  "policy_type": "return" // or "price_match" or "both"
}
```

**Response:**
```json
{
  "success": true,
  "extracted": {
    "return_window_days": 30,
    "free_returns": true,
    "free_return_shipping": true,
    "paid_return_cost": null,
    "restocking_fee_percent": 15,
    "exchange_only": false,
    "store_credit_only": false,
    "receipt_required": null,
    "original_packaging_required": null,
    "final_sale_items": null,
    "price_match_window_days": null,
    "price_match_competitors": null,
    "price_match_own_sales": null
  },
  "confidence": {
    "overall": 0.85,
    "fields": {
      "return_window_days": 0.95,
      "free_returns": 0.90,
      "restocking_fee_percent": 0.80
    }
  },
  "raw_response": "..." // For debugging
}
```

### Backend Implementation

#### `llmPolicyService.ts`
```typescript
interface LLMExtractionResult {
  success: boolean;
  extracted?: ExtractedPolicy;
  confidence?: {
    overall: number;
    fields: Record<string, number>;
  };
  error?: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

class LLMPolicyService {
  constructor(private apiKey: string, private provider: 'claude' | 'openai') {}

  async extractFromText(text: string, policyType: string): Promise<LLMExtractionResult>;
  async extractFromUrl(url: string, policyType: string): Promise<LLMExtractionResult>;
}
```

### Cost Management
- Cache LLM results by content hash for 7 days
- Limit text input to 10,000 characters
- Use cheaper models for simple extractions (haiku/gpt-3.5)
- Rate limit: 20 extractions per user per day
- Show estimated cost before extraction (optional)

### Frontend Components

#### `PolicyExtractorModal.tsx`
Modal with tabbed interface:
- **Tab 1: Paste Text**
  - Large textarea for pasting policy text
  - Character count with limit warning
  - "Extract" button

- **Tab 2: From URL**
  - URL input field
  - "Fetch & Extract" button
  - Shows fetching progress

#### `ExtractionResultsReview.tsx`
Review panel showing:
- Extracted fields in editable form
- Confidence indicators per field
- "Apply to Store" button
- "Extract Again" for retry
- Option to contribute to community database

---

## Implementation Priority

### MVP (Phase 1A): Basic Community Database
1. Create `community_store_policies` table
2. Implement search and import endpoints
3. Add "Search Community" UI to store form
4. One-click import functionality

### Phase 1B: Community Contributions
1. Create verification and report tables
2. Contribute endpoint with validation
3. Verification prompts after import
4. Report functionality

### Phase 2: Web Scraping
1. Implement scraper service with Puppeteer
2. Policy URL discovery logic
3. Content extraction heuristics
4. Review UI for scraped data

### Phase 3: LLM Extraction
1. LLM service with Claude/OpenAI
2. Prompt engineering for accuracy
3. Paste text extraction UI
4. URL fetch + extraction flow

---

## Security Considerations

### Community Database
- Rate limit contributions (5 per hour per user)
- Require email verification for contributions
- Flag suspicious patterns (bulk contributions, same IP)
- Admin review queue for reported policies

### Web Scraping
- Validate URLs before fetching
- Sanitize all extracted content
- Block internal/local URLs
- Set strict timeouts
- Don't follow redirects to different domains

### LLM Extraction
- Sanitize input text (no prompt injection)
- Validate JSON response format
- Don't expose raw LLM responses to frontend
- Log all extractions for abuse monitoring

---

## Success Metrics

### Phase 1 (Community)
- Number of community policies contributed
- Import rate (imports / store creations)
- Verification rate
- Report resolution time

### Phase 2 (Scraping)
- Scrape success rate by domain
- Extraction accuracy (user corrections)
- Cache hit rate

### Phase 3 (LLM)
- Extraction accuracy
- Average confidence scores
- User acceptance rate (apply vs discard)
- Cost per extraction

---

## Future Enhancements

1. **Policy Change Alerts**: Notify users when community policies are updated
2. **Bulk Import**: Import policies for multiple stores at once
3. **Browser Extension**: Extract policies while browsing store websites
4. **API for Partners**: Allow other apps to query community database
5. **Machine Learning**: Train custom model on verified policies for better extraction
6. **Multi-language Support**: Extract policies in different languages
