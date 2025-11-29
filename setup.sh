#!/bin/bash
# Unified Apps Setup Script
# Run this script on your VPS to set up the application

set -e

echo "=========================================="
echo "Unified Apps Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
   echo "❌ Please do not run as root. Run as your regular user."
   exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p uploads/wishlist
mkdir -p public/wishlist
mkdir -p public/seacalendar

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp .env.example .env
    echo "⚙️  Please edit .env with your actual configuration values!"
    echo "   Run: nano .env"
    exit 0
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npm run generate

# Build TypeScript
echo ""
echo "🔨 Building application..."
npm run build

# Check if databases exist and run migrations
echo ""
echo "🗄️  Database migrations..."
echo "   Note: Make sure PostgreSQL is running and databases are created!"
echo ""

read -p "Run Wishlist migrations? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run migrate:wishlist
fi

read -p "Run SeaCalendar migrations? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run migrate:seacalendar
fi

echo ""
echo "=========================================="
echo "✅ Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Build and copy your frontend applications:"
echo "   - Wishlist: copy build to ./public/wishlist/"
echo "   - SeaCalendar: copy build to ./public/seacalendar/"
echo ""
echo "2. Start the application:"
echo "   pm2 start ecosystem.config.cjs"
echo ""
echo "3. Save PM2 configuration:"
echo "   pm2 save"
echo ""
echo "4. Setup PM2 to start on boot:"
echo "   pm2 startup"
echo ""
echo "5. Monitor your apps:"
echo "   pm2 status"
echo "   pm2 logs"
echo "   pm2 monit"
echo ""
echo "For more details, see DEPLOYMENT.md"
echo ""
