# ⚡ Next Steps - 10 Minutes to Working Subscriptions

## 🔥 Critical: Do This NOW

### Step 1: Add StoreKit File to Xcode (5 min)

```bash
# Open Xcode
open ios/ToxicConfessions.xcworkspace
```

Then:
1. Right-click "ToxicConfessions" folder (blue icon) in left sidebar
2. "Add Files to ToxicConfessions..."
3. Select `ios/ToxicConfessions.storekit`
4. **UNCHECK** "Copy items if needed"
5. **CHECK** "Add to targets: ToxicConfessions"
6. Click "Add"

### Step 2: Configure Xcode Scheme (2 min)

1. Product → Scheme → Edit Scheme (or `⌘<`)
2. Click "Run" → "Options" tab
3. StoreKit Configuration → Select "ToxicConfessions.storekit"
4. Click "Close"

### Step 3: Rebuild (3 min)

```bash
npx expo run:ios
```

### Step 4: Test

1. Open app
2. Profile → Upgrade to Plus
3. Should see: $4.99/month, $29.99/year, $49.99 lifetime
4. Tap "Subscribe Now"
5. StoreKit dialog appears
6. Click "Subscribe"
7. Premium unlocks ✅

---

## 📋 Before Submitting to Apple

### Required (30 min):

**App Store Connect:**
1. Complete product metadata:
   - Display names
   - Descriptions (copy from SUBSCRIPTION_STATUS.md)
2. Sign Paid Applications Agreement
3. Add banking information
4. Add tax forms

**Testing:**
5. Test purchase in simulator
6. Test restore purchases
7. Verify premium features work

---

## 🚀 Ready to Submit?

Once the above is done:

1. Archive app: Product → Archive
2. Upload to App Store Connect
3. Fill out app information
4. Add screenshots
5. Submit for review

**Review Time:** 24-48 hours

---

## 📄 Full Documentation

- `SUBSCRIPTION_STATUS.md` - Complete status and troubleshooting
- `APPLE_SUBMISSION_GUIDE.md` - Full submission guide
- `QUICK_SETUP.md` - 5-minute setup instructions

---

## ✅ Current Status

- **RevenueCat:** ✅ Fully configured
- **Products:** ✅ Created in App Store Connect
- **App Code:** ✅ Ready
- **StoreKit File:** ⚠️ **YOU MUST ADD TO XCODE**
- **Metadata:** ⚠️ **COMPLETE IN APP STORE CONNECT**

**After adding StoreKit file, subscriptions will work immediately in sandbox AND production!**
