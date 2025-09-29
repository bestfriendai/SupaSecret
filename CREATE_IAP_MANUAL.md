# Manual In-App Purchase Creation Guide

**Your app is created!** App ID: `6753184999`

Since the Fastlane API for creating IAPs is unreliable, follow this manual guide. These IAPs are **already configured in RevenueCat** and will work automatically once created in App Store Connect.

---

## ✅ RevenueCat Configuration (Already Done)

Your RevenueCat is already set up with these exact product IDs:

### iOS Products (already in RevenueCat):
- ✅ `com.toxic.confessions.monthly` → Linked to entitlements: premium, pro, unlimited_videos
- ✅ `com.toxic.confessions.annual` → Linked to entitlements: premium, pro, unlimited_videos
- ✅ `com.toxic.confessions.lifetime` → Linked to entitlements: premium, pro, unlimited_videos

### Android Products (already in RevenueCat):
- ✅ `com.toxic.confessions.monthly:monthly-base`
- ✅ `com.toxic.confessions.annual:annual-base`
- ✅ `com.toxic.confessions.lifetime:lifetime-base`

**All you need to do is create the iOS products in App Store Connect with the EXACT same product IDs.**

---

## 📱 Step-by-Step: Create iOS In-App Purchases

### 1. Log Into App Store Connect
- Go to: https://appstoreconnect.apple.com
- Sign in with: `theblockbrowser@gmail.com`

### 2. Open Your App
- Click **"My Apps"**
- Click **"Toxic Confessions"**
- Or direct link: https://appstoreconnect.apple.com/apps/6753184999

### 3. Navigate to In-App Purchases
- Click the **"Features"** tab (top menu)
- Click **"In-App Purchases"** (left sidebar)
- Click the blue **"+"** button

---

## Product 1: Monthly Subscription

### Create Subscription Group (First Time Only)
1. Select **"Auto-Renewable Subscription"**
2. You'll be prompted to create a subscription group
3. Click **"Create Subscription Group"**
4. Enter:
   - **Reference Name**: `Premium Subscriptions`
   - Click **"Create"**

### Configure Monthly Subscription
1. **Reference Name**: `Premium Monthly`
2. **Product ID**: `com.toxic.confessions.monthly`
   - ⚠️ **CRITICAL**: Must be exact - copy/paste this
   - This matches your RevenueCat configuration
3. Click **"Create"**

### Set Subscription Details
1. **Subscription Duration**: 1 Month
2. Click **"Add Subscription Price"**
   - **Territory**: United States (or your primary market)
   - **Price**: $4.99 USD (tier 5) - or your choice
   - Click **"Next"** → **"Create"**

### Add Localization (English - United States)
1. Click **"+ Add Localization"**
2. Select **"English (U.S.)"**
3. Fill in:
   - **Display Name**: `Premium Monthly`
   - **Description**:
     ```
     Unlock premium features with monthly subscription:
     • Ad-free experience
     • Unlimited anonymous video recordings
     • HD video quality
     • Advanced privacy features
     • Priority support

     Cancel anytime from your App Store account settings.
     ```
4. Click **"Save"**

### Add Review Information
1. Scroll down to **"App Store Review Information"**
2. Upload a screenshot (can be any app screenshot showing the paywall)
3. **Review Notes** (optional):
   ```
   Monthly subscription for premium features. Users can test purchases in sandbox mode.
   ```
4. Click **"Save"** at the top

---

## Product 2: Annual Subscription

1. Go back to **In-App Purchases** list
2. Click the blue **"+"** button
3. Select **"Auto-Renewable Subscription"**
4. Select existing group: **"Premium Subscriptions"**

### Configure Annual Subscription
1. **Reference Name**: `Premium Annual`
2. **Product ID**: `com.toxic.confessions.annual`
   - ⚠️ **CRITICAL**: Must be exact - copy/paste this
3. Click **"Create"**

### Set Subscription Details
1. **Subscription Duration**: 1 Year
2. Click **"Add Subscription Price"**
   - **Price**: $29.99 USD (tier 30) - or your choice
   - Saves ~50% vs monthly

### Add Localization (English - United States)
1. Click **"+ Add Localization"**
2. Select **"English (U.S.)"**
3. Fill in:
   - **Display Name**: `Premium Annual`
   - **Description**:
     ```
     Best value! Unlock premium features with annual subscription:
     • Ad-free experience
     • Unlimited anonymous video recordings
     • HD video quality
     • Advanced privacy features
     • Priority support
     • Save 50% compared to monthly

     Cancel anytime from your App Store account settings.
     ```
4. Click **"Save"**

### Add Review Information
1. Upload screenshot
2. Click **"Save"**

---

## Product 3: Lifetime Purchase

1. Go back to **In-App Purchases** list
2. Click the blue **"+"** button
3. Select **"Non-Consumable"**

### Configure Lifetime Purchase
1. **Reference Name**: `Premium Lifetime`
2. **Product ID**: `com.toxic.confessions.lifetime`
   - ⚠️ **CRITICAL**: Must be exact - copy/paste this
3. Click **"Create"**

### Set Price
1. Click **"Add Pricing"**
   - **Price**: $49.99 USD (tier 50) - or your choice
   - One-time purchase, lifetime access

### Add Localization (English - United States)
1. Click **"+ Add Localization"**
2. Select **"English (U.S.)"**
3. Fill in:
   - **Display Name**: `Premium Lifetime`
   - **Description**:
     ```
     Unlock all premium features forever with a one-time purchase:
     • Ad-free experience
     • Unlimited anonymous video recordings
     • HD video quality
     • Advanced privacy features
     • Priority support
     • Lifetime access - pay once, use forever
     • No recurring charges

     One-time purchase, yours forever.
     ```
4. Click **"Save"**

### Add Review Information
1. Upload screenshot
2. Click **"Save"**

---

## ✅ Verification Checklist

After creating all three products, verify:

- [ ] Monthly subscription exists with ID: `com.toxic.confessions.monthly`
- [ ] Annual subscription exists with ID: `com.toxic.confessions.annual`
- [ ] Lifetime purchase exists with ID: `com.toxic.confessions.lifetime`
- [ ] All are in the same subscription group: "Premium Subscriptions"
- [ ] All have pricing configured
- [ ] All have English localization with descriptions
- [ ] All have review screenshots

---

## 🔗 How RevenueCat Integration Works

Once you create these IAPs in App Store Connect:

1. **RevenueCat Already Knows About Them**
   - Products are configured in RevenueCat dashboard
   - Entitlements are attached (premium, pro, unlimited_videos)
   - Offerings and packages are set up

2. **Your App Will Automatically Connect**
   - App uses RevenueCat SDK
   - SDK fetches offerings from RevenueCat
   - RevenueCat fetches prices from App Store Connect
   - User makes purchase → App Store processes → RevenueCat validates → Entitlements granted

3. **No Additional Code Needed**
   - Your `src/services/RevenueCatService.ts` is already configured
   - Product IDs match exactly
   - Entitlement checking already implemented

---

## 🧪 Testing Purchases

### Sandbox Testing
1. Create a sandbox test user:
   - Go to: https://appstoreconnect.apple.com/access/testers
   - Click **"+"** to add sandbox tester
   - Use a fake email: `test@example.com`
   - Create password

2. On your test device:
   - Settings → App Store → Sandbox Account
   - Sign in with sandbox test user
   - Launch your app
   - Make test purchases (won't be charged)

### RevenueCat Dashboard
- Monitor purchases at: https://app.revenuecat.com
- View customer data, subscriptions, revenue

---

## 📋 What Happens When User Subscribes

```
User taps "Subscribe"
  ↓
App calls RevenueCat SDK
  ↓
SDK presents Apple purchase sheet
  ↓
User authenticates & confirms
  ↓
Apple processes payment
  ↓
Apple sends receipt to RevenueCat
  ↓
RevenueCat validates receipt
  ↓
RevenueCat grants entitlements (premium, pro, unlimited_videos)
  ↓
App checks entitlements via SDK
  ↓
App unlocks features
```

---

## ⏱️ Time Estimate

- **Product 1 (Monthly)**: 3-5 minutes
- **Product 2 (Annual)**: 2-3 minutes (group already exists)
- **Product 3 (Lifetime)**: 2-3 minutes
- **Total**: ~10 minutes

---

## 🆘 Troubleshooting

### "Product ID already exists"
- Someone else might have reserved this ID
- Try adding a unique suffix: `com.toxic.confessions.monthly.v2`
- ⚠️ If you change IDs, you must update RevenueCat dashboard

### Can't find "In-App Purchases"
- Make sure you're on the **Features** tab
- Look in the left sidebar
- If missing, your app might not be fully created yet

### "Missing Contract"
- You need to agree to Paid Applications contract
- Go to: Agreements, Tax, and Banking
- Complete all sections

### Products not showing in app
- Wait 2-4 hours for App Store to propagate
- Make sure app is built with production profile
- Check RevenueCat dashboard for sync status

---

## 📞 Support Links

- **App Store Connect**: https://appstoreconnect.apple.com/apps/6753184999
- **RevenueCat Dashboard**: https://app.revenuecat.com
- **RevenueCat Docs**: https://docs.revenuecat.com
- **Apple IAP Guide**: https://developer.apple.com/in-app-purchase/

---

## Next Steps After IAP Creation

1. ✅ Create all three IAPs (you'll do this now)
2. ⏭️ Complete app metadata in App Store Connect
3. ⏭️ Build production app: `eas build --platform ios --profile production`
4. ⏭️ Test purchases in sandbox mode
5. ⏭️ Submit app for review
6. ⏭️ Products will be reviewed with your app

---

**Start here**: https://appstoreconnect.apple.com/apps/6753184999/appstore/features/iap