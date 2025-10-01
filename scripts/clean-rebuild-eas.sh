#!/bin/bash

# Clean and Rebuild with EAS Local Build
# This script performs a complete clean and rebuild for iOS

set -e  # Exit on error

echo "🧹 Starting Clean and Rebuild Process..."
echo ""

# Step 1: Clean iOS
echo "1️⃣ Cleaning iOS..."
if [ -d "ios" ]; then
    echo "   Removing iOS Pods..."
    rm -rf ios/Pods
    rm -f ios/Podfile.lock
    
    echo "   Deintegrating CocoaPods..."
    cd ios
    pod deintegrate 2>/dev/null || echo "   (No pods to deintegrate)"
    cd ..
    
    echo "   Removing build artifacts..."
    rm -rf ios/build
    rm -rf ~/Library/Developer/Xcode/DerivedData/*
    
    echo "   ✅ iOS cleaned"
else
    echo "   ⚠️  iOS folder not found (will be created during prebuild)"
fi

echo ""

# Step 2: Clean Android
echo "2️⃣ Cleaning Android..."
if [ -d "android" ]; then
    echo "   Removing Android build artifacts..."
    rm -rf android/build
    rm -rf android/.gradle
    rm -rf android/app/build
    
    if [ -f "android/gradlew" ]; then
        echo "   Running gradle clean..."
        cd android
        ./gradlew clean 2>/dev/null || echo "   (Gradle clean skipped)"
        cd ..
    fi
    
    echo "   ✅ Android cleaned"
else
    echo "   ⚠️  Android folder not found (will be created during prebuild)"
fi

echo ""

# Step 3: Clean Node modules and cache
echo "3️⃣ Cleaning Node modules and cache..."
echo "   Removing node_modules..."
rm -rf node_modules

echo "   Clearing npm cache..."
npm cache clean --force

echo "   Clearing Metro bundler cache..."
rm -rf .expo
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-map-*

echo "   ✅ Cache cleaned"

echo ""

# Step 4: Reinstall dependencies
echo "4️⃣ Reinstalling dependencies..."
npm install

echo "   ✅ Dependencies installed"

echo ""

# Step 5: Run prebuild
echo "5️⃣ Running Expo prebuild..."
npx expo prebuild --clean

echo "   ✅ Prebuild complete"

echo ""

# Step 6: Install iOS Pods
echo "6️⃣ Installing iOS Pods..."
if [ -d "ios" ]; then
    cd ios
    pod install
    cd ..
    echo "   ✅ Pods installed"
else
    echo "   ❌ iOS folder not found after prebuild"
    exit 1
fi

echo ""

# Step 7: Verify configuration
echo "7️⃣ Verifying configuration..."
./scripts/verify-config.sh

echo ""

# Step 8: Build with EAS
echo "8️⃣ Building with EAS (local)..."
echo ""
echo "Choose build type:"
echo "  1) Development build (for testing)"
echo "  2) Preview build (internal testing)"
echo "  3) Production build (App Store)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Building development build locally..."
        eas build --profile development --platform ios --local
        ;;
    2)
        echo ""
        echo "🚀 Building preview build locally..."
        eas build --profile preview --platform ios --local
        ;;
    3)
        echo ""
        echo "🚀 Building production build locally..."
        eas build --profile production --platform ios --local
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "  1. Install the build on your device"
echo "  2. Test video recording and preview"
echo "  3. Verify no Skia Canvas warnings"
echo "  4. Test face blur functionality"
echo ""

