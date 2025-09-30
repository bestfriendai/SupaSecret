# Ads Feature Module

AdMob integration for the SupaSecret app with proper consent management, premium user handling, and feature flags.

## Architecture

```
ads/
├── components/          # React components
│   ├── BannerAd.tsx    # Banner ad component
│   ├── FeedAd.tsx      # Feed/list ad component
│   └── OptimizedFeedAd.tsx # Optimized feed ad with memoization
├── hooks/              # React hooks
│   ├── useInterstitialAd.ts # Interstitial ad hook
│   ├── useRewardedAd.ts     # Rewarded ad hook
│   └── index.ts
├── services/           # Business logic
│   └── adService.ts    # Core ad service (singleton)
├── types/              # TypeScript types
│   └── index.ts
├── index.ts           # Barrel exports
└── README.md          # This file
```

## Features

- **Environment Detection**: Automatically detects Expo Go, Dev Build, and Production environments
- **Consent Management**: Respects user advertising consent preferences
- **Premium User Handling**: Automatically hides ads for premium users
- **Ad Cooldown**: Prevents showing interstitial ads too frequently (60-second cooldown)
- **Error Handling**: Graceful degradation with retry logic
- **Demo Mode**: Shows placeholder ads in Expo Go for development
- **TypeScript**: Full type safety throughout

## Usage

### 1. Initialize AdMob Service

In your app initialization (e.g., `App.tsx` or service initializer):

```tsx
import { adService } from '@/features/ads';

// Initialize AdMob with config and consent
await adService.initialize(adConfig, hasUserConsent);
```

### 2. Banner Ads

```tsx
import { BannerAdComponent } from '@/features/ads';

<BannerAdComponent
  config={adConfig}
  isPremium={isPremium}
  hasConsent={hasConsent}
  visible={true}
  size="banner"
  placement="home-feed"
  onAdLoaded={() => console.log('Ad loaded')}
  onAdFailedToLoad={(error) => console.error('Ad failed', error)}
/>
```

### 3. Feed Ads (In Lists)

```tsx
import { FeedAdComponent, OptimizedFeedAd } from '@/features/ads';

// Simple version
<FeedAdComponent
  index={index}
  interval={5}
  placement="video-feed"
  config={adConfig}
  isPremium={isPremium}
  hasConsent={hasConsent}
/>

// Optimized version (recommended for large lists)
<OptimizedFeedAd
  index={index}
  interval={5}
  placement="video-feed"
  size="medium"
  config={adConfig}
  isPremium={isPremium}
  hasConsent={hasConsent}
/>
```

### 4. Interstitial Ads

```tsx
import { useInterstitialAd } from '@/features/ads';

function MyComponent() {
  const { showAd, isShowing } = useInterstitialAd({ config: adConfig, isPremium });

  const handleAction = async () => {
    const shown = await showAd({
      placement: 'post-creation',
      onAdDismissed: () => {
        console.log('Ad dismissed, continue flow');
      },
      onAdFailedToShow: (error) => {
        console.error('Failed to show ad', error);
      },
    });

    if (shown) {
      // Ad was shown
    }
  };

  return <Button onPress={handleAction} disabled={isShowing} />;
}
```

### 5. Rewarded Ads

```tsx
import { useRewardedAd } from '@/features/ads';

function MyComponent() {
  const { showAd, isShowing, lastReward } = useRewardedAd({ config: adConfig });

  const handleWatchAd = async () => {
    const result = await showAd({
      placement: 'settings',
      onEarnedReward: (reward) => {
        console.log('User earned reward:', reward);
        // Grant reward to user (e.g., coins, lives, etc.)
        grantReward(reward.amount, reward.type);
      },
      onAdDismissed: () => {
        console.log('Ad dismissed');
      },
    });

    if (result.rewarded) {
      // User watched full ad and earned reward
    }
  };

  return <Button onPress={handleWatchAd} disabled={isShowing} />;
}
```

## Configuration

### Ad Config Structure

```typescript
const adConfig: AdConfig = {
  enabled: true,
  testMode: __DEV__,
  appId: {
    ios: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID,
    android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID,
  },
  adUnits: {
    banner: {
      ios: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID,
      android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
    },
    interstitial: {
      ios: process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID,
      android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID,
    },
    rewarded: {
      ios: process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID,
      android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID,
    },
  },
};
```

### Environment Variables

Required environment variables in `.env`:

```bash
# AdMob App IDs
EXPO_PUBLIC_ADMOB_IOS_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX

# Banner Ad Units
EXPO_PUBLIC_ADMOB_IOS_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX

# Interstitial Ad Units
EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX

# Rewarded Ad Units
EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
```

### google-mobile-ads.json

Create `google-mobile-ads.json` in project root:

```json
{
  "react-native-google-mobile-ads": {
    "android_app_id": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
    "ios_app_id": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX",
    "delay_app_measurement_init": true,
    "optimize_initialization": true,
    "optimize_ad_loading": true
  }
}
```

## Ad Placements

Standard placements used in the app:

- `home-feed` - Home screen feed
- `video-feed` - Video feed/list
- `profile` - User profile screen
- `post-creation` - After creating a post
- `settings` - Settings screen

## Best Practices

### 1. Always Check Premium Status

```tsx
if (isPremium) {
  // Don't show ads
  return null;
}
```

### 2. Respect User Consent

```tsx
if (!hasConsent) {
  // Don't show ads or only show non-personalized ads
  return null;
}
```

### 3. Handle Ad Loading Failures

```tsx
onAdFailedToLoad={(error) => {
  console.error('Ad failed to load:', error);
  // Continue app flow normally, don't block user
}}
```

### 4. Use Cooldowns for Interstitial Ads

The service automatically enforces a 60-second cooldown between interstitial ads to prevent ad fatigue.

### 5. Test with Test Ads First

Use test ad unit IDs during development:

```typescript
import { TEST_AD_UNITS } from '@/features/ads';

const testConfig = {
  ...adConfig,
  testMode: true,
  adUnits: TEST_AD_UNITS,
};
```

## Testing

### Expo Go Testing

Ads will show as demo placeholders in Expo Go. To test real ads, create a development build:

```bash
npx expo run:ios
# or
npx expo run:android
```

### Test Ad Units

Google provides test ad units that always return ads:

- Banner: `ca-app-pub-3940256099942544/2934735716` (iOS), `ca-app-pub-3940256099942544/6300978111` (Android)
- Interstitial: `ca-app-pub-3940256099942544/4411468910` (iOS), `ca-app-pub-3940256099942544/1033173712` (Android)
- Rewarded: `ca-app-pub-3940256099942544/1712485313` (iOS), `ca-app-pub-3940256099942544/5224354917` (Android)

## Migration from Main App

This feature module is a direct migration from the main app with the following improvements:

1. **Better Organization**: Feature-based structure vs scattered files
2. **Type Safety**: Comprehensive TypeScript types
3. **Better Separation**: Service layer separated from UI components
4. **Hooks Pattern**: Easy-to-use hooks for interstitial and rewarded ads
5. **Documentation**: Comprehensive docs and examples

## Troubleshooting

### Ads not showing?

1. Check if `config.enabled` is `true`
2. Verify user is not premium (`isPremium = false`)
3. Ensure user has given consent (`hasConsent = true`)
4. Check ad unit IDs are valid
5. Verify you're using a development build (not Expo Go)
6. Check console logs for errors

### "AdMob module not available"?

This means you're in Expo Go. Create a development build to test real ads.

### Interstitial ads not showing frequently?

Ads have a 60-second cooldown to prevent ad fatigue. This is by design.

## Dependencies

- `react-native-google-mobile-ads`: ^13.2.0 (or latest compatible version)
- `expo-constants`: For environment detection
- React Native & React

## License

Same as main app.
