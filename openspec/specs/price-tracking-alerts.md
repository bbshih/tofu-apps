# Price Tracking & Alerts

## Overview
Enable users to track price changes on their wishlist items and receive notifications when prices drop. The system will periodically check prices and alert users via email or in-app notifications when items go on sale or drop below a target price.

## Goals
1. Automatically track price history for wishlist items
2. Notify users when prices drop significantly
3. Allow users to set custom price targets ("alert me when under $50")
4. Provide price history visualization
5. Help users find the best time to buy

## Non-Goals
- Real-time price monitoring (too resource-intensive)
- Price comparison across retailers (future feature)
- Browser extension for live price display
- SMS notifications (email only for MVP)

## User Stories

### As a user, I want to:
1. See the current price vs. the price when I added an item
2. View a price history chart for any item
3. Set a target price and get notified when it's reached
4. See which items are currently on sale
5. Get a daily/weekly digest of price drops
6. Know the lowest price an item has ever been

### As the system, it should:
1. Check prices periodically (every 6-12 hours)
2. Store price history efficiently
3. Handle sites that block scraping gracefully
4. Not overwhelm external sites with requests
5. Clean up old price data to manage storage

## Technical Design

### Database Schema

```sql
-- Price history for each item
CREATE TABLE item_price_history (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  sale_price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'USD',
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source VARCHAR(50) DEFAULT 'scraper' -- 'scraper', 'manual', 'bookmarklet'
);

CREATE INDEX idx_price_history_item_id ON item_price_history(item_id);
CREATE INDEX idx_price_history_checked_at ON item_price_history(checked_at);

-- User price alerts
CREATE TABLE price_alerts (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_price DECIMAL(10, 2), -- NULL means "any drop"
  percentage_drop INTEGER, -- e.g., 20 means "alert on 20% drop"
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_id, user_id)
);

-- Notification preferences
ALTER TABLE users ADD COLUMN price_alert_email BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN price_digest_frequency VARCHAR(20) DEFAULT 'daily'; -- 'daily', 'weekly', 'never'

-- Add tracking fields to items
ALTER TABLE items ADD COLUMN last_price_check TIMESTAMP;
ALTER TABLE items ADD COLUMN lowest_price DECIMAL(10, 2);
ALTER TABLE items ADD COLUMN lowest_price_date TIMESTAMP;
ALTER TABLE items ADD COLUMN highest_price DECIMAL(10, 2);
ALTER TABLE items ADD COLUMN price_at_addition DECIMAL(10, 2);
```

### API Endpoints

```
GET    /api/wishlist/items/:id/price-history
       Returns price history for an item
       Query params: ?days=30 (default 90)

POST   /api/wishlist/items/:id/price-alert
       Create or update a price alert
       Body: { target_price?: number, percentage_drop?: number }

DELETE /api/wishlist/items/:id/price-alert
       Remove price alert for an item

GET    /api/wishlist/price-alerts
       Get all active price alerts for current user

GET    /api/wishlist/price-drops
       Get items with recent price drops
       Query params: ?days=7

PATCH  /api/wishlist/settings/notifications
       Update notification preferences
       Body: { price_alert_email: boolean, price_digest_frequency: string }
```

### Background Job: Price Checker

A scheduled job that runs every 6 hours:

```typescript
// Pseudocode for price checking job
async function checkPrices() {
  // Get items that need checking (haven't been checked in 6+ hours)
  // Prioritize items with active alerts
  const items = await getItemsToCheck({
    hasAlert: true, // Check alerted items first
    lastCheckBefore: hoursAgo(6),
    limit: 500 // Process in batches
  });

  for (const item of items) {
    try {
      // Rate limit: wait between requests to same domain
      await rateLimitByDomain(item.domain);

      const newPrice = await scrapePrice(item.original_url);

      if (newPrice) {
        await recordPrice(item.id, newPrice);
        await checkAlerts(item, newPrice);
        await updateItemStats(item.id, newPrice);
      }
    } catch (error) {
      // Log but don't fail entire job
      await recordCheckFailure(item.id, error);
    }
  }
}

async function checkAlerts(item, newPrice) {
  const alerts = await getActiveAlerts(item.id);

  for (const alert of alerts) {
    const shouldNotify =
      (alert.target_price && newPrice.price <= alert.target_price) ||
      (alert.percentage_drop && calculateDrop(item, newPrice) >= alert.percentage_drop);

    if (shouldNotify && !recentlyNotified(alert)) {
      await sendPriceAlertEmail(alert, item, newPrice);
      await markAlertNotified(alert.id);
    }
  }
}
```

### Price Drop Detection

```typescript
interface PriceDrop {
  item: Item;
  previousPrice: number;
  currentPrice: number;
  dropAmount: number;
  dropPercentage: number;
  isAllTimeLow: boolean;
}

function detectPriceDrop(item: Item, newPrice: number): PriceDrop | null {
  const previousPrice = item.price || item.price_at_addition;

  if (!previousPrice || newPrice >= previousPrice) {
    return null;
  }

  const dropAmount = previousPrice - newPrice;
  const dropPercentage = (dropAmount / previousPrice) * 100;

  // Only report drops of 5% or more (filter noise)
  if (dropPercentage < 5) {
    return null;
  }

  return {
    item,
    previousPrice,
    currentPrice: newPrice,
    dropAmount,
    dropPercentage,
    isAllTimeLow: newPrice < (item.lowest_price || Infinity)
  };
}
```

### Email Templates

**Instant Price Alert:**
```
Subject: Price Drop Alert: {item.product_name} is now ${newPrice}!

{item.product_name} dropped from ${oldPrice} to ${newPrice} ({dropPercentage}% off)!

{if isAllTimeLow}
  This is the LOWEST PRICE we've seen!
{/if}

[View Item] [Buy Now]

---
You're receiving this because you set a price alert for this item.
[Manage alerts]
```

**Daily/Weekly Digest:**
```
Subject: Your Wishlist Price Drops - {count} items on sale

Hey {user.name},

{count} items on your wishlist have dropped in price:

{for item in priceDrops}
  - {item.product_name}: ${oldPrice} → ${newPrice} ({dropPercentage}% off)
    {if isAllTimeLow} ALL-TIME LOW! {/if}
{/for}

[View All Items]

---
[Change digest frequency] [Unsubscribe]
```

## Frontend Components

### 1. Price History Chart (Item Detail)

Small sparkline or expandable chart showing price over time:
- X-axis: dates
- Y-axis: price
- Highlight current price, lowest price, price when added
- Show sale prices in different color

### 2. Price Alert Button

On each item card and detail view:
- Bell icon that's filled when alert is active
- Click to set/edit target price
- Quick options: "Alert on any drop", "Alert at $X", "Alert at X% off"

### 3. Price Drops Dashboard

New section on main dashboard or dedicated page:
- List of items with recent price drops
- Sorted by drop percentage
- Filter by: last 24h, last 7 days, last 30 days
- "All-time low" badge

### 4. Item Card Enhancements

Show on each item card:
- Price change indicator (green down arrow, red up arrow)
- "X% off" badge when on sale
- "Lowest price!" badge when at all-time low
- Small trend indicator (mini sparkline)

### 5. Settings Page Addition

Add notification preferences:
- Toggle: Email me about price drops
- Frequency: Instant / Daily digest / Weekly digest / Never
- Quiet hours (optional)

## Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Database migrations for price history and alerts
- [ ] Price history recording on item create/update
- [ ] Basic price history API endpoint
- [ ] Simple price history display in item detail

### Phase 2: Alerts
- [ ] Price alert CRUD endpoints
- [ ] Alert button UI on item cards
- [ ] Background job for price checking
- [ ] Email notification for alerts

### Phase 3: Polish
- [ ] Price history chart visualization
- [ ] Price drops dashboard
- [ ] Daily/weekly digest emails
- [ ] Item card price indicators

### Phase 4: Optimization
- [ ] Smart scheduling (check popular items more often)
- [ ] Failure handling and retry logic
- [ ] Price data cleanup job (archive old data)
- [ ] Rate limiting per domain

## Edge Cases & Considerations

### Scraping Challenges
- **Bot protection**: Some sites block scrapers. Fall back to showing "Price unavailable" and skip those items.
- **Price variations**: Same item may show different prices based on size/color. Store the URL-specific price.
- **Out of stock**: Items may go out of stock. Track availability separately.
- **Currency**: Store currency with price. Don't compare prices across currencies.

### Data Management
- **Storage growth**: Price history grows over time. Keep daily snapshots, aggregate older data weekly/monthly.
- **Deleted items**: CASCADE delete price history when item deleted.
- **Inactive users**: Don't check prices for users who haven't logged in for 30+ days.

### Notification Fatigue
- **Throttling**: Don't send more than 1 alert per item per 24 hours.
- **Grouping**: Batch multiple drops into digest rather than individual emails.
- **Significance threshold**: Only alert on drops > 5% to avoid noise from minor fluctuations.

## Success Metrics
- % of users who set at least one price alert
- % of price alerts that result in a purchase (if we track that)
- Email open/click rates for price alerts
- Reduction in manual price checking (user surveys)

## Future Enhancements
- Push notifications (web/mobile)
- Price comparison across retailers
- "Best time to buy" predictions based on historical patterns
- Integration with browser extension for real-time price display
- Camelcamelcamel-style price tracking page per item
