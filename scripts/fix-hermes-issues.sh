#!/bin/bash

# Hermes Constructor Error Fix Script
# This script cleans and rebuilds the project to resolve Hermes-specific issues

echo "🔧 Starting Hermes constructor error fix..."

# Step 1: Clean all caches and build artifacts
echo "📦 Cleaning caches and build artifacts..."
rm -rf node_modules
rm -rf .expo
rm -rf ios/build
rm -rf android/app/build
rm -rf android/.gradle

# Clean iOS specific files
if [ -d "ios" ]; then
    echo "🍎 Cleaning iOS build artifacts..."
    cd ios
    rm -rf Pods
    rm -rf Podfile.lock
    rm -rf build
    cd ..
fi

# Clean Metro cache
echo "🚇 Clearing Metro cache..."
npx expo start --clear --no-dev --minify 2>/dev/null || true
npx react-native start --reset-cache 2>/dev/null || true

# Step 2: Reinstall dependencies
echo "📥 Reinstalling dependencies..."
npm install

# Step 3: Reinstall iOS pods if iOS directory exists
if [ -d "ios" ]; then
    echo "🍎 Reinstalling iOS pods..."
    cd ios
    pod install --repo-update
    cd ..
fi

# Step 4: Clear Expo cache
echo "🧹 Clearing Expo cache..."
npx expo install --fix

# Step 5: Prebuild for native platforms (if using Expo)
echo "🏗️ Rebuilding native platforms..."
npx expo prebuild --clean

echo "✅ Hermes fix complete!"
echo ""
echo "🚀 To start the app:"
echo "   npx expo start --clear"
echo ""
echo "📱 If issues persist:"
echo "   1. Restart Metro bundler completely"
echo "   2. Close and reopen Expo Go app"
echo "   3. Try on a different device/simulator"
echo ""
echo "🐛 For debugging:"
echo "   - Check Metro logs for constructor errors"
echo "   - Look for 'Player pause failed during disposal' warnings"
echo "   - Monitor Hermes engine logs in device console"
