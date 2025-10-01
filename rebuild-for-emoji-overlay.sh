#!/bin/bash

# Emoji Overlay Fix - Complete Rebuild Script
# This script rebuilds the app with New Architecture and fixed frame processors

set -e  # Exit on any error

echo "🧹 Cleaning build artifacts..."
rm -rf ios/Pods ios/Podfile.lock ios/build node_modules/.cache

echo "📦 Rebuilding iOS project with New Architecture..."
npx expo prebuild --clean --platform ios

echo "📲 Installing CocoaPods dependencies..."
cd ios && pod install && cd ..

echo "✅ Rebuild complete!"
echo ""
echo "Next steps:"
echo "1. Run: npx expo run:ios"
echo "2. Test face detection by moving your face in camera view"
echo "3. Test emoji overlay by selecting different emoji styles"
echo "4. Record a video and verify emojis are captured"
echo "5. Play back the video to confirm emojis are visible"
echo ""
echo "📚 See EMOJI_OVERLAY_FIX.md for detailed documentation"
