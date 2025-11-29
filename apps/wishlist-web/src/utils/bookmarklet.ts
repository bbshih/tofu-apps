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

      if (data.wishlists.length === 0) {
        content.innerHTML = \`
          <p style="color:#666;margin:0 0 16px 0;">You don't have any wishlists yet. Create one first!</p>
          <button id="close-btn" style="background:#6366f1;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;width:100%;font-size:14px;">Close</button>
        \`;
        document.getElementById('close-btn').onclick = () => overlay.remove();
        return;
      }

      content.innerHTML = \`
        <label style="display:block;margin-bottom:8px;color:#374151;font-size:14px;font-weight:500;">Select Wishlist:</label>
        <select id="wishlist-select" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:6px;margin-bottom:16px;font-size:14px;">
          \${data.wishlists.map(w => \`<option value="\${w.id}">\${w.name}</option>\`).join('')}
        </select>
        <div style="display:flex;gap:8px;">
          <button id="add-btn" style="flex:1;background:#10b981;color:white;border:none;padding:10px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;">Add Item</button>
          <button id="cancel-btn" style="flex:1;background:#6b7280;color:white;border:none;padding:10px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;">Cancel</button>
        </div>
        <p id="status-msg" style="margin:12px 0 0 0;font-size:13px;color:#666;text-align:center;"></p>
      \`;

      document.getElementById('cancel-btn').onclick = () => overlay.remove();
      document.getElementById('add-btn').onclick = () => {
        const wishlistId = document.getElementById('wishlist-select').value;
        const addBtn = document.getElementById('add-btn');
        const statusMsg = document.getElementById('status-msg');

        addBtn.disabled = true;
        addBtn.textContent = 'Adding...';
        statusMsg.textContent = 'Adding item...';
        statusMsg.style.color = '#6366f1';

        fetch(API_URL + '/api/wishlist/bookmarklet/add-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: TOKEN,
            url: window.location.href,
            wishlist_id: parseInt(wishlistId)
          })
        })
        .then(res => res.json())
        .then(result => {
          if (result.error) {
            throw new Error(result.error);
          }
          statusMsg.textContent = '✓ Item added successfully!';
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
