# StoreKit Configuration Setup

This guide explains how to set up StoreKit Configuration for local testing of in-app purchases with RevenueCat.

## Problem

When running the app on a real device in development, you may see this error:

```
[RevenueCat] 🍎‼️ Error fetching offerings - The operation couldn't be completed. (RevenueCat.OfferingsManager.Error error 1.)
There's a problem with your configuration. None of the products registered in the RevenueCat dashboard could be fetched from App Store Connect (or the StoreKit Configuration file if one is being used).
```

This happens because:
1. Products are not yet configured in App Store Connect, OR
2. The app is not using a StoreKit Configuration file for local testing

## Solution: Use StoreKit Configuration File

A StoreKit Configuration file (`ToxicConfessions.storekit`) has been created in the project root. This allows you to test in-app purchases locally without needing to configure products in App Store Connect.

### Setup Steps (Xcode)

1. **Open the project in Xcode**:
   ```bash
   cd ios
   open ToxicConfessions.xcworkspace
   ```

2. **Configure the scheme**:
   - In Xcode, go to: **Product** > **Scheme** > **Edit Scheme...**
   - Select **Run** in the left sidebar
   - Go to the **Options** tab
   - Under **StoreKit Configuration**, select **ToxicConfessions.storekit**
   - Click **Close**

3. **Rebuild the app**:
   ```bash
   npx expo run:ios
   ```

### Verify Setup

After rebuilding, the RevenueCat error should be gone. You can verify by:

1. Opening the app
2. Navigating to the paywall/subscription screen
3. Checking the console logs for:
   ```
   ✅ Found 2 packages
   ```

### Products Configured

The StoreKit configuration includes:

- **Monthly Subscription** (`com.toxic.confessions.monthly`)
  - Price: $4.99/month
  - 7-day free trial

- **Annual Subscription** (`com.toxic.confessions.annual`)
  - Price: $29.99/year
  - 7-day free trial
  - Save 50% compared to monthly

## Alternative: Configure in App Store Connect

For production or TestFlight builds, you'll need to configure products in App Store Connect:

1. **Sign in to App Store Connect**: https://appstoreconnect.apple.com
2. **Go to your app** > **In-App Purchases**
3. **Create Auto-Renewable Subscriptions**:
   - Product ID: `com.toxic.confessions.monthly`
   - Reference Name: Monthly Subscription
   - Subscription Duration: 1 Month
   - Price: $4.99
   - Add 7-day free trial

   - Product ID: `com.toxic.confessions.annual`
   - Reference Name: Annual Subscription
   - Subscription Duration: 1 Year
   - Price: $29.99
   - Add 7-day free trial

4. **Submit for Review** (required before products can be fetched)

5. **Configure in RevenueCat**:
   - Go to RevenueCat dashboard
   - Add the product IDs
   - Create an offering with both products

## Troubleshooting

### Error: "No StoreKit Configuration file found"

Make sure the `ToxicConfessions.storekit` file is:
1. In the project root directory
2. Added to the Xcode project (drag it into Xcode if needed)
3. Selected in the scheme options

### Error: "Products still not loading"

1. Clean build folder: **Product** > **Clean Build Folder** (Shift+Cmd+K)
2. Delete derived data:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
3. Rebuild the app

### Testing Purchases

In development with StoreKit Configuration:
- Purchases are simulated locally
- No real money is charged
- You can test the full purchase flow
- Subscriptions can be managed in Settings > StoreKit Testing

## References

- [Apple StoreKit Testing Documentation](https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode)
- [RevenueCat iOS Setup](https://www.revenuecat.com/docs/getting-started/installation/ios)
- [Testing In-App Purchases](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox)

