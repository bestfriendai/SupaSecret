# Toxic Confessions - App Store Submission Status

**Date**: September 29, 2025
**App Version**: 1.0.0
**Bundle ID**: com.toxic.confessions

---

## ⚠️ CRITICAL: NOT READY FOR SUBMISSION

Your app has **critical blockers** that must be resolved before submission to the App Store or Google Play Store.

---

## 🚨 BLOCKING ISSUES

### 1. **TEST API KEYS IN PRODUCTION BUILD** ❌
**Severity**: CRITICAL - App will be rejected immediately

Your `eas.json` production profile contains test/placeholder keys:

```json
"production": {
  "EXPO_PUBLIC_ADMOB_IOS_APP_ID": "ca-app-pub-3940256099942544~1458002511",  // Google's test ID
  "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID": "ca-app-pub-3940256099942544~3347511713",  // Google's test ID
  "EXPO_PUBLIC_REVENUECAT_IOS_KEY": "appl_test_revenuecat_ios_key",  // Placeholder
  "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY": "goog_test_revenuecat_android_key",  // Placeholder
  // ... all other keys are also test values
}
```

**Required Action**:
Update `eas.json` production profile with actual production keys. Use EAS Secrets instead of hardcoding:

```bash
# Use existing EAS secrets (already configured correctly)
# Remove hardcoded env vars from eas.json production profile
```

The correct keys are already in EAS Secrets:
- ✅ `EXPO_PUBLIC_REVENUECAT_IOS_KEY`: `appl_nXnAuBEeeERxBHxAzqhFgSnIzam`
- ✅ `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`: `goog_ffsiomTRezyIrsyrwwZTiCpjSiC`
- ✅ `EXPO_PUBLIC_ADMOB_IOS_APP_ID`: `ca-app-pub-9512493666273460~1466059369`
- ✅ `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`: `ca-app-pub-9512493666273460~8236030580`

**Fix**: Remove the `env` object from `eas.json` production profile entirely, or replace with EAS Secret references.

---

### 2. **In-App Purchases Not Configured in Stores** ❌
**Severity**: CRITICAL - Purchases will not work

RevenueCat is configured with these product IDs:
- iOS: `com.toxic.confessions.monthly`, `com.toxic.confessions.annual`, `com.toxic.confessions.lifetime`
- Android: `com.toxic.confessions.monthly:monthly-base`, `com.toxic.confessions.annual:annual-base`, `com.toxic.confessions.lifetime:lifetime-base`

**Required Action**:
1. **App Store Connect**: Create In-App Purchases matching iOS product IDs
2. **Google Play Console**: Create subscription products with base plans matching Android product IDs

Without these configured, the app will crash when users try to subscribe.

---

### 3. **Missing App Store Assets** ❌
**Severity**: CRITICAL - Cannot submit without assets

You need to provide:

**iOS App Store**:
- [ ] Screenshots (6.7", 6.5", 5.5" iPhone)
- [ ] iPad screenshots (12.9", 11" Pro) - if supporting iPad
- [ ] App Preview videos (optional but recommended)
- [ ] App Store description text
- [ ] Keywords
- [ ] Marketing URL (optional)
- [ ] Support URL (✅ configured: https://toxicconfessions.app/help)

**Google Play Store**:
- [ ] App icon 512x512
- [ ] Feature graphic 1024x500
- [ ] Phone screenshots (minimum 2)
- [ ] Tablet screenshots (if supporting tablets)
- [ ] Short description (80 characters)
- [ ] Full description (4000 characters)
- [ ] Categorization and content rating

---

## ⚠️ HIGH PRIORITY WARNINGS

### 4. **App Store Connect Setup Required** ⚠️
You need to:
- [ ] Create app record in App Store Connect
- [ ] Add app information and metadata
- [ ] Configure pricing and availability
- [ ] Set up TestFlight for beta testing
- [ ] Complete privacy questionnaire

### 5. **Google Play Console Setup Required** ⚠️
You need to:
- [ ] Create app in Google Play Console
- [ ] Configure store listing
- [ ] Complete data safety form (explain face/voice processing)
- [ ] Set content ratings
- [ ] Configure pricing and distribution
- [ ] Add release notes

### 6. **Privacy Policy Must Address AI/ML Processing** ⚠️
Your privacy URLs (✅ all accessible):
- https://toxicconfessions.app/privacy
- https://toxicconfessions.app/terms
- https://toxicconfessions.app/help

**Ensure your privacy policy explicitly covers**:
- On-device face detection (ML Kit)
- Voice pitch modification (FFmpeg)
- Video processing and anonymization
- That processed data never leaves the device unprocessed
- Data retention policies
- Third-party services (Supabase, RevenueCat, AdMob)

---

## ✅ WHAT'S WORKING

### Configuration ✅
- [x] Bundle identifiers configured correctly
- [x] App name: "Toxic Confessions"
- [x] Version 1.0.0, Build 1
- [x] New Architecture enabled
- [x] iOS deployment target: 15.1+
- [x] Android min SDK: 24, target SDK: 35

### RevenueCat Setup ✅
- [x] iOS app created in RevenueCat
- [x] Android app created in RevenueCat
- [x] Products created for both platforms
- [x] Entitlements configured (premium, pro, unlimited_videos)
- [x] Offerings and packages created
- [x] API keys stored in EAS Secrets
- [x] API keys stored in Supabase Secrets

### Infrastructure ✅
- [x] Supabase backend configured
- [x] AdMob integration ready
- [x] Environment variables in EAS Secrets
- [x] Privacy/Terms URLs live and accessible
- [x] Assets present (icon, splash, adaptive icon)

### Permissions ✅
- [x] iOS permission descriptions properly written
- [x] Android permissions declared
- [x] Camera, Microphone, Photo Library permissions configured

---

## 📋 IMMEDIATE NEXT STEPS

### Step 1: Fix eas.json Production Profile
**Priority**: CRITICAL

Edit `eas.json` and remove hardcoded test values:

```json
{
  "build": {
    "production": {
      "channel": "production",
      "ios": {
        "resourceClass": "m-medium",
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease"
      }
      // Remove the "env" object entirely - EAS Secrets will be used automatically
    }
  }
}
```

### Step 2: Create In-App Purchases
**Priority**: CRITICAL

**App Store Connect**:
1. Log into App Store Connect
2. Navigate to your app → Features → In-App Purchases
3. Create three subscriptions:
   - Product ID: `com.toxic.confessions.monthly`
   - Product ID: `com.toxic.confessions.annual`
   - Product ID: `com.toxic.confessions.lifetime`
4. Add pricing and descriptions

**Google Play Console**:
1. Log into Play Console
2. Navigate to Monetization → Subscriptions
3. Create three subscription products:
   - `com.toxic.confessions.monthly` with base plan `monthly-base`
   - `com.toxic.confessions.annual` with base plan `annual-base`
   - `com.toxic.confessions.lifetime` with base plan `lifetime-base`

### Step 3: Prepare Store Assets
**Priority**: CRITICAL

Use a tool or designer to create:
- App Store screenshots (use iPhone simulator + screen recording)
- Play Store screenshots
- Feature graphic
- Marketing copy and descriptions

### Step 4: Build and Test
**Priority**: HIGH

```bash
# Build production version
eas build --platform all --profile production

# Install on test device
# Test all functionality:
# - Video recording and anonymization
# - Face blur processing
# - Voice modulation
# - Subscription purchases (sandbox)
# - Ad display
```

### Step 5: Submit to Stores
**Priority**: FINAL

Only after all above steps are complete:
```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

---

## 🎯 ESTIMATED TIME TO READY

- **Fix eas.json**: 5 minutes
- **Create in-app purchases**: 1-2 hours (pending store approvals)
- **Prepare store assets**: 2-4 hours
- **Create store listings**: 1-2 hours
- **Build and test**: 1-2 hours
- **Review cycles**: 1-7 days (Apple), 1-3 days (Google)

**Total estimated time**: 1-2 weeks to first submission, assuming you have all assets ready.

---

## ⚡ QUICK FIX CHECKLIST

Before running your next production build:

- [ ] Remove test API keys from `eas.json` production profile
- [ ] Verify EAS Secrets contain production keys (✅ already done)
- [ ] Create in-app purchases in App Store Connect
- [ ] Create subscription products in Google Play Console
- [ ] Prepare all required screenshots
- [ ] Write store descriptions
- [ ] Complete store privacy questionnaires
- [ ] Test build on physical devices
- [ ] Submit for review

---

## 📞 SUPPORT

If you need help with any of these steps:
- RevenueCat docs: https://docs.revenuecat.com/
- App Store Connect: https://developer.apple.com/app-store-connect/
- Google Play Console: https://play.google.com/console/about/

---

**Status**: 🔴 NOT READY - Critical blockers must be resolved before submission.