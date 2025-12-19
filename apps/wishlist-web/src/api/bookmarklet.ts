import { apiClient } from './client';
import { PolicyScrapeResult } from '../types';

export interface BookmarkletToken {
  token: string;
  createdAt: string;
  expiresAt: string;
}

export const bookmarkletApi = {
  generateToken: async (): Promise<BookmarkletToken> => {
    const response = await apiClient.post('/bookmarklet/generate-token');
    return response.data;
  },

  getPolicyCaptureResult: async (
    sessionId: string,
    token: string
  ): Promise<{ success: boolean; result: PolicyScrapeResult; url: string }> => {
    const response = await apiClient.get('/bookmarklet/policy-result', {
      params: { session_id: sessionId, token },
    });
    return response.data;
  },
};

/**
 * Generate the policy grabber bookmarklet code
 */
export function generatePolicyBookmarkletCode(token: string, apiBaseUrl: string): string {
  // Build the bookmarklet code using template literals for proper escaping
  const bookmarkletCode = `
(function() {
  var TOKEN = '${token}';
  var API_URL = '${apiBaseUrl}/bookmarklet/capture-policy';

  // Check if overlay already exists
  if (document.getElementById('wishlist-policy-overlay')) {
    document.getElementById('wishlist-policy-overlay').remove();
    return;
  }

  // Detect policy type from URL/content
  var policyType = 'return';
  var urlLower = window.location.href.toLowerCase();
  var titleLower = document.title.toLowerCase();
  if ((urlLower.includes('price') && (urlLower.includes('match') || urlLower.includes('adjust'))) ||
      (titleLower.includes('price') && (titleLower.includes('match') || titleLower.includes('adjust')))) {
    policyType = 'price_match';
  }

  // Create overlay
  var overlay = document.createElement('div');
  overlay.id = 'wishlist-policy-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;';

  // Create modal
  var modal = document.createElement('div');
  modal.style.cssText = 'background:white;border-radius:12px;padding:24px;max-width:450px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);text-align:center;';
  modal.innerHTML = '<div style="font-size:28px;margin-bottom:12px;">📋</div><h2 style="margin:0 0 8px 0;font-size:18px;color:#333;">Capturing Policy...</h2><p style="color:#666;margin:0;font-size:14px;">Sending page to Wishlist app</p>';

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });

  // Get page HTML and send to API
  var html = document.documentElement.outerHTML;
  var url = window.location.href;

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: TOKEN, html: html, url: url, policy_type: policyType })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.success) {
      var fieldsFound = data.result && data.result.data ? Object.keys(data.result.data).length : 0;
      var confidence = data.result && data.result.confidence ? Math.round(data.result.confidence.overall * 100) : 0;
      modal.innerHTML = '<div style="font-size:28px;margin-bottom:12px;">✅</div><h2 style="margin:0 0 12px 0;font-size:18px;color:#333;">Policy Captured!</h2><p style="color:#666;margin:0 0 16px 0;font-size:14px;">Found ' + fieldsFound + ' policy fields (' + confidence + '% confidence)</p><div style="background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:16px;text-align:left;"><strong style="font-size:12px;">Session ID:</strong><br><code id="policy-session-id" style="font-size:13px;word-break:break-all;">' + data.session_id + '</code></div><div style="display:flex;gap:8px;justify-content:center;"><button id="copy-btn" style="background:#8b5cf6;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;">Copy Session ID</button><button id="close-btn" style="background:#e5e7eb;color:#374151;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;">Close</button></div>';

      document.getElementById('copy-btn').onclick = function() {
        navigator.clipboard.writeText(data.session_id);
        this.textContent = 'Copied!';
        this.style.background = '#22c55e';
      };
      document.getElementById('close-btn').onclick = function() {
        overlay.remove();
      };
    } else {
      modal.innerHTML = '<div style="font-size:28px;margin-bottom:12px;">❌</div><h2 style="margin:0 0 12px 0;font-size:18px;color:#333;">Failed to Capture</h2><p style="color:#666;margin:0 0 16px 0;font-size:14px;">' + (data.error || 'Unknown error') + '</p><button id="close-btn" style="background:#e5e7eb;color:#374151;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;">Close</button>';
      document.getElementById('close-btn').onclick = function() { overlay.remove(); };
    }
  })
  .catch(function(err) {
    modal.innerHTML = '<div style="font-size:28px;margin-bottom:12px;">❌</div><h2 style="margin:0 0 12px 0;font-size:18px;color:#333;">Error</h2><p style="color:#666;margin:0 0 16px 0;font-size:14px;">' + err.message + '</p><button id="close-btn" style="background:#e5e7eb;color:#374151;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;">Close</button>';
    document.getElementById('close-btn').onclick = function() { overlay.remove(); };
  });
})();
  `.trim();

  // Return as a bookmarklet URL
  return `javascript:${encodeURIComponent(bookmarkletCode)}`;
}
