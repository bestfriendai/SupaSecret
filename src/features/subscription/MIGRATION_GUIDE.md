# RevenueCat Migration Guide

This guide helps you migrate from the old RevenueCat implementation to the new feature-based architecture.

## What Changed

### Old Structure
```
src/
├── services/
│   └── RevenueCatService.ts
├── state/
│   └── subscriptionStore.ts
├── screens/
│   └── PaywallScreen.tsx
└── components/
    └── PaywallModal.tsx
```

### New Structure
```
src/features/subscription/
├── services/
│   └── subscriptionService.ts
├── store/
│   └── subscriptionStore.ts
├── hooks/
│   └── useSubscription.ts
├── components/
│   └── PaywallModal.tsx
├── screens/
│   ├── PaywallScreen.tsx
│   └── SubscriptionManagementScreen.tsx
├── types/
│   └── index.ts
└── index.ts
```

## Benefits of New Architecture

1. **Better Organization**: All subscription code in one feature module
2. **Improved Type Safety**: Comprehensive TypeScript types
3. **Easier Testing**: Isolated, testable modules
4. **Better Developer Experience**: Centralized exports via index.ts
5. **Enhanced Features**: New subscription management screen
6. **Cleaner API**: useSubscription hook simplifies usage

## Step-by-Step Migration

### 1. Update Imports

Replace all old imports with new ones:

```typescript
// ❌ OLD
import { RevenueCatService } from '../services/RevenueCatService';
import { useSubscriptionStore } from '../state/subscriptionStore';
import { PaywallModal } from '../components/PaywallModal';
import { PaywallScreen } from '../screens/PaywallScreen';

// ✅ NEW
import {
  SubscriptionService,
  useSubscription,
  PaywallModal,
  PaywallScreen,
  SubscriptionManagementScreen,
} from '@/features/subscription';
```

### 2. Update Service Calls

#### Initialize RevenueCat

```typescript
// ❌ OLD
import { RevenueCatService } from '@/services/RevenueCatService';

useEffect(() => {
  RevenueCatService.initialize();
}, []);

// ✅ NEW
import { SubscriptionService } from '@/features/subscription';
import { config } from '@/config';

useEffect(() => {
  SubscriptionService.configure(config.REVENUECAT.API_KEY);
  SubscriptionService.initialize();
}, []);
```

#### Set User ID

```typescript
// ❌ OLD
await RevenueCatService.setUserID(userId);

// ✅ NEW (same API)
await SubscriptionService.setUserID(userId);
```

#### Check Premium Status

```typescript
// ❌ OLD
const isPremium = await RevenueCatService.isUserPremium();

// ✅ NEW (same API)
const isPremium = await SubscriptionService.isUserPremium();
```

### 3. Update Store Usage

#### In Components

```typescript
// ❌ OLD
import { useSubscriptionStore } from '@/state/subscriptionStore';

function MyComponent() {
  const { isPremium, purchaseSubscription } = useSubscriptionStore();
  // ...
}

// ✅ NEW
import { useSubscription } from '@/features/subscription';

function MyComponent() {
  const { isPremium, purchaseSubscription } = useSubscription();
  // ...
}
```

#### Direct Store Access (if needed)

```typescript
// ❌ OLD
import { useSubscriptionStore } from '@/state/subscriptionStore';
const isPremium = useSubscriptionStore.getState().isPremium;

// ✅ NEW
import { useSubscriptionStore } from '@/features/subscription';
const isPremium = useSubscriptionStore.getState().isPremium;
```

### 4. Update Component Usage

#### PaywallModal

```typescript
// ✅ SAME API - No changes needed
import { PaywallModal } from '@/features/subscription';

<PaywallModal
  visible={showPaywall}
  onClose={() => setShowPaywall(false)}
  onPurchaseSuccess={() => {
    console.log('Purchase successful!');
  }}
/>
```

#### PaywallScreen

```typescript
// ✅ SAME API - No changes needed
import { PaywallScreen } from '@/features/subscription';

<Stack.Screen
  name="Paywall"
  component={PaywallScreen}
  options={{ presentation: 'modal' }}
/>
```

### 5. Add New Features

#### Subscription Management Screen

```typescript
// ✅ NEW FEATURE
import { SubscriptionManagementScreen } from '@/features/subscription';

<Stack.Screen
  name="SubscriptionManagement"
  component={SubscriptionManagementScreen}
  options={{ headerShown: false }}
/>
```

#### Enhanced Subscription Status

```typescript
// ✅ NEW FEATURE
import { useSubscription } from '@/features/subscription';

function MyComponent() {
  const {
    isPremium,
    subscriptionStatus,
    isInTrial,
    hasBillingIssue,
    willRenew,
    expiresAt,
  } = useSubscription();

  return (
    <View>
      {isPremium && (
        <>
          <Text>Status: {subscriptionStatus?.status}</Text>
          {isInTrial && <Badge>Free Trial</Badge>}
          {hasBillingIssue && <Alert>Billing Issue</Alert>}
          <Text>Expires: {expiresAt}</Text>
        </>
      )}
    </View>
  );
}
```

### 6. Update Type Imports

```typescript
// ❌ OLD
interface RevenueCatCustomerInfo {
  activeSubscriptions: string[];
  // ...
}

// ✅ NEW
import type {
  RevenueCatCustomerInfo,
  RevenueCatPackage,
  SubscriptionStatus,
  PurchaseErrorType,
} from '@/features/subscription';
```

### 7. Update Error Handling

```typescript
// ❌ OLD
try {
  await purchaseSubscription(pkg);
} catch (error) {
  Alert.alert('Error', error.message);
}

// ✅ NEW (with enhanced error handling)
import { PurchaseErrorType } from '@/features/subscription';

try {
  const success = await purchaseSubscription(pkg);
  if (!success) {
    // Error message already stored in state
    if (lastErrorType === PurchaseErrorType.USER_CANCELLED) {
      // Don't show error for user cancellation
      return;
    }
    Alert.alert('Purchase Failed', error);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## File-by-File Changes

### App.tsx / index.tsx

```diff
- import { RevenueCatService } from './services/RevenueCatService';
+ import { SubscriptionService } from '@/features/subscription';
+ import { config } from '@/config';

  useEffect(() => {
+   SubscriptionService.configure(config.REVENUECAT.API_KEY);
-   RevenueCatService.initialize();
+   SubscriptionService.initialize();
  }, []);
```

### Navigation Setup

```diff
- import { PaywallScreen } from '../screens/PaywallScreen';
+ import { PaywallScreen, SubscriptionManagementScreen } from '@/features/subscription';

  <Stack.Screen name="Paywall" component={PaywallScreen} />
+ <Stack.Screen name="SubscriptionManagement" component={SubscriptionManagementScreen} />
```

### Feature Components

```diff
- import { useSubscriptionStore } from '../state/subscriptionStore';
+ import { useSubscription } from '@/features/subscription';

  function PremiumFeature() {
-   const { isPremium } = useSubscriptionStore();
+   const { isPremium } = useSubscription();

    if (!isPremium) {
      return <UpgradePrompt />;
    }

    return <PremiumContent />;
  }
```

### Auth Flow

```diff
- import { RevenueCatService } from '../services/RevenueCatService';
+ import { SubscriptionService } from '@/features/subscription';

  const handleLogin = async (userId: string) => {
    // Your login logic...

-   await RevenueCatService.setUserID(userId);
+   await SubscriptionService.setUserID(userId);
  };

  const handleLogout = async () => {
    // Your logout logic...

-   // No logout function in old implementation
+   await SubscriptionService.logOut();
  };
```

## API Compatibility Matrix

| Feature | Old API | New API | Compatible |
|---------|---------|---------|------------|
| Initialize | `RevenueCatService.initialize()` | `SubscriptionService.initialize()` | ✅ Yes |
| Get Offerings | `RevenueCatService.getOfferings()` | `SubscriptionService.getOfferings()` | ✅ Yes |
| Purchase | `RevenueCatService.purchasePackage()` | `SubscriptionService.purchasePackage()` | ✅ Yes |
| Restore | `RevenueCatService.restorePurchases()` | `SubscriptionService.restorePurchases()` | ✅ Yes |
| Is Premium | `RevenueCatService.isUserPremium()` | `SubscriptionService.isUserPremium()` | ✅ Yes |
| Set User ID | `RevenueCatService.setUserID()` | `SubscriptionService.setUserID()` | ✅ Yes |
| Get Customer Info | `RevenueCatService.getCustomerInfo()` | `SubscriptionService.getCustomerInfo()` | ✅ Yes |
| Log Out | ❌ Not available | `SubscriptionService.logOut()` | 🆕 New |
| Get Status | ❌ Not available | `SubscriptionService.getSubscriptionStatus()` | 🆕 New |
| Configure | ❌ Not available | `SubscriptionService.configure()` | 🆕 New |

## Breaking Changes

### 1. Configuration Required

**Old**: API key read from config automatically
**New**: Must call `configure()` before `initialize()`

```typescript
// Required in new implementation
SubscriptionService.configure(config.REVENUECAT.API_KEY);
SubscriptionService.initialize();
```

### 2. Store Import Path

**Old**: `@/state/subscriptionStore`
**New**: `@/features/subscription`

```typescript
// Old
import { useSubscriptionStore } from '@/state/subscriptionStore';

// New
import { useSubscriptionStore } from '@/features/subscription';
// Or better, use the hook:
import { useSubscription } from '@/features/subscription';
```

### 3. Service Import Path

**Old**: `@/services/RevenueCatService`
**New**: `@/features/subscription`

```typescript
// Old
import { RevenueCatService } from '@/services/RevenueCatService';

// New
import { SubscriptionService } from '@/features/subscription';
```

## Testing Your Migration

### Checklist

- [ ] App initializes without errors
- [ ] Paywall displays correctly
- [ ] Can view subscription offerings
- [ ] Purchase flow works (sandbox)
- [ ] Restore purchases works
- [ ] Premium status updates correctly
- [ ] Subscription management screen works
- [ ] Error handling displays user-friendly messages
- [ ] Demo mode works in Expo Go

### Test Scenarios

1. **Fresh Install**
   - [ ] Open paywall
   - [ ] View offerings
   - [ ] Purchase subscription
   - [ ] Verify premium features unlock

2. **Existing User**
   - [ ] Launch app
   - [ ] Subscription status loads
   - [ ] Premium features accessible
   - [ ] Can view subscription management

3. **Error Handling**
   - [ ] Cancel purchase (no error shown)
   - [ ] Network error (retry option shown)
   - [ ] Already owned (restore suggested)
   - [ ] Billing issue (warning shown)

## Common Issues

### Issue: "RevenueCat not initialized"

**Solution**: Make sure to call `configure()` before `initialize()`:

```typescript
SubscriptionService.configure(API_KEY);
await SubscriptionService.initialize();
```

### Issue: "No offerings available"

**Solution**: Check:
1. API key is correct
2. Products configured in RevenueCat dashboard
3. Products approved in App Store Connect / Google Play

### Issue: Import errors

**Solution**: Update your path aliases in `tsconfig.json`:

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

## Rollback Plan

If you need to rollback:

1. **Keep Old Files**: Don't delete old implementation until migration is complete
2. **Gradual Migration**: Migrate one screen at a time
3. **Feature Flags**: Use feature flags to toggle between old/new implementation

```typescript
// Example rollback strategy
const USE_NEW_SUBSCRIPTION = __DEV__; // Test in dev first

if (USE_NEW_SUBSCRIPTION) {
  import { useSubscription } from '@/features/subscription';
} else {
  import { useSubscriptionStore } from '@/state/subscriptionStore';
}
```

## Support

If you encounter issues during migration:

1. Check this migration guide
2. Review the [README](/new/src/features/subscription/README.md)
3. Check the [Best Practices Report](/REVENUECAT_BEST_PRACTICES_REPORT.md)
4. Contact the development team

## Timeline

Suggested migration timeline:

1. **Day 1**: Set up new structure, update imports
2. **Day 2**: Migrate core features, test purchase flow
3. **Day 3**: Add subscription management screen
4. **Day 4**: Comprehensive testing
5. **Day 5**: Production deployment

## Success Metrics

Migration is complete when:

- [ ] All old imports removed
- [ ] All tests passing
- [ ] Purchase flow works in sandbox
- [ ] No TypeScript errors
- [ ] Code review approved
- [ ] QA testing passed
- [ ] Production deployment successful

---

**Migration completed?** Delete the old implementation files:
- `/src/services/RevenueCatService.ts`
- `/src/state/subscriptionStore.ts`
- `/src/screens/PaywallScreen.tsx`
- `/src/components/PaywallModal.tsx`
