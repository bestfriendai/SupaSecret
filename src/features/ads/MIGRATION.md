# Migration Guide: Main App to Feature-Based Ads

This guide helps you migrate from the main app's AdMob implementation to the new feature-based structure.

## Overview of Changes

### Old Structure (Main App)
```
src/
├── services/
│   └── AdMobService.ts
├── components/
│   ├── AdMobBanner.tsx
│   ├── OptimizedAdBanner.tsx
│   └── ads/
│       ├── BannerAdComponent.tsx
│       └── FeedAdComponent.tsx
├── config/
│   └── production.ts (contains ad config)
└── state/
    └── consentStore.ts
```

### New Structure (Feature Module)
```
features/ads/
├── components/
│   ├── BannerAd.tsx
│   ├── FeedAd.tsx
│   └── OptimizedFeedAd.tsx
├── hooks/
│   ├── useInterstitialAd.ts
│   ├── useRewardedAd.ts
│   └── index.ts
├── services/
│   ├── adService.ts
│   └── adConfig.ts
├── types/
│   └── index.ts
├── index.ts
├── README.md
├── EXAMPLES.md
└── MIGRATION.md (this file)
```

## Key Improvements

1. **Better Organization**: All ad-related code in one feature module
2. **Type Safety**: Comprehensive TypeScript types
3. **Hooks Pattern**: Easy-to-use hooks for interstitial and rewarded ads
4. **Config Helpers**: Utility functions for creating and validating configs
5. **Better Documentation**: Comprehensive docs and examples
6. **Improved Error Handling**: Better error messages and recovery
7. **Testing Support**: Easier to test with isolated components

## Step-by-Step Migration

### Step 1: Update Imports

**Before (Main App):**
```tsx
import { AdMobService } from '../services/AdMobService';
import { AdMobBanner } from '../components/AdMobBanner';
import { BannerAdComponent } from '../components/ads/BannerAdComponent';
import { FeedAdComponent } from '../components/ads/FeedAdComponent';
```

**After (Feature Module):**
```tsx
import {
  adService,
  BannerAdComponent,
  FeedAdComponent,
  OptimizedFeedAd,
  useInterstitialAd,
  useRewardedAd,
  createAdConfig,
} from '@/features/ads';
```

### Step 2: Update Service Usage

**Before (Main App):**
```tsx
// AdMobService is a static class
await AdMobService.initialize();
const adUnitId = AdMobService.getBannerAdUnitId();
await AdMobService.showInterstitialAd(isPremium);
```

**After (Feature Module):**
```tsx
// adService is a singleton instance
const adConfig = createAdConfig();
await adService.initialize(adConfig, hasConsent);
const adUnitId = adService.getAdUnitId('banner', adConfig);

// Use hooks for interstitial ads
const { showAd } = useInterstitialAd({ config: adConfig, isPremium });
await showAd({ placement: 'home-feed' });
```

### Step 3: Update Banner Ad Components

**Before (Main App):**
```tsx
<AdMobBanner visible={true} testMode={__DEV__} />
```

**After (Feature Module):**
```tsx
<BannerAdComponent
  config={adConfig}
  isPremium={isPremium}
  hasConsent={hasConsent}
  visible={true}
  size="banner"
  placement="home-feed"
/>
```

### Step 4: Update Feed Ads

**Before (Main App):**
```tsx
<FeedAdComponent index={index} interval={5} placement="video-feed" />
```

**After (Feature Module):**
```tsx
<FeedAdComponent
  index={index}
  interval={5}
  placement="video-feed"
  config={adConfig}
  isPremium={isPremium}
  hasConsent={hasConsent}
/>

// Or use optimized version:
<OptimizedFeedAd
  index={index}
  interval={5}
  placement="video-feed"
  config={adConfig}
  isPremium={isPremium}
  hasConsent={hasConsent}
/>
```

### Step 5: Update Interstitial Ads

**Before (Main App):**
```tsx
const handleAction = async () => {
  await AdMobService.showInterstitialAd(isPremium);
  // Continue flow
};
```

**After (Feature Module):**
```tsx
const { showAd } = useInterstitialAd({ config: adConfig, isPremium });

const handleAction = async () => {
  await showAd({
    placement: 'my-action',
    onAdDismissed: () => {
      // Continue flow
    },
  });
};
```

### Step 6: Update Rewarded Ads

**Before (Main App):**
```tsx
const handleWatchAd = async () => {
  const result = await AdMobService.showRewardedAd();
  if (result.rewarded) {
    // Grant reward
  }
};
```

**After (Feature Module):**
```tsx
const { showAd } = useRewardedAd({ config: adConfig });

const handleWatchAd = async () => {
  const result = await showAd({
    placement: 'settings',
    onEarnedReward: (reward) => {
      // Grant reward
      grantCoins(reward.amount);
    },
  });

  if (result.rewarded) {
    // Additional logic
  }
};
```

### Step 7: Update Configuration

**Before (Main App):**
```tsx
// From production.ts
const config = getConfig();
const adConfig = config.ADMOB;
```

**After (Feature Module):**
```tsx
import { createAdConfig, validateAdConfig } from '@/features/ads';

const adConfig = createAdConfig({
  enabled: !__DEV__,
  testMode: __DEV__,
});

// Validate config
const validation = validateAdConfig(adConfig);
if (!validation.valid) {
  console.error('Invalid ad config:', validation.errors);
}
```

## Component Mapping

| Main App Component | Feature Module Component | Notes |
|-------------------|-------------------------|-------|
| `AdMobBanner` | `BannerAdComponent` | Props updated, now requires config and state |
| `BannerAdComponent` | `BannerAdComponent` | Merged into one component |
| `FeedAdComponent` | `FeedAdComponent` | Props updated |
| `OptimizedAdBanner` | `OptimizedFeedAd` | Renamed for clarity |
| N/A | `useInterstitialAd` | New hook pattern |
| N/A | `useRewardedAd` | New hook pattern |

## Service Mapping

| Main App Method | Feature Module Equivalent | Notes |
|----------------|--------------------------|-------|
| `AdMobService.initialize()` | `adService.initialize(config, consent)` | Now requires config and consent |
| `AdMobService.showInterstitialAd(isPremium)` | `useInterstitialAd` hook | Use hook instead |
| `AdMobService.showRewardedAd()` | `useRewardedAd` hook | Use hook instead |
| `AdMobService.getBannerAdUnitId()` | `adService.getAdUnitId('banner', config)` | More explicit |
| `AdMobService.isExpoGo()` | `adService.isExpoGo()` | Same |
| `AdMobService.shouldShowAd(isPremium)` | `adService.shouldShowAd(isPremium)` | Same |

## Breaking Changes

### 1. Props Changes

All ad components now require:
- `config: AdConfig` - Ad configuration object
- `isPremium: boolean` - Premium user status
- `hasConsent: boolean` - User consent status

### 2. Initialization Changes

Old:
```tsx
await AdMobService.initialize();
```

New:
```tsx
const adConfig = createAdConfig();
await adService.initialize(adConfig, hasConsent);
```

### 3. Interstitial Ads

Old:
```tsx
await AdMobService.showInterstitialAd(isPremium);
```

New:
```tsx
const { showAd } = useInterstitialAd({ config, isPremium });
await showAd({ placement: 'home' });
```

### 4. Rewarded Ads

Old:
```tsx
const result = await AdMobService.showRewardedAd();
```

New:
```tsx
const { showAd } = useRewardedAd({ config });
const result = await showAd({
  onEarnedReward: (reward) => grantReward(reward),
});
```

## Migration Checklist

- [ ] Update all ad-related imports
- [ ] Create ad configuration using `createAdConfig()`
- [ ] Update `AdMobBanner` to `BannerAdComponent` with new props
- [ ] Update `FeedAdComponent` with new required props
- [ ] Replace `OptimizedAdBanner` with `OptimizedFeedAd`
- [ ] Replace `AdMobService.showInterstitialAd()` with `useInterstitialAd` hook
- [ ] Replace `AdMobService.showRewardedAd()` with `useRewardedAd` hook
- [ ] Update service initialization
- [ ] Update consent management integration
- [ ] Update premium user checks
- [ ] Test on development build (not Expo Go)
- [ ] Verify ad placements work correctly
- [ ] Test with test ads first
- [ ] Test with production ads (optional)

## Common Issues

### Issue 1: "config is required"

**Problem:** Components throw error about missing config.

**Solution:** Pass ad config to all components:
```tsx
const adConfig = createAdConfig();
<BannerAdComponent config={adConfig} {...otherProps} />
```

### Issue 2: Ads not showing

**Problem:** Ads don't display even though code looks correct.

**Checklist:**
1. Are you using a development build (not Expo Go)?
2. Is `config.enabled` set to `true`?
3. Is `isPremium` set to `false`?
4. Is `hasConsent` set to `true`?
5. Are ad unit IDs valid?
6. Check console logs for errors

### Issue 3: TypeScript errors

**Problem:** TypeScript complains about types.

**Solution:** Import types from the feature module:
```tsx
import type { AdConfig, BannerAdProps } from '@/features/ads';
```

### Issue 4: Interstitial ads don't work

**Problem:** Interstitial ads don't show or hooks don't work.

**Solution:** Make sure you're using the hook inside a component:
```tsx
function MyComponent() {
  const { showAd } = useInterstitialAd({ config, isPremium });
  // Use showAd in component
}
```

## Testing Your Migration

1. **Test in Expo Go (Demo Mode)**
   ```bash
   npx expo start
   ```
   You should see demo placeholders for ads.

2. **Test in Development Build**
   ```bash
   npx expo run:ios
   # or
   npx expo run:android
   ```
   You should see real test ads.

3. **Test Ad Scenarios**
   - [ ] Banner ads show on screens
   - [ ] Feed ads show in lists
   - [ ] Interstitial ads show after actions
   - [ ] Rewarded ads grant rewards
   - [ ] Premium users don't see ads
   - [ ] Users without consent don't see ads
   - [ ] Ads respect cooldown periods

## Need Help?

- Check the [README.md](./README.md) for full documentation
- Review [EXAMPLES.md](./EXAMPLES.md) for usage examples
- Look at the TypeScript types in [types/index.ts](./types/index.ts)
- Compare with main app implementation

## Rollback Plan

If you need to rollback:

1. Revert import changes
2. Restore old component usage
3. Keep both implementations temporarily during transition
4. Test thoroughly before removing old code

## Next Steps

After migration:

1. Remove old AdMob code from main app
2. Update documentation
3. Train team on new patterns
4. Monitor ad performance
5. Collect feedback
6. Iterate on improvements
