# In-App Purchase Setup Instructions

**App Created**: ✅ Toxic Confessions (ID: 6753184999)
**Bundle ID**: ✅ com.toxic.confessions
**RevenueCat**: ✅ Fully configured with matching product IDs

---

## Why Manual Setup is Required

Fastlane's Spaceship API for creating IAPs has proven unreliable:
- First attempt failed: `undefined method 'in_app_purchases'`
- Second attempt failed: `undefined method 'get_subscription_groups'`

**Recommended**: Manual creation (10 minutes) or RevenueCat auto-push (requires dashboard config)

---

## Option 1: Manual Creation (Recommended - 10 minutes)

Follow the detailed guide in **CREATE_IAP_MANUAL.md**

**Direct link**: https://appstoreconnect.apple.com/apps/6753184999/appstore/features/iap

### Quick Steps:
1. Log into App Store Connect
2. Go to Toxic Confessions → Features → In-App Purchases
3. Create three products with these **exact** IDs:
   - `com.toxic.confessions.monthly` (Auto-Renewable, 1 Month, $4.99)
   - `com.toxic.confessions.annual` (Auto-Renewable, 1 Year, $29.99)
   - `com.toxic.confessions.lifetime` (Non-Consumable, $49.99)
4. Add localizations and pricing
5. Done!

---

## Option 2: RevenueCat Auto-Push

Configure App Store Connect API in RevenueCat dashboard:

### Step 1: Add Credentials to RevenueCat
1. Go to: https://app.revenuecat.com/projects/projbac41a84/apps
2. Click "Toxic Confessions iOS"
3. Find "App Store Connect Integration" or "Service Credentials"
4. Enter:
   - **Key ID**: `K3AQ7255RT`
   - **Issuer ID**: `d379ef5a-740b-4b80-bc48-8e1526fc03d3`
   - **Private Key**: (paste content from `AuthKey_K3AQ7255RT.p8`)
5. Click Save

### Step 2: Push Products from RevenueCat
Once credentials are saved, products can be pushed directly from RevenueCat to App Store Connect using the MCP command:

```
mcp_RC_create_product_in_store
```

---

## App Store Connect API Credentials

**Location**: `./AuthKey_K3AQ7255RT.p8`

**Key Details**:
- Key ID: K3AQ7255RT
- Issuer ID: d379ef5a-740b-4b80-bc48-8e1526fc03d3
- Generated: Today

**Security Note**: This key has full App Store Connect API access. Keep it secure.

---

## Product Configuration

All products are **already configured in RevenueCat** with the correct IDs:

### iOS Products:
| Product | ID | Type | RevenueCat ID |
|---------|----|----- |---------------|
| Monthly | `com.toxic.confessions.monthly` | Subscription | prod47867f0be0 |
| Annual | `com.toxic.confessions.annual` | Subscription | prod7fdcc0e91d |
| Lifetime | `com.toxic.confessions.lifetime` | Non-Renewable | prod8569a64235 |

### Android Products:
| Product | ID | Type | RevenueCat ID |
|---------|----|----- |---------------|
| Monthly | `com.toxic.confessions.monthly:monthly-base` | Subscription | prodbb6d838b3c |
| Annual | `com.toxic.confessions.annual:annual-base` | Subscription | prodcf041efab9 |
| Lifetime | `com.toxic.confessions.lifetime:lifetime-base` | Subscription | prod0dc9234bfa |

### Entitlements (already linked):
- ✅ `premium`
- ✅ `pro`
- ✅ `unlimited_videos`

### Offerings & Packages:
- ✅ Default offering with $rc_monthly, $rc_annual, $rc_lifetime

---

## How It Works

Once IAPs are created in App Store Connect:

```
User taps Subscribe
    ↓
RevenueCat SDK fetches offerings
    ↓
Displays products with App Store pricing
    ↓
User completes purchase
    ↓
App Store validates → RevenueCat grants entitlements
    ↓
App unlocks premium features
```

**No code changes needed** - your `src/services/RevenueCatService.ts` is already configured.

---

## Verification

After creating IAPs, verify they appear:

```bash
fastlane ios list_iap
```

Or check in RevenueCat dashboard:
https://app.revenuecat.com/projects/projbac41a84/overview

---

## Next Steps

1. **Create IAPs** (manual or RevenueCat auto-push)
2. **Complete metadata** in App Store Connect
3. **Build production app**: `eas build --platform ios --profile production`
4. **Test in sandbox** with test Apple ID
5. **Submit for review**

---

## Support

- **App Store Connect**: https://appstoreconnect.apple.com/apps/6753184999
- **RevenueCat Dashboard**: https://app.revenuecat.com
- **Manual Guide**: CREATE_IAP_MANUAL.md