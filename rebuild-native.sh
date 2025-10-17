#!/bin/bash

# Rebuild Native iOS Module Script
# This script rebuilds the iOS app with the native caption-burner fix

set -e  # Exit on error

echo "🔧 =========================================="
echo "🔧 REBUILDING NATIVE IOS MODULE"
echo "🔧 =========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run this script from project root"
  exit 1
fi

echo "📦 Step 1: Cleaning build artifacts..."
rm -rf ios/build
rm -rf ios/Pods
echo "✅ Cleaned ios/build and ios/Pods"
echo ""

echo "📦 Step 2: Reinstalling CocoaPods..."
cd ios
pod install
cd ..
echo "✅ CocoaPods installed"
echo ""

echo "🏗️  Step 3: Rebuilding iOS app with native changes..."
echo "⚠️  NOTE: This will open the iOS build. Make sure you have Xcode installed!"
echo "⚠️  You may need to manually select your device/simulator in Xcode."
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

npx expo run:ios

echo ""
echo "✅ =========================================="
echo "✅ REBUILD COMPLETE!"
echo "✅ =========================================="
echo ""
echo "Next steps:"
echo "1. The app should now be running on your device/simulator"
echo "2. Test by recording a video, adding blur/captions, and sharing"
echo "3. Check console logs for the new debug output:"
echo "   - '📹 Using source frame rate: X FPS'"
echo "   - '✅ Export COMPLETED successfully'"
echo "   - '✅ Output file size: X.XX MB'"
echo ""
echo "4. Verify the uploaded video shows video frames (not black!)"
echo ""
