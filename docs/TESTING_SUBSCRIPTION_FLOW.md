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
describe('RevenueCatService', () => {
  test('should initialize correctly', async () => {
    await RevenueCatService.initialize();
    expect(RevenueCatService.isInitialized).toBe(true);
  });

  test('should return mock offerings in demo mode', async () => {
    const offerings = await RevenueCatService.getOfferings();
    expect(offerings).toBeNull(); // Demo mode
  });

  test('should handle purchase errors gracefully', async () => {
    // Mock network failure
    const result = await RevenueCatService.purchasePackage(mockPackage);
    expect(result).toHaveProperty('mockCustomerInfo', true);
  });
});
```

## Debugging and Troubleshooting

### Common Issues and Solutions

#### Issue: "RevenueCat not initialized"
**Solution**:
```typescript
// Check initialization status
console.log('RevenueCat initialized:', RevenueCatService.isInitialized);

// Manually initialize if needed
await RevenueCatService.initialize();
```

#### Issue: Purchase hangs indefinitely
**Solution**:
```typescript
// Check network connectivity
const isConnected = await NetInfo.fetch().then(state => state.isConnected);

// Check RevenueCat configuration
const customerInfo = await RevenueCatService.getCustomerInfo();
console.log('Customer info:', customerInfo);
```

#### Issue: Premium features not unlocking
**Solution**:
```typescript
// Check subscription status
const isPremium = await RevenueCatService.isUserPremium();
console.log('Is premium:', isPremium);

// Check database sync
const { data: membership } = await supabase
  .from('user_memberships')
  .select('*')
  .eq('user_id', user.id)
  .single();
console.log('Database membership:', membership);
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
console.log('Purchase duration:', duration);

// Track subscription status changes
const initialStatus = await RevenueCatService.isUserPremium();
await RevenueCatService.purchasePackage(package);
const finalStatus = await RevenueCatService.isUserPremium();
console.log('Status changed:', initialStatus, '→', finalStatus);
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

## Getting Help

### Resources
- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [React Native Purchases SDK](https://github.com/RevenueCat/react-native-purchases)
- [Expo In-App Purchases Guide](https://docs.expo.dev/versions/latest/sdk/in-app-purchases/)
- [Apple Sandbox Testing Guide](https://developer.apple.com/support/sandbox-testing/)
- [Google Play Billing Testing Guide](https://developer.android.com/google/play/billing/billing_testing)

### Support Channels
- **RevenueCat Support**: support@revenuecat.com
- **Apple Developer Support**: developer.apple.com/contact
- **Google Play Support**: play.google.com/console/support

---

**Last Updated**: January 2025
**Version**: 1.0.0

For setup instructions, see:
- [REVENUECAT_SETUP.md](REVENUECAT_SETUP.md) - Comprehensive setup guide
- [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) - Environment variables guide