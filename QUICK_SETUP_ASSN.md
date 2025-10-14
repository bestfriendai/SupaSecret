# ⚡ Quick Setup: App Store Server Notifications

**Time Required:** 5 minutes  
**Difficulty:** Easy  
**Required:** Yes (for production)

---

## 🎯 What You Need

1. RevenueCat account (you already have this)
2. App Store Connect access
3. 5 minutes

---

## 📝 Step-by-Step

### 1️⃣ Get Webhook URL (2 minutes)

```
1. Go to: https://app.revenuecat.com
2. Select your project: "Toxic Confessions"
3. Click: Integrations (left sidebar)
4. Find: "Apple App Store Server Notifications"
5. Copy the URL that looks like:
   https://api.revenuecat.com/v1/webhooks/apple/YOUR_ID
```

---

### 2️⃣ Add to App Store Connect (2 minutes)

```
1. Go to: https://appstoreconnect.apple.com
2. Click: My Apps → Toxic Confessions
3. Click: App Information (left sidebar)
4. Scroll to: "App Store Server Notifications"
5. Paste URL in: Production Server URL
6. Paste URL in: Sandbox Server URL (same URL)
7. Click: Save
```

---

### 3️⃣ Verify (1 minute)

```
1. Go back to RevenueCat dashboard
2. Check Integrations page
3. Should see: ✅ Connected
4. Make a test purchase to confirm
```

---

## ✅ Done!

Your app will now receive real-time subscription updates from Apple.

**Benefits:**
- ✅ Instant premium activation
- ✅ Ads disappear immediately
- ✅ Better user experience
- ✅ Accurate analytics

---

## 🆘 Need Help?

**Full Guide:** See `APP_STORE_SERVER_NOTIFICATIONS_SETUP.md`

**Common Issues:**
- "Invalid URL" → Copy the entire URL from RevenueCat
- "Not Connected" → Wait 5-10 minutes, then refresh
- "No events" → Make a test purchase in sandbox

---

## 📋 Checklist

- [ ] Copied webhook URL from RevenueCat
- [ ] Added to App Store Connect (Production)
- [ ] Added to App Store Connect (Sandbox)
- [ ] Saved changes
- [ ] Verified "Connected" status
- [ ] Made test purchase
- [ ] Saw event in RevenueCat dashboard

**Status:** ⚠️ Required before App Store submission

---

**Last Updated:** 2025-10-14

