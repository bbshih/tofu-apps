/**
 * Bookmarklet script generator
 * Creates a self-contained JavaScript bookmarklet for adding items to wishlist
 */

export const generateBookmarkletScript = (apiUrl: string, token: string): string => {
  // This is the actual bookmarklet code that will be executed in the user's browser
  const bookmarkletCode = `
(function() {
  const API_URL = '${apiUrl}';
  const TOKEN = '${token}';

  // Check if overlay already exists
  if (document.getElementById('wishlist-bookmarklet-overlay')) {
    document.getElementById('wishlist-bookmarklet-overlay').remove();
    return;
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'wishlist-bookmarklet-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;';

  // Create modal
  const modal = document.createElement('div');
  modal.style.cssText = 'background:white;border-radius:12px;padding:24px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

  modal.innerHTML = \`
    <h2 style="margin:0 0 16px 0;font-size:20px;color:#333;">Add to Wishlist</h2>
    <div id="bookmarklet-content" style="min-height:100px;">
      <p style="color:#666;margin:0;">Loading wishlists...</p>
    </div>
  \`;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });

  // Fetch wishlists
  fetch(API_URL + '/api/wishlist/bookmarklet/wishlists?token=' + encodeURIComponent(TOKEN))
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        throw new Error(data.error);
      }

      const content = document.getElementById('bookmarklet-content');

      // Function to render the main UI
      function renderMainUI(wishlists) {
        if (wishlists.length === 0) {
          content.innerHTML = \`
            <p style="color:#666;margin:0 0 16px 0;">You don't have any wishlists yet.</p>
            <div id="create-list-section">
              <input type="text" id="new-list-input" placeholder="Enter list name" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;margin-bottom:12px;font-size:14px;box-sizing:border-box;" />
              <div style="display:flex;gap:8px;">
                <button id="create-list-btn" style="flex:1;background:#6366f1;color:white;border:none;padding:10px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;">Create List</button>
                <button id="cancel-btn" style="flex:1;background:#6b7280;color:white;border:none;padding:10px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;">Cancel</button>
              </div>
            </div>
            <p id="status-msg" style="margin:12px 0 0 0;font-size:13px;color:#666;text-align:center;"></p>
          \`;
          document.getElementById('cancel-btn').onclick = () => overlay.remove();
          setupCreateListHandler(wishlists);
          return;
        }

        content.innerHTML = \`
          <label style="display:block;margin-bottom:8px;color:#374151;font-size:14px;font-weight:500;">Select Wishlist:</label>
          <select id="wishlist-select" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;margin-bottom:12px;font-size:14px;">
            \${wishlists.map(w => \`<option value="\${w.id}">\${w.name}</option>\`).join('')}
          </select>
          <a href="#" id="create-new-link" style="display:block;margin-bottom:16px;font-size:13px;color:#6366f1;text-decoration:none;">+ Create new list</a>
          <div id="create-list-section" style="display:none;margin-bottom:16px;padding:12px;background:#f9fafb;border-radius:6px;">
            <input type="text" id="new-list-input" placeholder="Enter list name" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;margin-bottom:8px;font-size:14px;box-sizing:border-box;" />
            <button id="create-list-btn" style="width:100%;background:#6366f1;color:white;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;">Create List</button>
          </div>
          <div style="display:flex;gap:8px;">
            <button id="add-btn" style="flex:1;background:#10b981;color:white;border:none;padding:10px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;">Add Item</button>
            <button id="cancel-btn" style="flex:1;background:#6b7280;color:white;border:none;padding:10px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;">Cancel</button>
          </div>
          <p id="status-msg" style="margin:12px 0 0 0;font-size:13px;color:#666;text-align:center;"></p>
        \`;

        // Toggle create list section
        document.getElementById('create-new-link').onclick = (e) => {
          e.preventDefault();
          const section = document.getElementById('create-list-section');
          section.style.display = section.style.display === 'none' ? 'block' : 'none';
          if (section.style.display === 'block') {
            document.getElementById('new-list-input').focus();
          }
        };

        // Set up cancel and add item handlers
        document.getElementById('cancel-btn').onclick = () => overlay.remove();
        document.getElementById('add-btn').onclick = () => {
          const wishlistId = document.getElementById('wishlist-select').value;
          const addBtn = document.getElementById('add-btn');
          const statusMsg = document.getElementById('status-msg');

          addBtn.disabled = true;
          addBtn.textContent = 'Adding...';
          statusMsg.textContent = 'Adding item...';
          statusMsg.style.color = '#6366f1';

          // Scrape product data from the current page (runs in user's browser)
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
                data.brand = bylineText.replace(/^(by|Visit the)\s*/i, '').replace(/\s*(Store|Page)$/i, '').trim();
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

          const scrapedData = scrapeProductFromPage();

          fetch(API_URL + '/api/wishlist/bookmarklet/add-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: TOKEN,
              url: window.location.href,
              wishlist_id: parseInt(wishlistId),
              scraped_data: scrapedData
            })
          })
          .then(res => res.json())
          .then(result => {
            if (result.error) {
              throw new Error(result.error);
            }
            statusMsg.textContent = '✓ Item added!';
            statusMsg.style.color = '#10b981';
            setTimeout(() => overlay.remove(), 1500);
          })
          .catch(err => {
            statusMsg.textContent = '✗ ' + err.message;
            statusMsg.style.color = '#ef4444';
            addBtn.disabled = false;
            addBtn.textContent = 'Add Item';
          });
        };

        setupCreateListHandler(wishlists);
      }

      // Function to handle list creation
      function setupCreateListHandler(currentWishlists) {
        const createBtn = document.getElementById('create-list-btn');
        if (!createBtn) return;

        createBtn.onclick = () => {
          const input = document.getElementById('new-list-input');
          const name = input.value.trim();
          const statusMsg = document.getElementById('status-msg');

          if (!name) {
            statusMsg.textContent = 'Please enter a list name';
            statusMsg.style.color = '#ef4444';
            return;
          }

          createBtn.disabled = true;
          createBtn.textContent = 'Creating...';
          statusMsg.textContent = 'Creating list...';
          statusMsg.style.color = '#6366f1';

          fetch(API_URL + '/api/wishlist/bookmarklet/create-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: TOKEN, name: name })
          })
          .then(res => res.json())
          .then(result => {
            if (result.error) {
              throw new Error(result.error);
            }
            // Add the new list to wishlists and re-render
            const newList = result.wishlist;
            currentWishlists.unshift(newList);
            renderMainUI(currentWishlists);
            // Select the newly created list
            const select = document.getElementById('wishlist-select');
            if (select) select.value = newList.id;
            const statusMsg = document.getElementById('status-msg');
            statusMsg.textContent = 'List created!';
            statusMsg.style.color = '#10b981';
          })
          .catch(err => {
            statusMsg.textContent = err.message;
            statusMsg.style.color = '#ef4444';
            createBtn.disabled = false;
            createBtn.textContent = 'Create List';
          });
        };
      }

      renderMainUI(data.wishlists);
    })
    .catch(err => {
      const content = document.getElementById('bookmarklet-content');
      content.innerHTML = \`
        <p style="color:#ef4444;margin:0 0 16px 0;">Error: \${err.message}</p>
        <button id="close-btn" style="background:#6b7280;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;width:100%;font-size:14px;">Close</button>
      \`;
      document.getElementById('close-btn').onclick = () => overlay.remove();
    });
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
