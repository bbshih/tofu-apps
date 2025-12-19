import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB limit
const REQUEST_TIMEOUT = 15000; // 15 seconds

// Common return policy URL patterns - exported for client-side use
export const RETURN_POLICY_PATHS = [
  '/return-policy',
  '/returns-policy',
  '/returns',
  '/return-exchange',
  '/returns-exchanges',
  '/returns-and-exchanges',
  '/customer-service/returns',
  '/help/returns',
  '/shipping-returns',
  '/shipping-and-returns',
  '/refund-policy',
  '/refunds',
  '/return-refund-policy',
  '/policies/refund-policy',
  '/policies/return-policy',
  '/policies/returns',
  '/pages/return-policy',
  '/pages/returns',
  '/pages/refund-policy',
  '/info/returns',
  '/support/returns',
  '/faq/returns',
  '/help/shipping-returns',
];

// Common price match policy URL patterns - exported for client-side use
export const PRICE_MATCH_PATHS = [
  '/price-match',
  '/price-match-guarantee',
  '/price-match-policy',
  '/price-adjustment',
  '/price-matching',
  '/low-price-guarantee',
  '/best-price-guarantee',
  '/customer-service/price-match',
  '/help/price-match',
  '/pages/price-match',
];

export interface ScrapedPolicyData {
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
  return_policy_url?: string;
  return_policy_notes?: string;
  price_match_window_days?: number;
  price_match_competitors?: boolean;
  price_match_own_sales?: boolean;
  price_match_policy_url?: string;
  price_match_policy_notes?: string;
}

export interface ScrapedField {
  value: string | number | boolean | null;
  confidence: number;
  source?: string;
}

export interface PolicyScrapeResult {
  success: boolean;
  data?: ScrapedPolicyData;
  return_policy_url?: string;
  price_match_policy_url?: string;
  extracted_text?: {
    return_policy?: string;
    price_match_policy?: string;
  };
  confidence?: {
    overall: number;
    fields: Record<string, number>;
  };
  warnings?: string[];
  error?: string;
}

// Simple in-memory cache (24 hour TTL)
const policyCache = new Map<string, { data: PolicyScrapeResult; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCachedResult(domain: string): PolicyScrapeResult | null {
  const cached = policyCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  policyCache.delete(domain);
  return null;
}

function setCachedResult(domain: string, data: PolicyScrapeResult): void {
  policyCache.set(domain, { data, timestamp: Date.now() });
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: REQUEST_TIMEOUT,
      maxContentLength: MAX_RESPONSE_SIZE,
      maxBodyLength: MAX_RESPONSE_SIZE,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });
    return response.data;
  } catch (error) {
    console.log(`Failed to fetch ${url}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

async function findPolicyUrl(baseUrl: string, paths: string[]): Promise<string | null> {
  // Try each path
  for (const path of paths) {
    const url = `${baseUrl}${path}`;
    const html = await fetchPage(url);
    if (html && html.length > 1000) {
      // Basic check that we got a real page
      return url;
    }
  }
  return null;
}

async function findPolicyUrlFromHomepage(baseUrl: string, keywords: string[]): Promise<string | null> {
  try {
    const html = await fetchPage(baseUrl);
    if (!html) return null;

    const $ = cheerio.load(html);

    // Look for links in footer or navigation containing keywords
    const links: string[] = [];
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().toLowerCase();

      if (href && keywords.some(kw => text.includes(kw) || href.toLowerCase().includes(kw))) {
        links.push(href);
      }
    });

    // Try each found link
    for (const link of links.slice(0, 5)) { // Limit to first 5 matches
      let url = link;
      if (link.startsWith('/')) {
        url = `${baseUrl}${link}`;
      } else if (!link.startsWith('http')) {
        url = `${baseUrl}/${link}`;
      }

      // Verify it's on the same domain
      try {
        const linkUrl = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        if (linkUrl.hostname !== baseUrlObj.hostname) continue;
      } catch {
        continue;
      }

      const pageHtml = await fetchPage(url);
      if (pageHtml && pageHtml.length > 1000) {
        return url;
      }
    }
  } catch (error) {
    console.log('Error searching homepage for policy links:', error);
  }

  return null;
}

function extractReturnWindowDays(text: string): { value: number | null; confidence: number } {
  const patterns = [
    // "30 days", "30-day", "30 day"
    /(\d+)\s*[-]?\s*days?(?:\s+(?:return|refund|exchange))?/gi,
    // "within 30 days"
    /within\s+(\d+)\s*days?/gi,
    // "30 day return"
    /(\d+)\s*[-]?\s*day\s+(?:return|refund|exchange)/gi,
  ];

  const matches: number[] = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const days = parseInt(match[1], 10);
      if (days > 0 && days <= 365) {
        matches.push(days);
      }
    }
  }

  if (matches.length === 0) {
    return { value: null, confidence: 0 };
  }

  // Return most common value
  const counts = matches.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const mostCommon = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const confidence = Math.min(0.9, 0.5 + (parseInt(mostCommon[1].toString()) * 0.1));

  return { value: parseInt(mostCommon[0], 10), confidence };
}

function extractPriceMatchWindowDays(text: string): { value: number | null; confidence: number } {
  const patterns = [
    /(\d+)\s*[-]?\s*days?\s+(?:after|of|from)\s+(?:purchase|buying)/gi,
    /within\s+(\d+)\s*days?\s+(?:of|after)\s+(?:purchase|buying)/gi,
    /price\s+(?:match|adjustment).*?(\d+)\s*days?/gi,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const days = parseInt(match[1], 10);
      if (days > 0 && days <= 90) {
        return { value: days, confidence: 0.7 };
      }
    }
  }

  return { value: null, confidence: 0 };
}

function extractBoolean(text: string, positivePatterns: RegExp[], negativePatterns: RegExp[]): { value: boolean | null; confidence: number } {
  const textLower = text.toLowerCase();

  let positiveScore = 0;
  let negativeScore = 0;

  for (const pattern of positivePatterns) {
    if (pattern.test(textLower)) {
      positiveScore++;
    }
  }

  for (const pattern of negativePatterns) {
    if (pattern.test(textLower)) {
      negativeScore++;
    }
  }

  if (positiveScore > negativeScore) {
    return { value: true, confidence: Math.min(0.85, 0.5 + (positiveScore * 0.15)) };
  } else if (negativeScore > positiveScore) {
    return { value: false, confidence: Math.min(0.85, 0.5 + (negativeScore * 0.15)) };
  }

  return { value: null, confidence: 0 };
}

function extractFreeReturns(text: string): { value: boolean | null; confidence: number } {
  return extractBoolean(
    text,
    [
      /free\s+returns?/i,
      /returns?\s+(?:are\s+)?free/i,
      /no\s+(?:cost|charge|fee)\s+(?:for\s+)?returns?/i,
      /complimentary\s+returns?/i,
    ],
    [
      /return\s+(?:fee|cost|charge)/i,
      /\$\d+(?:\.\d{2})?\s+(?:return|shipping)/i,
      /deducted\s+from\s+(?:your\s+)?refund/i,
    ]
  );
}

function extractFreeReturnShipping(text: string): { value: boolean | null; confidence: number } {
  return extractBoolean(
    text,
    [
      /free\s+(?:return\s+)?shipping/i,
      /prepaid\s+(?:return\s+)?label/i,
      /(?:we|we'll)\s+(?:provide|send|email)\s+(?:a\s+)?(?:prepaid\s+)?(?:return\s+)?label/i,
      /shipping\s+(?:is\s+)?(?:on\s+us|free)/i,
      /no\s+(?:shipping\s+)?(?:cost|charge)\s+(?:for\s+)?returns?/i,
    ],
    [
      /(?:you|customer)\s+(?:pay|responsible)\s+(?:for\s+)?(?:return\s+)?shipping/i,
      /shipping\s+(?:fee|cost|charge)/i,
      /deducted\s+(?:from|for)\s+(?:return\s+)?shipping/i,
    ]
  );
}

function extractRestockingFee(text: string): { value: number | null; confidence: number } {
  const patterns = [
    /(\d+)%?\s*(?:percent\s+)?restocking\s+fee/i,
    /restocking\s+fee\s+(?:of\s+)?(\d+)%/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const fee = parseInt(match[1], 10);
      if (fee > 0 && fee <= 50) {
        return { value: fee, confidence: 0.8 };
      }
    }
  }

  return { value: null, confidence: 0 };
}

function extractPaidReturnCost(text: string): { value: number | null; confidence: number } {
  const patterns = [
    /\$(\d+(?:\.\d{2})?)\s+(?:return|shipping)\s+(?:fee|cost)/i,
    /(?:return|shipping)\s+(?:fee|cost)\s+(?:of\s+)?\$(\d+(?:\.\d{2})?)/i,
    /deduct(?:ed)?\s+\$(\d+(?:\.\d{2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const cost = parseFloat(match[1]);
      if (cost > 0 && cost < 100) {
        return { value: cost, confidence: 0.75 };
      }
    }
  }

  return { value: null, confidence: 0 };
}

function extractExchangeOnly(text: string): { value: boolean | null; confidence: number } {
  return extractBoolean(
    text,
    [
      /exchange\s+only/i,
      /exchanges?\s+(?:are\s+)?(?:only|allowed)/i,
      /no\s+refunds?,?\s+(?:only\s+)?exchanges?/i,
    ],
    [
      /refund\s+or\s+exchange/i,
      /full\s+refund/i,
      /money\s+back/i,
    ]
  );
}

function extractStoreCreditOnly(text: string): { value: boolean | null; confidence: number } {
  return extractBoolean(
    text,
    [
      /store\s+credit\s+only/i,
      /(?:refund|return)\s+(?:as|for|in)\s+store\s+credit/i,
      /no\s+(?:cash|monetary)\s+refunds?/i,
    ],
    [
      /(?:full|original)\s+(?:payment|refund)/i,
      /refund\s+to\s+(?:original|your)\s+(?:payment|card)/i,
    ]
  );
}

function extractReceiptRequired(text: string): { value: boolean | null; confidence: number } {
  return extractBoolean(
    text,
    [
      /receipt\s+required/i,
      /(?:must|need)\s+(?:have|provide|show)\s+(?:a\s+)?receipt/i,
      /proof\s+of\s+purchase\s+required/i,
      /original\s+receipt/i,
    ],
    [
      /(?:with\s+or\s+)?without\s+(?:a\s+)?receipt/i,
      /no\s+receipt\s+(?:needed|required)/i,
    ]
  );
}

function extractOriginalPackaging(text: string): { value: boolean | null; confidence: number } {
  return extractBoolean(
    text,
    [
      /original\s+(?:packaging|box|container)\s+required/i,
      /(?:must|need)\s+(?:be\s+)?(?:in\s+)?original\s+(?:packaging|box)/i,
      /unopened/i,
    ],
    [
      /(?:with\s+or\s+)?without\s+(?:original\s+)?packaging/i,
      /opened\s+(?:items?|products?)\s+(?:accepted|eligible)/i,
    ]
  );
}

function extractFinalSaleItems(text: string): { value: boolean | null; confidence: number } {
  return extractBoolean(
    text,
    [
      /final\s+sale/i,
      /non[-\s]?returnable/i,
      /all\s+sales\s+final/i,
      /no\s+returns?\s+on\s+(?:sale|clearance)/i,
    ],
    []
  );
}

function extractPriceMatchCompetitors(text: string): { value: boolean | null; confidence: number } {
  return extractBoolean(
    text,
    [
      /(?:match|beat)\s+(?:competitor|other\s+retailer)/i,
      /competitor\s+(?:price\s+)?match/i,
      /(?:amazon|walmart|target|best\s+buy)/i,
      /authorized\s+(?:retailers?|dealers?)/i,
    ],
    [
      /(?:do\s+not|don't|won't)\s+(?:match|price\s+match)\s+(?:competitor|other)/i,
    ]
  );
}

function extractPriceMatchOwnSales(text: string): { value: boolean | null; confidence: number } {
  return extractBoolean(
    text,
    [
      /price\s+(?:adjustment|protection)/i,
      /(?:match|adjust)\s+(?:our\s+)?(?:own\s+)?(?:lower\s+)?price/i,
      /(?:if|when)\s+(?:price|it)\s+(?:drops|goes\s+down)/i,
      /(?:refund|credit)\s+(?:the\s+)?difference/i,
    ],
    [
      /(?:no|not)\s+(?:price\s+)?adjustments?/i,
      /(?:sale|promotional)\s+prices?\s+(?:excluded|not\s+eligible)/i,
    ]
  );
}

function extractPolicyText($: cheerio.CheerioAPI): string {
  // Remove script, style, nav, header, footer elements
  $('script, style, nav, header, footer, aside, .nav, .header, .footer, .sidebar').remove();

  // Get main content
  const mainContent = $('main, article, .content, .main-content, #content, #main').text();
  if (mainContent.length > 500) {
    return mainContent.substring(0, 10000);
  }

  // Fallback to body
  return $('body').text().substring(0, 10000);
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

export async function scrapePolicies(domain: string): Promise<PolicyScrapeResult> {
  // Check cache first
  const cached = getCachedResult(domain);
  if (cached) {
    return { ...cached, warnings: [...(cached.warnings || []), 'Result from cache'] };
  }

  const warnings: string[] = [];
  const baseUrl = `https://${domain.replace(/^(https?:\/\/)?(www\.)?/, '')}`;
  const wwwBaseUrl = `https://www.${domain.replace(/^(https?:\/\/)?(www\.)?/, '')}`;

  let returnPolicyUrl: string | null = null;
  let priceMatchPolicyUrl: string | null = null;
  let returnPolicyText = '';
  let priceMatchPolicyText = '';

  // Try to find return policy URL
  returnPolicyUrl = await findPolicyUrl(baseUrl, RETURN_POLICY_PATHS);
  if (!returnPolicyUrl) {
    returnPolicyUrl = await findPolicyUrl(wwwBaseUrl, RETURN_POLICY_PATHS);
  }
  if (!returnPolicyUrl) {
    returnPolicyUrl = await findPolicyUrlFromHomepage(baseUrl, ['return', 'refund']);
  }
  if (!returnPolicyUrl) {
    returnPolicyUrl = await findPolicyUrlFromHomepage(wwwBaseUrl, ['return', 'refund']);
  }

  // Try to find price match policy URL
  priceMatchPolicyUrl = await findPolicyUrl(baseUrl, PRICE_MATCH_PATHS);
  if (!priceMatchPolicyUrl) {
    priceMatchPolicyUrl = await findPolicyUrl(wwwBaseUrl, PRICE_MATCH_PATHS);
  }
  if (!priceMatchPolicyUrl) {
    priceMatchPolicyUrl = await findPolicyUrlFromHomepage(baseUrl, ['price match', 'price adjustment', 'price guarantee']);
  }

  // Extract return policy content
  if (returnPolicyUrl) {
    const html = await fetchPage(returnPolicyUrl);
    if (html) {
      const $ = cheerio.load(html);
      returnPolicyText = cleanText(extractPolicyText($));
    } else {
      warnings.push('Could not fetch return policy page');
    }
  } else {
    warnings.push('Could not find return policy URL');
  }

  // Extract price match policy content
  if (priceMatchPolicyUrl) {
    const html = await fetchPage(priceMatchPolicyUrl);
    if (html) {
      const $ = cheerio.load(html);
      priceMatchPolicyText = cleanText(extractPolicyText($));
    } else {
      warnings.push('Could not fetch price match policy page');
    }
  } else {
    warnings.push('Could not find price match policy URL');
  }

  // If no policy pages found, try homepage
  if (!returnPolicyText && !priceMatchPolicyText) {
    const html = await fetchPage(baseUrl) || await fetchPage(wwwBaseUrl);
    if (html) {
      const $ = cheerio.load(html);
      const pageText = cleanText(extractPolicyText($));
      if (pageText.toLowerCase().includes('return')) {
        returnPolicyText = pageText;
      }
      if (pageText.toLowerCase().includes('price match')) {
        priceMatchPolicyText = pageText;
      }
    }
  }

  if (!returnPolicyText && !priceMatchPolicyText) {
    const result: PolicyScrapeResult = {
      success: false,
      error: 'Could not find or access policy pages',
      warnings,
    };
    return result;
  }

  // Extract structured data
  const combinedText = `${returnPolicyText} ${priceMatchPolicyText}`;
  const fieldConfidences: Record<string, number> = {};

  const returnWindow = extractReturnWindowDays(returnPolicyText || combinedText);
  const freeReturns = extractFreeReturns(returnPolicyText || combinedText);
  const freeReturnShipping = extractFreeReturnShipping(returnPolicyText || combinedText);
  const paidReturnCost = extractPaidReturnCost(returnPolicyText || combinedText);
  const restockingFee = extractRestockingFee(returnPolicyText || combinedText);
  const exchangeOnly = extractExchangeOnly(returnPolicyText || combinedText);
  const storeCreditOnly = extractStoreCreditOnly(returnPolicyText || combinedText);
  const receiptRequired = extractReceiptRequired(returnPolicyText || combinedText);
  const originalPackaging = extractOriginalPackaging(returnPolicyText || combinedText);
  const finalSaleItems = extractFinalSaleItems(returnPolicyText || combinedText);
  const priceMatchWindow = extractPriceMatchWindowDays(priceMatchPolicyText || combinedText);
  const priceMatchCompetitors = extractPriceMatchCompetitors(priceMatchPolicyText || combinedText);
  const priceMatchOwnSales = extractPriceMatchOwnSales(priceMatchPolicyText || combinedText);

  // Build data object with non-null values
  const data: ScrapedPolicyData = {};

  if (returnWindow.value !== null) {
    data.return_window_days = returnWindow.value;
    fieldConfidences.return_window_days = returnWindow.confidence;
  }
  if (freeReturns.value !== null) {
    data.free_returns = freeReturns.value;
    fieldConfidences.free_returns = freeReturns.confidence;
  }
  if (freeReturnShipping.value !== null) {
    data.free_return_shipping = freeReturnShipping.value;
    fieldConfidences.free_return_shipping = freeReturnShipping.confidence;
  }
  if (paidReturnCost.value !== null) {
    data.paid_return_cost = paidReturnCost.value;
    fieldConfidences.paid_return_cost = paidReturnCost.confidence;
  }
  if (restockingFee.value !== null) {
    data.restocking_fee_percent = restockingFee.value;
    fieldConfidences.restocking_fee_percent = restockingFee.confidence;
  }
  if (exchangeOnly.value !== null) {
    data.exchange_only = exchangeOnly.value;
    fieldConfidences.exchange_only = exchangeOnly.confidence;
  }
  if (storeCreditOnly.value !== null) {
    data.store_credit_only = storeCreditOnly.value;
    fieldConfidences.store_credit_only = storeCreditOnly.confidence;
  }
  if (receiptRequired.value !== null) {
    data.receipt_required = receiptRequired.value;
    fieldConfidences.receipt_required = receiptRequired.confidence;
  }
  if (originalPackaging.value !== null) {
    data.original_packaging_required = originalPackaging.value;
    fieldConfidences.original_packaging_required = originalPackaging.confidence;
  }
  if (finalSaleItems.value !== null) {
    data.final_sale_items = finalSaleItems.value;
    fieldConfidences.final_sale_items = finalSaleItems.confidence;
  }
  if (priceMatchWindow.value !== null) {
    data.price_match_window_days = priceMatchWindow.value;
    fieldConfidences.price_match_window_days = priceMatchWindow.confidence;
  }
  if (priceMatchCompetitors.value !== null) {
    data.price_match_competitors = priceMatchCompetitors.value;
    fieldConfidences.price_match_competitors = priceMatchCompetitors.confidence;
  }
  if (priceMatchOwnSales.value !== null) {
    data.price_match_own_sales = priceMatchOwnSales.value;
    fieldConfidences.price_match_own_sales = priceMatchOwnSales.confidence;
  }

  // Add URLs
  if (returnPolicyUrl) {
    data.return_policy_url = returnPolicyUrl;
  }
  if (priceMatchPolicyUrl) {
    data.price_match_policy_url = priceMatchPolicyUrl;
  }

  // Calculate overall confidence
  const confidenceValues = Object.values(fieldConfidences);
  const overallConfidence = confidenceValues.length > 0
    ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
    : 0;

  const result: PolicyScrapeResult = {
    success: Object.keys(data).length > 0,
    data,
    return_policy_url: returnPolicyUrl || undefined,
    price_match_policy_url: priceMatchPolicyUrl || undefined,
    extracted_text: {
      return_policy: returnPolicyText.substring(0, 2000) || undefined,
      price_match_policy: priceMatchPolicyText.substring(0, 2000) || undefined,
    },
    confidence: {
      overall: overallConfidence,
      fields: fieldConfidences,
    },
    warnings: warnings.length > 0 ? warnings : undefined,
  };

  // Cache the result
  setCachedResult(domain, result);

  return result;
}

/**
 * Parse HTML content that was fetched client-side
 * This allows bypassing CORS/bot protection by having the browser fetch the page
 */
export function parseClientFetchedHtml(
  returnPolicyHtml: string | null,
  returnPolicyUrl: string | null,
  priceMatchPolicyHtml: string | null,
  priceMatchPolicyUrl: string | null
): PolicyScrapeResult {
  const warnings: string[] = [];
  let returnPolicyText = '';
  let priceMatchPolicyText = '';

  // Extract text from return policy HTML
  if (returnPolicyHtml) {
    try {
      const $ = cheerio.load(returnPolicyHtml);
      returnPolicyText = cleanText(extractPolicyText($));
    } catch (error) {
      warnings.push('Failed to parse return policy HTML');
    }
  } else {
    warnings.push('No return policy HTML provided');
  }

  // Extract text from price match policy HTML
  if (priceMatchPolicyHtml) {
    try {
      const $ = cheerio.load(priceMatchPolicyHtml);
      priceMatchPolicyText = cleanText(extractPolicyText($));
    } catch (error) {
      warnings.push('Failed to parse price match policy HTML');
    }
  }

  if (!returnPolicyText && !priceMatchPolicyText) {
    return {
      success: false,
      error: 'Could not extract text from provided HTML',
      warnings,
    };
  }

  // Extract structured data (same logic as server-side scraping)
  const combinedText = `${returnPolicyText} ${priceMatchPolicyText}`;
  const fieldConfidences: Record<string, number> = {};

  const returnWindow = extractReturnWindowDays(returnPolicyText || combinedText);
  const freeReturns = extractFreeReturns(returnPolicyText || combinedText);
  const freeReturnShipping = extractFreeReturnShipping(returnPolicyText || combinedText);
  const paidReturnCost = extractPaidReturnCost(returnPolicyText || combinedText);
  const restockingFee = extractRestockingFee(returnPolicyText || combinedText);
  const exchangeOnly = extractExchangeOnly(returnPolicyText || combinedText);
  const storeCreditOnly = extractStoreCreditOnly(returnPolicyText || combinedText);
  const receiptRequired = extractReceiptRequired(returnPolicyText || combinedText);
  const originalPackaging = extractOriginalPackaging(returnPolicyText || combinedText);
  const finalSaleItems = extractFinalSaleItems(returnPolicyText || combinedText);
  const priceMatchWindow = extractPriceMatchWindowDays(priceMatchPolicyText || combinedText);
  const priceMatchCompetitors = extractPriceMatchCompetitors(priceMatchPolicyText || combinedText);
  const priceMatchOwnSales = extractPriceMatchOwnSales(priceMatchPolicyText || combinedText);

  // Build data object with non-null values
  const data: ScrapedPolicyData = {};

  if (returnWindow.value !== null) {
    data.return_window_days = returnWindow.value;
    fieldConfidences.return_window_days = returnWindow.confidence;
  }
  if (freeReturns.value !== null) {
    data.free_returns = freeReturns.value;
    fieldConfidences.free_returns = freeReturns.confidence;
  }
  if (freeReturnShipping.value !== null) {
    data.free_return_shipping = freeReturnShipping.value;
    fieldConfidences.free_return_shipping = freeReturnShipping.confidence;
  }
  if (paidReturnCost.value !== null) {
    data.paid_return_cost = paidReturnCost.value;
    fieldConfidences.paid_return_cost = paidReturnCost.confidence;
  }
  if (restockingFee.value !== null) {
    data.restocking_fee_percent = restockingFee.value;
    fieldConfidences.restocking_fee_percent = restockingFee.confidence;
  }
  if (exchangeOnly.value !== null) {
    data.exchange_only = exchangeOnly.value;
    fieldConfidences.exchange_only = exchangeOnly.confidence;
  }
  if (storeCreditOnly.value !== null) {
    data.store_credit_only = storeCreditOnly.value;
    fieldConfidences.store_credit_only = storeCreditOnly.confidence;
  }
  if (receiptRequired.value !== null) {
    data.receipt_required = receiptRequired.value;
    fieldConfidences.receipt_required = receiptRequired.confidence;
  }
  if (originalPackaging.value !== null) {
    data.original_packaging_required = originalPackaging.value;
    fieldConfidences.original_packaging_required = originalPackaging.confidence;
  }
  if (finalSaleItems.value !== null) {
    data.final_sale_items = finalSaleItems.value;
    fieldConfidences.final_sale_items = finalSaleItems.confidence;
  }
  if (priceMatchWindow.value !== null) {
    data.price_match_window_days = priceMatchWindow.value;
    fieldConfidences.price_match_window_days = priceMatchWindow.confidence;
  }
  if (priceMatchCompetitors.value !== null) {
    data.price_match_competitors = priceMatchCompetitors.value;
    fieldConfidences.price_match_competitors = priceMatchCompetitors.confidence;
  }
  if (priceMatchOwnSales.value !== null) {
    data.price_match_own_sales = priceMatchOwnSales.value;
    fieldConfidences.price_match_own_sales = priceMatchOwnSales.confidence;
  }

  // Add URLs
  if (returnPolicyUrl) {
    data.return_policy_url = returnPolicyUrl;
  }
  if (priceMatchPolicyUrl) {
    data.price_match_policy_url = priceMatchPolicyUrl;
  }

  // Calculate overall confidence
  const confidenceValues = Object.values(fieldConfidences);
  const overallConfidence = confidenceValues.length > 0
    ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
    : 0;

  return {
    success: Object.keys(data).length > 0,
    data,
    return_policy_url: returnPolicyUrl || undefined,
    price_match_policy_url: priceMatchPolicyUrl || undefined,
    extracted_text: {
      return_policy: returnPolicyText.substring(0, 2000) || undefined,
      price_match_policy: priceMatchPolicyText.substring(0, 2000) || undefined,
    },
    confidence: {
      overall: overallConfidence,
      fields: fieldConfidences,
    },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
