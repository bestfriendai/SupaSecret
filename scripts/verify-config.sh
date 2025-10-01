#!/bin/bash

# Verify Configuration Script
# Checks that all settings are correct for video recording and face blur

echo "🔍 Verifying Configuration..."
echo ""

# Check new architecture is disabled
echo "1️⃣ Checking new architecture settings..."

if grep -q '"newArchEnabled": "false"' ios/Podfile.properties.json 2>/dev/null; then
    echo "   ✅ iOS new architecture: DISABLED"
else
    echo "   ⚠️  iOS new architecture: NOT FOUND or ENABLED"
fi

if grep -q 'newArchEnabled: false' app.config.js 2>/dev/null; then
    echo "   ✅ App config new architecture: DISABLED"
else
    echo "   ⚠️  App config new architecture: NOT FOUND or ENABLED"
fi

echo ""

# Check Vision Camera version
echo "2️⃣ Checking Vision Camera..."
if npm ls react-native-vision-camera 2>/dev/null | grep -q "react-native-vision-camera@"; then
    VERSION=$(npm ls react-native-vision-camera 2>/dev/null | grep "react-native-vision-camera@" | head -1)
    echo "   ✅ Vision Camera installed: $VERSION"
else
    echo "   ⚠️  Vision Camera: NOT FOUND"
fi

echo ""

# Check Skia version
echo "3️⃣ Checking Skia..."
if npm ls @shopify/react-native-skia 2>/dev/null | grep -q "@shopify/react-native-skia@"; then
    VERSION=$(npm ls @shopify/react-native-skia 2>/dev/null | grep "@shopify/react-native-skia@" | head -1)
    echo "   ✅ Skia installed: $VERSION"
else
    echo "   ⚠️  Skia: NOT FOUND"
fi

echo ""

# Check Face Detector
echo "4️⃣ Checking Face Detector..."
if npm ls react-native-vision-camera-face-detector 2>/dev/null | grep -q "react-native-vision-camera-face-detector@"; then
    VERSION=$(npm ls react-native-vision-camera-face-detector 2>/dev/null | grep "react-native-vision-camera-face-detector@" | head -1)
    echo "   ✅ Face Detector installed: $VERSION"
else
    echo "   ⚠️  Face Detector: NOT FOUND"
fi

echo ""

# Check Podfile for frame processors
echo "5️⃣ Checking iOS Podfile..."
if [ -f "ios/Podfile" ]; then
    if head -5 ios/Podfile | grep -q "VCEnableFrameProcessors"; then
        echo "   ✅ Frame processors: ENABLED"
    else
        echo "   ⚠️  Frame processors: NOT FOUND in Podfile"
    fi
else
    echo "   ⚠️  iOS Podfile: NOT FOUND (run 'npx expo prebuild' first)"
fi

echo ""

# Check if pods are installed
echo "6️⃣ Checking iOS Pods..."
if [ -d "ios/Pods" ]; then
    echo "   ✅ Pods installed"
else
    echo "   ⚠️  Pods not installed (run 'cd ios && pod install')"
fi

echo ""

# Summary
echo "📋 Summary:"
echo ""
echo "If all checks show ✅, your configuration is correct!"
echo ""
echo "If you see ⚠️  warnings:"
echo "  - New architecture warnings: Run clean rebuild"
echo "  - Missing packages: Run 'npm install'"
echo "  - Missing Podfile: Run 'npx expo prebuild'"
echo "  - Missing Pods: Run 'cd ios && pod install'"
echo ""
echo "To suppress Skia Canvas warnings, the app has been updated with LogBox.ignoreLogs"
echo ""
echo "Next steps:"
echo "  1. Test video recording in the app"
echo "  2. See docs/QUICK_TEST_GUIDE.md for testing instructions"
echo "  3. See docs/VIDEO_PREVIEW_FIX.md for detailed fix information"
echo ""

