# Change: Add Bookmarklet for Quick Item Addition

## Why

Users currently need to manually copy product URLs from shopping websites, navigate to the Wishlist app, and paste the URL to add items. This multi-step process is cumbersome and disrupts the browsing experience. A bookmarklet would allow users to add items to their wishlist directly from any product page with a single click, significantly improving the user experience and encouraging more frequent wishlist usage.

## What Changes

- Add a bookmarklet generator page in the Wishlist web app that creates a personalized bookmarklet with the user's authentication token
- Create a new public API endpoint (`POST /api/wishlist/bookmarklet/add-item`) that accepts item creation requests from the bookmarklet without requiring the standard JWT header (authentication via URL-embedded token)
- Implement a bookmarklet JavaScript snippet that:
  - Captures the current page URL
  - Displays a compact overlay UI on the host page
  - Shows the user's wishlists in a dropdown
  - Sends the item to the selected wishlist via the API
  - Shows success/error feedback
- Add security measures including token expiration, rate limiting, and CORS considerations for cross-origin requests from bookmarklet
- Add a "Generate Bookmarklet" page accessible from the user's dashboard

## Impact

- **Affected specs**: `wishlist-items` (new capability)
- **Affected code**:
  - Backend: `apps/backend/src/wishlist/routes/bookmarklet.ts` (new)
  - Backend: `apps/backend/src/wishlist/controllers/bookmarkletController.ts` (new)
  - Frontend: `apps/wishlist-web/src/pages/Bookmarklet.tsx` (new)
  - Frontend: `apps/wishlist-web/src/App.tsx` (add route)
  - Database: `ALTER TABLE users ADD COLUMN bookmarklet_token` (new migration)
