# Paywall Setup - Action Checklist

## 🎯 Quick Start Guide

Follow these steps in order to get your paywall working for Apple review and production.

---

## ✅ Step 1: Local Testing Setup (15 minutes)

### Add StoreKit File to Xcode

1. Open Xcode:
   ```bash
   open ios/ToxicConfessions.xcworkspace
   ```

2. Add StoreKit file:
   - In Project Navigator, right-click "ToxicConfessions" folder
   - Select "Add Files to ToxicConfessions"
   - Navigate to and select `ios/ToxicConfessions.storekit`
   - **UNCHECK** "Copy items if needed"
   - **CHECK** "Add to targets: ToxicConfessions"
   - Click "Add"

3. Configure Xcode Scheme:
   - Go to **Product → Scheme → Edit Scheme** (or press `⌘ + <`)
   - Select **Run** from left sidebar
   - Go to **Options** tab
   - Under "StoreKit Configuration", select **ToxicConfessions.storekit**
   - Click "Close"

4. Test it works:
   ```bash
   # Clean and rebuild
   cd ios && pod install && cd ..
   npx expo run:ios
   ```

5. Navigate to paywall in app:
   - Should see 3 products: Monthly ($4.99), Annual ($29.99), Lifetime ($49.99)
   - Try purchasing - should complete instantly
   - Premium features should unlock

**✅ Done when:** You can purchase subscriptions in simulator and premium features unlock

---

## ✅ Step 2: App Store Connect Setup (30 minutes)

### Sign Agreements

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Agreements, Tax, and Banking**
3. Sign **Paid Applications Agreement**
4. Complete **Tax Forms** (W-9 for US, W-8BEN for international)
5. Add **Banking Information** for payouts

### Create Subscription Products

1. Go to **My Apps** → **Toxic Confessions** → **Features** → **In-App Purchases**

2. Create Subscription Group:
   - Click **+** next to "Subscription Groups"
   - Name: "Premium Subscriptions"
   - Reference Name: "Premium Subscriptions"
   - Click "Create"

3. Create Monthly Product:
   - Click **+** in the subscription group
   - Type: **Auto-Renewable Subscription**
   - Reference Name: `Premium Monthly`
   - Product ID: `com.toxic.confessions.monthly`
   - Subscription Group: Select "Premium Subscriptions"
   - Click "Create"
   
   **Pricing:**
   - Price: $4.99 USD
   - Availability: All countries
   
   **Localization (English - US):**
   - Display Name: `Toxic Confessions Plus Monthly`
   - Description:
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
   
   **Review Information:**
   - Screenshot: Upload screenshot showing premium features
   - Review Notes: "Test with sandbox account"
   
   Click "Save"

4. Create Annual Product:
   - Click **+** in the subscription group
   - Type: **Auto-Renewable Subscription**
   - Reference Name: `Premium Annual`
   - Product ID: `com.toxic.confessions.annual`
   - Subscription Group: Select "Premium Subscriptions"
   - Click "Create"
   
   **Pricing:**
   - Price: $29.99 USD
   - Availability: All countries
   
   **Localization (English - US):**
   - Display Name: `Toxic Confessions Plus Annual`
   - Description:
     ```
     Annual access to all premium features including:
     • Ad-free experience
     • Unlimited 5-minute videos
     • 4K quality uploads
     • Unlimited saves
     • Advanced filters
     • Priority processing
     • Custom themes
     • Early access to new features
     
     Save 50% compared to monthly!
     ```
   
   Click "Save"

5. Set Products to "Ready to Submit":
   - For each product, click on it
   - Scroll down and click "Submit for Review"
   - Products should show status "Ready to Submit"

**✅ Done when:** Both products show "Ready to Submit" status

---

## ✅ Step 3: RevenueCat Dashboard Setup (15 minutes)

### Configure Products

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select your project: "Toxic Confessions"

3. Add Monthly Product:
   - Go to **Products** in left sidebar
   - Click **+ New**
   - Product Identifier: `com.toxic.confessions.monthly`
   - App: Select "Toxic Confessions (iOS)"
   - Type: Subscription
   - Click "Save"

4. Add Annual Product:
   - Click **+ New**
   - Product Identifier: `com.toxic.confessions.annual`
   - App: Select "Toxic Confessions (iOS)"
   - Type: Subscription
   - Click "Save"

### Create Entitlement

1. Go to **Entitlements** in left sidebar
2. Click **+ New**
3. Identifier: `premium`
4. Display Name: `Premium Access`
5. Click "Save"

### Link Products to Entitlement

1. Click on the `premium` entitlement
2. Under "Products", click **Attach**
3. Select both products:
   - `com.toxic.confessions.monthly`
   - `com.toxic.confessions.annual`
4. Click "Attach"

**✅ Done when:** 
- Both products show "Active" status
- Entitlement shows "Active" status
- Both products are linked to `premium` entitlement

---

## ✅ Step 4: Sandbox Testing (30 minutes)

### Create Sandbox Tester

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to **Users and Access** → **Sandbox Testers**
3. Click **+** to add tester
4. Fill in:
   - Email: `test.toxicconfessions@example.com` (can be fake)
   - Password: Create strong password (save it!)
   - Country: United States
   - First Name: Test
   - Last Name: User
5. Click "Create"

### Build and Upload to TestFlight

```bash
# Build for TestFlight
eas build --platform ios --profile production

# Or if using Expo build
npx expo build:ios
```

Follow prompts to upload to App Store Connect.

### Test on Device

1. On your iPhone/iPad:
   - Go to **Settings** → **App Store**
   - Scroll down to **Sandbox Account**
   - Sign in with sandbox tester email/password

2. Install TestFlight build:
   - Open TestFlight app
   - Install "Toxic Confessions"

3. Test purchase flow:
   - Open app
   - Navigate to paywall
   - Should see products with prices
   - Tap "Subscribe" on Monthly
   - Purchase sheet should show "[Sandbox]" label
   - Complete purchase (no real charge)
   - Premium features should unlock
   - Ads should disappear

4. Test restore purchases:
   - Delete app
   - Reinstall from TestFlight
   - Open app
   - Tap "Restore Purchases"
   - Premium should be restored

**✅ Done when:** 
- Can purchase in TestFlight
- Premium features unlock
- Restore purchases works

---

## ✅ Step 5: Submit for Review (15 minutes)

### Prepare App Store Listing

1. Go to App Store Connect → My Apps → Toxic Confessions
2. Fill in all required fields:
   - App Name
   - Subtitle
   - Description
   - Keywords
   - Screenshots (all required sizes)
   - App Icon
   - Privacy Policy URL
   - Support URL

### Answer Subscription Questions

When submitting, Apple will ask:
- **Do you offer subscriptions?** Yes
- **What features are unlocked?** Ad-free experience, unlimited videos, etc.
- **Can users access content without subscribing?** Yes (basic features)
- **How do users manage subscriptions?** Through iOS Settings

### Submit

1. Click "Submit for Review"
2. Apple will review in 1-3 days
3. Apple tests in sandbox (same as your TestFlight testing)
4. If approved, app goes live automatically

**✅ Done when:** App status shows "Waiting for Review"

---

## ✅ Step 6: Production (Automatic)

### After Apple Approval

**Nothing to do!** 🎉

When Apple approves your app:
1. ✅ App appears in App Store
2. ✅ Users can download
3. ✅ RevenueCat automatically switches to production
4. ✅ Real purchases work automatically
5. ✅ Real money is charged
6. ✅ Subscriptions sync automatically

**No code changes needed!**

---

## 📊 Verification Checklist

### Before Submitting to Apple
- [ ] StoreKit file added to Xcode project
- [ ] Xcode scheme configured
- [ ] Tested locally in simulator
- [ ] Products created in App Store Connect
- [ ] Products set to "Ready to Submit"
- [ ] Paid Applications Agreement signed
- [ ] Tax forms completed
- [ ] Banking information added
- [ ] Products configured in RevenueCat
- [ ] Entitlement created and linked
- [ ] Sandbox tester created
- [ ] Tested in TestFlight
- [ ] Purchase flow works
- [ ] Restore purchases works
- [ ] Premium features unlock

### After Apple Approval
- [ ] App appears in App Store
- [ ] Test real purchase (optional)
- [ ] Monitor RevenueCat dashboard
- [ ] Monitor App Store Connect sales

---

## 🐛 Common Issues

### "No products available" in simulator
**Fix:** Add StoreKit file to Xcode project and configure scheme

### "No products available" in TestFlight
**Fix:** Wait 10-15 minutes for Apple to sync products

### "Purchase failed" in sandbox
**Fix:** Sign in with sandbox tester account in Settings → App Store

### "Premium doesn't unlock"
**Fix:** Check RevenueCat dashboard, verify entitlement is "premium"

---

## 📞 Need Help?

### Check Console Logs
Look for these messages:
- `✅ RevenueCat initialized successfully`
- `📦 Found 2 packages`
- `✅ Purchase successful`

### Check RevenueCat Dashboard
- Go to Customers
- Search for your test user
- Should show active subscription

### Check App Store Connect
- Go to Sales and Trends
- Should show sandbox purchases

---

## 🎉 Success Criteria

You're ready when:
- ✅ Products load in simulator
- ✅ Products load in TestFlight
- ✅ Purchase works in sandbox
- ✅ Premium features unlock
- ✅ Restore purchases works
- ✅ App submitted to Apple

**Estimated Total Time:** 2 hours

**Difficulty:** Medium

**Confidence:** Very High (95%)

---

**Created:** 2025-10-16
**Status:** Ready to Execute

