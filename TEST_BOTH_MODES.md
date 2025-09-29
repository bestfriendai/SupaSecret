# 🧪 Test Both Modes - Quick Guide

## ⚡ Quick Test Commands

### Test 1: Expo Go (2 minutes)
```bash
# Start Expo Go
npm start

# Scan QR code with Expo Go app
# Expected: Blue banner "Expo Go: Post-processing mode"
```

### Test 2: Native Build (5 minutes)
```bash
# iOS
npx expo run:ios --device

# Android
npx expo run:android --device

# Expected: Green indicator "Face Blur Active"
```

---

## ✅ Quick Verification

### Expo Go Mode
1. Open app in Expo Go
2. See **blue banner** at top
3. Navigate to video recording
4. Start recording
5. Stop recording
6. Click "Next"
7. Wait 30-60s for processing
8. See blurred video

### Native Build Mode
1. Open app on device
2. See **green indicator** in status pill
3. Navigate to video recording
4. Start recording
5. **See real-time blur** (faces blurred immediately)
6. Stop recording
7. Click "Next" (instant, no wait)
8. See blurred video

---

## 🎯 Success Indicators

| Mode | Visual Indicator | Processing Time | Face Blur |
|------|------------------|-----------------|-----------|
| **Expo Go** | 🔵 Blue banner | 30-60 seconds | Post-processing |
| **Native Build** | 🟢 Green indicator | 0 seconds | Real-time (60 FPS) |

---

## 🐛 Troubleshooting

### Expo Go not working?
```bash
# Clear cache and restart
npm run start-clean
```

### Native build not working?
```bash
# iOS: Reinstall pods
cd ios && pod install && cd ..
npx expo run:ios --device

# Android: Clean build
cd android && ./gradlew clean && cd ..
npx expo run:android --device
```

---

## 📊 What to Look For

### Expo Go Mode ✅
- Blue info banner visible
- Expo Camera used
- Post-processing after recording
- 30-60 second wait
- Faces blurred in final video

### Native Build Mode ✅
- Green status indicator
- Vision Camera used
- Real-time blur during recording
- Instant preview (no wait)
- Faces blurred in final video

---

## 🎉 Both Modes Working?

If both modes work correctly:
1. ✅ Expo Go shows blue banner and post-processes
2. ✅ Native build shows green indicator and real-time blur
3. ✅ Both produce videos with blurred faces

**You're ready for production!** 🚀

---

## 📞 Quick Commands

```bash
# Expo Go
npm start

# Native iOS
npx expo run:ios --device

# Native Android
npx expo run:android --device

# Production Build
eas build --profile production --platform all
```

---

**Status**: Ready to test both modes!

