# App Store Server Notifications Setup Guide
**For RevenueCat Integration**

---

## 📋 Overview

App Store Server Notifications (ASSN) provide real-time updates about subscription events directly from Apple to RevenueCat. This ensures your app always has the most up-to-date subscription status.

**Status:** ⚠️ **REQUIRED FOR PRODUCTION**

---

## 🎯 Why You Need This

### Without Server Notifications
- ❌ Subscription status updates delayed
- ❌ Users may see ads after purchasing
- ❌ Premium features may not unlock immediately
- ❌ Manual refresh required
- ❌ More support tickets

### With Server Notifications
- ✅ Real-time subscription updates
- ✅ Instant premium status changes
- ✅ Ads disappear immediately after purchase
- ✅ Better user experience
- ✅ Accurate analytics

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get RevenueCat Webhook URL

1. **Go to RevenueCat Dashboard**
   ```
   https://app.revenuecat.com
   ```

2. **Select Your Project**
   - Click on "Toxic Confessions" (or your project name)

3. **Navigate to Integrations**
   - Left sidebar → "Integrations"
   - Or direct link: https://app.revenuecat.com/projects/YOUR_PROJECT/integrations

4. **Find Apple App Store Server Notifications**
   - Scroll to "Apple App Store Server Notifications"
   - Click "Set Up" or "View"

5. **Copy Your Webhook URL**
   - You'll see a URL like:
   ```
   https://api.revenuecat.com/v1/webhooks/apple/YOUR_PROJECT_ID
   ```
   - **Copy this entire URL** (you'll need it in the next step)

---

### Step 2: Configure in App Store Connect

1. **Go to App Store Connect**
   ```
   https://appstoreconnect.apple.com
   ```

2. **Navigate to Your App**
   - Click "My Apps"
   - Select "Toxic Confessions"

3. **Go to App Information**
   - In the left sidebar, click "App Information"
   - (Not "App Store" - make sure it's "App Information")

4. **Scroll to "App Store Server Notifications"**
   - Scroll down to find this section
   - It's near the bottom of the page

5. **Add Production Server URL**
   - Click in the "Production Server URL" field
   - Paste your RevenueCat webhook URL
   - Example:
   ```
   https://api.revenuecat.com/v1/webhooks/apple/abc123xyz
   ```

6. **Add Sandbox Server URL (Recommended)**
   - Click in the "Sandbox Server URL" field
   - Paste the **same URL** (RevenueCat handles both)
   - Example:
   ```
   https://api.revenuecat.com/v1/webhooks/apple/abc123xyz
   ```

7. **Save Changes**
   - Click "Save" at the top right
   - Wait for confirmation message

---

### Step 3: Verify Setup

1. **Check RevenueCat Dashboard**
   - Go back to RevenueCat → Integrations
   - Apple App Store Server Notifications should show:
   ```
   ✅ Connected
   ```

2. **Test with Sandbox Purchase**
   - Make a test purchase in sandbox mode
   - Go to RevenueCat → Customer History
   - You should see the event appear within seconds
   - Look for "INITIAL_BUY" event

3. **Check Event Log**
   - In RevenueCat, go to "Event Log"
   - You should see webhook events coming in
   - Example events:
   ```
   ✅ INITIAL_BUY - User purchased subscription
   ✅ RENEWAL - Subscription renewed
   ```

---

## 📊 What Events You'll Receive

### Purchase Events
| Event | Description | Impact on App |
|-------|-------------|---------------|
| **INITIAL_BUY** | First purchase | User becomes premium |
| **RENEWAL** | Auto-renewal | Premium continues |
| **PRODUCT_CHANGE** | Plan change | Premium tier changes |

### Cancellation Events
| Event | Description | Impact on App |
|-------|-------------|---------------|
| **CANCELLATION** | User cancelled | Premium until expiration |
| **EXPIRATION** | Subscription expired | User loses premium |
| **REFUND** | Purchase refunded | Premium removed immediately |

### Billing Events
| Event | Description | Impact on App |
|-------|-------------|---------------|
| **BILLING_ISSUE** | Payment failed | Grace period starts |
| **BILLING_RECOVERY** | Payment succeeded | Premium restored |
| **GRACE_PERIOD** | Retry period | Premium continues temporarily |

---

## 🔍 How It Works

### The Flow

```
1. User purchases subscription in your app
   ↓
2. Apple processes the payment
   ↓
3. Apple sends notification to RevenueCat webhook
   ↓
4. RevenueCat updates customer info
   ↓
5. Your app checks RevenueCat (automatically)
   ↓
6. Premium status updates in your app
   ↓
7. Ads disappear, premium features unlock
```

**Time:** Usually < 5 seconds from purchase to premium activation

---

## ✅ Benefits for Toxic Confessions

### For Users
- ✅ Instant premium activation
- ✅ Ads disappear immediately
- ✅ No need to restart app
- ✅ Works across all devices
- ✅ Better experience

### For You
- ✅ Accurate subscription metrics
- ✅ Real-time revenue tracking
- ✅ Fewer support tickets
- ✅ Better retention data
- ✅ Automatic status sync

### For Business
- ✅ Higher conversion rates
- ✅ Better user satisfaction
- ✅ Reduced churn
- ✅ Accurate analytics
- ✅ Professional experience

---

## 🛠️ Troubleshooting

### Issue: "Invalid URL" Error

**Symptoms:**
- App Store Connect shows error when saving
- Red error message appears

**Solutions:**
1. Verify you copied the **entire URL** from RevenueCat
2. Make sure URL starts with `https://api.revenuecat.com`
3. Check for extra spaces at beginning or end
4. Try copying again from RevenueCat dashboard

---

### Issue: "Connection Failed"

**Symptoms:**
- RevenueCat shows "Not Connected"
- No events appearing in dashboard

**Solutions:**
1. Wait 5-10 minutes (propagation delay)
2. Verify URL is saved in App Store Connect
3. Check RevenueCat project is active
4. Make a test purchase to trigger notification
5. Contact RevenueCat support if still not working

---

### Issue: Not Receiving Notifications

**Symptoms:**
- Purchases work but no events in RevenueCat
- Premium status not updating

**Solutions:**
1. **Check App Store Connect:**
   - Verify URL is saved
   - Check both Production and Sandbox URLs

2. **Check RevenueCat:**
   - Go to Integrations
   - Verify "Connected" status
   - Check Event Log for errors

3. **Test Purchase:**
   - Make a sandbox purchase
   - Wait 30 seconds
   - Check RevenueCat Customer History
   - Look for the transaction

4. **Verify App Configuration:**
   - Check your app is using correct API keys
   - Verify RevenueCat SDK is initialized
   - Check console logs for errors

---

### Issue: Delayed Updates

**Symptoms:**
- Notifications arrive but delayed
- Premium status updates slowly

**Solutions:**
1. This is normal for some events (up to 5 minutes)
2. INITIAL_BUY should be instant (< 5 seconds)
3. RENEWAL may take longer (up to 1 hour)
4. Check Apple's system status: https://developer.apple.com/system-status/

---

## 📝 Important Notes

### Before Launch
⚠️ **Set this up BEFORE submitting to App Store**
- Notifications only work for purchases made AFTER setup
- Historical purchases won't trigger notifications
- Can't be added retroactively

### URL Configuration
✅ **Use same URL for both environments**
- RevenueCat automatically detects sandbox vs production
- No need for separate URLs
- Simplifies configuration

### Security
🔒 **Keep your webhook URL secure**
- Don't share publicly
- Don't commit to public repositories
- It's specific to your project

### Testing
🧪 **Always test in sandbox first**
- Make test purchases
- Verify events appear in RevenueCat
- Check premium status updates in app
- Test all subscription flows

---

## 🎯 Verification Checklist

### Configuration
- [ ] Logged in to RevenueCat dashboard
- [ ] Copied webhook URL from Integrations
- [ ] Logged in to App Store Connect
- [ ] Navigated to App Information
- [ ] Added Production Server URL
- [ ] Added Sandbox Server URL
- [ ] Saved changes in App Store Connect

### Testing
- [ ] Made test purchase in sandbox
- [ ] Verified event in RevenueCat dashboard
- [ ] Checked premium status in app
- [ ] Tested ad hiding
- [ ] Tested premium features
- [ ] Verified across devices

### Production
- [ ] Webhook URL is correct
- [ ] RevenueCat shows "Connected"
- [ ] Event log shows incoming events
- [ ] Customer history shows purchases
- [ ] App responds to status changes

---

## 📞 Support

### RevenueCat Support
- **Documentation:** https://docs.revenuecat.com
- **Support:** https://app.revenuecat.com/support
- **Community:** https://community.revenuecat.com

### Apple Support
- **Documentation:** https://developer.apple.com/documentation/appstoreservernotifications
- **System Status:** https://developer.apple.com/system-status/
- **Support:** https://developer.apple.com/contact/

### Your App Support
- **Email:** support@toxicconfessions.app
- **Check:** RevenueCat dashboard for real-time status

---

## 🚀 Next Steps

After setting up notifications:

1. **Test Thoroughly**
   - Make multiple test purchases
   - Test cancellations
   - Test renewals
   - Verify all events

2. **Monitor Dashboard**
   - Check RevenueCat daily
   - Review event log
   - Monitor customer history
   - Track metrics

3. **Submit to App Store**
   - Complete other submission requirements
   - Include webhook setup in review notes
   - Submit for review

4. **Post-Launch Monitoring**
   - Watch for webhook errors
   - Monitor event delivery
   - Check customer support tickets
   - Verify premium status accuracy

---

## ✅ Summary

**What:** App Store Server Notifications via RevenueCat  
**Why:** Real-time subscription updates  
**When:** Before App Store submission  
**Time:** 5 minutes to set up  
**Difficulty:** Easy  
**Required:** Yes, for production  

**Status After Setup:** ✅ Production Ready

---

**Last Updated:** 2025-10-14  
**Version:** 1.0  
**App:** Toxic Confessions

