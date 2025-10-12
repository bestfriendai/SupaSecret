#!/bin/bash

# Rebuild Development Build Script
# Fixes AdMob configuration and rebuilds iOS development build

set -e  # Exit on error

echo "🔧 Toxic Confessions - Development Build Rebuild"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "app.config.js" ]; then
    print_error "app.config.js not found. Please run this script from the project root."
    exit 1
fi

print_status "Found project root"

# Step 1: Clean iOS build artifacts
echo ""
echo "📦 Step 1: Cleaning iOS build artifacts..."
if [ -d "ios" ]; then
    cd ios
    rm -rf build Pods Podfile.lock
    print_status "Cleaned iOS build artifacts"
    cd ..
else
    print_warning "ios/ directory not found (will be generated)"
fi

# Step 2: Clean Metro bundler cache
echo ""
echo "🧹 Step 2: Cleaning Metro bundler cache..."
rm -rf node_modules/.cache
rm -rf .expo
print_status "Cleaned Metro cache"

# Step 3: Reset Watchman (if installed)
echo ""
echo "👁️  Step 3: Resetting Watchman..."
if command -v watchman &> /dev/null; then
    watchman watch-del "$(pwd)" 2>/dev/null || true
    watchman watch-project "$(pwd)"
    print_status "Watchman reset complete"
else
    print_warning "Watchman not installed (optional)"
fi

# Step 4: Verify configuration
echo ""
echo "🔍 Step 4: Verifying configuration..."

# Check if google-mobile-ads.json exists
if [ -f "google-mobile-ads.json" ]; then
    print_status "google-mobile-ads.json found"
else
    print_error "google-mobile-ads.json not found!"
    exit 1
fi

# Check if .env exists
if [ -f ".env" ]; then
    print_status ".env file found"
else
    print_warning ".env file not found (using defaults)"
fi

# Step 5: Install dependencies (if needed)
echo ""
echo "📥 Step 5: Checking dependencies..."
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found, installing..."
    npm install
    print_status "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

# Step 6: Prebuild (regenerate native projects)
echo ""
echo "🏗️  Step 6: Regenerating native projects..."
print_warning "This will regenerate the ios/ directory"
npx expo prebuild --clean --platform ios
print_status "Native projects regenerated"

# Step 7: Install CocoaPods
echo ""
echo "💎 Step 7: Installing CocoaPods..."
cd ios
pod install
print_status "CocoaPods installed"
cd ..

# Step 8: Build and run
echo ""
echo "🚀 Step 8: Building and running development build..."
echo ""
print_warning "This will take a few minutes..."
echo ""

# Ask user which device to use
echo "Select build target:"
echo "  1) iOS Simulator (default)"
echo "  2) Physical iOS Device"
read -p "Enter choice [1-2] (default: 1): " choice

case $choice in
    2)
        print_status "Building for physical device..."
        npx expo run:ios --device
        ;;
    *)
        print_status "Building for simulator..."
        npx expo run:ios
        ;;
esac

echo ""
echo "================================================"
print_status "Build complete!"
echo ""
echo "📱 The app should now launch successfully."
echo ""
echo "Expected behavior:"
echo "  ✓ No AdMob configuration warnings"
echo "  ✓ App launches on first attempt"
echo "  ✓ Initialization logs appear once"
echo "  ✓ App UI displays properly"
echo ""
echo "If you encounter issues, check DEVELOPMENT_BUILD_FIX.md"
echo "================================================"

