# Fastlane In-App Purchase Setup Guide

This guide will help you create In-App Purchases for Toxic Confessions using Fastlane.

## Prerequisites

Before running the script, ensure:

1. **App Created in App Store Connect**
   - Your app "Toxic Confessions" must exist in App Store Connect
   - Bundle ID: `com.toxic.confessions`
   - If not created yet, go to: https://appstoreconnect.apple.com/apps

2. **Apple Developer Account**
   - Active Apple Developer Program membership ($99/year)
   - Admin or App Manager role

3. **App-Specific Password** (if you have 2FA enabled)
   - Generate at: https://appleid.apple.com/account/manage
   - Navigate to: Sign-In and Security → App-Specific Passwords
   - Click "Generate Password"
   - Save this password - you'll need it when running Fastlane

## Quick Start

Run the automated setup script:

```bash
./scripts/create-iap.sh
```

This will:
1. Prompt for your Apple ID email
2. Prompt for your password (or app-specific password)
3. Create three in-app purchases:
   - Monthly Subscription (`com.toxic.confessions.monthly`)
   - Annual Subscription (`com.toxic.confessions.annual`)
   - Lifetime Purchase (`com.toxic.confessions.lifetime`)

## Manual Fastlane Commands

If you prefer to run Fastlane directly:

### Create All In-App Purchases
```bash
fastlane ios create_iap
```

### List Existing In-App Purchases
```bash
fastlane ios list_iap
```

## Products That Will Be Created

### 1. Premium Monthly
- **Product ID**: `com.toxic.confessions.monthly`
- **Type**: Auto-Renewable Subscription
- **Subscription Group**: Premium Subscriptions
- **Duration**: 1 Month
- **Suggested Price**: $4.99

### 2. Premium Annual
- **Product ID**: `com.toxic.confessions.annual`
- **Type**: Auto-Renewable Subscription
- **Subscription Group**: Premium Subscriptions
- **Duration**: 1 Year
- **Suggested Price**: $29.99

### 3. Premium Lifetime
- **Product ID**: `com.toxic.confessions.lifetime`
- **Type**: Non-Consumable
- **One-time purchase**
- **Suggested Price**: $49.99

## What Happens Next

After running the script:

1. **Log into App Store Connect**
   - Visit: https://appstoreconnect.apple.com
   - Go to: My Apps → Toxic Confessions

2. **Navigate to In-App Purchases**
   - Click the "Features" tab
   - Select "In-App Purchases"
   - You should see your three products

3. **Complete Each Product**
   For each product, you need to add:
   - **Pricing**: Select your price tier
   - **Localized Information**:
     - Display Name (e.g., "Premium Monthly")
     - Description (what users get)
   - **Review Information**:
     - Screenshot showing the purchase flow
     - Review notes (optional)

4. **Submit for Review**
   - Products are submitted along with your app
   - They will be reviewed when you submit your app binary

## Troubleshooting

### "Could not find app"
**Problem**: App doesn't exist in App Store Connect

**Solution**: Create the app first:
1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: Toxic Confessions
   - Primary Language: English
   - Bundle ID: com.toxic.confessions
   - SKU: toxic-confessions (or any unique identifier)
4. Click "Create"
5. Run the Fastlane script again

### "Invalid credentials" or "Authentication failed"
**Problem**: 2FA is blocking authentication

**Solution**: Use an app-specific password:
1. Visit: https://appleid.apple.com/account/manage
2. Navigate to: Sign-In and Security → App-Specific Passwords
3. Click "Generate Password"
4. Label it "Fastlane" or "Toxic Confessions"
5. Copy the password
6. Use this password when Fastlane prompts you

### "Product already exists"
**Problem**: Product was already created

**Solution**:
- The script will skip existing products
- You can verify with: `fastlane ios list_iap`

### Fastlane session expired
**Problem**: Session times out during long operations

**Solution**:
```bash
# Store session token
fastlane spaceauth -u your@email.com

# Copy the session token to:
export FASTLANE_SESSION="your-session-token"
```

## Alternative: Manual Creation

If Fastlane fails, you can create products manually:

1. **Log into App Store Connect**: https://appstoreconnect.apple.com
2. **Select Your App**: My Apps → Toxic Confessions
3. **Navigate to IAP**: Features tab → In-App Purchases
4. **Create Each Product**:

   **For Subscriptions (Monthly & Annual)**:
   - Click "+" → "Auto-Renewable Subscription"
   - If first subscription: Create new subscription group "Premium Subscriptions"
   - Reference Name: Premium Monthly (or Annual)
   - Product ID: `com.toxic.confessions.monthly` (or `.annual`)
   - Subscription Duration: 1 Month (or 1 Year)
   - Price: Select tier
   - Add localized information and screenshot
   - Save

   **For Lifetime**:
   - Click "+" → "Non-Consumable"
   - Reference Name: Premium Lifetime
   - Product ID: `com.toxic.confessions.lifetime`
   - Price: Select tier
   - Add localized information and screenshot
   - Save

## Fastlane Configuration Files

The setup created these files:

- `fastlane/Fastfile` - Main Fastlane configuration with lanes
- `fastlane/Appfile` - App-specific settings
- `scripts/create-iap.sh` - Convenience wrapper script

## Next Steps After IAP Creation

1. ✅ Products created in App Store Connect
2. ⏭️ Complete pricing and localization
3. ⏭️ Add product screenshots
4. ⏭️ Build and submit your app for review
5. ⏭️ Products will be reviewed with your app

## Pricing Recommendations

Based on similar apps:

- **Monthly**: $4.99 - $9.99
- **Annual**: $29.99 - $49.99 (save 40-60%)
- **Lifetime**: $49.99 - $99.99

## Support

- **Fastlane Docs**: https://docs.fastlane.tools
- **App Store Connect**: https://appstoreconnect.apple.com
- **RevenueCat Docs**: https://docs.revenuecat.com/docs/ios-products