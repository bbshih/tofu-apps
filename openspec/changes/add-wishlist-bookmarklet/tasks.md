# Implementation Tasks

## 1. Database Schema
- [x] 1.1 Create migration to add `bookmarklet_token` column to `users` table (TEXT, nullable, unique)
- [x] 1.2 Create migration to add `bookmarklet_token_created_at` column to `users` table (TIMESTAMP, nullable)
- [x] 1.3 Run migration and verify schema changes

## 2. Backend API
- [x] 2.1 Create bookmarklet controller with token generation endpoint
- [x] 2.2 Create bookmarklet controller with public add-item endpoint (token-based auth)
- [x] 2.3 Create bookmarklet controller with wishlists-by-token endpoint
- [x] 2.4 Add bookmarklet routes to Express router
- [x] 2.5 Add rate limiting middleware specific to bookmarklet endpoints
- [x] 2.6 Update CORS configuration to allow bookmarklet requests from any origin

## 3. Bookmarklet JavaScript
- [x] 3.1 Create bookmarklet script template with URL capture
- [x] 3.2 Implement overlay UI (modal with wishlist selector)
- [x] 3.3 Add API communication logic (fetch user wishlists, submit item)
- [x] 3.4 Add success/error feedback UI
- [x] 3.5 Add close/cancel functionality
- [x] 3.6 Minify and encode bookmarklet script for deployment

## 4. Frontend UI
- [x] 4.1 Create Bookmarklet page component with instructions
- [x] 4.2 Implement token generation UI (generate/regenerate button)
- [x] 4.3 Display bookmarklet as draggable link
- [x] 4.4 Add copy-to-clipboard functionality
- [x] 4.5 Add visual instructions for installing bookmarklet
- [x] 4.6 Add route to App.tsx for `/bookmarklet` path
- [x] 4.7 Add navigation link from Dashboard to Bookmarklet page

## 5. Security & Testing
- [x] 5.1 Implement token expiration (90 days default)
- [x] 5.2 Add token validation middleware
- [x] 5.3 Test bookmarklet on various e-commerce sites (Amazon, eBay, etc.)
- [x] 5.4 Test rate limiting behavior
- [x] 5.5 Test token regeneration flow
- [x] 5.6 Verify CORS headers work correctly

## 6. Documentation
- [ ] 6.1 Update README with bookmarklet feature description
- [ ] 6.2 Add user-facing documentation for bookmarklet installation
