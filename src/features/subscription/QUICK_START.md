# Quick Start Guide - RevenueCat Subscription Feature

Get up and running with the subscription feature in 5 minutes.

## 🚀 Quick Setup (5 Steps)

### 1. Import the Feature

```typescript
import {
  SubscriptionService,
  useSubscription,
  PaywallScreen,
  PaywallModal,
  SubscriptionManagementScreen,
} from '@/features/subscription';
```

### 2. Initialize in App.tsx

```typescript
// App.tsx
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

### 3. Set User ID After Login

```typescript
import { SubscriptionService } from '@/features/subscription';

const handleLogin = async (userId: string) => {
  // Your login logic...

  // Set RevenueCat user ID
  await SubscriptionService.setUserID(userId);
};
```

### 4. Add Screens to Navigation

```typescript
import {
  PaywallScreen,
  SubscriptionManagementScreen,
} from '@/features/subscription';

<Stack.Screen
  name="Paywall"
  component={PaywallScreen}
  options={{ presentation: 'modal', headerShown: false }}
/>

<Stack.Screen
  name="SubscriptionManagement"
  component={SubscriptionManagementScreen}
  options={{ headerShown: false }}
/>
```

### 5. Use in Components

```typescript
import { useSubscription } from '@/features/subscription';

function MyComponent() {
  const { isPremium } = useSubscription();

  if (!isPremium) {
    return (
      <Button onPress={() => navigation.navigate('Paywall')}>
        Upgrade to Premium
      </Button>
    );
  }

  return <PremiumContent />;
}
```

---

## 💡 Common Use Cases

### Check Premium Status

```typescript
const { isPremium, isLoading } = useSubscription();

if (isLoading) return <LoadingSpinner />;
if (!isPremium) return <UpgradePrompt />;
return <PremiumFeature />;
```

### Show Paywall Modal

```typescript
const [showPaywall, setShowPaywall] = useState(false);

<PaywallModal
  visible={showPaywall}
  onClose={() => setShowPaywall(false)}
  onPurchaseSuccess={() => {
    console.log('Purchase successful!');
    setShowPaywall(false);
  }}
/>
```

### Handle Purchase

```typescript
const { purchaseSubscription, error, lastErrorType } = useSubscription();

const handlePurchase = async (pkg: RevenueCatPackage) => {
  const success = await purchaseSubscription(pkg);

  if (success) {
    Alert.alert('Success!', 'Welcome to Premium');
  } else if (lastErrorType !== PurchaseErrorType.USER_CANCELLED) {
    Alert.alert('Error', error);
  }
};
```

### Show Subscription Status

```typescript
const {
  subscriptionStatus,
  isInTrial,
  hasBillingIssue,
  expiresAt,
} = useSubscription();

return (
  <View>
    <Text>Status: {subscriptionStatus?.status}</Text>
    {isInTrial && <Badge>Free Trial</Badge>}
    {hasBillingIssue && <Alert>Billing Issue</Alert>}
    <Text>Expires: {expiresAt}</Text>
  </View>
);
```

### Restore Purchases

```typescript
const { restorePurchases } = useSubscription();

<Button onPress={async () => {
  const success = await restorePurchases();
  if (success) {
    Alert.alert('Success', 'Purchases restored!');
  }
}}>
  Restore Purchases
</Button>
```

---

## 🎯 Feature Gates

### Basic Feature Gate

```typescript
function PremiumFeature() {
  const { isPremium } = useSubscription();

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

  return <YourPremiumFeature />;
}
```

### Advanced Feature Gate with Trial

```typescript
function AdvancedFeature() {
  const { isPremium, isInTrial, isLoading } = useSubscription();

  if (isLoading) return <LoadingSpinner />;

  if (!isPremium) {
    return (
      <LockedFeatureView
        title="Premium Feature"
        description="Unlock this feature with Premium"
        trialAvailable={!isInTrial}
        onUpgrade={() => navigation.navigate('Paywall')}
      />
    );
  }

  return <YourAdvancedFeature />;
}
```

---

## 🔧 Configuration

### API Keys

Add to your `.env` or configuration:

```bash
# iOS
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxxxx

# Android
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxxx
```

### Config File

```typescript
// config/production.ts
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

---

## 🧪 Testing

### Demo Mode (Expo Go)

Automatically detected - no configuration needed:

```typescript
// Returns mock data in Expo Go
const offerings = await SubscriptionService.getOfferings(); // null
const isPremium = await SubscriptionService.isUserPremium(); // false
```

### Sandbox Testing

1. **iOS**: Create sandbox tester in App Store Connect
2. **Android**: Add testers to Google Play Console license testing
3. Build development build: `npx expo run:ios` or `npx expo run:android`
4. Test purchase flow

---

## 📚 API Reference

### SubscriptionService

```typescript
// Configure
SubscriptionService.configure(apiKey: string)

// Initialize
SubscriptionService.initialize(): Promise<void>

// User management
SubscriptionService.setUserID(userID: string): Promise<void>
SubscriptionService.logOut(): Promise<void>

// Offerings
SubscriptionService.getOfferings(): Promise<RevenueCatOfferings | null>
SubscriptionService.getSubscriptionTiers(): Promise<SubscriptionTier[] | null>

// Purchases
SubscriptionService.purchasePackage(pkg: RevenueCatPackage): Promise<RevenueCatPurchaseResult>
SubscriptionService.restorePurchases(): Promise<RevenueCatCustomerInfo>

// Status
SubscriptionService.isUserPremium(): Promise<boolean>
SubscriptionService.getCustomerInfo(forceRefresh?: boolean): Promise<RevenueCatCustomerResult>
SubscriptionService.getSubscriptionStatus(): Promise<SubscriptionStatus>

// Utilities
SubscriptionService.handlePurchaseError(error: any): PurchaseError
SubscriptionService.invalidateCache(): void
```

### useSubscription Hook

```typescript
const {
  // State
  isPremium: boolean,
  customerInfo: RevenueCatCustomerInfo | null,
  subscriptionStatus: SubscriptionStatus | null,
  isLoading: boolean,
  error: string | null,
  lastErrorType: PurchaseErrorType | null,

  // Computed
  isInTrial: boolean,
  hasBillingIssue: boolean,
  willRenew: boolean,
  expiresAt: string | null,

  // Actions
  checkSubscriptionStatus: () => Promise<void>,
  purchaseSubscription: (pkg: RevenueCatPackage) => Promise<boolean>,
  restorePurchases: () => Promise<boolean>,
  refreshCustomerInfo: () => Promise<void>,
  clearError: () => void,
  setUserID: (userID: string) => Promise<void>,
  logOut: () => Promise<void>,
  getOfferings: () => Promise<RevenueCatOfferings | null>,
  getSubscriptionTiers: () => Promise<SubscriptionTier[] | null>,
} = useSubscription();
```

---

## ❓ Troubleshooting

### "No offerings available"

**Check:**
1. API key is correct
2. Products configured in RevenueCat dashboard
3. Products approved in App Store Connect / Google Play
4. Offering set as "Current" in dashboard

### "RevenueCat not initialized"

**Fix:**
```typescript
SubscriptionService.configure(API_KEY);
await SubscriptionService.initialize();
```

### Import errors

**Fix tsconfig.json:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"]
    }
  }
}
```

### Purchase not working

**Check:**
1. Using development build (not Expo Go)
2. Sandbox tester signed in (iOS)
3. License testers added (Android)
4. Products approved in store

---

## 📖 Learn More

- [Full README](./README.md) - Complete documentation
- [Migration Guide](./MIGRATION_GUIDE.md) - Migrate from old implementation
- [Best Practices](/REVENUECAT_BEST_PRACTICES_REPORT.md) - Production guidelines
- [RevenueCat Docs](https://docs.revenuecat.com/) - Official documentation

---

## 🎉 You're Ready!

That's it! You now have a fully functional subscription system with:

✅ Purchase flow
✅ Restore purchases
✅ Premium status checking
✅ Error handling
✅ UI components
✅ Demo mode for testing

Start building premium features! 🚀
