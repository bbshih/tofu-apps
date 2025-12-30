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

  // Scrape product data
  const scrapedData = scrapeProductFromPage();
  const currentUrl = window.location.href;

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
