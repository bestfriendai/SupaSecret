# Native Build Fixes - October 2025

This document summarizes the fixes applied to resolve errors in native builds.

## Issues Fixed

### 1. Camera Device Error ✅

**Error**:
```
ERROR [device/no-device: No device was set! Use `useCameraDevice(..)` or `Camera.getAvailableCameraDevices()` to select a suitable Camera device.]
```

**Root Cause**:
The `useVisionCameraRecorder` hook was setting a mock camera device `{ facing }` instead of using the actual Vision Camera device from `Camera.getAvailableCameraDevices()`.

**Fix**:
- Modified `src/hooks/useVisionCameraRecorder.ts` to properly call `Camera.getAvailableCameraDevices()`
- Find the device matching the current facing direction (front/back)
- Set the actual device object instead of a mock

**Code Changes**:
```typescript
// Before (WRONG):
setCameraDevice({ facing });

// After (CORRECT):
const devices = await Camera.getAvailableCameraDevices();
const device = devices.find((d: any) => d.position === facing);
setCameraDevice(device);
```

**Files Modified**:
- `src/hooks/useVisionCameraRecorder.ts`

---

### 2. Supabase GoTrueClient Error ✅

**Error**:
```
ERROR [Error: Value is undefined, expected an Object]
LOG GoTrueClient@0 (2.71.1) 2025-10-01T04:24:18.982Z #_stopAutoRefresh()
```

**Root Cause**:
The Supabase auth storage adapter was returning `undefined` when no session existed in secure storage, but GoTrueClient expected either a string or `null`.

**Fix**:
- Added proper error handling in the storage adapter
- Return `null` instead of `undefined` when no value exists
- Added validation to prevent setting `undefined` values
- Added try-catch blocks for all storage operations

**Code Changes**:
```typescript
// Before:
const supabaseStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// After:
const supabaseStorage = {
  getItem: async (key: string) => {
    try {
      const value = await SecureStore.getItemAsync(key);
      return value ?? null; // Return null if undefined
    } catch (error) {
      console.warn(`[Supabase Storage] Failed to get item "${key}":`, error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (value === undefined) {
        console.warn(`[Supabase Storage] Attempted to set undefined value for key "${key}"`);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`[Supabase Storage] Failed to set item "${key}":`, error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`[Supabase Storage] Failed to remove item "${key}":`, error);
    }
  },
};
```

**Files Modified**:
- `src/lib/supabase.ts`

---

### 3. RevenueCat Configuration Error ✅

**Error**:
```
ERROR [RevenueCat] 🍎‼️ Error fetching offerings - The operation couldn't be completed. (RevenueCat.OfferingsManager.Error error 1.)
There's a problem with your configuration. None of the products registered in the RevenueCat dashboard could be fetched from App Store Connect (or the StoreKit Configuration file if one is being used).
```

**Root Cause**:
Products were not configured in App Store Connect, and no StoreKit Configuration file was set up for local testing.

**Fix**:
1. Created `ToxicConfessions.storekit` file with product definitions
2. Added better error handling and logging in RevenueCat service
3. Created setup documentation

**Products Configured**:
- Monthly Subscription: `com.toxic.confessions.monthly` ($4.99/month)
- Annual Subscription: `com.toxic.confessions.annual` ($29.99/year)
- Both include 7-day free trial

**Setup Required**:
To use the StoreKit configuration:
1. Open Xcode: `cd ios && open ToxicConfessions.xcworkspace`
2. Product > Scheme > Edit Scheme > Run > Options
3. Select `ToxicConfessions.storekit` as StoreKit Configuration
4. Rebuild: `npx expo run:ios`

**Files Created**:
- `ToxicConfessions.storekit` - StoreKit configuration file
- `docs/STOREKIT_SETUP.md` - Detailed setup guide

**Files Modified**:
- `src/services/RevenueCatService.ts` - Better error handling and logging

---

## Testing

After applying these fixes, test the following:

### Camera Recording
1. Navigate to video recording screen
2. Verify camera preview appears
3. Check console for: `✅ Found camera device: { position: 'front', id: '...' }`
4. Test recording a video
5. Verify face blur works (if enabled)

### Authentication
1. Sign in/sign up
2. Check console - should NOT see GoTrueClient errors
3. Verify session persists after app restart

### In-App Purchases
1. Navigate to paywall/subscription screen
2. Check console for: `✅ Found 2 packages`
3. Verify products display correctly
4. Test purchase flow (uses StoreKit testing, no real charges)

## Build Commands

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android

# Clean build (if issues persist)
cd ios && pod install && cd ..
npx expo run:ios --clean
```

## References

- [Vision Camera Documentation](https://react-native-vision-camera.com/)
- [FaceBlurApp Example](https://github.com/mrousavy/FaceBlurApp)
- [Supabase Auth Storage](https://supabase.com/docs/reference/javascript/auth-storage)
- [RevenueCat iOS Setup](https://www.revenuecat.com/docs/getting-started/installation/ios)
- [StoreKit Testing](https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode)

## Next Steps

1. Test all fixes on a real device
2. Verify camera recording works with face blur
3. Test authentication flow
4. Test in-app purchase flow
5. Configure products in App Store Connect for production
6. Submit app for review

