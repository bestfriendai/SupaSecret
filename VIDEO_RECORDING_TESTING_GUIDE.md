# Video Recording Feature - Testing Guide

## 🧪 Complete Testing Checklist

This guide provides step-by-step instructions for testing the video recording feature with all integrated components.

---

## Prerequisites

### For Full Feature Testing (Native Build):
```bash
# Build for iOS
npx expo run:ios

# Build for Android
npx expo run:android
```

### For Basic Testing (Expo Go):
```bash
npx expo start
```

**Note:** Face blur and real-time transcription have limitations in Expo Go.

---

## Test Suite 1: Basic Video Recording

### Test 1.1: Record Video (No Effects)
**Steps:**
1. Open app and navigate to video recording screen
2. Disable face blur toggle
3. Disable voice modification toggle
4. Tap "Record" button
5. Record for 10 seconds
6. Tap "Stop" button
7. Verify "Next" button appears
8. Tap "Next"

**Expected Results:**
- ✅ Recording starts immediately
- ✅ Timer counts up from 0:00
- ✅ "Next" button appears after stopping
- ✅ Navigation to preview screen
- ✅ Video plays in preview

**Pass/Fail:** ___________

---

### Test 1.2: Record Video (Max Duration)
**Steps:**
1. Start recording
2. Wait for 60 seconds (max duration)
3. Verify auto-stop

**Expected Results:**
- ✅ Recording stops automatically at 60 seconds
- ✅ "Next" button appears
- ✅ No errors displayed

**Pass/Fail:** ___________

---

## Test Suite 2: Face Blur (Native Build Only)

### Test 2.1: Real-time Face Blur
**Steps:**
1. Enable face blur toggle
2. Start recording
3. Move face around frame
4. Stop recording
5. Tap "Next"
6. Review video in preview

**Expected Results:**
- ✅ Face is blurred in real-time during recording
- ✅ Blur follows face movement
- ✅ Blur is visible in recorded video
- ✅ Status indicator shows "Privacy Mode: Blur"
- ✅ Preview shows blurred face

**Pass/Fail:** ___________

---

### Test 2.2: Multiple Faces
**Steps:**
1. Enable face blur
2. Record with 2+ people in frame
3. Review recording

**Expected Results:**
- ✅ All faces are blurred
- ✅ Blur tracks each face independently
- ✅ Performance remains smooth

**Pass/Fail:** ___________

---

### Test 2.3: Face Detection Edge Cases
**Steps:**
1. Record with face partially out of frame
2. Record with face at different angles
3. Record with face far from camera
4. Record with face very close to camera

**Expected Results:**
- ✅ Blur adapts to face position
- ✅ Blur size adjusts appropriately
- ✅ No crashes or errors

**Pass/Fail:** ___________

---

## Test Suite 3: Voice Modification

### Test 3.1: Deep Voice Effect
**Steps:**
1. Enable voice modification toggle
2. Select "Deep" voice effect
3. Record video while speaking
4. Tap "Next"
5. Wait for processing
6. Review in preview

**Expected Results:**
- ✅ Processing progress shown (0-100%)
- ✅ Status shows "Applying deep voice effect..."
- ✅ Processing completes without errors
- ✅ Audio sounds deeper in preview
- ✅ Video plays smoothly

**Pass/Fail:** ___________

---

### Test 3.2: Light Voice Effect
**Steps:**
1. Enable voice modification
2. Select "Light" voice effect
3. Record and process
4. Review audio

**Expected Results:**
- ✅ Processing completes successfully
- ✅ Audio sounds higher-pitched
- ✅ Voice effect is noticeable

**Pass/Fail:** ___________

---

### Test 3.3: Voice Processing Performance
**Steps:**
1. Record 60-second video with voice effect
2. Monitor processing time
3. Check device temperature

**Expected Results:**
- ✅ Processing completes in reasonable time (<30 seconds)
- ✅ No app crashes
- ✅ Device doesn't overheat
- ✅ Progress updates smoothly

**Pass/Fail:** ___________

---

## Test Suite 4: Real-time Transcription

### Test 4.1: Basic Transcription
**Steps:**
1. Start recording
2. Speak clearly: "This is my anonymous confession"
3. Observe transcription overlay
4. Stop recording
5. Tap "Next"
6. Check preview for transcription

**Expected Results:**
- ✅ Transcription overlay appears during recording
- ✅ Text updates as you speak
- ✅ Transcription is reasonably accurate
- ✅ Final transcription saved with video
- ✅ Transcription visible in preview

**Pass/Fail:** ___________

---

### Test 4.2: Continuous Speech
**Steps:**
1. Record while speaking continuously for 30 seconds
2. Observe transcription updates
3. Review final transcription

**Expected Results:**
- ✅ Transcription updates in real-time
- ✅ Long sentences captured correctly
- ✅ No text truncation

**Pass/Fail:** ___________

---

### Test 4.3: Transcription Fallback
**Steps:**
1. Test in Expo Go (or with voice API unavailable)
2. Start recording
3. Observe simulation mode

**Expected Results:**
- ✅ Simulation text appears
- ✅ No crashes or errors
- ✅ Graceful degradation

**Pass/Fail:** ___________

---

## Test Suite 5: Complete Integration

### Test 5.1: All Features Enabled
**Steps:**
1. Enable face blur
2. Enable voice modification (deep)
3. Start recording
4. Speak while recording
5. Move face around
6. Stop recording
7. Tap "Next"
8. Wait for processing
9. Review in preview
10. Tap "Share"
11. Wait for upload

**Expected Results:**
- ✅ Face blur works during recording
- ✅ Transcription captures speech
- ✅ Voice processing completes
- ✅ Preview shows all effects
- ✅ Upload succeeds
- ✅ Video appears in feed

**Pass/Fail:** ___________

---

### Test 5.2: Database Verification
**Steps:**
1. Complete Test 5.1
2. Check Supabase database
3. Find the uploaded confession
4. Verify fields

**Expected Results:**
- ✅ `has_face_blur` = true
- ✅ `has_voice_change` = true
- ✅ `transcription` contains text
- ✅ `video_duration` is set
- ✅ `video_uri` points to storage

**Pass/Fail:** ___________

---

### Test 5.3: Performance Under Load
**Steps:**
1. Record 60-second video with all features
2. Monitor:
   - CPU usage
   - Memory usage
   - Battery drain
   - Processing time

**Expected Results:**
- ✅ CPU usage acceptable (<80%)
- ✅ Memory usage stable
- ✅ No memory leaks
- ✅ Battery drain reasonable
- ✅ Total processing time <45 seconds

**Pass/Fail:** ___________

---

## Test Suite 6: Error Handling

### Test 6.1: Network Failure During Upload
**Steps:**
1. Record video with all features
2. Process video
3. Disable network
4. Tap "Share"

**Expected Results:**
- ✅ Error message displayed
- ✅ Option to retry
- ✅ Video not lost
- ✅ Can retry when network restored

**Pass/Fail:** ___________

---

### Test 6.2: Processing Failure
**Steps:**
1. Record video
2. Force-close app during processing
3. Reopen app

**Expected Results:**
- ✅ App recovers gracefully
- ✅ No corrupted state
- ✅ Can record new video

**Pass/Fail:** ___________

---

### Test 6.3: Permission Denial
**Steps:**
1. Deny camera permission
2. Attempt to record
3. Grant permission
4. Retry recording

**Expected Results:**
- ✅ Clear permission request message
- ✅ Graceful handling of denial
- ✅ Works after granting permission

**Pass/Fail:** ___________

---

## Test Suite 7: UI/UX

### Test 7.1: Toggle Interactions
**Steps:**
1. Toggle face blur on/off multiple times
2. Toggle voice modification on/off
3. Switch between deep/light voice
4. Verify UI updates

**Expected Results:**
- ✅ Toggles respond immediately
- ✅ Status indicators update
- ✅ No UI glitches

**Pass/Fail:** ___________

---

### Test 7.2: Progress Indicators
**Steps:**
1. Record and process video
2. Observe all progress indicators

**Expected Results:**
- ✅ Recording timer visible
- ✅ Processing progress bar smooth
- ✅ Status messages clear
- ✅ No UI freezing

**Pass/Fail:** ___________

---

### Test 7.3: Navigation Flow
**Steps:**
1. Record video
2. Tap "Next"
3. Tap "Retake" in preview
4. Record again
5. Tap "Discard"

**Expected Results:**
- ✅ Navigation works correctly
- ✅ Back button functions
- ✅ Confirmation dialogs appear
- ✅ No navigation bugs

**Pass/Fail:** ___________

---

## Test Suite 8: Edge Cases

### Test 8.1: Very Short Video
**Steps:**
1. Record for 2 seconds
2. Stop and process

**Expected Results:**
- ✅ Processing completes
- ✅ No errors
- ✅ Video plays correctly

**Pass/Fail:** ___________

---

### Test 8.2: Silent Video
**Steps:**
1. Record without speaking
2. Process with voice effect

**Expected Results:**
- ✅ Processing completes
- ✅ No crashes
- ✅ Transcription empty or minimal

**Pass/Fail:** ___________

---

### Test 8.3: Low Light Conditions
**Steps:**
1. Record in low light
2. Enable face blur
3. Verify face detection

**Expected Results:**
- ✅ Face detection still works
- ✅ Blur applied correctly
- ✅ Performance acceptable

**Pass/Fail:** ___________

---

## Test Results Summary

### Overall Statistics
- Total Tests: 28
- Passed: _____
- Failed: _____
- Skipped: _____

### Critical Issues Found
1. ___________________________________
2. ___________________________________
3. ___________________________________

### Minor Issues Found
1. ___________________________________
2. ___________________________________
3. ___________________________________

### Performance Metrics
- Average recording time: _____ seconds
- Average processing time: _____ seconds
- Average upload time: _____ seconds
- Memory usage peak: _____ MB
- CPU usage peak: _____ %

---

## Sign-off

**Tester Name:** _____________________
**Date:** _____________________
**Device:** _____________________
**OS Version:** _____________________
**App Version:** _____________________

**Overall Assessment:** 
- [ ] Ready for production
- [ ] Needs minor fixes
- [ ] Needs major fixes
- [ ] Not ready

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

