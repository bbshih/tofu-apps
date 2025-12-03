import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedProduct } from '../types/index.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5MB limit

// Common brand names to detect in product titles
const COMMON_BRANDS = [
  'Apple', 'Samsung', 'Sony', 'LG', 'Microsoft', 'Google', 'Amazon', 'Dell', 'HP', 'Lenovo',
  'Asus', 'Acer', 'Nintendo', 'PlayStation', 'Xbox', 'Canon', 'Nikon', 'Panasonic', 'GoPro',
  'Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'New Balance', 'Vans', 'Converse',
  'Lego', 'Hasbro', 'Mattel', 'Fisher-Price', 'Nerf', 'Hot Wheels', 'Barbie',
  'KitchenAid', 'Cuisinart', 'Ninja', 'Instant Pot', 'Keurig', 'Breville', 'OXO',
  'Dyson', 'Roomba', 'Shark', 'Bissell', 'Black+Decker', 'DeWalt', 'Bosch', 'Makita',
  'Bose', 'JBL', 'Beats', 'Sennheiser', 'Audio-Technica', 'Logitech', 'Razer', 'Corsair',
  'Fitbit', 'Garmin', 'Polar', 'TomTom', 'GoPro',
  'North Face', 'Patagonia', 'Columbia', 'REI', 'Arc\'teryx',
  'Levi\'s', 'Gap', 'Old Navy', 'H&M', 'Zara', 'Uniqlo',
  '18 East', 'Eighteen East',
];

/**
 * Extract brand name from product title using common brand patterns
 */
function extractBrandFromTitle(title: string): string | undefined {
  if (!title) return undefined;

  // Check if any common brand name appears at the start of the title
  const titleLower = title.toLowerCase();
  for (const brand of COMMON_BRANDS) {
    const brandLower = brand.toLowerCase();
    // Check if brand is at the start or after common prefixes
    if (titleLower.startsWith(brandLower + ' ') ||
        titleLower.startsWith(brandLower + '-') ||
        titleLower.includes(` ${brandLower} `) ||
        titleLower.includes(`-${brandLower}-`)) {
      return brand;
    }
  }

  return undefined;
}

export async function scrapeProduct(url: string): Promise<ScrapedProduct> {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
      maxContentLength: MAX_RESPONSE_SIZE,
      maxBodyLength: MAX_RESPONSE_SIZE,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Determine the site and use appropriate scraper
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes('amazon.')) {
      return scrapeAmazon($, url);
    } else if (hostname.includes('target.com')) {
      return scrapeTarget($, url);
    } else if (hostname.includes('walmart.com')) {
      return scrapeWalmart($, url);
    } else if (hostname.includes('bestbuy.com')) {
      return scrapeBestBuy($, url);
    } else {
      return scrapeGeneric($, url);
    }
  } catch (_error) {
    console.error('Scraping _error:', _error);
    throw new Error('Failed to scrape product information');
  }
}

function scrapeAmazon($: cheerio.CheerioAPI, _url: string): ScrapedProduct {
  const product_name =
    $('#productTitle').text().trim() ||
    $('h1.a-size-large').text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    '';

  const brand =
    $('#bylineInfo')
      .text()
      .replace(/^(Brand:|Visit the|by)\s*/i, '')
      .trim() ||
    $('.a-spacing-small.po-brand .po-break-word').text().trim() ||
    '';

  let price: number | undefined;
  let sale_price: number | undefined;

  const priceWhole = $('.a-price.aok-align-center .a-price-whole').first().text().trim();
  const priceFraction = $('.a-price.aok-align-center .a-price-fraction').first().text().trim();

  if (priceWhole) {
    sale_price = parseFloat(priceWhole.replace(/,/g, '') + '.' + (priceFraction || '00'));
  }

  const listPrice = $('.a-price.a-text-price .a-offscreen').first().text().trim();
  if (listPrice) {
    price = parseFloat(listPrice.replace(/[^0-9.]/g, ''));
  }

  // If no sale price but has regular price, use that
  if (!sale_price && price) {
    sale_price = price;
    price = undefined;
  }

  const image_url =
    $('#landingImage').attr('src') ||
    $('.a-dynamic-image').first().attr('src') ||
    $('meta[property="og:image"]').attr('content');

  return {
    product_name,
    brand: brand || undefined,
    price,
    sale_price,
    currency: 'USD',
    image_url,
    site_name: 'Amazon',
  };
}

function scrapeTarget($: cheerio.CheerioAPI, _url: string): ScrapedProduct {
  const product_name =
    $('h1[data-test="product-title"]').text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    '';

  const brand = $('a[data-test="product-brand"]').text().trim() || '';

  let price: number | undefined;
  let sale_price: number | undefined;

  const currentPrice = $('[data-test="product-price"]').text().trim();
  const regPrice = $('[data-test="product-price-reg"]').text().trim();

  if (currentPrice) {
    sale_price = parseFloat(currentPrice.replace(/[^0-9.]/g, ''));
  }

  if (regPrice && regPrice !== currentPrice) {
    price = parseFloat(regPrice.replace(/[^0-9.]/g, ''));
  }

  const image_url =
    $('img[data-test="product-image-photo"]').attr('src') ||
    $('meta[property="og:image"]').attr('content');

  return {
    product_name,
    brand: brand || undefined,
    price,
    sale_price,
    currency: 'USD',
    image_url,
    site_name: 'Target',
  };
}

function scrapeWalmart($: cheerio.CheerioAPI, _url: string): ScrapedProduct {
  const product_name =
    $('h1[itemprop="name"]').text().trim() || $('meta[property="og:title"]').attr('content') || '';

  const brand = $('[itemprop="brand"]').text().trim() || '';

  let price: number | undefined;
  let sale_price: number | undefined;

  const currentPrice =
    $('[itemprop="price"]').attr('content') || $('.price-characteristic').first().text().trim();

  if (currentPrice) {
    sale_price = parseFloat(currentPrice.replace(/[^0-9.]/g, ''));
  }

  const wasPrice = $('span.was-price .visuallyhidden').text().trim();
  if (wasPrice) {
    price = parseFloat(wasPrice.replace(/[^0-9.]/g, ''));
  }

  const image_url =
    $('img[data-testid="hero-image-carousel-image"]').attr('src') ||
    $('meta[property="og:image"]').attr('content');

  return {
    product_name,
    brand: brand || undefined,
    price,
    sale_price,
    currency: 'USD',
    image_url,
    site_name: 'Walmart',
  };
}

function scrapeBestBuy($: cheerio.CheerioAPI, _url: string): ScrapedProduct {
  const product_name =
    $('h1.sku-title').text().trim() || $('meta[property="og:title"]').attr('content') || '';

  const brand = $('a.sku-value').first().text().trim() || '';

  let price: number | undefined;
  let sale_price: number | undefined;

  const currentPrice = $('div[data-testid="customer-price"] span[aria-hidden="true"]')
    .first()
    .text()
    .trim();
  const regularPrice = $('div[data-testid="regular-price"]').text().trim();

  if (currentPrice) {
    sale_price = parseFloat(currentPrice.replace(/[^0-9.]/g, ''));
  }

  if (regularPrice && regularPrice !== currentPrice) {
    price = parseFloat(regularPrice.replace(/[^0-9.]/g, ''));
  }

  const image_url =
    $('img.primary-image').attr('src') || $('meta[property="og:image"]').attr('content');

  return {
    product_name,
    brand: brand || undefined,
    price,
    sale_price,
    currency: 'USD',
    image_url,
    site_name: 'Best Buy',
  };
}

function scrapeGeneric($: cheerio.CheerioAPI, url: string): ScrapedProduct {
  // Fallback to Open Graph and common meta tags
  const product_name =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="title"]').attr('content') ||
    $('title').text().trim() ||
    '';

  let brand =
    $('meta[property="og:brand"]').attr('content') ||
    $('meta[property="product:brand"]').attr('content') ||
    '';

  // If no brand found in meta tags, try to extract from product name
  if (!brand && product_name) {
    brand = extractBrandFromTitle(product_name) || '';
  }

  // Try to extract brand from page title (often in format: "Product Name – Brand")
  if (!brand) {
    const pageTitle = $('title').text().trim();
    // Check for patterns like "Product – Brand" or "Product | Brand"
    const titleBrandMatch = pageTitle.match(/[–—|]\s*(.+?)$/);
    if (titleBrandMatch) {
      const potentialBrand = titleBrandMatch[1].trim();
      // Verify it's a known brand
      const foundBrand = extractBrandFromTitle(potentialBrand);
      if (foundBrand) {
        brand = foundBrand;
      }
    }
  }

  let price: number | undefined;
  let sale_price: number | undefined;

  const priceAmount =
    $('meta[property="og:price:amount"]').attr('content') ||
    $('meta[property="product:price:amount"]').attr('content');

  if (priceAmount) {
    sale_price = parseFloat(priceAmount);
  }

  const currency =
    $('meta[property="og:price:currency"]').attr('content') ||
    $('meta[property="product:price:currency"]').attr('content') ||
    'USD';

  const image_url =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[property="og:image:url"]').attr('content');

  const hostname = new URL(url).hostname.replace(/^www\./, '');

  return {
    product_name: product_name.substring(0, 500), // Limit length
    brand: brand || undefined,
    price,
    sale_price,
    currency,
    image_url,
    site_name: hostname,
  };
}
