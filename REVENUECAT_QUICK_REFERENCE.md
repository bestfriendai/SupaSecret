# RevenueCat Quick Reference - Toxic Confessions

## 🔑 Key Information

| Setting | Value |
|---------|-------|
| **App Name** | Toxic Confessions |
| **Bundle ID** | com.toxic.confessions |
| **iOS API Key** | appl_DOIFtYSbtSxeplMuPlcSNIEapYvOz |
| **Android API Key** | goog_DOIFtYSbtSxeplMuPlcSNIEapYvOz |

## 📦 Products Configuration

### Monthly Subscription
- **Product ID**: `supasecret_plus_monthly`
- **Name**: ToxicConfessions Plus Monthly
- **Price**: $4.99 USD
- **Duration**: Monthly
- **Entitlement**: supasecret_plus

### Annual Subscription
- **Product ID**: `supasecret_plus_annual`
- **Name**: ToxicConfessions Plus Annual
- **Price**: $29.99 USD (Save 50%)
- **Duration**: Annual
- **Entitlement**: supasecret_plus
- **Status**: ⭐ Popular/Recommended

## 🎯 Entitlement

**ID**: `supasecret_plus`
**Name**: Premium Access
**Features**:
- ✅ Ad-free experience
- ✅ Unlimited video recordings (up to 5 minutes)
- ✅ Higher quality video (4K)
- ✅ Unlimited saves
- ✅ Advanced filters
- ✅ Priority processing
- ✅ Custom themes
- ✅ Early access to new features

## 🛍️ Offering

**ID**: `default`
**Name**: ToxicConfessions Plus
**Packages**:
- `monthly` → supasecret_plus_monthly
- `annual` → supasecret_plus_annual (Recommended)

## 🏪 Store Setup

### App Store Connect
1. Create subscription group: `supasecret_plus_group`
2. Add subscriptions:
   - `supasecret_plus_monthly` - $4.99/month
   - `supasecret_plus_annual` - $29.99/year

### Google Play Console
1. Create subscription group: `supasecret_plus_group`
2. Add subscriptions:
   - `supasecret_plus_monthly` - $4.99/month
   - `supasecret_plus_annual` - $29.99/year

## 🧪 Testing Commands

```bash
# Verify RevenueCat configuration
npm run verify-revenuecat

# Show setup instructions
npm run setup-revenuecat

# Test in development
npm start
```

## 🔗 Important Links

- **RevenueCat Dashboard**: https://app.revenuecat.com
- **Documentation**: https://docs.revenuecat.com
- **Support**: support@revenuecat.com

## 📱 Integration Status

✅ **Environment Variables**: Configured
✅ **API Keys**: Valid format
✅ **Configuration Files**: Present
✅ **Package Dependencies**: Installed
✅ **App Configuration**: Correct bundle IDs
✅ **Dashboard Configuration**: Complete

## 🚀 Next Steps

1. **Dashboard Setup**: Follow the detailed guide in `setup/revenuecat-setup-guide.md`
2. **Store Integration**: Connect App Store Connect and Google Play Console
3. **Product Creation**: Create in-app purchases in both stores
4. **Testing**: Use sandbox accounts to test purchase flow
5. **Production**: Submit for app store review

## 🛠️ Code Usage

```typescript
// Check if user has premium access
const isPremium = await RevenueCatService.isUserPremium();

// Get available offerings
const offerings = await RevenueCatService.getOfferings();

// Purchase a subscription
const result = await RevenueCatService.purchasePackage(selectedPackage);

// Get customer info
const customerInfo = await RevenueCatService.getCustomerInfo();
```

## 🔧 Configuration Files

- `src/config/production.ts` - RevenueCat settings
- `src/services/RevenueCatService.ts` - Core service
- `setup/revenuecat-dashboard-config.json` - Dashboard config
- `setup/store-configuration.json` - Store setup data

---

**Status**: ✅ Ready for dashboard setup
**Last Updated**: $(date)
**Version**: 1.0.0
