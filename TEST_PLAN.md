# Comprehensive Test Plan - Video Upload, Paywall, and AdMob Fixes

## Date: 2025-10-16

## Overview
This document outlines the comprehensive testing plan to verify all fixes for video posting, RevenueCat paywall, and AdMob integration.

---

## ✅ Pre-Test Checklist

### Code Validation
- [x] No TypeScript errors in modified files
- [x] All imports are correct
- [x] Database schema supports the changes (`video_uri` is `text` and nullable)
- [x] Logic flow is correct for both text and video confessions

### Environment Setup
- [x] `.env` file has all required variables
- [x] Supabase URL and anon key configured
- [x] AdMob IDs configured (production IDs)
- [x] RevenueCat API keys configured
- [x] App is running (confirmed in terminal)

---

## 🎥 Test 1: Video Upload Flow

### Test 1.1: Successful Video Upload (Primary Test)
**Objective**: Verify video uploads correctly and `video_uri` is saved to database

**Steps**:
1. Open the app on simulator/device
2. Navigate to video recording screen
3. Record a short video (5-10 seconds)
4. Apply face blur (optional)
5. Add captions (optional)
6. Tap "Share" or "Upload"
7. Wait for upload to complete

**Expected Results**:
- ✅ Console shows: `"📤 Starting video upload for user [userId]"`
- ✅ Console shows: `"📁 Local file URI: file://..."`
- ✅ Console shows: `"📤 Upload URL: https://..."`
- ✅ Console shows: `"📁 Storage path: confessions/[userId]/[uuid].mp4"`
- ✅ Console shows: `"✅ Video uploaded successfully: confessions/[userId]/[uuid].mp4"`
- ✅ Upload progress bar shows 0% → 100%
- ✅ Success message appears
- ✅ Video appears in feed

**Database Verification**:
```sql
SELECT id, type, video_uri, has_face_blur, has_voice_change, created_at 
FROM confessions 
WHERE type = 'video' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Database Result**:
- `video_uri` should be: `confessions/[userId]/[uuid].mp4` (NOT NULL!)
- `has_face_blur` should match what was applied
- `has_voice_change` should match what was applied

---

### Test 1.2: Video Upload Failure Handling
**Objective**: Verify proper error handling when upload fails

**Steps**:
1. Turn off WiFi/cellular data
2. Record a video
3. Try to upload

**Expected Results**:
- ✅ Console shows: `"❌ Video upload failed: [error message]"`
- ✅ Error alert appears with clear message
- ✅ Video is queued for retry (check console for "✅ Confession queued for offline processing")
- ✅ No database insert happens (video_uri should not be NULL in database)

---

### Test 1.3: Text Confession (Regression Test)
**Objective**: Verify text confessions still work after video fixes

**Steps**:
1. Navigate to compose screen
2. Type a text confession (10-280 characters)
3. Tap "Share"

**Expected Results**:
- ✅ Console shows: `"📝 Adding new confession: {type: 'text', ...}"`
- ✅ No video upload logic is triggered
- ✅ Success message appears
- ✅ Text confession appears in feed

**Database Verification**:
```sql
SELECT id, type, content, video_uri, created_at 
FROM confessions 
WHERE type = 'text' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Database Result**:
- `type` should be: `text`
- `video_uri` should be: `NULL` (this is correct for text!)
- `content` should match what was typed

---

## 💰 Test 2: RevenueCat Paywall

### Test 2.1: Expo Go Demo Mode
**Objective**: Verify demo mode shows in Expo Go

**Steps**:
1. Run app in Expo Go: `npx expo start`
2. Scan QR code with Expo Go app
3. Navigate to paywall screen

**Expected Results**:
- ✅ Console shows: `"🎯 Demo: Getting mock offerings"`
- ✅ Alert appears: "Demo Mode - Subscriptions require a development build"
- ✅ No real offerings are loaded

---

### Test 2.2: Development Build - No Offerings
**Objective**: Verify helpful error message when offerings aren't configured

**Steps**:
1. Run development build: `npx expo run:ios`
2. Navigate to paywall screen
3. (Assuming StoreKit config isn't set up yet)

**Expected Results**:
- ✅ Console shows: `"📦 Loading RevenueCat offerings..."`
- ✅ Console shows: `"⚠️ No offerings returned"` or `"⚠️ No subscription packages available"`
- ✅ Alert appears with development setup instructions:
  - Create StoreKit Configuration file
  - Add products in Xcode scheme
  - Verify RevenueCat product IDs match
- ✅ Instructions are clear and actionable

---

### Test 2.3: Development Build - With Offerings
**Objective**: Verify offerings load correctly when configured

**Prerequisites**: StoreKit Configuration file created and configured

**Steps**:
1. Run development build: `npx expo run:ios`
2. Navigate to paywall screen

**Expected Results**:
- ✅ Console shows: `"📦 Loading RevenueCat offerings..."`
- ✅ Console shows: `"📦 Found [n] packages"`
- ✅ Console shows: `"✅ Packages loaded successfully: [identifiers]"`
- ✅ Subscription plans display correctly
- ✅ Prices show correctly
- ✅ Can select different plans

---

### Test 2.4: Purchase Flow (Sandbox)
**Objective**: Verify purchase flow works

**Prerequisites**: StoreKit Configuration or App Store Connect sandbox account

**Steps**:
1. Select a subscription plan
2. Tap "Subscribe" or "Purchase"
3. Complete purchase flow

**Expected Results**:
- ✅ Purchase sheet appears
- ✅ Can complete purchase
- ✅ Success message appears
- ✅ User is marked as premium
- ✅ Ads are hidden after purchase

---

## 📱 Test 3: AdMob Integration

### Test 3.1: Expo Go Demo Ads
**Objective**: Verify demo ads show in Expo Go

**Steps**:
1. Run app in Expo Go
2. Navigate to home feed
3. Scroll through feed

**Expected Results**:
- ✅ Console shows: `"📱 AdMob Banner Component [home-feed]"`
- ✅ Console shows: `"✓ Is Expo Go: true"`
- ✅ Demo ad appears (purple "Toxic Confessions Premium" banner)
- ✅ Demo ad says "Demo Ad - Dev build for real ads"

---

### Test 3.2: Development Build - Test Ads
**Objective**: Verify test ads show in development build

**Steps**:
1. Run development build: `npx expo run:ios`
2. Ensure user is NOT premium
3. Ensure advertising consent is granted
4. Navigate to home feed

**Expected Results**:
- ✅ Console shows: `"📱 AdMob Banner Component [home-feed]"`
- ✅ Console shows: `"✓ Module loaded: true"`
- ✅ Console shows: `"✓ Ad Unit ID: [test-id]"`
- ✅ Console shows: `"✓ Has Consent: true"`
- ✅ Console shows: `"✓ Is Premium: false"`
- ✅ Real test ad appears (Google test ad)

---

### Test 3.3: Premium User - No Ads
**Objective**: Verify ads are hidden for premium users

**Steps**:
1. Purchase subscription (or set premium flag manually)
2. Navigate to home feed

**Expected Results**:
- ✅ Console shows: `"🚫 Ad hidden: User is premium"`
- ✅ No ads appear anywhere in the app

---

### Test 3.4: No Consent - No Ads
**Objective**: Verify ads are hidden when user hasn't given consent

**Steps**:
1. Revoke advertising consent (or set consent flag to false)
2. Navigate to home feed

**Expected Results**:
- ✅ Console shows: `"🚫 Ad hidden: No advertising consent"`
- ✅ No ads appear

---

## 🔍 Test 4: Edge Cases

### Test 4.1: Large Video Upload
**Objective**: Verify large videos are handled correctly

**Steps**:
1. Record a 30-60 second video
2. Upload it

**Expected Results**:
- ✅ Upload progress shows correctly
- ✅ Video compresses if needed
- ✅ Upload completes successfully
- ✅ `video_uri` is saved correctly

---

### Test 4.2: Network Interruption During Upload
**Objective**: Verify upload handles network interruption

**Steps**:
1. Start video upload
2. Turn off WiFi mid-upload
3. Turn WiFi back on

**Expected Results**:
- ✅ Upload fails with clear error message
- ✅ Video is queued for retry
- ✅ Retry happens automatically when network is restored

---

### Test 4.3: Multiple Rapid Uploads
**Objective**: Verify multiple uploads don't interfere with each other

**Steps**:
1. Record and upload video 1
2. Immediately record and upload video 2
3. Immediately record and upload video 3

**Expected Results**:
- ✅ All uploads complete successfully
- ✅ All `video_uri` values are unique and correct
- ✅ No race conditions or conflicts

---

## 📊 Test Results Summary

### Video Upload Tests
- [ ] Test 1.1: Successful Video Upload
- [ ] Test 1.2: Video Upload Failure Handling
- [ ] Test 1.3: Text Confession (Regression)

### RevenueCat Paywall Tests
- [ ] Test 2.1: Expo Go Demo Mode
- [ ] Test 2.2: Development Build - No Offerings
- [ ] Test 2.3: Development Build - With Offerings
- [ ] Test 2.4: Purchase Flow (Sandbox)

### AdMob Integration Tests
- [ ] Test 3.1: Expo Go Demo Ads
- [ ] Test 3.2: Development Build - Test Ads
- [ ] Test 3.3: Premium User - No Ads
- [ ] Test 3.4: No Consent - No Ads

### Edge Case Tests
- [ ] Test 4.1: Large Video Upload
- [ ] Test 4.2: Network Interruption During Upload
- [ ] Test 4.3: Multiple Rapid Uploads

---

## 🐛 Known Issues to Watch For

1. **Video URI Extraction from Signed URL**: The new code extracts storage path from signed URLs. Watch for:
   - Incorrect path extraction
   - URL encoding issues
   - Missing `confessions/` prefix

2. **Text Confession Validation**: Ensure the video validation doesn't break text confessions

3. **Offline Queue**: Verify queued videos upload correctly when network is restored

---

## 📝 Test Execution Notes

### How to Run Tests
1. Start with Expo Go tests (easiest)
2. Then run development build tests
3. Finally test edge cases

### Console Logs to Watch
```bash
# Video Upload Success
"📤 Starting video upload for user [userId]"
"✅ Video uploaded successfully: confessions/[userId]/[uuid].mp4"

# Video Upload Failure
"❌ Video upload failed: [error]"

# RevenueCat
"📦 Loading RevenueCat offerings..."
"✅ Packages loaded successfully: [identifiers]"

# AdMob
"📱 AdMob Banner Component [placement]"
"✓ Module loaded: true"
```

### Database Queries for Verification
```sql
-- Check recent video confessions
SELECT id, type, video_uri, has_face_blur, has_voice_change, created_at 
FROM confessions 
WHERE type = 'video' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check for NULL video_uri (should be NONE after fixes!)
SELECT COUNT(*) as null_video_uri_count
FROM confessions 
WHERE type = 'video' AND video_uri IS NULL;

-- Check recent text confessions
SELECT id, type, content, video_uri, created_at 
FROM confessions 
WHERE type = 'text' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## ✅ Success Criteria

All tests must pass with:
- ✅ No TypeScript errors
- ✅ No runtime crashes
- ✅ Clear, helpful console logs
- ✅ Proper error messages for users
- ✅ Database integrity maintained
- ✅ No NULL `video_uri` for video confessions
- ✅ Text confessions still work
- ✅ Paywall shows appropriate messages
- ✅ Ads show/hide correctly based on user state

---

## 🚀 Next Steps After Testing

1. If all tests pass:
   - ✅ Mark all tasks as complete
   - ✅ Commit changes to git
   - ✅ Push to GitHub
   - ✅ Create pull request
   - ✅ Deploy to TestFlight

2. If any tests fail:
   - ❌ Document the failure
   - ❌ Fix the issue
   - ❌ Re-run tests
   - ❌ Repeat until all pass

---

## 📞 Support

If you encounter issues during testing:
1. Check console logs first (they're now very detailed!)
2. Check `FIXES_APPLIED.md` for debugging tips
3. Verify environment variables in `.env`
4. Check Supabase dashboard for database state

