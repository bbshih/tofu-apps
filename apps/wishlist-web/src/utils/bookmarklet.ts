/**
 * Bookmarklet script generator
 * Creates a self-contained JavaScript bookmarklet for adding items to wishlist
 * Uses a popup window to bypass CSP restrictions on external sites
 */

export const generateBookmarkletScript = (apiUrl: string, token: string): string => {
  // This is the actual bookmarklet code that will be executed in the user's browser
  const bookmarkletCode = `
(function() {
  const API_URL = '${apiUrl}';
  const TOKEN = '${token}';

  // Scrape product data from the current page
  function scrapeProductFromPage() {
    const hostname = window.location.hostname.toLowerCase();
    let data = { product_name: null, brand: null, price: null, sale_price: null, image_url: null, currency: 'USD' };

    if (hostname.includes('amazon.')) {
      // Amazon product page - handles books and regular products
      data.product_name = document.getElementById('productTitle')?.textContent?.trim()
        || document.getElementById('ebooksProductTitle')?.textContent?.trim()
        || document.querySelector('#title span')?.textContent?.trim()
        || document.querySelector('meta[property="og:title"]')?.content;

      // Author for books
      const authorElement = document.querySelector('.author a, #bylineInfo a.contributorNameID, #bylineInfo a');
      const bylineText = document.getElementById('bylineInfo')?.textContent?.trim();
      if (authorElement) {
        data.brand = authorElement.textContent?.trim();
      } else if (bylineText) {
        data.brand = bylineText.replace(/^(by|Visit the)\\s*/i, '').replace(/\\s*(Store|Page)$/i, '').trim();
      }

      // Price - check multiple locations
      const priceWhole = document.querySelector('.a-price.aok-align-center .a-price-whole, #kindle-price, .kindle-price, .a-price .a-price-whole');
      const priceFraction = document.querySelector('.a-price.aok-align-center .a-price-fraction, .a-price .a-price-fraction');
      if (priceWhole) {
        const whole = priceWhole.textContent?.replace(/[^0-9]/g, '') || '0';
        const frac = priceFraction?.textContent?.replace(/[^0-9]/g, '') || '00';
        data.sale_price = parseFloat(whole + '.' + frac);
      }
      // Also try extracting from the offscreen price
      const offscreenPrice = document.querySelector('.a-price .a-offscreen');
      if (!data.sale_price && offscreenPrice) {
        data.sale_price = parseFloat(offscreenPrice.textContent?.replace(/[^0-9.]/g, '') || '0');
      }

      // List/original price
      const listPrice = document.querySelector('.a-price.a-text-price .a-offscreen, .a-text-strike .a-offscreen');
      if (listPrice) {
        data.price = parseFloat(listPrice.textContent?.replace(/[^0-9.]/g, '') || '0');
      }

      // Image - books often use different selectors
      data.image_url = document.getElementById('landingImage')?.src
        || document.getElementById('imgBlkFront')?.src
        || document.getElementById('ebooksImgBlkFront')?.src
        || document.querySelector('#imageBlockContainer img')?.src
        || document.querySelector('img.a-dynamic-image')?.src
        || document.querySelector('meta[property="og:image"]')?.content;

    } else if (hostname.includes('ikea.')) {
      // IKEA - uses utag_data analytics object for pricing
      data.product_name = document.querySelector('h1.pip-header-section__title--big')?.textContent?.trim()
        || document.querySelector('.pip-header-section__title')?.textContent?.trim()
        || document.querySelector('meta[property="og:title"]')?.content
        || document.title.split('-')[0]?.trim();
      data.brand = 'IKEA';
      data.image_url = document.querySelector('meta[property="og:image"]')?.content
        || document.querySelector('.pip-image img')?.src;

      // IKEA stores prices in utag_data global variable
      if (window.utag_data) {
        const prices = window.utag_data.product_prices || window.utag_data.price;
        if (prices && prices[0]) {
          data.sale_price = parseFloat(prices[0]);
        }
      }
      // Fallback: try to find price in the DOM
      if (!data.sale_price) {
        const priceEl = document.querySelector('.pip-temp-price__integer, .pip-price__integer');
        if (priceEl) {
          const priceText = priceEl.textContent?.replace(/[^0-9.]/g, '');
          if (priceText) data.sale_price = parseFloat(priceText);
        }
      }

    } else if (hostname.includes('crateandbarrel.') || hostname.includes('cb2.')) {
      // Crate & Barrel / CB2
      data.product_name = document.querySelector('h1.product-name')?.textContent?.trim()
        || document.querySelector('[data-testid="product-name"]')?.textContent?.trim()
        || document.querySelector('meta[property="og:title"]')?.content
        || document.title.split('|')[0]?.trim();
      data.brand = hostname.includes('cb2.') ? 'CB2' : 'Crate & Barrel';
      data.image_url = document.querySelector('meta[property="og:image"]')?.content;

      // Try JSON-LD first
      const jsonLd = document.querySelector('script[type="application/ld+json"]');
      if (jsonLd) {
        try {
          const jsonData = JSON.parse(jsonLd.textContent || '{}');
          const product = jsonData['@type'] === 'Product' ? jsonData : jsonData['@graph']?.find(i => i['@type'] === 'Product');
          if (product?.offers) {
            const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
            data.sale_price = parseFloat(offer.price || offer.lowPrice);
          }
        } catch (e) {}
      }
      // Fallback: DOM price
      if (!data.sale_price) {
        const priceEl = document.querySelector('.price-state-current, [data-testid="product-price"], .product-price');
        if (priceEl) {
          const priceText = priceEl.textContent?.replace(/[^0-9.]/g, '');
          if (priceText) data.sale_price = parseFloat(priceText);
        }
      }

    } else {
      // Generic fallback using meta tags
      data.product_name = document.querySelector('meta[property="og:title"]')?.content
        || document.querySelector('meta[name="title"]')?.content
        || document.title;
      data.brand = document.querySelector('meta[property="og:brand"]')?.content
        || document.querySelector('meta[property="product:brand"]')?.content;
      const priceAmount = document.querySelector('meta[property="og:price:amount"]')?.content
        || document.querySelector('meta[property="product:price:amount"]')?.content;
      if (priceAmount) data.sale_price = parseFloat(priceAmount);
      data.currency = document.querySelector('meta[property="og:price:currency"]')?.content
        || document.querySelector('meta[property="product:price:currency"]')?.content || 'USD';
      data.image_url = document.querySelector('meta[property="og:image"]')?.content;
    }

    return data;
  }

  // Clean URL - remove tracking/referral params
  function cleanUrl(url) {
    try {
      const u = new URL(url);
      const paramsToRemove = [
        // UTM params
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
        // Referral/affiliate
        'ref', 'ref_', 'referrer', 'aff', 'affiliate', 'affid', 'partner', 'tag',
        // Analytics/tracking
        'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'twclid', 'igshid',
        'mc_cid', 'mc_eid', '_ga', '_gl', 'yclid', 'ymclid',
        // Social
        'share', 'shared', 's', 'smid', 'smtyp',
        // Misc tracking
        'trk', 'trkInfo', 'trackingId', 'clickid', 'click_id', 'campaign_id',
        'source', 'src', 'cid', 'ito', 'itok', 'icid', 'ICID',
        // Amazon specific
        'psc', 'pd_rd_i', 'pd_rd_r', 'pd_rd_w', 'pd_rd_wg', 'pf_rd_i', 'pf_rd_m',
        'pf_rd_p', 'pf_rd_r', 'pf_rd_s', 'pf_rd_t', 'linkCode', 'linkId',
        'creativeASIN', 'ascsubtag', 'sr', 'qid', 'sbo', 'spIA', 'sp_csd',
        // IKEA
        'itm_campaign', 'itm_element', 'itm_content', 'intcmp', 'icid'
      ];
      paramsToRemove.forEach(p => u.searchParams.delete(p));
      return u.toString();
    } catch (e) {
      return url;
    }
  }

  // Scrape product data
  const scrapedData = scrapeProductFromPage();
  const currentUrl = cleanUrl(window.location.href);

  // Build popup URL
  const popupUrl = API_URL + '/bookmarklet-add?token=' + encodeURIComponent(TOKEN)
    + '&url=' + encodeURIComponent(currentUrl)
    + '&data=' + encodeURIComponent(JSON.stringify(scrapedData));

  // Open popup window
  const width = 420;
  const height = 500;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;

  window.open(
    popupUrl,
    'wishlist-add',
    'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',scrollbars=yes,resizable=yes'
  );
})();
  `.trim();

  // Return as a bookmarklet URL
  return `javascript:${encodeURIComponent(bookmarkletCode)}`;
};

export const getApiUrl = (): string => {
  // In development, use localhost; in production, use the actual domain
  if (import.meta.env.DEV) {
    return 'http://localhost:3000';
  }
  return window.location.origin;
};
