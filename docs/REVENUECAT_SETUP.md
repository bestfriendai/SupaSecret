# RevenueCat Setup Guide - ToxicConfessions Plus

## Overview

This guide provides comprehensive instructions for setting up RevenueCat for the ToxicConfessions app, including product configuration, environment variables, and testing procedures.

## Current Implementation Status

✅ **Already Implemented:**

- RevenueCat service with TypeScript interfaces
- Mock offerings for development
- Supabase integration for subscription status syncing
- Enhanced MCP service with analytics
- Production configuration structure
- Error handling and retry logic

## Step 1: RevenueCat Dashboard Setup

### 1.1 Create RevenueCat Account

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Sign up for a free account
3. Create a new project named "ToxicConfessions"

### 1.2 Configure Platforms

#### iOS Configuration

1. Go to **Project Settings** → **Platforms** → **iOS**
2. Enter your App Store Bundle ID: `com.toxic.confessions`
3. Enable **Sandbox** for testing
4. Add your **App Store Connect API Key** (for receipts validation)

#### Android Configuration

1. Go to **Project Settings** → **Platforms** → **Android**
2. Enter your Package Name: `com.toxic.confessions`
3. Enable **Sandbox** for testing
4. Configure your **Google Play Service Account** (for receipts validation)

### 1.3 Create Products

#### Monthly Subscription

1. Go to **Products** → **Create Product**
2. **Product ID**: `supasecret_plus_monthly`
3. **Product Type**: Subscription
4. **Duration**: 1 month
5. **Price**: $4.99 USD
6. **Store Product ID**: Configure for each platform:
   - iOS: Leave blank initially (will be set when published)
   - Android: Leave blank initially (will be set when published)

#### Annual Subscription

1. Go to **Products** → **Create Product**
2. **Product ID**: `supasecret_plus_annual`
3. **Product Type**: Subscription
4. **Duration**: 1 year
5. **Price**: $29.99 USD
6. **Store Product ID**: Configure for each platform:
   - iOS: Leave blank initially (will be set when published)
   - Android: Leave blank initially (will be set when published)

### 1.4 Create Offering

1. Go to **Offerings** → **Create Offering**
2. **Offering ID**: `default_offering`
3. **Display Name**: "ToxicConfessions Plus"
4. Add both products to the offering:
   - Monthly: `supasecret_plus_monthly`
   - Annual: `supasecret_plus_annual` (set as popular)

### 1.5 Create Entitlement

1. Go to **Entitlements** → **Create Entitlement**
2. **Entitlement ID**: `supasecret_plus`
3. **Display Name**: "Premium Access"
4. Link this entitlement to both subscription products

## Step 2: Environment Variables Setup

### 2.1 Required Environment Variables

Create a `.env` file in your project root with the following variables:

```bash
# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_IOS_KEY=your_revenuecat_ios_api_key_here
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=your_revenuecat_android_api_key_here

# AdMob Configuration (Required for production)
EXPO_PUBLIC_ADMOB_IOS_APP_ID=your_admob_ios_app_id_here
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=your_admob_android_app_id_here
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=your_admob_ios_banner_id_here
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=your_admob_android_banner_id_here
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=your_admob_ios_interstitial_id_here
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=your_admob_android_interstitial_id_here

# Optional: Analytics
EXPO_PUBLIC_GOOGLE_ANALYTICS_ID=your_google_analytics_id_here

# Optional: Push Notifications
EXPO_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id_here
```

### 2.2 Get RevenueCat API Keys

1. Go to **Project Settings** → **API Keys**
2. Copy the **Public SDK Key** for each platform:
   - iOS Public SDK Key → `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
   - Android Public SDK Key → `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

⚠️ **Important**: Never commit API keys to version control. Use environment variables or secure secret management.

### 2.3 EAS Build Secrets (Production)

For production builds, set up EAS secrets:

```bash
# Set RevenueCat keys as EAS secrets
eas secret:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value your_ios_key_here --scope project
eas secret:create --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value your_android_key_here --scope project

# Set AdMob keys as EAS secrets
eas secret:create --name EXPO_PUBLIC_ADMOB_IOS_APP_ID --value your_ios_app_id_here --scope project
eas secret:create --name EXPO_PUBLIC_ADMOB_ANDROID_APP_ID --value your_android_app_id_here --scope project
```

## Step 3: Code Configuration

### 3.1 Verify Configuration

The current configuration in `src/config/production.ts` is already set up correctly:

```typescript
REVENUECAT: {
  API_KEY: Platform.select({
    ios: getEnvVar("EXPO_PUBLIC_REVENUECAT_IOS_KEY", { required: true }),
    android: getEnvVar("EXPO_PUBLIC_REVENUECAT_ANDROID_KEY", { required: true }),
  }),
  ENTITLEMENTS: {
    PREMIUM: "supasecret_plus",
  },
  PRODUCTS: {
    MONTHLY: "supasecret_plus_monthly",
    YEARLY: "supasecret_plus_annual",
  },
},
```

### 3.2 Test Configuration Validation

Run the configuration validation:

```bash
npm run typecheck
```

This will check that all required environment variables are properly configured.

## Step 4: Testing Procedures

### 4.1 Development Testing

1. **Test Mock Mode** (Expo Go):

   ```typescript
   // In development, the app automatically uses mock subscriptions
   const isPremium = await RevenueCatService.isUserPremium();
   // Returns false in demo mode
   ```

2. **Test Real Subscriptions** (Development Build):
   ```bash
   # Build development version
   npx expo run:ios --configuration development
   # or
   npx expo run:android --configuration development
   ```

### 4.2 Subscription Flow Testing

#### Monthly Subscription Test

1. Navigate to subscription screen
2. Select "ToxicConfessions Plus Monthly"
3. Verify purchase flow works
4. Check that user status updates in Supabase
5. Verify premium features unlock

#### Annual Subscription Test

1. Navigate to subscription screen
2. Select "ToxicConfessions Plus Annual" (popular)
3. Verify purchase flow works
4. Check that user status updates in Supabase
5. Verify premium features unlock

### 4.3 Edge Cases to Test

- [ ] Network failure during purchase
- [ ] User cancels purchase
- [ ] Invalid payment method
- [ ] Subscription restore after app reinstall
- [ ] Subscription status sync after network reconnect
- [ ] Trial period handling (if implemented)

## Step 5: Production Deployment

### 5.1 Update Store Product IDs

Before publishing to App Store/Play Store:

1. **iOS Setup**:
   - Create in-app purchases in App Store Connect
   - Get the Product IDs from Apple
   - Update RevenueCat dashboard with actual Store Product IDs

2. **Android Setup**:
   - Create in-app products in Google Play Console
   - Get the Product IDs from Google
   - Update RevenueCat dashboard with actual Store Product IDs

### 5.2 Production Configuration

1. Ensure all environment variables are set in production
2. Test subscription flow in TestFlight/Internal Testing
3. Verify receipt validation works
4. Confirm subscription status syncs properly

### 5.3 Monitoring

Set up monitoring for:

- Purchase success/failure rates
- Subscription churn
- Revenue tracking
- User engagement with premium features

## Step 6: Troubleshooting

### Common Issues

#### "Invalid API Key" Error

- Verify API keys are correct in environment variables
- Check that keys are for the correct platform
- Ensure keys are Public SDK Keys, not Secret API Keys

#### "No Offerings Found" Error

- Verify offerings are published in RevenueCat dashboard
- Check that product IDs match between app and dashboard
- Ensure entitlements are properly linked

#### Subscription Status Not Syncing

- Check Supabase user_memberships table exists
- Verify user is authenticated before purchase
- Check network connectivity during sync

#### Purchase Failed

- Verify payment method is valid
- Check that device/emulator supports in-app purchases
- Ensure app is properly signed for production testing

### Debug Information

Enable debug logging in development:

```typescript
// RevenueCat service automatically enables debug logs in __DEV__ mode
// Check console for detailed error messages
```

## Step 7: Analytics & Optimization

### Key Metrics to Track

- Conversion rate (free → premium)
- Subscription retention rates
- Revenue per user
- Churn rate
- Popular subscription tier

### Optimization Strategies

- A/B test pricing
- Trial period experiments
- Feature gating optimization
- Promotional campaigns

## Support Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [React Native Purchases SDK](https://github.com/RevenueCat/react-native-purchases)
- [Expo In-App Purchases Guide](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)

## Current Features Unlocked by Premium

Based on the mock offerings in `RevenueCatService.ts`:

✅ **Premium Features:**

- Ad-free experience
- Unlimited video recordings (up to 5 minutes)
- Higher quality video (4K)
- Unlimited saves
- Advanced filters
- Priority processing
- Custom themes
- Early access to new features

## Next Steps

1. ✅ Complete RevenueCat dashboard setup
2. ✅ Configure environment variables
3. ⏳ Test subscription flows
4. ⏳ Set up production store listings
5. ⏳ Monitor and optimize conversion rates

## Latest RevenueCat Features (September 2025)

RevenueCat continues to evolve with powerful features for subscription management. Here are the key features available as of September 2025:

### Promotional Offers

- **Introductory Pricing**: Offer free trials, discounted periods, or pay-as-you-go options
- **Promotional Codes**: Create and distribute discount codes for specific products
- **Win-Back Offers**: Automatically offer discounts to lapsed subscribers to encourage reactivation
- **Store-Specific Promotions**: Leverage App Store and Google Play promotional tools

### Win-Back Campaigns

- **Automated Campaigns**: Set up rules-based campaigns targeting inactive subscribers
- **Custom Messaging**: Personalized email/SMS campaigns integrated with RevenueCat
- **Flexible Targeting**: Target users based on churn risk, subscription history, or custom attributes
- **Performance Tracking**: Monitor campaign effectiveness with built-in analytics

### A/B Testing

- **Price Testing**: Test different pricing tiers and observe conversion impact
- **Feature Testing**: A/B test paywall designs, messaging, and feature presentations
- **Offer Testing**: Compare different promotional offers and trial structures
- **Statistical Significance**: Built-in statistical analysis for reliable test results

### Analytics Integration

- **Third-Party Integrations**: Connect with Mixpanel, Amplitude, Segment, and other analytics platforms
- **Custom Events**: Track app-specific events alongside subscription metrics
- **Revenue Forecasting**: Predictive analytics for subscription revenue
- **Cohort Analysis**: Analyze user behavior by acquisition date and subscription status

### Advanced Features

- **Subscription Offers**: Manage upgrade/downgrade flows with proration
- **Webhook Enhancements**: Real-time notifications for all subscription events
- **Customer Portal**: Self-service subscription management for users
- **Multi-App Support**: Manage subscriptions across multiple apps

## Expo 54 Best Practices

Expo SDK 54 (released September 2025) includes React Native 0.81 and brings several improvements for subscription apps. Follow these best practices:

### SDK Compatibility

- **React Native Purchases**: Ensure you're using `react-native-purchases` version 8.x or later
- **Expo Modules**: Use the latest Expo modules for in-app purchases
- **Hermes Engine**: Leverage improved Hermes performance for subscription flows

### EAS Build Configuration

```json
// eas.json
{
  "build": {
    "production": {
      "ios": {
        "image": "latest",
        "env": {
          "EXPO_PUBLIC_REVENUECAT_IOS_KEY": "your_ios_key"
        }
      },
      "android": {
        "image": "latest",
        "env": {
          "EXPO_PUBLIC_REVENUECAT_ANDROID_KEY": "your_android_key"
        }
      }
    }
  }
}
```

### Environment Setup

- **Secure Secrets**: Use EAS secrets for all API keys in production builds
- **Platform-Specific Keys**: Maintain separate keys for iOS and Android
- **Environment Variables**: Prefix with `EXPO_PUBLIC_` for client-side access

### Code Integration Best Practices

```typescript
// src/config/production.ts
import { getEnvVar } from "../utils/env";

export const REVENUECAT_CONFIG = {
  API_KEY: Platform.select({
    ios: getEnvVar("EXPO_PUBLIC_REVENUECAT_IOS_KEY", { required: true }),
    android: getEnvVar("EXPO_PUBLIC_REVENUECAT_ANDROID_KEY", { required: true }),
  }),
  ENTITLEMENTS: {
    PREMIUM: "supasecret_plus",
  },
  PRODUCTS: {
    MONTHLY: "supasecret_plus_monthly",
    ANNUAL: "supasecret_plus_annual",
  },
};
```

### Performance Optimization

- **Lazy Loading**: Load RevenueCat SDK only when needed
- **Caching**: Implement proper caching for offerings and customer info
- **Error Boundaries**: Wrap subscription components with error boundaries

## Comprehensive Troubleshooting

### Advanced Issues and Solutions

#### "Purchases module not found" Error

**Symptoms**: App crashes on launch with module not found error
**Solutions**:

- Verify `react-native-purchases` is installed: `npm list react-native-purchases`
- Check Expo SDK compatibility in `package.json`
- Reinstall pods: `npx expo run:ios --clear`
- Clean Android build: `npx expo run:android --clear`

#### Subscription Status Sync Issues

**Symptoms**: User shows as premium in app but not in RevenueCat dashboard
**Solutions**:

- Check Supabase `user_memberships` table for sync status
- Verify webhook configuration in RevenueCat dashboard
- Test with `RevenueCat.getCustomerInfo()` directly
- Check network connectivity during purchase flow

#### Store-Specific Issues

##### iOS App Store Connect

- **"Product not found"**: Ensure product IDs match exactly between RevenueCat and App Store Connect
- **"Receipt validation failed"**: Check App Store Connect shared secret configuration
- **Sandbox testing**: Use test accounts and ensure app is in sandbox mode

##### Android Google Play

- **"Item not owned"**: Verify license testing setup for development
- **"Billing unavailable"**: Check Google Play Services version and device compatibility
- **"Developer error"**: Ensure package name matches Google Play Console

#### Webhook Delivery Issues

**Symptoms**: Webhooks not reaching your server
**Solutions**:

- Verify webhook URL is publicly accessible
- Check server logs for incoming requests
- Test webhook endpoint with tools like ngrok
- Ensure proper SSL certificate configuration

#### A/B Testing Problems

**Symptoms**: Experiments not showing expected results
**Solutions**:

- Verify experiment is published in RevenueCat dashboard
- Check user segmentation rules
- Ensure sufficient sample size for statistical significance
- Monitor experiment health in analytics

#### Performance Issues

**Symptoms**: Slow loading of paywalls or offerings
**Solutions**:

- Implement caching for `getOfferings()`
- Use `Purchases.configure()` early in app lifecycle
- Optimize image loading in paywall components
- Monitor network requests with Flipper or similar tools

### Debug Tools and Commands

#### Enable Verbose Logging

```typescript
// In development
import Purchases from "react-native-purchases";

Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
```

#### Test Commands

```bash
# Verify configuration
npm run typecheck

# Test RevenueCat integration
npx react-native-purchases test

# Check environment variables
echo $EXPO_PUBLIC_REVENUECAT_IOS_KEY
```

#### Common Debug Checks

- [ ] API keys are correct and match dashboard
- [ ] Products are created and linked to entitlements
- [ ] Offerings are published and contain packages
- [ ] Store products are approved and match IDs
- [ ] Webhooks are configured and delivering
- [ ] User authentication is working before purchases

## Configuration Examples from SupaSecret Codebase

### Automated Setup Script

```typescript
// scripts/setup-revenuecat.ts (excerpt)
const APP_CONFIG = {
  name: "Toxic Confessions",
  bundle_id_ios: "com.toxic.confessions",
  bundle_id_android: "com.toxic.confessions",
  ios_api_key: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android_api_key: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
};

const PRODUCTS = [
  {
    id: "supasecret_plus_monthly",
    display_name: "Toxic Confessions Plus Monthly",
    type: "subscription",
    duration: "P1M",
    price_usd: 4.99,
    entitlements: ["supasecret_plus"],
  },
  {
    id: "supasecret_plus_annual",
    display_name: "Toxic Confessions Plus Annual",
    type: "subscription",
    duration: "P1Y",
    price_usd: 29.99,
    entitlements: ["supasecret_plus"],
    is_popular: true,
  },
];
```

### Production Configuration

```json
// setup/revenuecat-production-config.json
{
  "updated": "2025-09-29T22:10:50.400Z",
  "config": {
    "projectName": "Toxic Confessions",
    "bundleId": "com.toxic.confessions",
    "packageName": "com.toxic.confessions",
    "products": [
      {
        "identifier": "monthly",
        "name": "Toxic Confessions Plus Monthly",
        "type": "subscription",
        "price": 4.99,
        "duration": "monthly",
        "storeProductId": {
          "ios": "com.toxic.confessions.monthly",
          "android": "com.toxic.confessions.monthly"
        }
      }
    ],
    "entitlement": "premium",
    "offering": "default"
  }
}
```

### Subscription Service Implementation

```typescript
// src/features/subscription/services/subscriptionService.ts (excerpt)
import Purchases, { CustomerInfo, PurchasesOffering } from "react-native-purchases";

export class SubscriptionService {
  static async initialize() {
    await Purchases.configure({
      apiKey: REVENUECAT_CONFIG.API_KEY,
      appUserID: userId, // From auth context
    });
  }

  static async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error("Failed to get offerings:", error);
      return null;
    }
  }

  static async purchasePackage(packageToPurchase: PurchasesPackage): Promise<CustomerInfo> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      await this.syncWithSupabase(customerInfo);
      return customerInfo;
    } catch (error) {
      throw new Error(`Purchase failed: ${error.message}`);
    }
  }
}
```

### Hook Usage Example

```typescript
// src/features/subscription/hooks/useSubscription.ts
import { useState, useEffect } from "react";
import { CustomerInfo } from "react-native-purchases";
import { SubscriptionService } from "../services/subscriptionService";

export function useSubscription() {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCustomerInfo = async () => {
      try {
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
      } catch (error) {
        console.error("Failed to load customer info:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerInfo();
  }, []);

  const isPremium = customerInfo?.entitlements.active.supasecret_plus?.isActive ?? false;

  return { customerInfo, isPremium, isLoading };
}
```

### Paywall Component Example

```typescript
// src/features/subscription/components/PaywallModal.tsx (excerpt)
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSubscription } from '../hooks/useSubscription';
import { SubscriptionService } from '../services/subscriptionService';

export function PaywallModal() {
  const { isPremium } = useSubscription();
  const [offerings, setOfferings] = useState(null);

  useEffect(() => {
    const loadOfferings = async () => {
      const offering = await SubscriptionService.getOfferings();
      setOfferings(offering);
    };
    loadOfferings();
  }, []);

  if (isPremium) return null;

  return (
    <Modal visible={!isPremium}>
      <View>
        <Text>Unlock Premium Features</Text>
        {offerings?.availablePackages.map((pkg) => (
          <TouchableOpacity
            key={pkg.identifier}
            onPress={() => SubscriptionService.purchasePackage(pkg)}
          >
            <Text>{pkg.product.title}</Text>
            <Text>{pkg.product.priceString}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}
```

---

**Last Updated**: September 2025
**Version**: 2.0.0
