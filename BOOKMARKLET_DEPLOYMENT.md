# Bookmarklet Feature Deployment Guide

This guide covers deploying the new bookmarklet feature to your VPS.

## Quick Deployment Steps

### 1. Push to Repository

```bash
git push origin main
```

### 2. SSH into Your VPS

```bash
ssh your-username@your-vps-ip
```

### 3. Navigate to Project Directory

```bash
cd /opt/tofu-apps
# Or wherever you deployed the app
```

### 4. Pull Latest Changes

```bash
git pull origin main
```

### 5. Install Dependencies (if needed)

```bash
npm install
```

### 6. Run Database Migration

**IMPORTANT:** This adds the bookmarklet token columns to the users table.

```bash
npm run migrate:wishlist
```

You should see:
```
✅ Wishlist migrations completed successfully!
```

### 7. Build Everything

```bash
npm run build:all
```

This will:
- Build the backend (TypeScript → JavaScript)
- Build the wishlist frontend (includes new Bookmarklet page)
- Copy the built frontend to `apps/backend/public/wishlist/`

### 8. Restart PM2

```bash
pm2 restart all
```

Or restart just the backend:
```bash
pm2 restart unified-backend
```

### 9. Verify Deployment

Check PM2 status:
```bash
pm2 status
pm2 logs unified-backend --lines 50
```

Test the API endpoints:
```bash
# Health check
curl http://localhost:3000/health

# Test bookmarklet endpoints (after logging in)
curl http://localhost:3000/api/wishlist/bookmarklet/wishlists?token=invalid-token
# Should return: {"error":"Invalid bookmarklet token"}
```

### 10. Access the Bookmarklet Page

Visit your app in a browser:
```
https://your-domain.com/wishlist
```

Log in, then click the "📌 Bookmarklet" link in the header to access the new feature.

## Post-Deployment Verification

### Test the Complete Flow:

1. **Login to your Wishlist app**
2. **Click "📌 Bookmarklet" in the header**
3. **Click "Generate Bookmarklet"**
   - You should see a token, creation date, and expiration date
   - The "➕ Add to Wishlist" button should appear

4. **Drag the bookmarklet to your browser's bookmarks bar**
   - Make sure bookmarks bar is visible (Ctrl+Shift+B / Cmd+Shift+B)

5. **Test on a product page:**
   - Navigate to any e-commerce site (Amazon, eBay, etc.)
   - Click the "➕ Add to Wishlist" bookmark
   - Modal should appear showing your wishlists
   - Select a wishlist and click "Add Item"
   - Item should be added successfully

### Troubleshooting:

**Migration fails:**
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Check database exists
psql -U wishlist_user -d wishlist -c "\dt users"

# Verify columns were added
psql -U wishlist_user -d wishlist -c "\d users"
# Should show bookmarklet_token and bookmarklet_token_created_at columns
```

**Build fails:**
```bash
# Clean and rebuild
npm run clean
npm install
npm run build:all
```

**Frontend not loading:**
```bash
# Verify frontend was copied
ls -la apps/backend/public/wishlist/

# Should contain:
# - index.html
# - assets/ directory with JS and CSS files
# - vite.svg

# If missing, run copy script manually
node scripts/copy-frontends.js
```

**Bookmarklet token generation fails:**
```bash
# Check server logs
pm2 logs unified-backend

# Look for errors like:
# "column bookmarklet_token does not exist"
# If you see this, the migration didn't run properly

# Re-run migration
npm run migrate:wishlist
pm2 restart unified-backend
```

**CORS errors in browser console:**
- The bookmarklet needs to make cross-origin requests
- The CORS configuration was updated to `callback(null, true)` to allow all origins
- This is necessary for bookmarklets to work from any website
- Verify in `apps/backend/src/server.ts` that CORS allows all origins

## Production Considerations

### Security:

1. **Token Storage:**
   - Tokens are stored in the database with timestamps
   - 90-day automatic expiration
   - Unique constraint prevents duplicates

2. **Rate Limiting:**
   - Bookmarklet endpoints limited to 10 requests/minute
   - Prevents abuse if token is leaked
   - Can be adjusted in `apps/backend/src/wishlist/routes/bookmarklet.ts`

3. **HTTPS Required:**
   - Bookmarklets should only be used over HTTPS
   - Tokens are visible in bookmarklet code
   - HTTPS encrypts the token during transmission

### Monitoring:

```bash
# Watch for bookmarklet usage
pm2 logs unified-backend | grep bookmarklet

# Monitor rate limiting
pm2 logs unified-backend | grep "Rate limit exceeded"

# Check PM2 resource usage
pm2 monit
```

### Backup:

Before deploying, consider backing up your database:
```bash
pg_dump wishlist > wishlist_backup_$(date +%Y%m%d_%H%M%S).sql
```

## Rollback (if needed)

If something goes wrong:

```bash
# 1. Revert to previous commit
git reset --hard HEAD~1

# 2. Rebuild
npm run build:all

# 3. Restart PM2
pm2 restart all
```

The database migration is additive (adds columns), so it's safe to keep even if you rollback the code. Users just won't be able to use the bookmarklet feature until you redeploy.

## Environment Variables

No new environment variables are required for this feature. It uses existing configuration:
- `PORT` - Server port (default: 3000)
- Database credentials (already configured)
- JWT secret (already configured)

## Feature Usage Stats

To track bookmarklet adoption, you can query:

```sql
-- Count users with bookmarklet tokens
SELECT COUNT(*) FROM users WHERE bookmarklet_token IS NOT NULL;

-- Count active tokens (not expired)
SELECT COUNT(*) FROM users
WHERE bookmarklet_token IS NOT NULL
AND bookmarklet_token_created_at > NOW() - INTERVAL '90 days';

-- Items added via bookmarklet (if you want to track this later)
-- Currently all items have notes='Added via bookmarklet' when added this way
SELECT COUNT(*) FROM items WHERE notes = 'Added via bookmarklet';
```

## Support

If users report issues:
1. Check PM2 logs: `pm2 logs unified-backend`
2. Verify migration ran: `psql -U wishlist_user -d wishlist -c "\d users"`
3. Test API endpoints with curl
4. Check browser console for JavaScript errors
5. Verify CORS headers in Network tab

---

**Feature is production-ready!** 🚀

For questions or issues, refer to:
- `openspec/changes/add-wishlist-bookmarklet/` - Full design and requirements
- `openspec/project.md` - Project conventions and tech stack
