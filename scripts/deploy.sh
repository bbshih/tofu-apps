#!/bin/bash
# Deploy unified-apps to production VPS

set -e

echo "=========================================="
echo "Unified Apps Deployment"
echo "=========================================="
echo ""

# Configuration
VPS_USER="deploy"
VPS_HOST="100.76.160.26"
VPS_PATH="/opt/tofu-apps"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from project root"
    exit 1
fi

# Confirm deployment
echo "This will deploy to: ${VPS_USER}@${VPS_HOST}:${VPS_PATH}"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Build all apps
echo ""
echo "📦 Building applications..."
npm run build:all

# Deploy wishlist frontend
echo ""
echo "🚀 Deploying wishlist frontend..."
rsync -avz --delete apps/backend/public/wishlist/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/apps/backend/public/wishlist/

# Deploy calendar frontend
echo ""
echo "🚀 Deploying calendar frontend..."
rsync -avz --delete apps/backend/public/calendar/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/apps/backend/public/calendar/

# Deploy backend code
echo ""
echo "🚀 Deploying backend code..."
rsync -avz apps/backend/dist/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/apps/backend/dist/

# Restart PM2
echo ""
echo "🔄 Restarting PM2 process..."
ssh ${VPS_USER}@${VPS_HOST} 'pm2 restart unified-backend'

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: Clear Cloudflare cache!"
echo ""
echo "1. Go to Cloudflare Dashboard"
echo "2. Navigate to Caching → Configuration"
echo "3. Click 'Purge Everything'"
echo ""
echo "Or purge specific URLs:"
echo "  - https://wishlist.billyeatstofu.com/"
echo "  - https://cal.billyeatstofu.com/"
echo ""
