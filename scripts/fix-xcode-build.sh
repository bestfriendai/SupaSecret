#!/bin/bash

# Fix Xcode Build Errors
# Resolves "unable to initiate PIF transfer session" and similar build issues

set -e

echo "🔧 Fixing Xcode Build Issues..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Kill any hanging Xcode processes
echo "${YELLOW}Step 1: Killing hanging Xcode processes...${NC}"
killall Xcode 2>/dev/null || true
killall xcodebuild 2>/dev/null || true
killall IBAgent 2>/dev/null || true
killall IBDesignablesAgent 2>/dev/null || true
sleep 2
echo "${GREEN}✓ Processes killed${NC}"
echo ""

# Step 2: Clean npm/node modules
echo "${YELLOW}Step 2: Cleaning npm cache and node_modules...${NC}"
rm -rf node_modules
rm -rf package-lock.json
npm cache clean --force
npm install
echo "${GREEN}✓ npm cleaned and reinstalled${NC}"
echo ""

# Step 3: Clean iOS build artifacts
echo "${YELLOW}Step 3: Cleaning iOS build artifacts...${NC}"
cd ios
rm -rf build
rm -rf Pods
rm -rf Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/*
echo "${GREEN}✓ iOS artifacts cleaned${NC}"
echo ""

# Step 4: Reinstall pods
echo "${YELLOW}Step 4: Reinstalling CocoaPods...${NC}"
pod deintegrate || true
pod install --repo-update
echo "${GREEN}✓ Pods reinstalled${NC}"
echo ""

# Step 5: Clean Expo
echo "${YELLOW}Step 5: Cleaning Expo cache...${NC}"
cd ..
npx expo prebuild --clean
echo "${GREEN}✓ Expo cleaned${NC}"
echo ""

# Step 6: Final cleanup
echo "${YELLOW}Step 6: Final cleanup...${NC}"
rm -rf .expo
rm -rf ios/build
watchman watch-del-all 2>/dev/null || true
echo "${GREEN}✓ Final cleanup complete${NC}"
echo ""

echo "${GREEN}✅ All cleanup steps completed!${NC}"
echo ""
echo "${YELLOW}Next steps:${NC}"
echo "1. Open Xcode: cd ios && open ToxicConfessions.xcworkspace"
echo "2. In Xcode: Product > Clean Build Folder (Cmd+Shift+K)"
echo "3. Close Xcode"
echo "4. Run: npx expo run:ios"
echo ""

