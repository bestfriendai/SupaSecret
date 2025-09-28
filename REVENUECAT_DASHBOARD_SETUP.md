# 🚀 RevenueCat Dashboard Setup - Step by Step

## Prerequisites
- RevenueCat Account with API Key: `sk_DOIFtYSbtSxeplMuPlcSNIEapYvOz`
- Access to https://app.revenuecat.com

## Step 1: Create or Access Project

### If Project Doesn't Exist:
1. Go to https://app.revenuecat.com
2. Click **"Create a new project"**
3. Enter project name: **"Toxic Confessions"**
4. Click **"Create project"**

### If Project Already Exists:
1. Go to https://app.revenuecat.com
2. Select **"Toxic Confessions"** from your projects

## Step 2: Add App Platforms

### Add iOS App:
1. Click **"Set up your first app"** or **"Add an app"**
2. Select **"App Store"**
3. Fill in:
   - **App name**: `Toxic Confessions iOS`
   - **Bundle ID**: `com.toxic.confessions`
   - **App Store Connect Shared Secret**: (leave blank for now, add later)
4. Click **"Add app"**
5. Copy the **Public iOS SDK Key**: Should be `appl_DOIFtYSbtSxeplMuPlcSNIEapYvOz`

### Add Android App:
1. Click **"Add an app"**
2. Select **"Play Store"**
3. Fill in:
   - **App name**: `Toxic Confessions Android`
   - **Package name**: `com.toxic.confessions`
   - **Service Account Credentials JSON**: (leave blank for now, add later)
4. Click **"Add app"**
5. Copy the **Public Android SDK Key**: Should be `goog_DOIFtYSbtSxeplMuPlcSNIEapYvOz`

## Step 3: Create Products

### For iOS App:
1. Go to **"Products"** tab → Select **"iOS App"**
2. Click **"New"**

#### Product 1 - Monthly:
- **Identifier**: `supasecret_plus_monthly`
- **Description**: Toxic Confessions Plus Monthly
- **Duration**: P1M (1 month)
- **Store Product ID**: `supasecret_plus_monthly` (will link later)
- Click **"Add"**

#### Product 2 - Annual:
- **Identifier**: `supasecret_plus_annual`
- **Description**: Toxic Confessions Plus Annual
- **Duration**: P1Y (1 year)
- **Store Product ID**: `supasecret_plus_annual` (will link later)
- Click **"Add"**

### For Android App:
1. Go to **"Products"** tab → Select **"Android App"**
2. Repeat the same products as above

## Step 4: Create Entitlements

1. Go to **"Entitlements"** tab
2. Click **"New"**
3. Fill in:
   - **Identifier**: `supasecret_plus`
   - **Description**: Premium Access
4. Click **"Add"**
5. In the entitlement settings:
   - Click **"Attach"** next to Products
   - Select both:
     - ✅ `supasecret_plus_monthly`
     - ✅ `supasecret_plus_annual`
   - Click **"Attach"**

## Step 5: Create Offerings

1. Go to **"Offerings"** tab
2. Click **"New"**
3. Fill in:
   - **Identifier**: `default`
   - **Description**: Toxic Confessions Plus
   - **Metadata** (optional): `{"featured": true}`
4. Click **"Add"**

### Add Packages to Offering:
1. In the offering, click **"New"** under Packages

#### Package 1 - Monthly:
- **Identifier**: `$rc_monthly`
- **Description**: Monthly Subscription
- **Platform**: Both
- **Product**: Select `supasecret_plus_monthly`
- Click **"Add"**

#### Package 2 - Annual:
- **Identifier**: `$rc_annual`
- **Description**: Annual Subscription (Save 50%)
- **Platform**: Both
- **Product**: Select `supasecret_plus_annual`
- Click **"Add"**

2. Click **"Make Current"** to set this as the default offering

## Step 6: Configure Store Integrations

### App Store Connect:
1. Go to **"Integrations"** → **"App Store Connect"**
2. Click **"Connect to App Store"**
3. Follow the setup wizard:
   - Generate App Store Connect API Key
   - Upload the key file
   - Enter Key ID and Issuer ID
4. Import products from App Store Connect

### Google Play Console:
1. Go to **"Integrations"** → **"Google Play"**
2. Click **"Connect to Google Play"**
3. Follow the setup wizard:
   - Create Service Account in Google Cloud
   - Download JSON credentials
   - Upload to RevenueCat
4. Import products from Google Play

## Step 7: Create Store Products

### In App Store Connect:
1. Go to your app → **"In-App Purchases"**
2. Create subscription group: `toxicconfessions_plus`
3. Add products:

#### Monthly:
- **Product ID**: `supasecret_plus_monthly`
- **Reference Name**: Toxic Confessions Plus Monthly
- **Duration**: 1 Month
- **Price**: $4.99 USD (Tier 5)

#### Annual:
- **Product ID**: `supasecret_plus_annual`
- **Reference Name**: Toxic Confessions Plus Annual
- **Duration**: 1 Year
- **Price**: $29.99 USD (Tier 30)

### In Google Play Console:
1. Go to your app → **"Monetization" → "Subscriptions"**
2. Create subscriptions:

#### Monthly:
- **Product ID**: `supasecret_plus_monthly`
- **Name**: Toxic Confessions Plus Monthly
- **Billing Period**: Monthly
- **Default Price**: $4.99 USD

#### Annual:
- **Product ID**: `supasecret_plus_annual`
- **Name**: Toxic Confessions Plus Annual
- **Billing Period**: Yearly
- **Default Price**: $29.99 USD

## Step 8: Import Products to RevenueCat

1. Go back to RevenueCat Dashboard
2. Go to **"Products"** tab
3. Click **"Import"** for each platform
4. Select the products from the stores
5. Map them to your RevenueCat products

## Step 9: Configure Webhooks (Optional)

1. Go to **"Integrations"** → **"Webhooks"**
2. Click **"Add Webhook"**
3. Configure:
   - **URL**: `https://your-backend.com/webhooks/revenuecat`
   - **Version**: 1.0
   - Select events to track
4. Click **"Add"**

## Step 10: Test Your Configuration

1. Go to **"Overview"** tab
2. Check the dashboard shows:
   - ✅ 2 Apps configured (iOS + Android)
   - ✅ 2 Products created
   - ✅ 1 Entitlement configured
   - ✅ 1 Current offering with 2 packages

## Verification Checklist

- [ ] Project created: "Toxic Confessions"
- [ ] iOS app added with bundle ID: `com.toxic.confessions`
- [ ] Android app added with package: `com.toxic.confessions`
- [ ] Monthly product created: `supasecret_plus_monthly`
- [ ] Annual product created: `supasecret_plus_annual`
- [ ] Entitlement created: `supasecret_plus`
- [ ] Products attached to entitlement
- [ ] Offering created: `default`
- [ ] Packages added to offering
- [ ] Offering set as current
- [ ] Store products created in App Store Connect
- [ ] Store products created in Google Play Console
- [ ] Store integrations connected
- [ ] Products imported from stores

## API Keys for Your App

Add these to your `.env` file:
```env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_DOIFtYSbtSxeplMuPlcSNIEapYvOz
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_DOIFtYSbtSxeplMuPlcSNIEapYvOz
```

## Test Your Setup

Run in your app:
```bash
npm run verify-revenuecat
npm start
```

## Premium Features Enabled

✅ Ad-free experience
✅ Unlimited video recordings (up to 5 minutes)
✅ 4K video quality
✅ Unlimited saves
✅ Advanced filters
✅ Priority processing
✅ Custom themes
✅ Early access to new features

## Support

- **Dashboard**: https://app.revenuecat.com
- **Documentation**: https://docs.revenuecat.com
- **Support**: support@revenuecat.com

---

**Status**: Ready for manual dashboard configuration
**Last Updated**: September 2025