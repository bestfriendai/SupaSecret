# RevenueCat Setup Guide for SupaSecret

## Overview

This guide will help you set up RevenueCat for the SupaSecret app with the specified subscription plans and entitlements.

## Prerequisites

- RevenueCat account with API key: `sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz`
- App Store Connect and Google Play Console access
- SupaSecret project configured

## Step 1: Configure App in RevenueCat Dashboard

### 1.1 Create New App

1. Log in to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Click "New App" or select your existing app
3. Set app name: "SupaSecret"
4. Bundle ID: `com.toxic.confessions`
5. Select platforms: iOS and Android

### 1.2 Configure API Keys

- **iOS API Key**: `sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz`
- **Android API Key**: `sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz`

## Step 2: Create Entitlements

### 2.1 Create Premium Entitlement

1. Navigate to "Entitlements" section
2. Click "Create Entitlement"
3. **Entitlement ID**: `supasecret_plus`
4. **Display Name**: "SupaSecret Plus"
5. **Description**: "Premium features for SupaSecret users"

### 2.2 Entitlement Features

The `supasecret_plus` entitlement includes:

- Ad-free experience
- Unlimited video recordings (up to 5 minutes)
- Higher quality video (4K)
- Unlimited saves
- Advanced filters
- Priority processing
- Custom themes
- Early access to new features

## Step 3: Create Products

### 3.1 Monthly Subscription

1. Navigate to "Products" section
2. Click "Create Product"
3. **Product ID**: `supasecret_plus_monthly`
4. **Display Name**: "SupaSecret Plus Monthly"
5. **Description**: "Monthly subscription to SupaSecret Plus"
6. **Price**: $4.99/month
7. **Entitlement**: `supasecret_plus`

### 3.2 Annual Subscription

1. Click "Create Product" again
2. **Product ID**: `supasecret_plus_annual`
3. **Display Name**: "SupaSecret Plus Annual"
4. **Description**: "Annual subscription to SupaSecret Plus (Save 50%)"
5. **Price**: $29.99/year
6. **Entitlement**: `supasecret_plus`

## Step 4: Configure Store Connect

### 4.1 App Store Connect

1. In RevenueCat, go to "Stores" > "App Store"
2. Connect your App Store Connect account
3. Create in-app purchases in App Store Connect:
   - **Monthly**: Subscription product with ID `supasecret_plus_monthly`
   - **Annual**: Subscription product with ID `supasecret_plus_annual`
4. Set prices:
   - Monthly: $4.99 USD
   - Annual: $29.99 USD
5. Submit for review

### 4.2 Google Play Console

1. In RevenueCat, go to "Stores" > "Google Play"
2. Connect your Google Play Console account
3. Create in-app purchases in Google Play Console:
   - **Monthly**: Subscription product with ID `supasecret_plus_monthly`
   - **Annual**: Subscription product with ID `supasecret_plus_annual`
4. Set prices:
   - Monthly: $4.99 USD
   - Annual: $29.99 USD
5. Submit for review

## Step 5: Configure Offering

### 5.1 Create Offering

1. Navigate to "Offerings" section
2. Click "Create Offering"
3. **Offering ID**: `default`
4. **Display Name**: "SupaSecret Plus"

### 5.2 Add Packages

Add both subscription products to the offering:

- **Monthly Package**: `supasecret_plus_monthly`
- **Annual Package**: `supasecret_plus_annual` (marked as recommended)

## Step 6: Environment Configuration

### 6.1 Update Environment Variables

Create or update your `.env` file:

```bash
# RevenueCat Configuration
EXPO_PUBLIC_REVENUECAT_IOS_KEY=sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz
```

### 6.2 Verify Configuration

The configuration is already set up in:

- `src/config/production.ts` - RevenueCat settings
- `src/services/RevenueCatService.ts` - Core service implementation
- `src/services/RevenueCatMCPService.ts` - Enhanced MCP service

## Step 7: Testing

### 7.1 Sandbox Testing

1. Enable sandbox mode in RevenueCat dashboard
2. Use test accounts for purchase testing
3. Verify subscription flow works correctly

### 7.2 Feature Verification

Test that all premium features work when subscription is active:

- Ad removal
- Video recording limits
- Video quality
- Save limits
- Filter access
- Processing priority
- Theme customization
- Early access features

## Step 8: Deployment

### 8.1 Production Build

```bash
eas build --platform all --profile production
```

### 8.2 Store Submission

Submit your app to both App Store and Google Play Store with the configured in-app purchases.

## Integration Code

The RevenueCat integration is already implemented in your codebase:

### Usage Example

```typescript
import { RevenueCatService } from "../services/RevenueCatService";

// Initialize service
await RevenueCatService.initialize();

// Get offerings
const offerings = await RevenueCatService.getOfferings();

// Purchase subscription
const result = await RevenueCatService.purchasePackage(selectedPackage);

// Check premium status
const isPremium = await RevenueCatService.isUserPremium();
```

### MCP Service Usage

```typescript
import { RevenueCatMCPService } from "../services/RevenueCatMCPService";

// Get enhanced offerings
const enhancedOfferings = await RevenueCatMCPService.getEnhancedOfferings();

// Make purchase with analytics
const purchaseResult = await RevenueCatMCPService.makePurchase("supasecret_plus_monthly");

// Get subscription analytics
const analytics = await RevenueCatMCPService.getSubscriptionAnalytics();
```

## Troubleshooting

### Common Issues

1. **API Key Issues**: Verify keys are correctly set in environment variables
2. **Product Not Found**: Ensure product IDs match between RevenueCat and app stores
3. **Entitlement Issues**: Verify entitlement configuration in RevenueCat dashboard
4. **Purchase Failures**: Check app store product status and review status

### Debug Mode

Enable debug logging in development:

```typescript
// Debug logs are automatically enabled in __DEV__ mode
```

## Support

- RevenueCat Documentation: https://docs.revenuecat.com
- RevenueCat Support: support@revenuecat.com
- Project-specific issues: Check the implementation in `src/services/`
