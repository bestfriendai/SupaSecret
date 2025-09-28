# 🚀 RevenueCat Complete Setup Guide - Toxic Confessions

## Overview
This guide provides step-by-step instructions to set up RevenueCat for the Toxic Confessions app with in-app subscriptions.

## Prerequisites
- RevenueCat account (sign up at https://app.revenuecat.com)
- Apple Developer account (for iOS)
- Google Play Console account (for Android)
- App published to respective stores (or in TestFlight/Internal Testing)

## Configuration Details

### App Information
- **App Name**: Toxic Confessions
- **iOS Bundle ID**: `com.toxic.confessions`
- **Android Package Name**: `com.toxic.confessions`

### API Keys (from .env)
- **iOS Key**: `appl_DOIFtYSbtSxeplMuPlcSNIEapYvOz`
- **Android Key**: `goog_DOIFtYSbtSxeplMuPlcSNIEapYvOz`
- **Management API Key**: `sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz`

## Step 1: Create RevenueCat Project

1. **Login to RevenueCat Dashboard**
   - Go to https://app.revenuecat.com
   - Sign in or create account

2. **Create New Project**
   - Click "Create new project"
   - Project name: `Toxic Confessions`
   - Click "Create project"

## Step 2: Add App Platforms

### iOS App Setup
1. Click "Set up your app" → "App Store"
2. Enter details:
   - **App name**: `Toxic Confessions iOS`
   - **Bundle ID**: `com.toxic.confessions`
   - **App Store Connect App-Specific Shared Secret**: (get from App Store Connect)
3. Copy the Public SDK Key: `appl_DOIFtYSbtSxeplMuPlcSNIEapYvOz`
4. Click "Save"

### Android App Setup
1. Click "Add app" → "Play Store"
2. Enter details:
   - **App name**: `Toxic Confessions Android`
   - **Package name**: `com.toxic.confessions`
   - **Google Play Service Account Credentials**: (upload JSON key from Play Console)
3. Copy the Public SDK Key: `goog_DOIFtYSbtSxeplMuPlcSNIEapYvOz`
4. Click "Save"

## Step 3: Create Products in App Stores

### App Store Connect (iOS)
1. Go to App Store Connect → Your App → In-App Purchases
2. Click "+" to create new subscription group:
   - **Reference Name**: `Toxic Confessions Plus`
   - **Subscription Group Reference Name**: `toxicconfessions_plus_group`

3. Add Monthly Subscription:
   - Click "+" in the subscription group
   - **Reference Name**: `Toxic Confessions Plus Monthly`
   - **Product ID**: `supasecret_plus_monthly`
   - **Duration**: 1 Month
   - **Price**: Tier 5 ($4.99 USD)
   - Add localizations and review information

4. Add Annual Subscription:
   - Click "+" in the subscription group
   - **Reference Name**: `Toxic Confessions Plus Annual`
   - **Product ID**: `supasecret_plus_annual`
   - **Duration**: 1 Year
   - **Price**: Tier 30 ($29.99 USD)
   - Add localizations and review information

### Google Play Console (Android)
1. Go to Play Console → Your App → Monetization → Subscriptions
2. Click "Create subscription"

3. Monthly Subscription:
   - **Product ID**: `supasecret_plus_monthly`
   - **Name**: `Toxic Confessions Plus Monthly`
   - **Description**: Premium monthly subscription
   - **Billing period**: Monthly
   - **Default price**: $4.99 USD
   - Set up pricing for other countries
   - Click "Save"

4. Annual Subscription:
   - **Product ID**: `supasecret_plus_annual`
   - **Name**: `Toxic Confessions Plus Annual`
   - **Description**: Premium annual subscription (Save 50%)
   - **Billing period**: Yearly
   - **Default price**: $29.99 USD
   - Set up pricing for other countries
   - Click "Save"

## Step 4: Configure RevenueCat Products

1. **Go back to RevenueCat Dashboard**
2. Navigate to "Products" tab
3. Click "New" to add products

### Monthly Product
- **Identifier**: `supasecret_plus_monthly`
- **Description**: Toxic Confessions Plus Monthly
- **App Store**: Select `supasecret_plus_monthly` from dropdown
- **Play Store**: Select `supasecret_plus_monthly` from dropdown
- Click "Add"

### Annual Product
- **Identifier**: `supasecret_plus_annual`
- **Description**: Toxic Confessions Plus Annual
- **App Store**: Select `supasecret_plus_annual` from dropdown
- **Play Store**: Select `supasecret_plus_annual` from dropdown
- Click "Add"

## Step 5: Create Entitlements

1. Go to "Entitlements" tab
2. Click "New"
3. Configure entitlement:
   - **Identifier**: `supasecret_plus`
   - **Description**: Premium Access
   - **Products**: Select both products:
     - `supasecret_plus_monthly`
     - `supasecret_plus_annual`
4. Click "Add"

## Step 6: Create Offerings

1. Go to "Offerings" tab
2. Click "New"
3. Configure offering:
   - **Identifier**: `default`
   - **Description**: Toxic Confessions Plus
   - **Is Current**: ✅ (checked)

4. Add Packages:

   **Monthly Package:**
   - Click "Add Package"
   - **Identifier**: `$rc_monthly`
   - **Description**: Monthly Subscription
   - **Products**: `supasecret_plus_monthly`

   **Annual Package:**
   - Click "Add Package"
   - **Identifier**: `$rc_annual`
   - **Description**: Annual Subscription (Best Value)
   - **Products**: `supasecret_plus_annual`
   - **Is Featured**: ✅ (checked)

5. Click "Save"

## Step 7: Configure Webhooks (Optional but Recommended)

1. Go to "Integrations" → "Webhooks"
2. Click "Add Webhook"
3. Configure:
   - **URL**: Your server endpoint (e.g., `https://api.toxicconfessions.app/webhooks/revenuecat`)
   - **Events**: Select all relevant events
   - **Authorization Header**: Add your secret key
4. Click "Add"

## Step 8: Test Configuration

### Sandbox Testing (iOS)
1. Create sandbox tester in App Store Connect
2. Sign in with sandbox account on device
3. Test purchase flow in app

### Testing (Android)
1. Add test accounts in Play Console
2. Install app via Internal Testing track
3. Test purchase flow

## Step 9: Verify Integration in App

Run these commands to verify:

```bash
# Install dependencies
npm install

# Run in development
npm start

# For iOS
npm run ios

# For Android
npm run android
```

## Premium Features Enabled

When users subscribe to `supasecret_plus`, they unlock:

- ✅ **Ad-free experience** - No more interruptions
- ✅ **Unlimited video recordings** - Up to 5 minutes each
- ✅ **4K video quality** - Crystal clear confessions
- ✅ **Unlimited saves** - Keep all your videos
- ✅ **Advanced filters** - Premium effects
- ✅ **Priority processing** - Faster video processing
- ✅ **Custom themes** - Personalize your experience
- ✅ **Early access** - Be first to try new features

## Code Integration Points

The app is already configured to use RevenueCat in:

### Key Files
- `/src/services/RevenueCatService.ts` - Main service
- `/src/services/RevenueCatMCPService.ts` - Enhanced MCP service
- `/src/state/membershipStore.ts` - State management
- `/src/config/production.ts` - Configuration

### Usage Examples

```typescript
// Check premium status
const isPremium = await RevenueCatService.isUserPremium();

// Get offerings
const offerings = await RevenueCatService.getOfferings();

// Purchase subscription
const result = await RevenueCatService.purchasePackage(selectedPackage);

// Restore purchases
await RevenueCatService.restorePurchases();
```

## Troubleshooting

### Common Issues

1. **Products not showing**
   - Ensure products are approved in app stores
   - Check product IDs match exactly
   - Verify API keys are correct

2. **Purchases failing**
   - Check sandbox/test account setup
   - Verify store configurations
   - Check network connectivity

3. **Entitlements not updating**
   - Call `restorePurchases()` after purchase
   - Check webhook configuration
   - Verify product-entitlement mapping

## Production Checklist

- [ ] App Store products approved
- [ ] Play Store products active
- [ ] RevenueCat products imported
- [ ] Entitlements configured
- [ ] Offerings set as current
- [ ] API keys in .env file
- [ ] Sandbox testing complete
- [ ] Production purchase tested
- [ ] Analytics tracking verified
- [ ] Webhook endpoints working

## Support Resources

- **RevenueCat Dashboard**: https://app.revenuecat.com
- **Documentation**: https://docs.revenuecat.com
- **API Reference**: https://docs.revenuecat.com/reference
- **Support**: support@revenuecat.com

## Status

✅ **Configuration Ready** - Follow the steps above to complete setup in RevenueCat Dashboard

---

*Last Updated: September 2025*
*App: Toxic Confessions v1.0.0*