# Apple App Store Submission Guide - Toxic Confessions

## ✅ Pre-Submission Checklist

### 1. StoreKit Configuration (REQUIRED for Testing)

#### Add StoreKit File to Xcode
1. Open `ios/ToxicConfessions.xcworkspace` in Xcode
2. In Project Navigator, right-click on "ToxicConfessions" folder
3. Select "Add Files to ToxicConfessions"
4. Navigate to `ios/ToxicConfessions.storekit`
5. Make sure "Copy items if needed" is UNCHECKED
6. Make sure "Add to targets: ToxicConfessions" is CHECKED
7. Click "Add"

#### Configure Scheme to Use StoreKit
1. In Xcode, go to **Product → Scheme → Edit Scheme** (or press `⌘ + <`)
2. Select **Run** from the left sidebar
3. Go to the **Options** tab
4. Under "StoreKit Configuration", select **ToxicConfessions.storekit**
5. Click "Close"

#### Verify Configuration
1. Clean build folder: **Product → Clean Build Folder** (`⇧ + ⌘ + K`)
2. Build and run: **Product → Run** (`⌘ + R`)
3. Navigate to the paywall screen
4. You should see:
   - Premium Monthly ($4.99/month)
   - Premium Annual ($29.99/year)
   - Both with 7-day free trial

---

## 🏪 App Store Connect Setup

### Step 1: Sign Agreements

**CRITICAL: Must be completed before submission**

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Agreements, Tax, and Banking**
3. Sign the **Paid Applications Agreement**
4. Complete **Tax Forms** (W-9 for US, W-8BEN for international)
5. Add **Banking Information** for payouts

### Step 2: Create In-App Purchases

1. Go to **My Apps** → **Toxic Confessions** → **Features** → **In-App Purchases**
2. Click the **+** button to create products

#### Product 1: Premium Monthly

**Product Details:**
- **Type:** Auto-Renewable Subscription
- **Reference Name:** Premium Monthly
- **Product ID:** `com.toxic.confessions.monthly`
- **Subscription Group:** Create new group "Premium Subscriptions"

**Pricing:**
- **Price:** $4.99 USD
- **Availability:** All countries

**Introductory Offer:**
- **Type:** Free Trial
- **Duration:** 7 days
- **Subscription Period:** 1 month

**Localization (English - US):**
- **Subscription Display Name:** Toxic Confessions Plus Monthly
- **Description:**
  ```
  Monthly access to all premium features including:
  • Ad-free experience
  • Unlimited 5-minute videos
  • 4K quality uploads
  • Unlimited saves
  • Advanced filters
  • Priority processing
  • Custom themes
  • Early access to new features
  ```

**App Store Promotion:**
- **Promotional Image:** Upload 1600x1200 image showing premium features
- **Promotional Text:** "Go ad-free and unlock unlimited videos!"

#### Product 2: Premium Annual

**Product Details:**
- **Type:** Auto-Renewable Subscription
- **Reference Name:** Premium Annual
- **Product ID:** `com.toxic.confessions.annual`
- **Subscription Group:** Same as above "Premium Subscriptions"

**Pricing:**
- **Price:** $29.99 USD (Save 50%!)
- **Availability:** All countries

**Introductory Offer:**
- **Type:** Free Trial
- **Duration:** 7 days
- **Subscription Period:** 1 year

**Localization (English - US):**
- **Subscription Display Name:** Toxic Confessions Plus Annual
- **Description:**
  ```
  Save 50% with annual billing! Get access to all premium features:
  • Ad-free experience
  • Unlimited 5-minute videos
  • 4K quality uploads
  • Unlimited saves
  • Advanced filters
  • Priority processing
  • Custom themes
  • Early access to new features
  ```

**App Store Promotion:**
- **Promotional Image:** Same as monthly with "SAVE 50%" badge
- **Promotional Text:** "Best Value - Save 50% with annual plan!"

#### Product 3: Premium Lifetime (Optional)

**Product Details:**
- **Type:** Non-Renewing Subscription
- **Reference Name:** Premium Lifetime
- **Product ID:** `com.toxic.confessions.lifetime`

**Pricing:**
- **Price:** $49.99 USD (One-time payment)
- **Availability:** All countries

**Localization (English - US):**
- **Name:** Toxic Confessions Plus Lifetime
- **Description:**
  ```
  One-time payment for lifetime access to all premium features. Never pay again!
  ```

### Step 3: Submit Products for Review

1. For each product, click **Submit for Review**
2. Products must be "Ready to Submit" status
3. **Screenshot Requirements:** Upload screenshots showing:
   - How users access the paywall
   - What the subscription screen looks like
   - What features they get with the subscription

---

## 🧪 Testing Your Subscription Flow

### Local Testing (Sandbox)

1. **Build with StoreKit Configuration:**
   ```bash
   npx expo run:ios
   ```

2. **Test Flow:**
   - Launch app on simulator
   - Sign up/sign in
   - Navigate to Profile → Upgrade to Plus
   - Select a subscription plan
   - Click "Start Free Trial"
   - ✅ Should show StoreKit confirmation dialog
   - ✅ Click "Subscribe"
   - ✅ Should see success message
   - ✅ Premium features should unlock

3. **Verify Premium Access:**
   - Check for "Plus" badge in profile
   - Upload a video > 1 minute (should work)
   - Check for no ads
   - Access advanced filters

4. **Test Restore Purchases:**
   - Tap "Restore Purchases" button
   - Should restore active subscriptions
   - Premium status should persist

### Sandbox Testing (Real Device)

1. **Create Sandbox Tester:**
   - Go to **App Store Connect** → **Users and Access** → **Sandbox Testers**
   - Click **+** to create new tester
   - Use format: `sandbox.test+[unique]@icloud.com`
   - Password must be 8+ chars with number and uppercase
   - Save the tester

2. **Configure Device:**
   - Go to iPhone **Settings → App Store**
   - Scroll down to **Sandbox Account**
   - Sign in with your sandbox tester account

3. **Install TestFlight Build:**
   ```bash
   # Build for TestFlight
   eas build --platform ios --profile production

   # Or upload via Xcode
   # Product → Archive → Upload to App Store
   ```

4. **Test on Device:**
   - Install from TestFlight
   - Navigate to paywall
   - Purchase subscription (will not charge)
   - Apple ID prompt should say "[Sandbox]"
   - Complete purchase
   - Verify premium features work

### Production Testing (Before Public Release)

1. **Submit app for review with subscriptions**
2. **Apple Review Team will test:**
   - Purchasing the subscription
   - Using premium features
   - Restore purchases functionality
   - Cancellation process

---

## 📱 App Store Connect Submission

### App Information

**Category:** Social Networking
**Secondary Category:** Entertainment

**Privacy Policy URL:** `https://toxicconfessions.app/privacy`
**Terms of Use URL:** `https://toxicconfessions.app/terms`

### App Review Information

**Sign-In Required:** Yes
**Demo Account:**
- Email: `reviewer@toxicconfessions.app`
- Password: `[Create a demo account in your app]`
- Notes: "This account has sample content for review purposes"

**Contact Information:**
- First Name: [Your Name]
- Last Name: [Your Last Name]
- Phone: [Your Phone]
- Email: [Your Email]

**Notes:**
```
SUBSCRIPTION TESTING INSTRUCTIONS:

1. The app uses StoreKit 2 and RevenueCat for subscription management
2. Free trial is 7 days, then auto-renews
3. To test subscriptions:
   - Launch app and sign in with demo account
   - Tap Profile → "Upgrade to Plus"
   - Select any subscription plan
   - Use sandbox test account for purchases

4. Premium features include:
   - Ad-free experience
   - Longer videos (5 min vs 1 min)
   - 4K quality uploads
   - Unlimited saves
   - Advanced filtering

5. Users can manage/cancel subscriptions via:
   - Settings → Subscriptions
   - App Store settings

6. Privacy features:
   - All videos have automatic face blurring
   - Voice modulation for anonymity
   - No user data is shared
```

### Screenshots

Upload screenshots showing:
1. **Main feed** - Sample confessions
2. **Video recording** - Face blurring in action
3. **Paywall** - Subscription options with pricing
4. **Premium features** - What users get
5. **Profile screen** - User profile with Plus badge
6. **Settings** - Subscription management

### App Preview Video (Optional but Recommended)

Create 15-30 second video showing:
- App opening
- Browsing confessions
- Recording a video (face blurred)
- Paywall screen
- Premium features in action

---

## 🎯 RevenueCat Integration Verification

### Verify API Keys Are Set

Check your `.env` file has:
```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_nXnAuBEeeERxBHxAzqhFgSnIzam
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_ffsiomTRezyIrsyrwwZTiCpjSiC
```

### Verify RevenueCat Dashboard

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Navigate to **Toxic Confessions iOS** app
3. Verify:
   - ✅ App is connected
   - ✅ Products are synced (`com.toxic.confessions.monthly`, `.annual`, `.lifetime`)
   - ✅ Entitlements are configured (`premium`)
   - ✅ Offerings are set up (`default` offering with packages)

### Enable RevenueCat Webhooks (Recommended)

1. In RevenueCat Dashboard, go to **Integrations**
2. Add webhook URL for your backend (if you have one)
3. Enable events:
   - `INITIAL_PURCHASE`
   - `RENEWAL`
   - `CANCELLATION`
   - `EXPIRATION`

---

## 🚨 Common Submission Issues & Solutions

### Issue 1: "Products Not Available"

**Cause:** App Store Connect products not "Ready to Submit"

**Solution:**
1. Go to App Store Connect → In-App Purchases
2. Ensure all products have status "Ready to Submit"
3. Complete all required fields (pricing, localization, screenshots)
4. Submit products for review

### Issue 2: "Sandbox Purchases Not Working"

**Cause:** Not signed into sandbox account or StoreKit not configured

**Solution:**
1. Settings → App Store → Sandbox Account → Sign in
2. Xcode → Edit Scheme → Run → Options → Select StoreKit config
3. Clean build and run again

### Issue 3: "RevenueCat Not Loading Offerings"

**Cause:** Products not synced to RevenueCat or API key mismatch

**Solution:**
1. Verify product IDs match exactly in:
   - App Store Connect
   - RevenueCat Dashboard
   - Your code (production.ts)
2. Wait 10-15 minutes for sync
3. Force refresh in RevenueCat Dashboard

### Issue 4: "Free Trial Not Showing"

**Cause:** Introductory offer not configured

**Solution:**
1. In App Store Connect, edit subscription
2. Go to "Subscription Prices"
3. Add "Introductory Offer": Free Trial, 7 days
4. Save and submit for review

---

## ✅ Final Submission Checklist

Before submitting to App Store:

- [ ] **Signed Paid Applications Agreement**
- [ ] **Added banking information**
- [ ] **Completed tax forms**
- [ ] **Created all 3 products in App Store Connect**
- [ ] **Submitted products for review**
- [ ] **Uploaded app screenshots (minimum 5)**
- [ ] **Tested subscriptions in sandbox**
- [ ] **Tested on real device with TestFlight**
- [ ] **Verified RevenueCat integration**
- [ ] **Added demo account for reviewers**
- [ ] **Written clear review notes**
- [ ] **Privacy policy and terms are live**
- [ ] **StoreKit configuration is in Xcode**

---

## 🎉 You're Ready!

Once all checkboxes are complete:

1. Archive your app in Xcode: **Product → Archive**
2. Upload to App Store Connect
3. Fill out all app information
4. Submit for review
5. Wait 24-48 hours for review

Apple will test your subscriptions using sandbox environment. They'll verify:
- ✅ Subscriptions can be purchased
- ✅ Free trial works correctly
- ✅ Premium features unlock after purchase
- ✅ Restore purchases works
- ✅ Subscription can be managed/cancelled

Good luck! 🚀
