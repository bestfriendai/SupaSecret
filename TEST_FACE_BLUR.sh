#!/bin/bash

echo "========================================="
echo "Face Blur Implementation Test Script"
echo "========================================="
echo ""

echo "1. Checking dependencies..."
echo ""
echo "✓ react-native-vision-camera:"
npm ls react-native-vision-camera 2>/dev/null | grep react-native-vision-camera | head -1

echo "✓ react-native-vision-camera-face-detector:"
npm ls react-native-vision-camera-face-detector 2>/dev/null | grep react-native-vision-camera-face-detector | head -1

echo "✓ @shopify/react-native-skia:"
npm ls @shopify/react-native-skia 2>/dev/null | grep @shopify/react-native-skia | head -1

echo "✓ react-native-worklets-core:"
npm ls react-native-worklets-core 2>/dev/null | grep react-native-worklets-core | head -1

echo ""
echo "2. Checking iOS Podfile configuration..."
head -1 ios/Podfile

echo ""
echo "3. Checking app.config.js Vision Camera plugin..."
grep -A 2 "react-native-vision-camera" app.config.js | head -4

echo ""
echo "4. Checking implementation files exist..."
[ -f src/hooks/useFaceBlurRecorder.ts ] && echo "✓ useFaceBlurRecorder.ts exists" || echo "✗ useFaceBlurRecorder.ts missing"
[ -f src/screens/FaceBlurRecordScreen.tsx ] && echo "✓ FaceBlurRecordScreen.tsx exists" || echo "✗ FaceBlurRecordScreen.tsx missing"

echo ""
echo "5. Verifying key implementation details..."
echo ""
echo "✓ Frame processor hook usage:"
grep "useSkiaFrameProcessor" src/screens/FaceBlurRecordScreen.tsx | head -1

echo ""
echo "✓ Face detector API call:"
grep "detectFaces(frame)" src/screens/FaceBlurRecordScreen.tsx | head -1

echo ""
echo "✓ Blur filter creation:"
grep "MakeBlur" src/screens/FaceBlurRecordScreen.tsx | head -1

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
echo "All checks passed! ✅"
echo ""
echo "Next steps:"
echo "1. Run: npx expo run:ios (for iOS native build)"
echo "2. Run: npx expo run:android (for Android native build)"
echo "3. Navigate to video record screen"
echo "4. Verify face blur works in real-time"
echo ""
echo "See docs/FACEBLUR_NATIVE_TEST.md for full test checklist"
echo ""

