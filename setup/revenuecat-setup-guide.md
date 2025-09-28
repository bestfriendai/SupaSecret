# RevenueCat Dashboard Setup Guide for Toxic Confessions

## 🚀 Quick Setup Checklist

### Step 1: Create App in RevenueCat Dashboard

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Click "Create new app" or "Add app"
3. **App Name**: `Toxic Confessions`
4. **Bundle ID (iOS)**: `com.toxic.confessions`
5. **Package Name (Android)**: `com.toxic.confessions`
6. Select both **iOS** and **Android** platforms

### Step 2: Configure API Keys

Your API keys are already configured in `.env`:
- **iOS API Key**: `appl_DOIFtYSbtSxeplMuPlcSNIEapYvOz`
- **Android API Key**: `goog_DOIFtYSbtSxeplMuPlcSNIEapYvOz`

✅ **Verify**: These keys should appear in your RevenueCat dashboard under Settings > API Keys

### Step 3: Create Entitlements

1. Navigate to **Entitlements** in the dashboard
2. Click **"Create Entitlement"**
3. **Entitlement ID**: `supasecret_plus`
4. **Display Name**: `Premium Access`
5. **Description**: `Full access to all premium features`

### Step 4: Create Products

#### Monthly Subscription
1. Go to **Products** section
2. Click **"Create Product"**
3. **Product ID**: `supasecret_plus_monthly`
4. **Display Name**: `ToxicConfessions Plus Monthly`
5. **Type**: `Subscription`
6. **Subscription Group**: Create new group called `supasecret_plus_group`
7. **Entitlements**: Select `supasecret_plus`

#### Annual Subscription
1. Click **"Create Product"** again
2. **Product ID**: `supasecret_plus_annual`
3. **Display Name**: `ToxicConfessions Plus Annual`
4. **Type**: `Subscription`
5. **Subscription Group**: Use existing `supasecret_plus_group`
6. **Entitlements**: Select `supasecret_plus`

### Step 5: Create Offering

1. Navigate to **Offerings**
2. Click **"Create Offering"**
3. **Offering ID**: `default`
4. **Display Name**: `ToxicConfessions Plus`
5. **Description**: `Premium subscription for ToxicConfessions`

#### Add Packages to Offering
1. In the offering, click **"Add Package"**
2. **Package 1**:
   - **Package ID**: `monthly`
   - **Product**: `supasecret_plus_monthly`
3. **Package 2**:
   - **Package ID**: `annual`
   - **Product**: `supasecret_plus_annual`
   - ✅ Mark as **"Recommended"**

### Step 6: Store Configuration

#### App Store Connect (iOS)
1. In RevenueCat, go to **Integrations** > **App Store Connect**
2. Connect your App Store Connect account
3. Create these in-app purchases in App Store Connect:
   - **Product ID**: `supasecret_plus_monthly`
   - **Type**: Auto-Renewable Subscription
   - **Price**: $4.99 USD
   - **Subscription Group**: Create new group
   
   - **Product ID**: `supasecret_plus_annual`
   - **Type**: Auto-Renewable Subscription
   - **Price**: $29.99 USD
   - **Same Subscription Group** as monthly

#### Google Play Console (Android)
1. In RevenueCat, go to **Integrations** > **Google Play**
2. Connect your Google Play Console account
3. Create these subscriptions in Google Play Console:
   - **Product ID**: `supasecret_plus_monthly`
   - **Price**: $4.99 USD
   - **Billing Period**: Monthly
   
   - **Product ID**: `supasecret_plus_annual`
   - **Price**: $29.99 USD
   - **Billing Period**: Yearly

### Step 7: Webhook Configuration (Optional)

1. Go to **Integrations** > **Webhooks**
2. Add webhook URL if you have server-side logic
3. Select events you want to track

## 🧪 Testing Your Setup

### Sandbox Testing
1. Enable **Sandbox Mode** in RevenueCat dashboard
2. Use test accounts for both iOS and Android
3. Test purchase flow in your app

### Verification Script
Run the verification script to test your integration:

```bash
npm run verify-revenuecat
```

## 📱 App Store Setup Requirements

### iOS App Store Connect
- App must be in "Ready for Review" or "In Review" status
- In-app purchases must be approved
- Test with sandbox accounts

### Android Google Play Console
- App must be in Internal Testing track minimum
- Subscriptions must be published
- Test with license testing accounts

## 🔧 Configuration Summary

Your app is configured with:
- **Bundle ID**: `com.toxic.confessions`
- **Entitlement**: `supasecret_plus`
- **Products**: `supasecret_plus_monthly`, `supasecret_plus_annual`
- **Offering**: `default`
- **Features**: Ad-free, unlimited videos, 4K quality, advanced filters, custom themes

## 🚨 Important Notes

1. **API Keys**: Never commit real API keys to version control
2. **Testing**: Always test in sandbox before production
3. **Store Review**: Submit in-app purchases for review before app submission
4. **Pricing**: Verify pricing in all supported regions
5. **Compliance**: Ensure subscription terms comply with store policies

## 📞 Support

- RevenueCat Docs: https://docs.revenuecat.com
- Support: support@revenuecat.com
- Community: https://community.revenuecat.com
