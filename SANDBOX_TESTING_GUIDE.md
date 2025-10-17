# Sandbox Testing Guide - RevenueCat & IAP

## ✅ YES to Both Questions!

### Question 1: Is it integrated in the paywall?
**Answer**: ✅ **YES - Fully integrated**

### Question 2: Will it work in sandbox until packages are approved?
**Answer**: ✅ **YES - Works in sandbox BEFORE Apple approval**

---

## Integration Flow Verified ✅

### Complete Data Flow

```
PaywallScreen.tsx (UI)
  │
  ├─ useSubscription() hook
  │   └─ SubscriptionService.getOfferings()
  │       └─ Purchases.getOfferings() [Official SDK]
  │           └─ RevenueCat API
  │               └─ Returns packages: $rc_monthly, $rc_annual, $rc_lifetime
  │
  ├─ User taps "Start Free Trial"
  │
  └─ purchaseSubscription(selectedPackage)
      └─ SubscriptionService.purchasePackage(pkg)
          └─ Purchases.purchasePackage(pkg) [Official SDK]
              └─ Apple StoreKit (Sandbox)
                  └─ Transaction processed
                      └─ RevenueCat webhook
                          └─ Entitlements updated
```

### Paywall Integration Code

**File**: `src/features/subscription/screens/PaywallScreen.tsx`

**Line 69**: Uses RevenueCat hook
```typescript
const { isLoading, error, purchaseSubscription, restorePurchases, clearError, getOfferings } = useSubscription();
```

**Line 93**: Loads offerings from RevenueCat
```typescript
const offerings = await getOfferings();
```

**Line 102**: Gets packages
```typescript
const availablePackages = offerings.current.availablePackages || [];
```

**Line 110**: Displays packages in UI
```typescript
setPackages(availablePackages);
```

**Line 137**: Purchases selected package
```typescript
const success = await purchaseSubscription(selectedPackage);
```

✅ **Confirmed**: Paywall is fully integrated with RevenueCat SDK

---

## Sandbox Testing - How It Works

### Do Products Need Apple Approval First?

**❌ NO - Products do NOT need to be approved by Apple to test in sandbox**

Apple's sandbox environment works with products in these states:
- ✅ "Waiting for Review"
- ✅ "In Review"
- ✅ "Pending Developer Release"
- ✅ "Ready to Submit"
- ✅ "Rejected" (you can still test rejected products!)

You can test IAP **immediately after creating products in App Store Connect** - no approval needed!

### What You Need for Sandbox Testing

#### 1. Products Created in App Store Connect ✅
- Create the 3 in-app purchase products (see APPLE_REVIEW_FIXES.md)
- Products just need to exist - any status is fine
- No approval required

#### 2. Products Synced to RevenueCat (10-30 minutes) ⏱️
- RevenueCat automatically syncs from App Store Connect
- Check RevenueCat dashboard to see when sync completes
- Once visible in dashboard, ready to test

#### 3. Development Build (NOT Expo Go) ✅
```bash
npx expo run:ios --configuration Debug
```

#### 4. Sandbox Test Account 👤
- Create in App Store Connect → Users and Access → Sandbox Testers
- Sign out of real Apple ID on test device
- DO NOT sign in to Settings → use StoreKit prompt instead

#### 5. StoreKit Configuration (for simulator testing) 📱
- Use `ios/ToxicConfessions.storekit` file
- Select in Xcode: Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration

---

## Testing Workflow

### Step 1: Create Products in App Store Connect

**Time**: 15-30 minutes

Create these 3 products (detailed instructions in APPLE_REVIEW_FIXES.md):
1. `com.toxic.confessions.monthly` - $4.99/month
2. `com.toxic.confessions.annual` - $29.99/year
3. `com.toxic.confessions.lifetime` - $49.99 one-time

**Status after creation**: "Waiting for Review" or "Ready to Submit"
**Can you test?**: ✅ YES - immediately (after sync)

### Step 2: Wait for RevenueCat Sync

**Time**: 10-30 minutes

**Check sync status**:
1. Go to RevenueCat Dashboard
2. Navigate to Products tab
3. Wait until all 3 products appear

**Console message when synced**:
```
✅ Found 3 packages
✅ Packages loaded successfully: ['$rc_monthly', '$rc_annual', '$rc_lifetime']
```

### Step 3: Build Development App

```bash
# Clean build (recommended)
rm -rf node_modules ios/Pods ios/Podfile.lock
npm install
cd ios && pod install && cd ..

# Run on device or simulator
npx expo run:ios --configuration Debug
```

**Important**: Must be a development build, NOT Expo Go!

### Step 4: Test Purchase Flow

#### On Real Device (Sandbox)

1. **Sign out** of real Apple ID:
   - Settings → [Your Name] → Sign Out

2. **Run app** and navigate to paywall

3. **Select a subscription** plan

4. **Tap "Start Free Trial"**

5. **StoreKit prompt appears** asking for Apple ID
   - Enter your sandbox test account email
   - Use sandbox password
   - DO NOT sign in to Settings first!

6. **Complete purchase**

7. **Verify entitlement**:
   - Premium features should unlock
   - Console: `✅ Purchase completed successfully!`

#### On Simulator (StoreKit Testing)

1. **Select StoreKit config** in Xcode:
   - Product → Scheme → Edit Scheme
   - Run → Options
   - StoreKit Configuration → ToxicConfessions.storekit

2. **Run app** and navigate to paywall

3. **Select and purchase** - works instantly!

4. **No Apple ID needed** - uses local StoreKit file

---

## Expected Console Output

### Successful Load (Sandbox)

```
📦 Loading RevenueCat offerings...
🚀 RevenueCat module loaded successfully
✅ RevenueCat initialized successfully
📱 Environment: Development
📦 Found 3 packages
✅ Packages loaded successfully: ['$rc_monthly', '$rc_annual', '$rc_lifetime']
```

### Successful Purchase (Sandbox)

```
🚀 Purchasing package: $rc_monthly
✅ Purchase completed successfully!
✅ Premium entitlement active
```

### Before Products Exist

```
📦 Loading RevenueCat offerings...
✅ RevenueCat initialized successfully
⚠️ No current offering available
```

This is normal - means products haven't been created in App Store Connect yet.

---

## Troubleshooting

### Issue: "No subscription packages available"

**Cause**: Products not created in App Store Connect or not synced yet

**Solution**:
1. ✅ Create products in App Store Connect
2. ⏱️ Wait 30 minutes for sync
3. 🔄 Refresh RevenueCat dashboard
4. 📱 Restart app and try again

### Issue: "Sandbox receipt used in production"

**Cause**: Testing with sandbox account but app thinks it's production

**Solution**: This is normal! RevenueCat handles this automatically. The error you mentioned from Apple's rejection was about proper receipt validation, which RevenueCat handles correctly.

### Issue: StoreKit prompt doesn't appear

**Cause**: Already signed in with non-sandbox account

**Solution**:
1. Sign out of all Apple IDs
2. Delete and reinstall app
3. Try purchase again
4. StoreKit will prompt for credentials

### Issue: "Cannot connect to iTunes Store"

**Cause**: Sandbox servers temporarily unavailable

**Solution**:
1. Wait a few minutes
2. Try again
3. Check Apple System Status page

### Issue: Purchase completes but entitlement not active

**Cause**: Entitlement not attached to product in RevenueCat

**Solution**:
1. Go to RevenueCat dashboard
2. Navigate to Entitlements → premium
3. Click "Products" tab
4. Ensure all 3 products are attached
5. Save changes

---

## Testing Checklist

Before Apple review, verify:

### Product Setup
- [ ] 3 products created in App Store Connect
- [ ] Products visible in RevenueCat dashboard
- [ ] Products attached to "premium" entitlement
- [ ] "default" offering set as current
- [ ] 3 packages configured in offering

### App Build
- [ ] Development build (not Expo Go)
- [ ] `react-native-purchases@9.5.4` installed
- [ ] RevenueCat API keys in .env file
- [ ] Clean build completed successfully

### Sandbox Testing
- [ ] Sandbox test account created
- [ ] Signed out of real Apple ID
- [ ] Paywall loads with 3 options
- [ ] Can select subscription plan
- [ ] StoreKit prompt appears
- [ ] Purchase completes successfully
- [ ] Premium features unlock
- [ ] Restore purchases works

### Console Verification
- [ ] No error messages during load
- [ ] "✅ Packages loaded successfully" appears
- [ ] "✅ Purchase completed successfully!" after purchase
- [ ] "✅ Premium entitlement active" after purchase

---

## Important Notes

### Apple Review Testing

**When Apple reviews your app**:
1. ✅ They use sandbox environment
2. ✅ Your sandbox-ready products will work
3. ✅ They test actual purchase flow
4. ✅ They verify entitlements activate
5. ✅ Products do NOT need to be approved first

**Apple's sandbox account**:
- Apple has their own internal sandbox accounts
- They automatically test in sandbox mode
- Your products just need to exist in App Store Connect

### Sandbox vs Production

**Sandbox** (Testing):
- ✅ Free transactions
- ✅ Instant renewals (minutes instead of months)
- ✅ Works before Apple approval
- ✅ Use sandbox test accounts
- ✅ Use development builds

**Production** (Live):
- 💰 Real money
- 📅 Real renewal periods
- ✅ Only works after Apple approval
- 👤 Use real Apple IDs
- 📱 TestFlight or App Store builds

### RevenueCat Environment Detection

RevenueCat automatically detects sandbox vs production:
- Sandbox receipts → routed to sandbox
- Production receipts → routed to production
- No code changes needed!

---

## Summary

### Question 1: Is it integrated in the paywall?
✅ **YES** - Full integration verified:
- PaywallScreen → useSubscription → SubscriptionService → RevenueCat SDK
- Loads offerings from RevenueCat
- Displays packages in UI
- Handles purchases through RevenueCat
- Manages entitlements via RevenueCat

### Question 2: Will it work in sandbox before approval?
✅ **YES** - Works immediately:
- Products just need to exist in App Store Connect
- NO Apple approval required for sandbox testing
- RevenueCat syncs products automatically (10-30 min)
- Test with sandbox accounts or StoreKit file
- Apple reviewers will test in sandbox too

### Timeline
1. **Now**: Create products in App Store Connect (15-30 min)
2. **+30 min**: Products sync to RevenueCat
3. **+5 min**: Build and test in sandbox
4. **READY**: Submit to Apple with working IAP

### Key Point
Your paywall is already fully integrated with RevenueCat. You just need to:
1. Create the 3 products in App Store Connect
2. Wait 30 minutes for sync
3. Test in sandbox
4. Submit to Apple

No code changes needed - it's ready to go! 🚀
