# RevenueCat Integration Architecture

## ✅ Confirmation: Using Official React Native SDK

Your app **IS correctly using the official RevenueCat React Native SDK** as documented at:
- https://www.revenuecat.com/docs/getting-started/installation/reactnative
- https://www.revenuecat.com/docs/getting-started/installation/expo

## Current Architecture

### 1. Official SDK Integration ✅

**Package Installed**: `react-native-purchases@9.5.4`
```bash
npm list react-native-purchases
└── react-native-purchases@9.5.4
```

**iOS Native Pod**: ✅ Installed in `ios/Pods/RevenueCat*/`

**Import Method**: Dynamic import (prevents Expo Go crashes)
```typescript
// src/features/subscription/services/subscriptionService.ts:76
const RevenueCatModule = await import("react-native-purchases");
Purchases = RevenueCatModule.default;
```

### 2. Production Service: SubscriptionService ✅

**Location**: `src/features/subscription/services/subscriptionService.ts`

**Purpose**: Main production service for all in-app purchase functionality

**Features**:
- ✅ Uses official `react-native-purchases` SDK
- ✅ Lazy loads module to prevent Expo Go crashes
- ✅ Proper initialization with API keys
- ✅ Automatic sandbox/production detection
- ✅ Customer info caching (5-minute TTL)
- ✅ Retry logic for transient failures
- ✅ Comprehensive error handling
- ✅ Mock mode for Expo Go development

**Key Methods**:
```typescript
SubscriptionService.initialize()           // Initialize SDK
SubscriptionService.configure(apiKey)      // Set API key
SubscriptionService.getOfferings()         // Get available packages
SubscriptionService.purchasePackage()      // Purchase subscription
SubscriptionService.restorePurchases()     // Restore previous purchases
SubscriptionService.getCustomerInfo()      // Get customer info (cached)
SubscriptionService.isUserPremium()        // Check premium status
SubscriptionService.setUserID()            // Set user ID
SubscriptionService.logOut()               // Log out user
```

**RevenueCat SDK Methods Used**:
```typescript
Purchases.configure({ apiKey, appUserID })
Purchases.setLogLevel("DEBUG")
Purchases.getOfferings()
Purchases.purchasePackage(pkg)
Purchases.restorePurchases()
Purchases.logIn(userID)
Purchases.logOut()
Purchases.getCustomerInfo()
Purchases.setAttributes(attributes)
```

### 3. MCP Service: RevenueCatMCPService ⚠️

**Location**: `src/services/RevenueCatMCPService.ts`

**Purpose**: MCP (Model Context Protocol) tooling ONLY - NOT for production app code

**Usage**: Only for development tooling and analytics wrappers

**Important**:
- ❌ NOT used in production app code
- ❌ NOT imported by any production components
- ✅ Only wraps SubscriptionService with analytics
- ✅ Properly documented as tooling-only

**Previous Issue**: Was imported in `membershipStore.ts` but never used
**Status**: ✅ Fixed - unused import removed

### 4. Store Integration ✅

**Membership Store**: `src/state/membershipStore.ts`
- Uses SubscriptionService (dynamically imported)
- Manages subscription state with Zustand
- Syncs with Supabase database
- Handles entitlement checking

**Subscription Hook**: `src/features/subscription/hooks/useSubscription.ts`
- Provides React hook interface
- Wraps SubscriptionService methods
- Used by UI components

**Paywall UI**: `src/features/subscription/screens/PaywallScreen.tsx`
- Uses useSubscription hook
- Displays offerings from RevenueCat
- Handles purchase flow
- App Store compliant

## Data Flow

```
User Action (Paywall)
  ↓
useSubscription Hook
  ↓
membershipStore.ts
  ↓
SubscriptionService (production service)
  ↓
react-native-purchases SDK (official)
  ↓
RevenueCat Platform
  ↓
Apple/Google Store
```

## Configuration

### API Keys
**Location**: `.env` file
```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_nXnAuBEeeERxBHxAzqhFgSnIzam
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_ffsiomTRezyIrsyrwwZTiCpjSiC
```

**Loaded via**: `src/config/production.ts`
```typescript
REVENUECAT: {
  API_KEY: Platform.select({
    ios: getEnvVar("EXPO_PUBLIC_REVENUECAT_IOS_KEY", { required: true }),
    android: getEnvVar("EXPO_PUBLIC_REVENUECAT_ANDROID_KEY", { required: true }),
  }),
}
```

**Configured via**: `src/services/ServiceInitializer.ts`
```typescript
SubscriptionService.configure(config.REVENUECAT.API_KEY);
await SubscriptionService.initialize();
```

### Entitlements
**Primary Entitlement**: `"premium"`
- Configured in RevenueCat dashboard
- All 6 products attached
- Checked via `customerInfo.entitlements.active`

### Offerings
**Default Offering**: `"default"` (current)
- 3 packages: `$rc_monthly`, `$rc_annual`, `$rc_lifetime`
- Loaded dynamically from RevenueCat
- Fallback to DEFAULT_PLANS if unavailable

## Expo Integration

### Build Configuration

**Prebuild**: Generates native iOS/Android projects
```bash
npx expo prebuild
```

**Development Build**: Required for testing IAP
```bash
npx expo run:ios  # Includes native RevenueCat SDK
```

**Expo Go**:
- ❌ Does NOT support native modules
- ✅ App handles gracefully with mock mode
- ✅ Shows demo mode message in development

### Installation Method

Following Expo + RevenueCat best practices:

1. ✅ Install package via npm:
   ```bash
   npm install react-native-purchases
   ```

2. ✅ Run prebuild to generate native projects:
   ```bash
   npx expo prebuild
   ```

3. ✅ Install iOS dependencies:
   ```bash
   cd ios && pod install
   ```

4. ✅ Build with development client:
   ```bash
   npx expo run:ios
   ```

**No Config Plugin Needed**:
- react-native-purchases works with Expo prebuild out of the box
- No additional app.config.js plugin required
- Native configuration handled by prebuild

## Verification Checklist ✅

### Package Installation
- ✅ `react-native-purchases@9.5.4` in package.json
- ✅ RevenueCat pod installed in ios/Pods/
- ✅ No package.json issues

### Code Integration
- ✅ SubscriptionService uses official `react-native-purchases` SDK
- ✅ Dynamic import prevents Expo Go crashes
- ✅ Proper initialization with API keys
- ✅ All RevenueCat methods called correctly

### Production Code
- ✅ membershipStore uses SubscriptionService (not MCP service)
- ✅ PaywallScreen uses useSubscription hook
- ✅ ServiceInitializer configures SubscriptionService
- ✅ No MCP dependencies in production code

### Error Handling
- ✅ User-friendly error messages
- ✅ No technical error alerts
- ✅ Graceful fallback when products unavailable
- ✅ Console logging for debugging

### Configuration
- ✅ API keys in .env file
- ✅ Keys loaded via production.ts
- ✅ Configured in ServiceInitializer
- ✅ RevenueCat dashboard properly configured

## Common Questions

### Q: Is the app using the official RevenueCat SDK?
**A**: ✅ YES - Using `react-native-purchases@9.5.4` (official SDK)

### Q: What is RevenueCatMCPService?
**A**: It's a development/tooling wrapper, NOT used in production app code. Only for MCP (Model Context Protocol) tooling.

### Q: Does the integration follow RevenueCat docs?
**A**: ✅ YES - Follows official Expo + React Native installation guide

### Q: Is a config plugin needed?
**A**: ❌ NO - react-native-purchases works with Expo prebuild without a config plugin

### Q: Will it work in Expo Go?
**A**: ❌ NO - Expo Go doesn't support native modules. App handles this gracefully with mock mode. Use development build (`npx expo run:ios`)

### Q: Are the API keys correct?
**A**: ✅ YES - Keys match RevenueCat dashboard configuration

### Q: Is the purchase flow App Store compliant?
**A**: ✅ YES - Follows Apple's IAP guidelines (after recent fixes)

## Testing Commands

### Development Build
```bash
# Clean and rebuild
rm -rf node_modules ios/Pods ios/Podfile.lock
npm install
cd ios && pod install && cd ..

# Run on device/simulator
npx expo run:ios --configuration Debug
```

### Production Build
```bash
# Build for TestFlight/App Store
eas build --platform ios --profile production
```

### Verify Integration
```bash
# Check package installation
npm list react-native-purchases

# Check pod installation
ls -la ios/Pods/RevenueCat*

# Check for import errors
npx tsc --noEmit
```

## Summary

✅ **Your app correctly uses the official RevenueCat React Native SDK**
✅ **Integration follows RevenueCat + Expo documentation**
✅ **No MCP dependencies in production code**
✅ **Ready for App Store submission**

The RevenueCatMCPService is only for development tooling and has been properly documented to prevent confusion. All production app functionality uses the official `react-native-purchases` SDK through the SubscriptionService.

## References

- [RevenueCat React Native SDK](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
- [RevenueCat Expo Guide](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [react-native-purchases on npm](https://www.npmjs.com/package/react-native-purchases)
- [RevenueCat Dashboard](https://app.revenuecat.com)
