# Subscription Testing Guide

## Simulator Testing

The app now supports mock subscriptions in the simulator for testing purposes.

### What to Test:

1. **Paywall Screen**:
   - Navigate to any premium feature (e.g., Download video)
   - Should see the paywall with mock pricing
   - Monthly: $4.99
   - Annual: $29.99 (marked as POPULAR)

2. **Purchase Flow**:
   - Select a plan
   - Click "Subscribe Now"
   - Should show "Processing..." for 2 seconds
   - Then show success message

3. **Download Feature**:
   - After mock purchase, download should work
   - Before purchase, should show "Premium subscription required"

### Expected Behavior:

- Mock data loads in simulator
- Purchase simulation works
- Features unlock after mock purchase

### Production Testing:

- On real device, will connect to RevenueCat
- Requires sandbox tester account
- Real Apple ID authentication

## Notes:

- Simulator uses mock data for development
- Real devices use RevenueCat sandbox/production
- Download only includes face blur and watermark (no captions)
