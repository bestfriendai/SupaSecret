# Subscription Feature Module

This module handles all subscription-related functionality for the SupaSecret app using RevenueCat.

## Architecture

The subscription feature follows a clean, modular architecture:

```
subscription/
├── services/          # Business logic and API integration
│   └── subscriptionService.ts
├── store/            # State management (Zustand)
│   └── subscriptionStore.ts
├── hooks/            # React hooks for components
│   └── useSubscription.ts
├── components/       # Reusable UI components
│   └── PaywallModal.tsx
├── screens/          # Full-screen components
│   ├── PaywallScreen.tsx
│   └── SubscriptionManagementScreen.tsx
├── types/            # TypeScript type definitions
│   └── index.ts
└── index.ts          # Module exports
```

## Features

### ✅ Implemented

- **Purchase Flow**: Complete subscription purchase with retry logic
- **Restore Purchases**: Recover previous subscriptions
- **Subscription Status**: Check and monitor subscription state
- **Error Handling**: Comprehensive error categorization and user-friendly messages
- **Offline Support**: Caching and graceful degradation
- **Demo Mode**: Mock functionality for Expo Go testing
- **Type Safety**: Full TypeScript support

### 🎯 Key Components

#### 1. SubscriptionService

The core service handling all RevenueCat operations:

```typescript
import { SubscriptionService } from '@/features/subscription';

// Initialize with API key
SubscriptionService.configure(REVENUECAT_API_KEY);
await SubscriptionService.initialize();

// Set user ID after login
await SubscriptionService.setUserID(userId);

// Get offerings
const offerings = await SubscriptionService.getOfferings();

// Purchase subscription
const result = await SubscriptionService.purchasePackage(package);

// Check premium status
const isPremium = await SubscriptionService.isUserPremium();
```

#### 2. useSubscription Hook

Convenient React hook for components:

```typescript
import { useSubscription } from '@/features/subscription';

function MyComponent() {
  const {
    isPremium,
    isLoading,
    error,
    purchaseSubscription,
    restorePurchases,
    checkSubscriptionStatus,
  } = useSubscription();

  return (
    <View>
      {isPremium ? (
        <Text>Premium User</Text>
      ) : (
        <Button onPress={() => navigation.navigate('Paywall')}>
          Upgrade
        </Button>
      )}
    </View>
  );
}
```

#### 3. PaywallModal

Reusable modal for in-app paywall:

```typescript
import { PaywallModal } from '@/features/subscription';

function MyScreen() {
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <>
      <Button onPress={() => setShowPaywall(true)}>Upgrade</Button>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseSuccess={() => {
          // Handle success
        }}
      />
    </>
  );
}
```

#### 4. PaywallScreen

Full-screen paywall for navigation:

```typescript
import { PaywallScreen } from '@/features/subscription';

// In your navigation setup
<Stack.Screen
  name="Paywall"
  component={PaywallScreen}
  options={{ presentation: 'modal' }}
/>
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install react-native-purchases zustand
```

### 2. Configure RevenueCat

Add your API keys to your environment configuration:

```typescript
// config/production.ts or similar
import { Platform } from 'react-native';

export const config = {
  REVENUECAT: {
    API_KEY: Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    }),
  },
};
```

### 3. Initialize on App Launch

```typescript
// App.tsx or index.tsx
import { SubscriptionService } from '@/features/subscription';
import { config } from '@/config';

function App() {
  useEffect(() => {
    // Configure with API key
    SubscriptionService.configure(config.REVENUECAT.API_KEY);

    // Initialize SDK
    SubscriptionService.initialize();
  }, []);

  return <YourApp />;
}
```

### 4. Set User ID After Login

```typescript
// After successful authentication
import { SubscriptionService } from '@/features/subscription';

const handleLogin = async (userId: string) => {
  // Your login logic...

  // Set RevenueCat user ID
  await SubscriptionService.setUserID(userId);
};
```

### 5. Add Paywall to Navigation

```typescript
// navigation/index.tsx
import { PaywallScreen, SubscriptionManagementScreen } from '@/features/subscription';

<Stack.Screen
  name="Paywall"
  component={PaywallScreen}
  options={{
    presentation: 'modal',
    headerShown: false
  }}
/>

<Stack.Screen
  name="SubscriptionManagement"
  component={SubscriptionManagementScreen}
  options={{ headerShown: false }}
/>
```

## Usage Examples

### Basic Subscription Check

```typescript
import { useSubscription } from '@/features/subscription';

function FeatureGate({ children }) {
  const { isPremium, isLoading } = useSubscription();

  if (isLoading) return <LoadingSpinner />;

  if (!isPremium) {
    return (
      <View>
        <Text>This feature requires Premium</Text>
        <Button onPress={() => navigation.navigate('Paywall')}>
          Upgrade Now
        </Button>
      </View>
    );
  }

  return children;
}
```

### Purchase Flow with Error Handling

```typescript
import { useSubscription } from '@/features/subscription';
import { PurchaseErrorType } from '@/features/subscription';

function PurchaseButton({ package }) {
  const { purchaseSubscription, error, lastErrorType } = useSubscription();

  const handlePurchase = async () => {
    const success = await purchaseSubscription(package);

    if (success) {
      Alert.alert('Success', 'Welcome to Premium!');
    } else if (lastErrorType === PurchaseErrorType.USER_CANCELLED) {
      // User cancelled - don't show error
      return;
    } else {
      Alert.alert('Purchase Failed', error);
    }
  };

  return (
    <Button onPress={handlePurchase}>
      Purchase Now
    </Button>
  );
}
```

### Subscription Status Display

```typescript
import { useSubscription } from '@/features/subscription';

function SubscriptionBadge() {
  const {
    isPremium,
    subscriptionStatus,
    isInTrial,
    hasBillingIssue
  } = useSubscription();

  if (!isPremium) return null;

  return (
    <View>
      {isInTrial && <Badge>Free Trial</Badge>}
      {hasBillingIssue && <Badge color="warning">Billing Issue</Badge>}
      {!isInTrial && !hasBillingIssue && <Badge>Premium</Badge>}
    </View>
  );
}
```

## Best Practices

### ✅ DO:

1. **Use the hook in components**: Always use `useSubscription()` instead of directly accessing the store
2. **Check subscription status on critical features**: Gate premium features properly
3. **Handle errors gracefully**: Show user-friendly messages, not technical errors
4. **Cache subscription status**: The service includes built-in caching (5 minutes)
5. **Log out RevenueCat on user logout**: Call `SubscriptionService.logOut()`
6. **Test in sandbox mode**: Always test purchases before production

### ❌ DON'T:

1. **Don't call initialize multiple times**: It's handled automatically
2. **Don't hardcode product IDs**: Use the offerings from RevenueCat
3. **Don't show errors for user cancellation**: Check `lastErrorType`
4. **Don't forget to set user ID**: Set it after authentication
5. **Don't block UI on subscription checks**: Always show loading states
6. **Don't store customerInfo in localStorage**: It's handled by the store

## Testing

### Demo Mode (Expo Go)

The service automatically detects Expo Go and runs in demo mode with mock data:

```typescript
// Automatically detected
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

// Returns mock data in Expo Go
const offerings = await SubscriptionService.getOfferings(); // null
const isPremium = await SubscriptionService.isUserPremium(); // false
```

### Sandbox Testing

1. **iOS**: Use sandbox tester accounts from App Store Connect
2. **Android**: Add testers to Google Play Console license testing

See the main RevenueCat best practices document for detailed testing instructions.

## Configuration Checklist

- [ ] Install `react-native-purchases` package
- [ ] Configure API keys in environment
- [ ] Initialize SubscriptionService on app launch
- [ ] Set user ID after authentication
- [ ] Add paywall screens to navigation
- [ ] Set up products in App Store Connect / Google Play Console
- [ ] Configure products in RevenueCat dashboard
- [ ] Create offerings in RevenueCat dashboard
- [ ] Test in sandbox mode
- [ ] Submit products for review

## API Reference

See the [Best Practices Report](/REVENUECAT_BEST_PRACTICES_REPORT.md) for comprehensive API documentation and production readiness guidelines.

## Support

For issues or questions:

1. Check the [RevenueCat Documentation](https://docs.revenuecat.com/)
2. Review the [Best Practices Report](/REVENUECAT_BEST_PRACTICES_REPORT.md)
3. Contact the development team

## Migration from Old Implementation

If migrating from the old implementation:

1. Replace imports:
   ```typescript
   // Old
   import { RevenueCatService } from '@/services/RevenueCatService';
   import { useSubscriptionStore } from '@/state/subscriptionStore';

   // New
   import { SubscriptionService, useSubscription } from '@/features/subscription';
   ```

2. Update API calls:
   ```typescript
   // Old
   await RevenueCatService.initialize();

   // New
   SubscriptionService.configure(API_KEY);
   await SubscriptionService.initialize();
   ```

3. Use the new hook:
   ```typescript
   // Old
   const { isPremium } = useSubscriptionStore();

   // New
   const { isPremium } = useSubscription();
   ```

The new implementation maintains the same functionality while being more modular and maintainable.
