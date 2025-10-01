# 🚀 SupaSecret Complete Setup Guide - September 2025

This comprehensive guide covers the complete setup process for SupaSecret (Toxic Confessions), including Expo 54 setup, dependency management, database configuration, and all necessary configuration steps.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Expo 54 Setup](#expo-54-setup)
- [Dependency Management](#dependency-management)
- [Database Setup (Supabase)](#database-setup-supabase)
- [Configuration Steps](#configuration-steps)
- [RevenueCat MCP Setup](#revenuecat-mcp-setup)
- [Troubleshooting](#troubleshooting)
- [Common Issues](#common-issues)
- [Verification Steps](#verification-steps)
- [Next Steps](#next-steps)

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js 18+** and **npm** or **yarn**
- **Expo CLI**: `npm install -g @expo/cli`
- **EAS CLI**: `npm install -g eas-cli`
- **Supabase CLI**: `npm install -g supabase`
- **Git** for version control
- **Apple Developer Account** (for iOS builds)
- **Google Play Console Account** (for Android builds)
- **RevenueCat Account** (for subscriptions)
- **AdMob Account** (for monetization)

## ⚡ Expo 54 Setup

### 1. Install Expo CLI and Dependencies

```bash
# Install Expo CLI globally
npm install -g @expo/cli

# Install EAS CLI for builds
npm install -g eas-cli

# Verify installations
expo --version
eas --version
```

### 2. Clone and Initialize Project

```bash
# Clone the repository
git clone <repository-url>
cd SupaSecret

# Install dependencies
npm install

# Login to Expo (if not already logged in)
expo login
```

### 3. Configure Expo Application Services (EAS)

```bash
# Initialize EAS (if not already done)
eas build:configure

# Login to EAS
eas login

# Verify account
eas whoami
```

### 4. Environment Setup

```bash
# Copy environment template
cp setup/.env.template .env

# Edit .env with your configuration (see Configuration Steps below)
nano .env
```

### 5. Start Development Server

```bash
# Start Expo development server
npm start

# Or with clear cache
npm run start-clean

# For iOS simulator
npm run ios

# For Android emulator
npm run android
```

### 6. Expo 54 Specific Configuration

The project is configured for Expo SDK 54 with:

- **React Native 0.81.4**
- **React 19.1.0**
- **New Architecture enabled**
- **Hermes engine**
- **TypeScript 5.9.0**

Key Expo 54 features utilized:

- Enhanced video processing with `expo-video`
- Improved camera capabilities with `expo-camera`
- Advanced audio handling with `expo-audio`
- NativeWind for styling
- Vision Camera integration

## 📦 Dependency Management

### Core Dependencies

The project uses the following major dependencies:

```json
{
  "expo": "~54.0.10",
  "react": "^19.1.0",
  "react-native": "0.81.4",
  "typescript": "^5.9.0",
  "@supabase/supabase-js": "^2.42.7",
  "react-native-purchases": "^9.4.2",
  "react-native-google-mobile-ads": "^13.2.0"
}
```

### Installing Dependencies

```bash
# Install all dependencies
npm install

# Install iOS pods (macOS only)
cd ios && pod install && cd ..

# Clean install (if issues occur)
rm -rf node_modules package-lock.json
npm install
```

### Development Dependencies

Key dev dependencies include:

- **ESLint** and **Prettier** for code quality
- **TypeScript** for type checking
- **Tailwind CSS** with NativeWind
- **Patch Package** for dependency patches

### Dependency Scripts

```bash
# Run linting
npm run lint

# Run type checking
npm run typecheck

# Fix common issues
npm run fix-hermes
```

## 🗄️ Database Setup (Supabase)

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Initialize Supabase (Local Development)

```bash
# Start Supabase locally
supabase start

# This will start:
# - PostgreSQL database (port 54325)
# - Supabase API (port 54331)
# - Supabase Studio (port 54332)
# - Storage API
# - Edge Functions
```

### 3. Database Configuration

The project includes pre-configured Supabase settings:

- **Project ID**: SupaSecret
- **Database Version**: PostgreSQL 17
- **Storage Buckets**: videos, images
- **Migrations**: Located in `supabase/migrations/`

### 4. Apply Migrations

```bash
# Apply database migrations
supabase db push

# Reset database (development only)
supabase db reset
```

### 5. Seed Database (Optional)

```bash
# Run seed files
supabase db seed
```

### 6. Supabase Configuration Files

- `supabase/config.toml` - Main configuration
- `supabase/schema.sql` - Database schema
- `supabase/migrations/` - Database migrations
- `src/lib/supabase.ts` - Client configuration

### 7. Environment Variables for Supabase

Add to your `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## ⚙️ Configuration Steps

### 1. Environment Variables Setup

Copy the template and configure:

```bash
cp setup/.env.template .env
```

Required environment variables:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# RevenueCat
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_ios_key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_android_key

# AdMob
EXPO_PUBLIC_ADMOB_IOS_APP_ID=your_ios_admob_app_id
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=your_android_admob_app_id

# Optional
EXPO_PUBLIC_GOOGLE_ANALYTICS_ID=your_analytics_id
EXPO_PUBLIC_ONESIGNAL_APP_ID=your_push_notification_key
```

### 2. EAS Secrets (Production)

For production builds, use EAS secrets:

```bash
# RevenueCat keys
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value "your_ios_key" --scope project
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value "your_android_key" --scope project

# AdMob keys
eas secret:create --name EXPO_PUBLIC_ADMOB_IOS_APP_ID --value "your_ios_app_id" --scope project
eas secret:create --name EXPO_PUBLIC_ADMOB_ANDROID_APP_ID --value "your_android_app_id" --scope project
```

### 3. App Configuration

Update `app.config.js` if needed:

- **Bundle ID**: `com.toxic.confessions`
- **Package Name**: `com.toxic.confessions`
- **App Name**: Toxic Confessions
- **Version**: 1.0.0

### 4. Build Configuration

Configure EAS build profiles in `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "channel": "production"
    }
  }
}
```

## 💰 RevenueCat MCP Setup

### What Was Done

- Updated `scripts/mcp-setup-revenuecat.ts` to read MCP API key from environment
- Generated configuration files using MCP simulation

### Command Used

```bash
REVENUECAT_MCP_API_KEY=sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz npx tsx scripts/mcp-setup-revenuecat.ts
```

### Generated Files

- `setup/mcp-revenuecat-config.json` — Full MCP configuration
- `setup/mcp-store-configuration.json` — Store configuration for App Store/Google Play
- `setup/mcp-setup-summary.json` — Setup summary
- `setup/mcp-test-results.json` — Test results

### Next Steps for RevenueCat

1. **Create RevenueCat Project**
   - Go to https://app.revenuecat.com
   - Create project "Toxic Confessions"

2. **Configure Platforms**
   - iOS: Bundle ID `com.toxic.confessions`
   - Android: Package name `com.toxic.confessions`

3. **Create Products**
   - `supasecret_plus_monthly` - $4.99/month
   - `supasecret_plus_annual` - $29.99/year

4. **Create Entitlement**
   - `supasecret_plus` - Premium access

5. **Create Offering**
   - `default_offering` with both products

6. **Store Setup**
   - Create products in App Store Connect
   - Create products in Google Play Console
   - Link to RevenueCat products

### Verification

```bash
# Run RevenueCat verification
npm run verify-revenuecat
```

## 🔧 Troubleshooting

### Expo 54 Issues

#### Metro Bundler Issues

```bash
# Clear cache and restart
npm run start-clean

# Reset Metro cache
npx expo start --clear
```

#### iOS Build Issues

```bash
# Clean iOS build
cd ios && rm -rf build && cd ..
npm run ios
```

#### Android Build Issues

```bash
# Clean Android build
cd android && ./gradlew clean && cd ..
npm run android
```

### Dependency Issues

#### Package Installation Failures

```bash
# Clear npm cache
npm cache clean --force

# Clean install
rm -rf node_modules package-lock.json
npm install
```

#### Pod Install Issues (iOS)

```bash
# Clean CocoaPods
cd ios && rm -rf Pods Podfile.lock && cd ..
npm run ios
```

### Supabase Issues

#### Local Supabase Not Starting

```bash
# Stop all services
supabase stop

# Start fresh
supabase start
```

#### Database Connection Issues

```bash
# Check Supabase status
supabase status

# Reset database
supabase db reset
```

## 🚨 Common Issues

### 1. "Invalid API Key" Errors

**RevenueCat:**

- Verify API keys in `.env` file
- Ensure using Public SDK Keys, not Secret API Keys
- Check platform-specific keys (iOS/Android)

**Supabase:**

- Verify URL and anon key
- Check network connectivity
- Ensure Supabase is running locally

### 2. Build Failures

**EAS Build:**

- Check EAS secrets are set correctly
- Verify environment variables
- Check build logs for specific errors

**Local Build:**

- Ensure all dependencies installed
- Check Xcode/Android Studio versions
- Verify Expo CLI version compatibility

### 3. Runtime Errors

**Camera/Audio Permissions:**

- Check app permissions in device settings
- Verify permission requests in code
- Test on physical device vs simulator

**Video Processing:**

- Check file system permissions
- Verify FFmpeg installation
- Check available storage space

### 4. Subscription Issues

**RevenueCat:**

- Verify products created in app stores
- Check entitlement configuration
- Test with sandbox accounts

**Purchase Flow:**

- Ensure proper error handling
- Check network connectivity
- Verify receipt validation

### 5. Database Issues

**Connection Problems:**

- Check Supabase local status
- Verify connection strings
- Check firewall settings

**Migration Failures:**

- Review migration files
- Check database schema
- Verify migration order

## ✅ Verification Steps

### 1. Environment Setup Verification

```bash
# Run configuration validation
node setup/validate-config.js

# Check environment variables
echo $EXPO_PUBLIC_SUPABASE_URL
echo $EXPO_PUBLIC_REVENUECAT_IOS_KEY
```

### 2. Dependency Verification

```bash
# Check installations
npm list expo
npm list react-native
npm list @supabase/supabase-js

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

### 3. Database Verification

```bash
# Check Supabase status
supabase status

# Test database connection
npx tsx scripts/test-supabase-connection.ts
```

### 4. RevenueCat Verification

```bash
# Run RevenueCat verification
npm run verify-revenuecat

# Test offerings
npx tsx scripts/test-revenuecat-offerings.ts
```

### 5. Build Verification

```bash
# Test development build
eas build --platform ios --profile development

# Test production build (dry run)
eas build --platform ios --profile production --no-submit
```

### 6. App Functionality Tests

**Core Features:**

- [ ] App launches successfully
- [ ] Authentication works
- [ ] Video recording functions
- [ ] Video processing completes
- [ ] Upload to Supabase succeeds

**Premium Features:**

- [ ] Subscription purchase works
- [ ] Premium status updates
- [ ] Ad-free experience activates
- [ ] Enhanced features unlock

**Monetization:**

- [ ] Ads display correctly
- [ ] AdMob integration works
- [ ] Analytics tracking functions

## 🚀 Next Steps

### Immediate Actions

1. ✅ **Complete Environment Setup**
   - Configure all required environment variables
   - Set up EAS secrets for production

2. ⏳ **Test Core Functionality**
   - Run app in development mode
   - Test video recording and processing
   - Verify Supabase integration

3. ⏳ **Set Up RevenueCat Production**
   - Create products in app stores
   - Configure RevenueCat dashboard
   - Test subscription flows

4. ⏳ **Configure Monetization**
   - Set up AdMob properly
   - Test ad integration
   - Configure analytics

### Production Deployment

1. **Build Production Versions**

   ```bash
   eas build --platform ios --profile production
   eas build --platform android --profile production
   ```

2. **Submit to App Stores**
   - Prepare store listings
   - Submit for review
   - Set up pricing and availability

3. **Monitor and Optimize**
   - Track user engagement
   - Monitor subscription metrics
   - Optimize conversion rates

### Ongoing Maintenance

- **Update Dependencies**: Keep Expo and React Native updated
- **Monitor Performance**: Track app performance and crashes
- **User Support**: Handle user issues and feedback
- **Feature Development**: Plan and implement new features

## 📞 Support Resources

- **Expo Documentation**: https://docs.expo.dev/
- **Supabase Docs**: https://supabase.com/docs
- **RevenueCat Docs**: https://docs.revenuecat.com/
- **React Native**: https://reactnative.dev/docs
- **EAS Build**: https://docs.expo.dev/build/introduction/

## 🔒 Security Notes

- **Never commit secrets** to version control
- **Use EAS secrets** for production environment variables
- **Rotate API keys** periodically
- **Validate configurations** before deployment
- **Monitor for vulnerabilities** in dependencies

---

**Last Updated**: September 2025
**Version**: 1.0.0
**App**: SupaSecret (Toxic Confessions)
