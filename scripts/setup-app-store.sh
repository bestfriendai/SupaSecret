#!/bin/bash

# Complete App Store Connect Setup for Toxic Confessions
# Creates both the app and in-app purchases

set -e

echo "================================================"
echo "Toxic Confessions - Complete App Store Setup"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

echo -e "${BLUE}This script will:${NC}"
echo ""
echo "  1️⃣  Create app in App Store Connect"
echo "      • Name: Toxic Confessions"
echo "      • Bundle ID: com.toxic.confessions"
echo ""
echo "  2️⃣  Create three in-app purchases:"
echo "      • Monthly Subscription (com.toxic.confessions.monthly)"
echo "      • Annual Subscription (com.toxic.confessions.annual)"
echo "      • Lifetime Purchase (com.toxic.confessions.lifetime)"
echo ""
echo -e "${YELLOW}⚠️  Requirements:${NC}"
echo "  • Apple Developer account (active membership)"
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
echo "Running Fastlane complete setup..."
echo ""

# Run fastlane
fastlane ios setup_complete

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "What's been created:"
echo "  ✓ App in App Store Connect"
echo "  ✓ Bundle ID: com.toxic.confessions"
echo "  ✓ Three in-app purchases"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Log into App Store Connect:"
echo "   https://appstoreconnect.apple.com"
echo ""
echo "2. Complete app information:"
echo "   • Add app description"
echo "   • Add screenshots (required)"
echo "   • Set category"
echo "   • Add app icon"
echo "   • Set age rating"
echo ""
echo "3. Complete in-app purchase details:"
echo "   • Set pricing for each product"
echo "   • Add localized descriptions"
echo "   • Add product screenshots"
echo ""
echo "4. Build and submit:"
echo "   eas build --platform ios --profile production"
echo "   eas submit --platform ios --profile production"
echo ""