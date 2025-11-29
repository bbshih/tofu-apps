# Design: Wishlist Bookmarklet

## Context

Bookmarklets are browser bookmarks containing JavaScript code that executes on the current page. They provide a way to add functionality to any website without requiring browser extensions or user permissions. Users can quickly add items to their wishlist while browsing e-commerce sites by clicking the bookmarklet in their browser's bookmarks bar.

**Constraints:**
- Bookmarklets execute in the context of the host page (same-origin policy applies to API requests)
- Must work across all major browsers (Chrome, Firefox, Safari, Edge)
- Cannot make authenticated requests using standard Authorization headers due to CORS
- Limited to ~2000 characters (URL length restrictions)
- No external dependencies (must be self-contained JavaScript)

**Stakeholders:**
- End users who want quick item addition
- Backend maintainers concerned with security
- Frontend developers maintaining the bookmarklet generator UI

## Goals / Non-Goals

**Goals:**
- Enable one-click item addition from any product page
- Provide a secure authentication mechanism for bookmarklet requests
- Minimize friction in the user flow (no login prompts, quick feedback)
- Support all major browsers without browser-specific code

**Non-Goals:**
- Automatic product detection (URL scraping on backend is sufficient)
- Offline support (requires API connection)
- Sharing bookmarklets between users (each user gets unique token)
- Browser extension (bookmarklet is simpler, no installation required)

## Decisions

### Decision 1: Token-Based Authentication in URL
**What:** Embed the authentication token as a query parameter in the bookmarklet API request URL, rather than using JWT in Authorization header.

**Why:**
- Bookmarklets execute in cross-origin context, making CORS-compliant header-based auth complex
- Query parameter tokens are simpler to implement and work reliably across browsers
- Allows for simple token regeneration without affecting the main JWT auth system

**Alternatives Considered:**
1. **JWT in Authorization header** - Rejected due to CORS preflight complexity and unreliable cross-origin header access
2. **Session-based auth with cookies** - Rejected because third-party cookie restrictions would break functionality
3. **OAuth flow** - Rejected as too complex for this use case; adds unnecessary redirect flows

**Trade-offs:**
- ✅ Simpler implementation, better browser compatibility
- ⚠️ Token visible in URL (mitigated by HTTPS and token expiration)
- ⚠️ Requires separate token management system

### Decision 2: 90-Day Token Expiration
**What:** Bookmarklet tokens expire after 90 days of creation. Users can regenerate tokens at any time.

**Why:**
- Balances security (limits exposure window) with usability (users don't need to regenerate frequently)
- 90 days is standard for API tokens in many systems
- Token regeneration is easy, so aggressive expiration isn't needed

**Alternatives Considered:**
1. **30-day expiration** - Rejected as too frequent; would frustrate users
2. **Never expire** - Rejected due to security concerns (lost tokens remain valid indefinitely)
3. **Sliding expiration (extends on use)** - Rejected as more complex to implement

### Decision 3: Overlay UI Pattern
**What:** The bookmarklet injects a modal overlay on the host page rather than opening a popup window or new tab.

**Why:**
- Keeps user in context (no tab switching)
- Works reliably across browsers (popups often blocked)
- Better mobile experience
- Can be dismissed easily

**Alternatives Considered:**
1. **Popup window** - Rejected due to popup blockers and poor UX
2. **New tab redirect** - Rejected as it takes user out of shopping flow
3. **Sidebar injection** - Rejected as more complex and may conflict with page layout

**Implementation:**
```javascript
// Overlay structure
<div id="wishlist-bookmarklet-overlay">
  <div class="modal">
    <h2>Add to Wishlist</h2>
    <select id="wishlist-select"><!-- wishlists --></select>
    <button>Add Item</button>
    <button>Cancel</button>
  </div>
</div>
```

### Decision 4: Single API Endpoint for Item Creation
**What:** Create a dedicated public endpoint `POST /api/wishlist/bookmarklet/add-item` separate from the standard authenticated `POST /api/wishlist/items` endpoint.

**Why:**
- Allows different CORS policies (open CORS for bookmarklet endpoint)
- Enables specific rate limiting for public bookmarklet usage
- Simplifies authentication logic (token vs JWT)
- Easier to monitor and secure separately

**Alternatives Considered:**
1. **Reuse existing items endpoint** - Rejected due to conflicting CORS and auth requirements
2. **Multiple endpoints per operation** - Rejected as overkill; single endpoint handles all bookmarklet needs

### Decision 5: Rate Limiting Strategy
**What:** Apply strict rate limiting to bookmarklet endpoint: 10 requests per minute per token.

**Why:**
- Prevents token abuse if leaked
- Protects backend from spam/DoS via bookmarklet
- 10/minute is generous for legitimate use (adding ~1 item every 6 seconds)

**Implementation:**
- Use existing `express-rate-limit` middleware
- Key by `bookmarklet_token` rather than IP
- Return 429 with clear error message when limit exceeded

## Risks / Trade-offs

### Risk 1: Token Leakage
**Risk:** User shares their bookmarklet link publicly, exposing their token.

**Likelihood:** Medium - users may not understand security implications

**Mitigation:**
- Clear warnings in UI: "Do not share this bookmarklet with others"
- Easy token regeneration (invalidates old token immediately)
- 90-day expiration limits damage window
- Rate limiting prevents mass abuse

**Residual Risk:** Low - mitigations are sufficient for typical use

### Risk 2: Browser Compatibility
**Risk:** Bookmarklet may break on specific browsers or future browser updates.

**Likelihood:** Low - using standard DOM APIs and fetch

**Mitigation:**
- Test on Chrome, Firefox, Safari, Edge before launch
- Use vanilla JavaScript (no dependencies that could break)
- Monitor for user reports of browser-specific issues

**Residual Risk:** Low - bookmarklets are well-established pattern

### Risk 3: Host Page Conflicts
**Risk:** Bookmarklet overlay CSS/JS may conflict with host page styles or scripts.

**Likelihood:** Medium - e-commerce sites have complex CSS frameworks

**Mitigation:**
- Use unique ID prefixes (`wishlist-bookmarklet-*`)
- Inline all styles with `!important` to override host styles
- Namespace JavaScript variables
- Add z-index: 999999 to overlay for visibility

**Residual Risk:** Low-Medium - some visual glitches possible but rare

### Risk 4: CORS and CSP Restrictions
**Risk:** Some sites may block bookmarklet API requests via Content Security Policy.

**Likelihood:** Low - bookmarklet runs in user context, not blocked by CSP

**Mitigation:**
- Ensure API has permissive CORS (`Access-Control-Allow-Origin: *`)
- Use simple requests (POST with text/plain content-type to avoid preflight)
- Provide fallback instructions (copy URL manually if bookmarklet fails)

**Residual Risk:** Very Low - CSP doesn't typically affect bookmarklet fetch requests

## Migration Plan

**Phase 1: Database Migration**
1. Run migration to add `bookmarklet_token` and `bookmarklet_token_created_at` columns
2. Verify existing users still function normally (nullable columns)

**Phase 2: Backend Deployment**
1. Deploy new bookmarklet endpoints
2. Monitor error rates and rate limiting metrics
3. Test with a small set of beta users before general availability

**Phase 3: Frontend Deployment**
1. Deploy Bookmarklet page and navigation
2. Announce feature to users via dashboard notification

**Rollback Plan:**
- Remove Bookmarklet page from navigation
- Disable bookmarklet endpoints (return 503)
- No database rollback needed (columns can remain)

**Data Migration:**
- No existing data to migrate
- Tokens generated on-demand when users visit Bookmarklet page

## Open Questions

1. **Should we support multiple active tokens per user?**
   - Leaning No - simplicity preferred, one token per user
   - User can regenerate if needed for different devices

2. **Should we track bookmarklet usage analytics?**
   - Leaning Yes - log item creations via bookmarklet to measure adoption
   - Add `source: 'bookmarklet'` field to items table (optional)

3. **Should we support custom wishlist selection or always use default?**
   - Leaning Yes - show all wishlists, let user choose (current design)
   - Enhances usability, worth the extra complexity
