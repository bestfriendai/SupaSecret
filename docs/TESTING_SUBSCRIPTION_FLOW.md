# Subscription Flow Testing Guide - ToxicConfessions Plus

## Overview

This guide provides comprehensive testing procedures for the RevenueCat subscription flow in the ToxicConfessions app. Follow these steps to ensure your subscription system works correctly across all scenarios.

## Test Environment Setup

### 1. Development Environment

```bash
# Use development build for testing
npx expo run:ios --configuration development
# or
npx expo run:android --configuration development
```

### 2. Test Accounts

- **Sandbox Apple ID**: Create a test Apple ID in App Store Connect
- **Sandbox Google Account**: Use a test Google account for Play Store
- **Test Payment Methods**: Use test credit cards provided by Apple/Google

## Testing Procedures

### Phase 1: Basic Functionality Tests

#### 1.1 Service Initialization

**Test**: Verify RevenueCat service initializes correctly

**Steps**:

1. Launch the app
2. Navigate to any screen that uses subscription features
3. Check console logs for:
   ```
   🚀 RevenueCat module loaded successfully
   🚀 RevenueCat initialized for development build
   ```

**Expected Result**: ✅ No errors in console, service initializes successfully

**Troubleshooting**:

- If "react-native-purchases not installed" appears, ensure dependencies are installed
- If API key errors occur, verify `.env` file exists and contains valid keys

#### 1.2 Mock Mode Testing (Expo Go)

**Test**: Verify app works in demo mode without real subscriptions

**Steps**:

1. Run app in Expo Go
2. Navigate to subscription screen
3. Attempt to "purchase" subscription
4. Check console logs for demo messages

**Expected Result**:

```
🎯 Demo: Simulating purchase...
✅ Demo purchase completed successfully!
```

**Expected Behavior**:

- ✅ Purchase completes with mock success
- ✅ No real payment processing
- ✅ User status remains free

### Phase 2: Subscription Flow Tests

#### 2.1 Monthly Subscription Test

**Test**: Complete monthly subscription purchase flow

**Steps**:

1. Navigate to subscription screen
2. Select "ToxicConfessions Plus Monthly" ($4.99)
3. Tap "Subscribe" button
4. Complete payment flow (sandbox/test payment)
5. Verify successful purchase completion
6. Check that premium features unlock
7. Verify subscription status in Supabase

**Expected Result**:

- ✅ Payment sheet appears
- ✅ Purchase completes successfully
- ✅ Console shows: "✅ Purchase completed successfully!"
- ✅ User membership updates in database
- ✅ Premium features become available

**Verification Checklist**:

- [ ] Ad-free experience activated
- [ ] Video recording limits removed
- [ ] 4K quality option available
- [ ] Advanced filters unlocked
- [ ] Custom themes accessible

#### 2.2 Annual Subscription Test

**Test**: Complete annual subscription purchase flow

**Steps**:

1. Navigate to subscription screen
2. Select "ToxicConfessions Plus Annual" ($29.99)
3. Verify "Popular" badge appears
4. Complete payment flow
5. Verify successful purchase
6. Check premium features unlock

**Expected Result**: Same as monthly test but with annual pricing

### Phase 3: Edge Cases and Error Scenarios

#### 3.1 Network Failure During Purchase

**Test**: Simulate network interruption during purchase

**Steps**:

1. Start subscription purchase
2. Turn off network connectivity mid-flow
3. Observe app behavior
4. Restore network connectivity
5. Check if purchase completes or fails gracefully

**Expected Result**:

- ✅ App handles network error gracefully
- ✅ User receives clear error message
- ✅ No partial charges or stuck transactions
- ✅ Retry mechanism works when network restored

#### 3.2 Payment Cancellation

**Test**: User cancels payment mid-flow

**Steps**:

1. Start subscription purchase
2. Cancel at payment screen
3. Verify cancellation handling

**Expected Result**:

- ✅ Purchase cancels cleanly
- ✅ No charges processed
- ✅ User returns to subscription screen
- ✅ Console shows appropriate cancellation message

#### 3.3 Invalid Payment Method

**Test**: Attempt purchase with invalid payment details

**Steps**:

1. Start subscription purchase
2. Enter invalid test payment method
3. Complete purchase flow

**Expected Result**:

- ✅ Payment fails gracefully
- ✅ Clear error message displayed
- ✅ No charges attempted
- ✅ User can retry with valid payment method

#### 3.4 Subscription Restore Test

**Test**: Restore purchases after app reinstall

**Steps**:

1. Complete subscription purchase
2. Verify premium features work
3. Simulate app reinstall (clear app data)
4. Launch app and navigate to subscription screen
5. Test restore purchases functionality

**Expected Result**:

- ✅ Subscription status restored correctly
- ✅ Premium features unlock without re-purchasing
- ✅ User membership syncs with Supabase

### Phase 4: Integration Tests

#### 4.1 Supabase Integration Test

**Test**: Verify subscription status syncs with database

**Steps**:

1. Complete subscription purchase
2. Check Supabase dashboard
3. Verify `user_memberships` table updated
4. Check user tier changed to "plus"

**Expected Database State**:

```sql
-- user_memberships table should contain:
{
  user_id: "user_uuid",
  tier: "plus",
  created_at: "timestamp",
  updated_at: "timestamp"
}
```

#### 4.2 Premium Features Test

**Test**: Verify all premium features work correctly

**Feature Checklist**:

- [ ] Ad-free experience (no ads shown)
- [ ] Unlimited video recordings
- [ ] 4K video quality option
- [ ] Unlimited saves functionality
- [ ] Advanced filter access
- [ ] Priority processing indication
- [ ] Custom theme selection
- [ ] Early access features (if available)

#### 4.3 Subscription Status Check

**Test**: Verify subscription status detection works

**Steps**:

1. Complete subscription purchase
2. Restart the app
3. Check subscription status on profile/settings screen
4. Verify correct subscription tier displayed

**Expected Result**:

- ✅ Correct subscription status shown
- ✅ Subscription end date displayed (if applicable)
- ✅ Manage subscription option available

## Automated Testing

### 4.4 Unit Tests (Future Implementation)

```typescript
// Example test structure
describe("RevenueCatService", () => {
  test("should initialize correctly", async () => {
    await RevenueCatService.initialize();
    expect(RevenueCatService.isInitialized).toBe(true);
  });

  test("should return mock offerings in demo mode", async () => {
    const offerings = await RevenueCatService.getOfferings();
    expect(offerings).toBeNull(); // Demo mode
  });

  test("should handle purchase errors gracefully", async () => {
    // Mock network failure
    const result = await RevenueCatService.purchasePackage(mockPackage);
    expect(result).toHaveProperty("mockCustomerInfo", true);
  });
});
```

## Debugging and Troubleshooting

### Common Issues and Solutions

#### Issue: "RevenueCat not initialized"

**Solution**:

```typescript
// Check initialization status
console.log("RevenueCat initialized:", RevenueCatService.isInitialized);

// Manually initialize if needed
await RevenueCatService.initialize();
```

#### Issue: Purchase hangs indefinitely

**Solution**:

```typescript
// Check network connectivity
const isConnected = await NetInfo.fetch().then((state) => state.isConnected);

// Check RevenueCat configuration
const customerInfo = await RevenueCatService.getCustomerInfo();
console.log("Customer info:", customerInfo);
```

#### Issue: Premium features not unlocking

**Solution**:

```typescript
// Check subscription status
const isPremium = await RevenueCatService.isUserPremium();
console.log("Is premium:", isPremium);

// Check database sync
const { data: membership } = await supabase.from("user_memberships").select("*").eq("user_id", user.id).single();
console.log("Database membership:", membership);
```

### Debug Logging

Enable detailed logging:

```typescript
// RevenueCat automatically enables debug logs in __DEV__
// Check console for:
// - 🚀 RevenueCat initialization messages
// - ✅ Purchase completion confirmations
// - ❌ Error messages with details
// - 📦 Offline queue operations
```

### Performance Monitoring

Monitor key metrics:

```typescript
// Track purchase conversion
const startTime = Date.now();
await RevenueCatService.purchasePackage(package);
const duration = Date.now() - startTime;
console.log("Purchase duration:", duration);

// Track subscription status changes
const initialStatus = await RevenueCatService.isUserPremium();
await RevenueCatService.purchasePackage(package);
const finalStatus = await RevenueCatService.isUserPremium();
console.log("Status changed:", initialStatus, "→", finalStatus);
```

## Test Data and Mock Responses

### Mock Subscription Data

```typescript
// For testing without real purchases
const mockCustomerInfo = {
  activeSubscriptions: ["supasecret_plus_monthly"],
  entitlements: {
    active: {
      supasecret_plus: {
        identifier: "supasecret_plus",
        isActive: true,
        willRenew: true,
        latestPurchaseDate: "2024-01-01T00:00:00.000Z",
      },
    },
  },
  allPurchasedProductIdentifiers: ["supasecret_plus_monthly"],
  latestExpirationDate: "2024-02-01T00:00:00.000Z",
  originalAppUserId: "user_123",
  requestDate: "2024-01-01T00:00:00.000Z",
};
```

## Test Completion Checklist

### Development Testing

- [ ] ✅ Mock mode works in Expo Go
- [ ] ✅ Development build initializes correctly
- [ ] ✅ Monthly subscription purchase flow
- [ ] ✅ Annual subscription purchase flow
- [ ] ✅ Network failure handling
- [ ] ✅ Payment cancellation handling
- [ ] ✅ Invalid payment method handling
- [ ] ✅ Subscription restore functionality
- [ ] ✅ Supabase integration works
- [ ] ✅ Premium features unlock correctly

### Production Testing

- [ ] ✅ TestFlight/Internal Testing build
- [ ] ✅ Sandbox payment processing
- [ ] ✅ Receipt validation
- [ ] ✅ Subscription status persistence
- [ ] ✅ App Store/Play Store submission ready

### Edge Cases

- [ ] ✅ App restart during purchase
- [ ] ✅ Device rotation during purchase
- [ ] ✅ Background/foreground transitions
- [ ] ✅ Low battery scenarios
- [ ] ✅ Storage full scenarios
- [ ] ✅ Multiple subscription attempts
- [ ] ✅ Subscription upgrade/downgrade (future)
- [ ] ✅ Refund scenarios (future)

## Success Metrics

### Key Performance Indicators

- **Conversion Rate**: Free → Premium subscription rate
- **Error Rate**: Failed purchases / total attempts
- **Retention Rate**: Subscription renewal rate
- **User Engagement**: Premium feature usage

### Monitoring Setup

```typescript
// Track in production
const analytics = {
  purchase_attempts: totalAttempts,
  successful_purchases: completedPurchases,
  conversion_rate: (completedPurchases / totalAttempts) * 100,
  average_purchase_time: averageDuration,
  error_rate: (failedPurchases / totalAttempts) * 100,
};
```

## Post-Testing Cleanup

### 1. Sandbox Account Cleanup

```bash
# Cancel test subscriptions in sandbox
1. Go to App Store Connect → Users and Access → Sandbox Testers
2. Sign in with sandbox Apple ID
3. Cancel test subscriptions
4. Clear test payment methods
```

### 2. Database Cleanup

```sql
-- Remove test data (use with caution)
DELETE FROM user_memberships
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email LIKE '%+test%'
);
```

### 3. RevenueCat Dashboard Cleanup

- Remove test transactions from RevenueCat dashboard
- Clear test customer data
- Reset sandbox configurations if needed

## Modern React Native Testing Practices (2025)

This section expands the testing guide with modern React Native testing practices, including Jest configuration for Expo 54, component testing, E2E testing, coverage strategies, and CI/CD integration.

### Jest Configuration for Expo 54

Expo 54 integrates seamlessly with Jest for unit and integration testing. Configure Jest in your `package.json` or `jest.config.js`:

```javascript
// jest.config.js
module.exports = {
  preset: "jest-expo",
  collectCoverageFrom: [
    "**/*.{ts,tsx,js,jsx}",
    "!**/coverage/**",
    "!**/node_modules/**",
    "!**/babel.config.js",
    "!**/jest.config.js",
    "!**/.expo/**",
    "!**/.expo-shared/**",
    "!**/android/**",
    "!**/ios/**",
  ],
  coverageReporters: ["html", "text", "lcov", "clover"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@screens/(.*)$": "<rootDir>/src/screens/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
  },
};
```

Create `jest.setup.js` for global test setup:

```javascript
// jest.setup.js
import "jest-expo/jest-setup";
import { jest } from "@jest/globals";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");

// Mock expo modules
jest.mock("expo-constants", () => ({
  default: {
    manifest: {},
    platform: {},
  },
}));

// Global test utilities
global.fetch = jest.fn();
```

### Component Testing with @testing-library/react-native

Use `@testing-library/react-native` for component testing, focusing on user interactions rather than implementation details:

```typescript
// __tests__/SubscriptionButton.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SubscriptionButton } from '../components/SubscriptionButton';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';

// Mock the subscription context
const mockPurchaseSubscription = jest.fn();
jest.mock('../contexts/SubscriptionContext', () => ({
  SubscriptionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSubscription: () => ({
    purchaseSubscription: mockPurchaseSubscription,
    isLoading: false,
    isPremium: false,
  }),
}));

describe('SubscriptionButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(<SubscriptionButton />);
    expect(getByText('Subscribe Now')).toBeTruthy();
  });

  it('calls purchaseSubscription when pressed', async () => {
    const { getByText } = render(<SubscriptionButton />);
    const button = getByText('Subscribe Now');

    fireEvent.press(button);

    await waitFor(() => {
      expect(mockPurchaseSubscription).toHaveBeenCalledWith('monthly');
    });
  });

  it('shows loading state during purchase', () => {
    // Mock loading state
    jest.mock('../contexts/SubscriptionContext', () => ({
      useSubscription: () => ({
        purchaseSubscription: mockPurchaseSubscription,
        isLoading: true,
        isPremium: false,
      }),
    }));

    const { getByText } = render(<SubscriptionButton />);
    expect(getByText('Processing...')).toBeTruthy();
  });

  it('displays premium badge when user is premium', () => {
    jest.mock('../contexts/SubscriptionContext', () => ({
      useSubscription: () => ({
        purchaseSubscription: mockPurchaseSubscription,
        isLoading: false,
        isPremium: true,
      }),
    }));

    const { getByText } = render(<SubscriptionButton />);
    expect(getByText('Premium User')).toBeTruthy();
  });
});
```

For testing components with navigation:

```typescript
// __tests__/SubscriptionScreen.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SubscriptionScreen from '../screens/SubscriptionScreen';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const Stack = createStackNavigator();

const renderWithNavigation = (component: React.ReactElement) =>
  render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Subscription" component={() => component} />
      </Stack.Navigator>
    </NavigationContainer>
  );

describe('SubscriptionScreen', () => {
  it('navigates to success screen after purchase', async () => {
    const { getByText } = renderWithNavigation(<SubscriptionScreen />);

    const subscribeButton = getByText('Subscribe Monthly');
    fireEvent.press(subscribeButton);

    // Mock successful purchase
    // ... assertions for navigation
  });
});
```

### E2E Testing with Detox

Detox provides gray-box E2E testing for React Native apps. Configure Detox for Expo 54:

```json
// package.json
{
  "detox": {
    "configurations": {
      "ios.sim.debug": {
        "binaryPath": "ios/build/Build/Products/Debug-iphonesimulator/SupaSecret.app",
        "build": "xcodebuild -workspace ios/SupaSecret.xcworkspace -scheme SupaSecret -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
        "type": "ios.simulator",
        "device": {
          "type": "iPhone 14"
        }
      },
      "android.emu.debug": {
        "binaryPath": "android/app/build/outputs/apk/debug/app-debug.apk",
        "build": "cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug",
        "type": "android.emulator",
        "device": {
          "avdName": "Pixel_5_API_33"
        }
      }
    },
    "test-runner": "jest"
  }
}
```

Create E2E test for subscription flow:

```typescript
// e2e/subscriptionFlow.e2e.js
describe("Subscription Flow", () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it("should complete monthly subscription purchase", async () => {
    // Navigate to subscription screen
    await element(by.id("subscription-tab")).tap();

    // Select monthly plan
    await element(by.text("Monthly")).tap();

    // Tap subscribe button
    await element(by.id("subscribe-button")).tap();

    // Handle payment flow (mocked in sandbox)
    await element(by.text("Pay Now")).tap();

    // Verify success
    await expect(element(by.text("Subscription Successful!"))).toBeVisible();
    await expect(element(by.id("premium-badge"))).toBeVisible();
  });

  it("should handle payment cancellation", async () => {
    await element(by.id("subscription-tab")).tap();
    await element(by.text("Monthly")).tap();
    await element(by.id("subscribe-button")).tap();

    // Cancel payment
    await element(by.text("Cancel")).tap();

    // Verify we're back on subscription screen
    await expect(element(by.text("Choose Your Plan"))).toBeVisible();
    await expect(element(by.id("premium-badge"))).not.toBeVisible();
  });

  it("should restore previous subscription", async () => {
    // Simulate app reinstall by clearing data
    // Note: This would require custom native code or device setup

    await element(by.id("subscription-tab")).tap();
    await element(by.id("restore-purchases-button")).tap();

    await expect(element(by.text("Subscription Restored"))).toBeVisible();
  });
});
```

### Comprehensive Test Coverage Strategies

Implement multi-layered testing strategy:

#### 1. Unit Tests (Jest)

- Test individual functions and utilities
- Mock external dependencies
- Focus on business logic

#### 2. Component Tests (@testing-library/react-native)

- Test component rendering and interactions
- Mock contexts and hooks
- Test user-facing behavior

#### 3. Integration Tests

- Test component interactions
- Test API integrations with mocks
- Test navigation flows

#### 4. E2E Tests (Detox)

- Test complete user journeys
- Test on real devices/simulators
- Test with actual APIs (staging environment)

#### Coverage Goals

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 85%
- **Lines**: 80%

#### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: ["src/**/*.{ts,tsx,js,jsx}", "!src/**/*.d.ts", "!src/**/__tests__/**", "!src/**/__mocks__/**"],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 85,
      lines: 80,
    },
    "./src/components/": {
      statements: 90,
      branches: 85,
    },
    "./src/services/": {
      statements: 95,
      functions: 90,
    },
  },
};
```

#### Test Organization

```
src/
├── components/
│   ├── __tests__/
│   │   ├── Component.test.tsx
│   │   └── Component.spec.tsx
├── services/
│   ├── __tests__/
│   │   ├── apiService.test.ts
│   │   └── subscriptionService.test.ts
├── hooks/
│   ├── __tests__/
│   │   ├── useSubscription.test.ts
├── utils/
│   ├── __tests__/
│   │   ├── helpers.test.ts
e2e/
├── __tests__/
│   ├── subscriptionFlow.e2e.js
│   └── navigation.e2e.js
```

### Automated Testing Pipelines and CI/CD Integration

#### EAS Workflows (Recommended for Expo)

```yaml
# .eas/workflows/test-and-build.yml
name: Test and Build
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Run Tests
    type: job
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
      - name: Run component tests
        run: npm run test:components
      - name: Generate coverage report
        run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  e2e_test:
    name: E2E Tests
    type: job
    needs: test
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Build for E2E
        run: npm run build:e2e
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload E2E artifacts
        uses: actions/upload-artifact@v3
        with:
          name: e2e-results
          path: e2e/artifacts/

  build:
    name: Build App
    type: build
    needs: [test, e2e_test]
    params:
      platform: all
      profile: production
```

#### GitHub Actions (Alternative)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Install dependencies
        run: npm ci
      - name: Run lint
        run: npm run lint
      - name: Run type check
        run: npm run typecheck
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      - name: Run component tests
        run: npm run test:components
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  e2e:
    runs-on: macos-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Install dependencies
        run: npm ci
      - name: Install Detox CLI
        run: npm install -g detox-cli
      - name: Build E2E
        run: npm run build:e2e
      - name: Run E2E tests
        run: npm run test:e2e
        timeout-minutes: 30

  build:
    runs-on: ubuntu-latest
    needs: [test, e2e]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Build on EAS
        run: eas build --platform all --profile production --non-interactive --no-wait
```

#### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=src/__tests__",
    "test:components": "jest --testPathPattern=src/components/__tests__",
    "test:integration": "jest --testPathPattern=src/__integration__",
    "test:e2e": "detox test --configuration ios.sim.debug",
    "test:coverage": "jest --coverage",
    "test:watch": "jest --watch",
    "build:e2e": "detox build --configuration ios.sim.debug",
    "lint": "eslint src --ext .ts,.tsx,.js,.jsx",
    "typecheck": "tsc --noEmit"
  }
}
```

#### Quality Gates

- **Unit Test Coverage**: >80%
- **Lint**: No errors
- **Type Check**: No errors
- **E2E Tests**: All passing
- **Build**: Successful

#### Monitoring and Reporting

- Use Codecov for coverage tracking
- Integrate with GitHub PR checks
- Set up Slack notifications for failures
- Generate test reports with Jest reporters

## Getting Help

### Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [React Native Purchases SDK](https://github.com/RevenueCat/react-native-purchases)
- [Expo In-App Purchases Guide](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)
- [Apple Sandbox Testing Guide](https://developer.apple.com/support/sandbox-testing/)
- [Google Play Billing Testing Guide](https://developer.android.com/google/play/billing/billing_testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [@testing-library/react-native](https://callstack.github.io/react-native-testing-library/)
- [Detox Documentation](https://wix.github.io/Detox/)
- [Expo Testing Guide](https://docs.expo.dev/guides/testing/)

### Support Channels

- **RevenueCat Support**: support@revenuecat.com
- **Apple Developer Support**: developer.apple.com/contact
- **Google Play Support**: play.google.com/console/support
- **Expo Forums**: https://chat.expo.dev/
- **React Native Community**: https://reactnative.dev/community/support

---

**Last Updated**: September 2025
**Version**: 2.0.0

For setup instructions, see:

- [REVENUECAT_SETUP.md](REVENUECAT_SETUP.md) - Comprehensive setup guide
- [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) - Environment variables guide
