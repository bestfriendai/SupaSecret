# Environment Variables Setup Guide - ToxicConfessions

## Overview
This guide explains how to set up environment variables for the ToxicConfessions app, including RevenueCat configuration, AdMob setup, and other external services.

Note: For local validation and development you can create a `.env.local` file in the project root with the keys below (do NOT commit real secrets). A `.env.local.sample` is provided as an example in the repo.

## Required Environment Variables

### RevenueCat Configuration
```bash
# iOS RevenueCat API Key (Required)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_revenuecat_ios_api_key_here

# Android RevenueCat API Key (Required)
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_revenuecat_android_api_key_here
```

### AdMob Configuration
```bash
# iOS AdMob App ID (Required for production)
EXPO_PUBLIC_ADMOB_IOS_APP_ID=your_admob_ios_app_id_here

# Android AdMob App ID (Required for production)
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=your_admob_android_app_id_here

# iOS Ad Unit IDs
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=your_admob_ios_banner_id_here
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=your_admob_ios_interstitial_id_here

# Android Ad Unit IDs
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=your_admob_android_banner_id_here
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=your_admob_android_interstitial_id_here
```

### Optional Services
```bash
# Google Analytics (Optional)
EXPO_PUBLIC_GOOGLE_ANALYTICS_ID=your_google_analytics_id_here

# Push Notifications (Optional)
EXPO_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id_here
```

## Setup Instructions

### 1. Development Setup

#### Option A: Local .env file (Recommended for development)
1. Copy the template:
   ```bash
   cp setup/.env.template .env
   ```

2. Edit `.env` file with your actual values:
   ```bash
   # Open .env in your editor
   nano .env
   ```

3. Add your development keys (use test/sandbox keys for development)

#### Option B: System Environment Variables
```bash
# Set variables in your shell profile
export EXPO_PUBLIC_REVENUECAT_IOS_KEY="your_ios_key_here"
export EXPO_PUBLIC_REVENUECAT_ANDROID_KEY="your_android_key_here"
```

### 2. Production Setup (EAS Build)

#### Step 1: Get Your API Keys

##### RevenueCat Keys
1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select your "ToxicConfessions" project
3. Go to **Project Settings** → **API Keys**
4. Copy the **Public SDK Key** for each platform:
   - iOS: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
   - Android: `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

##### AdMob Keys
1. Go to [AdMob Console](https://apps.admob.com)
2. Select your app or create a new one
3. Copy the **App ID** for each platform:
   - iOS: `EXPO_PUBLIC_ADMOB_IOS_APP_ID`
   - Android: `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`

#### Step 2: Set EAS Secrets
```bash
# RevenueCat API Keys
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "your_actual_ios_key" --scope project
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "your_actual_android_key" --scope project

# AdMob Configuration
eas secret:create --name EXPO_PUBLIC_ADMOB_IOS_APP_ID --value "your_actual_ios_app_id" --scope project
eas secret:create --name EXPO_PUBLIC_ADMOB_ANDROID_APP_ID --value "your_actual_android_app_id" --scope project

# Ad Unit IDs (if using specific ad units)
eas secret:create --name EXPO_PUBLIC_ADMOB_IOS_BANNER_ID --value "your_ios_banner_unit_id" --scope project
eas secret:create --name EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID --value "your_android_banner_unit_id" --scope project
```

### 3. CI/CD Setup (GitHub Actions, etc.)

Add these secrets to your CI/CD environment:
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- `EXPO_PUBLIC_ADMOB_IOS_APP_ID`
- `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`

## Environment Variable Reference

### RevenueCat Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat Public SDK Key for iOS | Yes | `appl_XXXXXXXXXXXXXXXXXXXXXXXXXX` |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat Public SDK Key for Android | Yes | `goog_XXXXXXXXXXXXXXXXXXXXXXXXXX` |

### AdMob Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `EXPO_PUBLIC_ADMOB_IOS_APP_ID` | AdMob App ID for iOS | Yes | `ca-app-pub-XXXXXXXXXX~YYYYYYYYYY` |
| `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID` | AdMob App ID for Android | Yes | `ca-app-pub-XXXXXXXXXX~YYYYYYYYYY` |
| `EXPO_PUBLIC_ADMOB_IOS_BANNER_ID` | Banner ad unit ID for iOS | No | `ca-app-pub-XXXXXXXXXX/YYYYYYYYYY` |
| `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID` | Banner ad unit ID for Android | No | `ca-app-pub-XXXXXXXXXX/YYYYYYYYYY` |

### Optional Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `EXPO_PUBLIC_GOOGLE_ANALYTICS_ID` | Google Analytics tracking ID | No | `G-XXXXXXXXXX` |
| `EXPO_PUBLIC_ONESIGNAL_APP_ID` | OneSignal App ID for push notifications | No | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |

## Validation

### 1. Check Configuration Validity

Run the built-in validation script:
```bash
# From the project root
node setup/validate-config.js
```

This will check:
- ✅ All required environment variables are set
- ✅ No placeholder values are present
- ✅ Configuration files exist and are valid
- ✅ Product definitions are consistent

### 2. Manual Verification

1. **Check RevenueCat Configuration**:
   ```typescript
   import { validateProductionConfig } from './src/config/production';

   const validation = validateProductionConfig();
   console.log('Validation result:', validation);
   ```

2. **Test RevenueCat Connection**:
   ```typescript
   import { RevenueCatService } from './src/services/RevenueCatService';

   // Initialize and check connection
   await RevenueCatService.initialize();
   const offerings = await RevenueCatService.getOfferings();
   console.log('RevenueCat connection:', offerings ? '✅ Success' : '❌ Failed');
   ```

### 3. EAS Build Validation

Before building for production, validate your setup:
```bash
# Check that all EAS secrets are set
eas secret:list --scope project

# Test build configuration
eas build:configure
```

## Troubleshooting

### Common Issues

#### "Invalid API Key" Error
- **Problem**: RevenueCat API keys are incorrect or expired
- **Solution**:
  - Verify keys are copied correctly from RevenueCat dashboard
  - Ensure you're using Public SDK Keys, not Secret API Keys
  - Check that keys match the correct platform (iOS/Android)

#### "No Offerings Found" Error
- **Problem**: Products or offerings not configured in RevenueCat
- **Solution**:
  - Verify products exist in RevenueCat dashboard
  - Check that product IDs match between app and dashboard
  - Ensure offerings are published (not in draft mode)

#### Environment Variables Not Loading
- **Problem**: `.env` file not being read by Expo
- **Solution**:
  - Ensure `.env` file is in project root
  - Restart Metro bundler: `npx expo start --clear`
  - Check file permissions on `.env`

#### EAS Build Using Wrong Secrets
- **Problem**: Production build not picking up EAS secrets
- **Solution**:
  - Verify secret names match exactly (case-sensitive)
  - Check secret scope is set to `project`
  - Redeploy after updating secrets

### Debug Information

Enable debug logging:
```typescript
// In development, debug logs are automatically enabled
// Check console for detailed error messages
```

### Getting Help

1. **RevenueCat Support**:
   - Check [RevenueCat Documentation](https://docs.revenuecat.com/)
   - Review [React Native Guide](https://docs.revenuecat.com/docs/react-native)

2. **AdMob Support**:
   - Check [AdMob Documentation](https://developers.google.com/admob)
   - Review [Expo AdMob Guide](https://docs.expo.dev/versions/latest/sdk/admob/)

3. **Environment Variables**:
   - Check [Expo Environment Variables Guide](https://docs.expo.dev/guides/environment-variables/)

## Security Best Practices

### ✅ Do's
- Use different API keys for development and production
- Store sensitive keys in EAS secrets for production builds
- Rotate keys periodically
- Use Public SDK Keys (not Secret API Keys) in client-side code
- Validate keys before deploying

### ❌ Don'ts
- Never commit API keys to version control
- Never use Secret API Keys in client-side code
- Never share keys between different environments
- Never use placeholder values in production

## Quick Setup Checklist

- [ ] Create RevenueCat account and project
- [ ] Configure platforms in RevenueCat dashboard
- [ ] Create products and entitlements in RevenueCat
- [ ] Set up offerings in RevenueCat
- [ ] Get API keys from RevenueCat dashboard
- [ ] Set up AdMob account and get App IDs
- [ ] Create `.env` file for development
- [ ] Set EAS secrets for production
- [ ] Run validation script
- [ ] Test configuration in development build
- [ ] Test configuration in production build

## Next Steps

1. ✅ Set up environment variables
2. ⏳ Test subscription flow (see TESTING.md)
3. ⏳ Set up production store listings
4. ⏳ Monitor subscription metrics
5. ⏳ Optimize conversion rates

---

**Last Updated**: January 2025
**Version**: 1.0.0

For detailed RevenueCat setup instructions, see [REVENUECAT_SETUP.md](REVENUECAT_SETUP.md).