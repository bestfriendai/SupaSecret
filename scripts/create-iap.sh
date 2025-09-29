#!/bin/bash

# Create In-App Purchases for Toxic Confessions
# This script uses Fastlane to automate IAP creation in App Store Connect

set -e

echo "================================================"
echo "Toxic Confessions - In-App Purchase Setup"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if fastlane is installed
if ! command -v fastlane &> /dev/null; then
    echo -e "${RED}❌ Fastlane is not installed${NC}"
    echo ""
    echo "Install with: brew install fastlane"
    exit 1
fi

echo -e "${GREEN}✓ Fastlane installed${NC}"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

echo "This script will create the following In-App Purchases:"
echo ""
echo "  1. Monthly Subscription (com.toxic.confessions.monthly)"
echo "  2. Annual Subscription (com.toxic.confessions.annual)"
echo "  3. Lifetime Purchase (com.toxic.confessions.lifetime)"
echo ""
echo -e "${YELLOW}⚠️  Requirements:${NC}"
echo "  • Your app must already exist in App Store Connect"
echo "  • You need an Apple Developer account"
echo "  • If you have 2FA enabled, generate an app-specific password:"
echo "    https://appleid.apple.com/account/manage"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Running Fastlane..."
echo ""

# Run fastlane
fastlane ios create_iap

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}Setup complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Log into App Store Connect: https://appstoreconnect.apple.com"
echo "2. Navigate to: My Apps → Toxic Confessions → Features → In-App Purchases"
echo "3. Complete pricing and localization for each product"
echo "4. Add product screenshots and descriptions"
echo "5. Submit with your app for review"
echo ""