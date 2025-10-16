# 🚀 Quick Setup - Do This NOW Before Testing

## Step 1: Add StoreKit File to Xcode (2 minutes)

1. **Open Xcode workspace:**
   ```bash
   cd /Users/iamabillionaire/Downloads/SupaSecret
   open ios/ToxicConfessions.xcworkspace
   ```

2. **Wait for Xcode to fully load**

3. **Add the StoreKit file:**
   - In the left sidebar (Project Navigator), find the "ToxicConfessions" folder (blue icon)
   - Right-click on it → **Add Files to "ToxicConfessions"...**
   - Navigate to: `ios/ToxicConfessions.storekit`
   - **IMPORTANT:** UNCHECK "Copy items if needed"
   - **IMPORTANT:** CHECK "Add to targets: ToxicConfessions"
   - Click **Add**

4. **Verify it was added:**
   - You should now see `ToxicConfessions.storekit` in the project navigator
   - It should have a blue icon

## Step 2: Configure Scheme (1 minute)

1. **Open scheme editor:**
   - In Xcode menu bar: **Product** → **Scheme** → **Edit Scheme...**
   - Or press: `⌘ + <` (Command + Less Than)

2. **Set StoreKit configuration:**
   - Click **Run** in the left sidebar
   - Click the **Options** tab at the top
   - Find "StoreKit Configuration" dropdown
   - Select **ToxicConfessions.storekit**
   - Click **Close**

## Step 3: Test It! (5 minutes)

1. **Clean and rebuild:**
   ```bash
   # In terminal:
   cd /Users/iamabillionaire/Downloads/SupaSecret

   # Clean pods (optional but recommended)
   cd ios && pod deintegrate && pod install && cd ..

   # Or clean in Xcode:
   # Product → Clean Build Folder (⇧⌘K)
   ```

2. **Run the app:**
   ```bash
   npx expo run:ios
   ```

   Or in Xcode: **Product → Run** (`⌘R`)

3. **Test the paywall:**
   - Launch app in simulator
   - Create account or sign in
   - Tap **Profile** tab
   - Tap **"Upgrade to Plus"** or similar button
   - You should see:
     - ✅ Premium Monthly ($4.99/month) - 7 day free trial
     - ✅ Premium Annual ($29.99/year) - 7 day free trial
     - ✅ Premium Lifetime ($49.99) one-time

4. **Test purchase (Sandbox):**
   - Select any plan
   - Tap "Start Free Trial"
   - StoreKit dialog should appear
   - Click **Subscribe**
   - Should see success message
   - Premium features should unlock

## ✅ Success Indicators

You'll know it's working when:

1. **Offerings Load:**
   - Console shows: `✅ Loaded 3 plans from RevenueCat`
   - Console shows: `🚀 Retrieved RevenueCat offerings`

2. **Purchase Works:**
   - StoreKit popup appears
   - After subscribing, you see success alert
   - Console shows: `✅ Purchase completed successfully!`
   - Console shows: `✅ Subscription status synced with Supabase`

3. **Premium Features Work:**
   - Can upload videos > 1 minute
   - No ads showing
   - See "Plus" badge in profile

## 🐛 Troubleshooting

### "No offerings available"
**Solution:**
1. Check console for RevenueCat errors
2. Verify StoreKit file is selected in scheme
3. Clean build folder and rebuild

### "Products could not be fetched"
**Solution:**
1. Verify StoreKit file has all 3 products
2. Check product IDs match exactly:
   - `com.toxic.confessions.monthly`
   - `com.toxic.confessions.annual`
   - `com.toxic.confessions.lifetime`
3. Restart Xcode and simulator

### "Purchase completed but features don't unlock"
**Solution:**
1. Check console for `✅ Subscription status synced`
2. Verify entitlement check in code uses "premium"
3. Try signing out and back in

### "RevenueCat initialization failed"
**Solution:**
1. Check .env has API keys:
   ```bash
   cat .env | grep REVENUECAT
   ```
2. Should show: `EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_nXnAuBEeeERxBHxAzqhFgSnIzam`
3. If missing, add it and rebuild

## 📝 What You've Set Up

✅ **StoreKit Configuration File** - Allows sandbox testing without App Store Connect
✅ **RevenueCat Integration** - Handles subscription management and validation
✅ **3 Subscription Products:**
   - Monthly ($4.99) with 7-day trial
   - Annual ($29.99) with 7-day trial
   - Lifetime ($49.99) one-time

✅ **Automatic Features:**
   - Free trial for 7 days
   - Auto-renewal after trial
   - Restore purchases
   - Cross-device sync via RevenueCat
   - Entitlement checking

## 🎯 Next Steps

1. **Test thoroughly** - Purchase, restore, cancel
2. **Create App Store Connect products** - See `APPLE_SUBMISSION_GUIDE.md`
3. **Add screenshots** - For App Store listing
4. **Submit for review** - Follow the full guide

## 💡 Pro Tips

- **Sandbox testing is FREE** - Test as many times as you want
- **Subscriptions renew every 5 minutes in sandbox** - For fast testing
- **Clear sandbox purchases** - Settings → App Store → Sandbox Account → Manage
- **Check RevenueCat Dashboard** - See real-time subscription events

---

Need help? Check the full guide: `APPLE_SUBMISSION_GUIDE.md`
