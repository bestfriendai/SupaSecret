# AdMob Integration Examples

Complete examples showing how to use the ads feature module.

## Table of Contents

1. [App Initialization](#app-initialization)
2. [Banner Ads in Screens](#banner-ads-in-screens)
3. [Feed/List Ads](#feedlist-ads)
4. [Interstitial Ads](#interstitial-ads)
5. [Rewarded Ads](#rewarded-ads)
6. [Custom Ad Configurations](#custom-ad-configurations)
7. [Integration with State Management](#integration-with-state-management)

---

## App Initialization

Initialize AdMob when your app starts:

```tsx
// src/app/App.tsx or similar
import React, { useEffect } from 'react';
import { adService, createAdConfig, logAdConfig } from '@/features/ads';
import { useConsentStore } from '@/features/consent'; // Your consent store
import { useSubscriptionStore } from '@/features/subscription'; // Your subscription store

export default function App() {
  useEffect(() => {
    const initializeAds = async () => {
      // Create ad configuration
      const adConfig = createAdConfig({
        enabled: !__DEV__, // Disable in development, enable in production
        testMode: __DEV__, // Use test ads in development
      });

      // Log configuration (optional, for debugging)
      if (__DEV__) {
        logAdConfig(adConfig);
      }

      // Get user consent status
      const hasConsent = useConsentStore.getState().hasAdvertisingConsent;

      // Initialize AdMob
      try {
        await adService.initialize(adConfig, hasConsent);
        console.log('AdMob initialized successfully');
      } catch (error) {
        console.error('Failed to initialize AdMob:', error);
      }
    };

    initializeAds();
  }, []);

  return <YourAppContent />;
}
```

---

## Banner Ads in Screens

### Basic Banner Ad

```tsx
// src/screens/HomeScreen.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import { BannerAdComponent, createAdConfig } from '@/features/ads';
import { useConsentStore } from '@/features/consent';
import { useSubscriptionStore } from '@/features/subscription';

export const HomeScreen = () => {
  const hasConsent = useConsentStore((state) => state.hasAdvertisingConsent);
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const adConfig = createAdConfig();

  return (
    <ScrollView>
      {/* Your content */}
      <View style={{ padding: 16 }}>
        {/* ... */}
      </View>

      {/* Banner ad at bottom */}
      <BannerAdComponent
        config={adConfig}
        isPremium={isPremium}
        hasConsent={hasConsent}
        visible={true}
        size="banner"
        placement="home-feed"
      />
    </ScrollView>
  );
};
```

### Banner Ad with Different Sizes

```tsx
import { BannerAdComponent } from '@/features/ads';

// Small banner (320x50)
<BannerAdComponent size="banner" {...otherProps} />

// Medium rectangle (300x250)
<BannerAdComponent size="medium" {...otherProps} />

// Large banner (320x100)
<BannerAdComponent size="large" {...otherProps} />

// Full banner (468x60)
<BannerAdComponent size="full-banner" {...otherProps} />

// Leaderboard (728x90)
<BannerAdComponent size="leaderboard" {...otherProps} />
```

### Banner Ad with Callbacks

```tsx
<BannerAdComponent
  config={adConfig}
  isPremium={isPremium}
  hasConsent={hasConsent}
  placement="profile"
  onAdLoaded={() => {
    console.log('Banner ad loaded successfully');
    // Track ad impression in analytics
  }}
  onAdFailedToLoad={(error) => {
    console.error('Banner ad failed to load:', error);
    // Log error to crash reporting
  }}
  onAdOpened={() => {
    console.log('User clicked on banner ad');
    // Track ad click
  }}
  onAdClosed={() => {
    console.log('User closed ad');
  }}
/>
```

---

## Feed/List Ads

### Basic Feed Ads

```tsx
// src/screens/VideoFeedScreen.tsx
import React from 'react';
import { FlatList } from 'react-native';
import { FeedAdComponent, createAdConfig } from '@/features/ads';
import { useConsentStore } from '@/features/consent';
import { useSubscriptionStore } from '@/features/subscription';

export const VideoFeedScreen = () => {
  const hasConsent = useConsentStore((state) => state.hasAdvertisingConsent);
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const adConfig = createAdConfig();
  const [videos, setVideos] = React.useState([]);

  return (
    <FlatList
      data={videos}
      renderItem={({ item, index }) => {
        // Show ad every 5 items
        if (index > 0 && index % 5 === 0) {
          return (
            <FeedAdComponent
              index={index}
              interval={5}
              placement="video-feed"
              size="medium"
              config={adConfig}
              isPremium={isPremium}
              hasConsent={hasConsent}
            />
          );
        }

        // Regular video item
        return <VideoItem video={item} />;
      }}
      keyExtractor={(item, index) => `${item.id}-${index}`}
    />
  );
};
```

### Optimized Feed Ads (Recommended)

For better performance with large lists:

```tsx
import { OptimizedFeedAd, createAdConfig } from '@/features/ads';
import { FlashList } from '@shopify/flash-list';

export const OptimizedVideoFeedScreen = () => {
  const hasConsent = useConsentStore((state) => state.hasAdvertisingConsent);
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const adConfig = createAdConfig();
  const [videos, setVideos] = React.useState([]);

  return (
    <FlashList
      data={videos}
      renderItem={({ item, index }) => (
        <>
          {/* Optimized ad component with memoization */}
          <OptimizedFeedAd
            index={index}
            interval={5}
            placement="video-feed"
            size="medium"
            config={adConfig}
            isPremium={isPremium}
            hasConsent={hasConsent}
          />

          {/* Video item */}
          <VideoItem video={item} />
        </>
      )}
      estimatedItemSize={400}
    />
  );
};
```

### Custom Feed Ad Interval

```tsx
// Show ads every 3 items
<FeedAdComponent interval={3} {...otherProps} />

// Show ads every 10 items
<FeedAdComponent interval={10} {...otherProps} />
```

---

## Interstitial Ads

### Basic Interstitial Ad

```tsx
// src/screens/PostCreationScreen.tsx
import React from 'react';
import { Button } from 'react-native';
import { useInterstitialAd, createAdConfig } from '@/features/ads';
import { useSubscriptionStore } from '@/features/subscription';

export const PostCreationScreen = () => {
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const adConfig = createAdConfig();
  const { showAd, isShowing } = useInterstitialAd({ config: adConfig, isPremium });

  const handlePostCreated = async () => {
    // Create the post
    await createPost(postData);

    // Show interstitial ad after post creation
    const shown = await showAd({
      placement: 'post-creation',
    });

    if (shown) {
      console.log('Interstitial ad was shown');
    }

    // Navigate to next screen
    navigation.navigate('Home');
  };

  return (
    <Button
      title="Create Post"
      onPress={handlePostCreated}
      disabled={isShowing} // Disable button while ad is showing
    />
  );
};
```

### Interstitial Ad with Callbacks

```tsx
const { showAd } = useInterstitialAd({ config: adConfig, isPremium });

const handleAction = async () => {
  await showAd({
    placement: 'post-creation',
    onAdDismissed: () => {
      console.log('User dismissed the ad');
      // Continue app flow
      navigation.navigate('NextScreen');
    },
    onAdFailedToShow: (error) => {
      console.error('Failed to show ad:', error);
      // Continue app flow even if ad failed
      navigation.navigate('NextScreen');
    },
  });
};
```

### Conditional Interstitial Ad

```tsx
const handleVideoWatched = async () => {
  // Only show ad every 3rd video
  const videoCount = await getVideoWatchCount();

  if (videoCount % 3 === 0) {
    await showAd({
      placement: 'video-completion',
      onAdDismissed: () => {
        // Continue to next video
        loadNextVideo();
      },
    });
  } else {
    // Skip ad, go to next video
    loadNextVideo();
  }
};
```

---

## Rewarded Ads

### Basic Rewarded Ad

```tsx
// src/screens/SettingsScreen.tsx
import React from 'react';
import { Button, Alert } from 'react-native';
import { useRewardedAd, createAdConfig } from '@/features/ads';

export const SettingsScreen = () => {
  const adConfig = createAdConfig();
  const { showAd, isShowing, lastReward } = useRewardedAd({ config: adConfig });

  const handleWatchAdForReward = async () => {
    const result = await showAd({
      placement: 'settings',
      onEarnedReward: (reward) => {
        console.log('User earned reward:', reward);
        // Grant reward to user
        grantCoins(reward.amount);

        Alert.alert('Reward Earned!', `You earned ${reward.amount} ${reward.type}`);
      },
    });

    if (result.rewarded) {
      console.log('User watched full ad and earned reward');
    } else {
      console.log('User did not earn reward (closed early or ad failed)');
    }
  };

  return (
    <Button
      title={isShowing ? 'Watching Ad...' : 'Watch Ad for 10 Coins'}
      onPress={handleWatchAdForReward}
      disabled={isShowing}
    />
  );
};
```

### Rewarded Ad with Multiple Rewards

```tsx
const handleWatchAd = async () => {
  const result = await showAd({
    placement: 'shop',
    onEarnedReward: (reward) => {
      // Different rewards based on type
      switch (reward.type) {
        case 'coins':
          grantCoins(reward.amount);
          break;
        case 'lives':
          grantLives(reward.amount);
          break;
        case 'premium_time':
          grantPremiumTime(reward.amount);
          break;
      }
    },
    onAdDismissed: () => {
      // Ad closed, update UI
      updateRewardUI();
    },
  });

  if (result.rewarded) {
    // Show success message
    showSuccessToast(`Earned ${result.rewardAmount} ${result.rewardType}`);
  }
};
```

### Rewarded Ad for Premium Features

```tsx
const handleUnlockPremiumFeature = async () => {
  Alert.alert(
    'Watch Ad to Unlock',
    'Watch a short ad to unlock this feature temporarily',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Watch Ad',
        onPress: async () => {
          const result = await showAd({
            placement: 'feature-unlock',
            onEarnedReward: (reward) => {
              // Unlock feature temporarily (e.g., 24 hours)
              unlockFeature('premium_filters', 24 * 60 * 60 * 1000);
            },
          });

          if (result.rewarded) {
            Alert.alert('Success!', 'Premium feature unlocked for 24 hours');
          }
        },
      },
    ]
  );
};
```

---

## Custom Ad Configurations

### Development vs Production Config

```tsx
// src/config/ads.ts
import { createAdConfig } from '@/features/ads';

export const getAdConfigForEnvironment = () => {
  if (__DEV__) {
    // Development: Use test ads
    return createAdConfig({
      enabled: true,
      testMode: true,
      useTestAds: true,
    });
  } else {
    // Production: Use real ads
    return createAdConfig({
      enabled: true,
      testMode: false,
      useTestAds: false,
    });
  }
};
```

### Feature Flag Based Config

```tsx
import { createAdConfig } from '@/features/ads';
import { useFeatureFlags } from '@/features/featureFlags';

export const useAdConfig = () => {
  const featureFlags = useFeatureFlags();

  return createAdConfig({
    enabled: featureFlags.enableAds,
    testMode: featureFlags.useTestAds || __DEV__,
  });
};
```

### Platform-Specific Config

```tsx
import { Platform } from 'react-native';
import { createAdConfig } from '@/features/ads';

export const getPlatformAdConfig = () => {
  const config = createAdConfig();

  // Disable ads on tablets
  if (Platform.isTV || Platform.isPad) {
    return {
      ...config,
      enabled: false,
    };
  }

  return config;
};
```

---

## Integration with State Management

### Zustand Store Example

```tsx
// src/features/ads/store/adStore.ts
import { create } from 'zustand';
import { adService, createAdConfig } from '@/features/ads';
import type { AdConfig } from '@/features/ads';

interface AdStore {
  config: AdConfig;
  initialized: boolean;
  lastInterstitialTime: number;
  totalAdsShown: number;
  initialize: (hasConsent: boolean) => Promise<void>;
  canShowInterstitial: () => boolean;
  incrementAdCount: () => void;
}

export const useAdStore = create<AdStore>((set, get) => ({
  config: createAdConfig(),
  initialized: false,
  lastInterstitialTime: 0,
  totalAdsShown: 0,

  initialize: async (hasConsent: boolean) => {
    const { config } = get();
    await adService.initialize(config, hasConsent);
    set({ initialized: true });
  },

  canShowInterstitial: () => {
    const { lastInterstitialTime } = get();
    const now = Date.now();
    const cooldown = 60000; // 1 minute
    return now - lastInterstitialTime >= cooldown;
  },

  incrementAdCount: () => {
    set((state) => ({
      totalAdsShown: state.totalAdsShown + 1,
      lastInterstitialTime: Date.now(),
    }));
  },
}));
```

### Using the Store

```tsx
import { useAdStore } from '@/features/ads/store/adStore';
import { useInterstitialAd } from '@/features/ads';

export const MyComponent = () => {
  const { config, canShowInterstitial, incrementAdCount } = useAdStore();
  const { showAd } = useInterstitialAd({ config, isPremium: false });

  const handleAction = async () => {
    if (canShowInterstitial()) {
      const shown = await showAd({
        placement: 'my-action',
        onAdDismissed: () => {
          incrementAdCount();
        },
      });
    }
  };

  return <Button onPress={handleAction} />;
};
```

---

## Testing

### Component Tests

```tsx
// __tests__/BannerAd.test.tsx
import { render } from '@testing-library/react-native';
import { BannerAdComponent, createAdConfig } from '@/features/ads';

describe('BannerAdComponent', () => {
  const mockConfig = createAdConfig({ testMode: true });

  it('should not render when user is premium', () => {
    const { queryByTestId } = render(
      <BannerAdComponent
        config={mockConfig}
        isPremium={true}
        hasConsent={true}
        visible={true}
      />
    );

    expect(queryByTestId('banner-ad')).toBeNull();
  });

  it('should not render when user has not given consent', () => {
    const { queryByTestId } = render(
      <BannerAdComponent
        config={mockConfig}
        isPremium={false}
        hasConsent={false}
        visible={true}
      />
    );

    expect(queryByTestId('banner-ad')).toBeNull();
  });
});
```

---

## Best Practices Summary

1. **Always respect user premium status** - Never show ads to premium users
2. **Check consent** - Only show ads to users who have given consent
3. **Use test ads in development** - Never use production ad IDs in dev
4. **Handle failures gracefully** - Don't block user flow if ads fail
5. **Respect cooldowns** - Don't show interstitial ads too frequently
6. **Track ad performance** - Use callbacks to track impressions and clicks
7. **Use optimized components** - Use `OptimizedFeedAd` for large lists
8. **Initialize early** - Initialize AdMob when app starts
9. **Feature flags** - Make ads configurable via feature flags
10. **Test on real devices** - Always test on development builds, not Expo Go
