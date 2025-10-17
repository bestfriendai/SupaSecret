#!/bin/bash

# Sandbox Paywall Setup Script
# This script prepares your app for sandbox IAP testing

set -e  # Exit on error

echo "🚀 Setting up paywall for sandbox testing..."
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Clean existing builds
echo -e "${BLUE}Step 1: Cleaning build artifacts...${NC}"
rm -rf ios/build
rm -rf ios/Pods
rm -rf node_modules/.cache
echo -e "${GREEN}✅ Build artifacts cleaned${NC}"
echo ""

# Step 2: Verify dependencies
echo -e "${BLUE}Step 2: Installing dependencies...${NC}"
npm install --silent
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Install pods
echo -e "${BLUE}Step 3: Installing iOS pods...${NC}"
cd ios
pod install --silent
cd ..
echo -e "${GREEN}✅ Pods installed${NC}"
echo ""

# Step 4: Verify RevenueCat configuration
echo -e "${BLUE}Step 4: Verifying RevenueCat configuration...${NC}"

if grep -q "EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_" .env; then
    echo -e "${GREEN}✅ RevenueCat iOS API key found${NC}"
else
    echo -e "${RED}❌ RevenueCat iOS API key not found in .env${NC}"
    echo -e "${YELLOW}Please add: EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_key${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Configuration verified${NC}"
echo ""

# Step 5: Show instructions
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Setup Complete! Ready for sandbox testing${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Build and run the app:"
echo -e "   ${BLUE}npx expo run:ios --configuration Debug${NC}"
echo ""
echo "2. Wait for app to launch (may take 2-3 minutes)"
echo ""
echo "3. Navigate to the paywall screen"
echo ""
echo "4. Look for this in console:"
echo -e "   ${GREEN}✅ Found 3 packages${NC}"
echo -e "   ${GREEN}🔄 Ready for sandbox testing${NC}"
echo ""
echo "5. If products still don't load:"
echo "   - Delete the app from your device"
echo "   - Wait 5 more minutes (Apple server sync)"
echo "   - Run the build command again"
echo ""
echo -e "${YELLOW}Sandbox Testing:${NC}"
echo "• Sign out of your real Apple ID (Settings → App Store)"
echo "• Use your sandbox tester account when prompted"
echo "• Sandbox account email: [Your sandbox tester email]"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
