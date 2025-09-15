# App Store Submission Guide

## Overview
This guide provides step-by-step instructions for submitting Toxic Confessions to the Apple App Store and Google Play Store.

## Prerequisites

### Developer Accounts
- [ ] Apple Developer Account ($99/year) - https://developer.apple.com
- [ ] Google Play Developer Account ($25 one-time) - https://play.google.com/console

### Build Requirements
- [ ] Production builds created via EAS Build
- [ ] All environment variables configured (no placeholders)
- [ ] App tested on physical devices
- [ ] All native modules working correctly

---

## iOS App Store Submission

### 1. App Store Connect Setup

#### Create App
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+"
3. Select "New App"
4. Fill in:
   - **Platform**: iOS
   - **Name**: Toxic Confessions
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: com.toxic.confessions
   - **SKU**: toxic-confessions-ios
   - **User Access**: Full Access

#### App Information
1. **Category**: Social Networking
2. **Secondary Category**: Entertainment
3. **Content Rights**: Check "No third-party content"
4. **Age Rating**: 17+ (due to anonymous content nature)

### 2. App Metadata

#### App Description
```
Toxic Confessions is a revolutionary anonymous confession platform that prioritizes user privacy above all else. Share your deepest secrets, thoughts, and experiences without fear of judgment or exposure.

KEY FEATURES:
• Complete Anonymity: Advanced face blurring and voice modulation technology
• Privacy-First: No personal data collection, no tracking, no ads targeting
• Safe Space: Community moderation and content filtering
• Video & Text: Choose your preferred confession format
• Real-Time Processing: Instant anonymization on-device

Your privacy is our priority. All video processing happens on your device, ensuring your identity is protected before anything is uploaded.

Join thousands sharing their authentic selves in a judgment-free environment.
```

#### Keywords
```
anonymous, confessions, secrets, privacy, safe space, video confession, voice changer, face blur, anonymous chat
```

#### Support URL
```
https://toxicconfessions.app/support
```

#### Privacy Policy URL
```
https://toxicconfessions.app/privacy
```

### 3. Screenshots & Preview

#### Required Screenshots (per device size)
- **iPhone 6.7"** (1290 × 2796): 3-10 screenshots
- **iPhone 6.5"** (1284 × 2778 or 1242 × 2688): 3-10 screenshots
- **iPhone 5.5"** (1242 × 2208): 3-10 screenshots
- **iPad Pro 12.9"** (2048 × 2732): 3-10 screenshots

#### Screenshot Suggestions
1. Onboarding screen with privacy promise
2. Main feed showing blurred videos
3. Recording screen with face detection overlay
4. Text confession creation
5. Settings showing privacy controls

### 4. Privacy Details

#### Data Collection Disclosure
- [ ] **Data Not Collected**: We don't collect any personally identifiable information
- [ ] **Data Linked to You**: None
- [ ] **Data Not Linked to You**:
  - Usage Data (anonymous analytics)
  - Diagnostics (crash reports)

#### Privacy Nutrition Labels
- **Contact Info**: Not Collected
- **Health & Fitness**: Not Collected
- **Financial Info**: Not Collected (unless using in-app purchases)
- **Location**: Not Collected
- **Sensitive Info**: Not Collected
- **Identifiers**: Device ID (for analytics only)
- **Usage Data**: Product Interaction (anonymous)
- **Diagnostics**: Crash Data, Performance Data

### 5. App Review Information

#### Demo Account
```
Not required - app functions without account
```

#### Notes for Reviewer
```
Toxic Confessions is an anonymous confession platform that prioritizes user privacy.

Key points for review:
1. All face blurring and voice modulation happens on-device
2. No user accounts or personal data collection
3. Content moderation via community reporting
4. Age-gated to 17+ due to mature content potential
5. Full functionality available without sign-up

The app uses the camera and microphone for recording video confessions, with all processing done locally before upload.
```

### 6. Build Upload

#### Using EAS Submit
```bash
# Submit to App Store Connect
eas submit --platform ios --latest

# Or with specific build
eas submit --platform ios --id=<build-id>
```

#### Manual Upload
1. Download `.ipa` file from EAS
2. Open Xcode → Window → Organizer
3. Click "Distribute App"
4. Select "App Store Connect"
5. Upload and wait for processing

### 7. TestFlight Setup

#### Internal Testing
1. Go to TestFlight tab in App Store Connect
2. Select build
3. Add internal testers (up to 100)
4. No review required

#### External Testing
1. Add external testers (up to 10,000)
2. Fill in test information
3. Submit for Beta App Review
4. Wait 24-48 hours for approval

### 8. Release Management

#### Phased Release (Recommended)
1. In "Version Release" section
2. Select "Phased Release for Automatic Updates"
3. 7-day gradual rollout to users

#### Version Release Options
- **Manually release**: You control when it goes live
- **Automatically release**: Goes live after approval
- **Automatically release after date**: Schedule release

---

## Google Play Store Submission

### 1. Google Play Console Setup

#### Create Application
1. Log in to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in:
   - **App name**: Toxic Confessions
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
   - **Declarations**: Check all required boxes

### 2. Store Listing

#### App Details
- **Short description** (80 chars):
  ```
  Anonymous confessions with complete privacy. Share secrets safely.
  ```

- **Full description** (4000 chars):
  ```
  [Use same description as iOS above]
  ```

#### Graphic Assets
- **App icon**: 512 × 512 PNG
- **Feature graphic**: 1024 × 500 PNG
- **Screenshots**:
  - Phone: 2-8 screenshots
  - Tablet: Up to 8 screenshots (optional)

#### Categorization
- **Category**: Social
- **Tags**: Anonymous, Privacy, Confessions

### 3. Content Rating

#### Questionnaire
1. Start questionnaire
2. Select category: Social, Communication
3. Answer content questions:
   - Violence: No
   - Sexual Content: User-generated (possible)
   - Profanity: User-generated (possible)
   - Controlled Substance: User-generated (possible)
   - User Interaction: Yes
   - Personal Info Sharing: No
   - Location Sharing: No

Expected Rating: **Mature 17+**

### 4. App Content

#### Privacy Policy
1. Add privacy policy URL
2. Ensure it covers:
   - Data collection practices
   - Data usage
   - Data sharing
   - Data retention
   - User rights

#### App Access
- No special access needed
- No login required

#### Ads
- Declare if using AdMob
- Specify ad networks used

### 5. Data Safety

#### Data Collection
- [ ] **Data Collection**: Yes (anonymous analytics only)
- [ ] **Data Sharing**: No
- [ ] **Data Deletion**: Users can request deletion

#### Data Types
- **Location**: Not collected
- **Personal Info**: Not collected
- **Financial Info**: Not collected
- **Health & Fitness**: Not collected
- **Messages**: User-generated content (anonymized)
- **Photos/Videos**: Processed on-device, anonymized before upload
- **Audio**: Processed on-device, voice modulated
- **Files**: Not collected
- **App Activity**: Analytics only
- **Device/Other IDs**: Device ID for analytics

### 6. Production Release

#### Release Setup
1. Go to Production → Create new release
2. Upload AAB file from EAS Build
3. Add release notes

#### Release Notes Template
```
Version 1.0.0
- Initial release
- Anonymous video and text confessions
- Advanced privacy protection with face blurring
- Voice modulation for complete anonymity
- Community-driven content moderation
```

### 7. Managed Publishing

#### Review Times
- First submission: 2-3 days typically
- Updates: 2-24 hours

#### Staged Rollout
1. Start at 5-20% of users
2. Monitor crash rates and feedback
3. Increase percentage gradually
4. Full rollout when stable

---

## Post-Submission Checklist

### Monitoring
- [ ] Set up email alerts for review status
- [ ] Monitor crash reports in Firebase Crashlytics
- [ ] Check user reviews daily
- [ ] Track download numbers

### Response Templates

#### If Rejected
1. Read rejection reason carefully
2. Address specific issues mentioned
3. Resubmit with detailed response
4. Common rejection reasons:
   - Missing privacy policy
   - Inappropriate content
   - Crashes during review
   - Misleading metadata
   - Guideline 4.3 (spam/copycat)

#### Appeal Process
- iOS: Reply to rejection in Resolution Center
- Android: Use appeal form in Play Console

### Marketing Materials

#### App Store Optimization (ASO)
- Monitor keyword rankings
- A/B test screenshots
- Update description based on user feedback
- Respond to reviews

#### Press Kit
- High-res app icon
- Screenshots for all devices
- App description (short & long)
- Feature list
- Privacy-focused messaging

---

## Timeline Estimates

### iOS App Store
- Build upload: 5-10 minutes
- Processing: 30-60 minutes
- Review: 24-48 hours (can be 7+ days)
- Release: Immediate after approval

### Google Play Store
- Build upload: 10-20 minutes
- Processing: 2-4 hours
- Review: 2-3 hours (first submission: 2-3 days)
- Release: 2-4 hours after approval

---

## Important Links

### Apple
- [App Store Connect](https://appstoreconnect.apple.com)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

### Google
- [Google Play Console](https://play.google.com/console)
- [Play Store Policies](https://play.google.com/about/developer-content-policy/)
- [Material Design Guidelines](https://material.io/design)

### Expo/EAS
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Configuration](https://docs.expo.dev/submit/ios/)
- [Play Store Configuration](https://docs.expo.dev/submit/android/)

---

## Emergency Contacts

### Critical Issues
- App removed from store
- Account suspended
- Legal/compliance issues

### Support Channels
- Apple Developer Support: https://developer.apple.com/contact/
- Google Play Developer Support: https://support.google.com/googleplay/android-developer
- Expo Support: https://expo.dev/contact

---

## Notes

1. **Privacy is Critical**: Given the app's nature, be extra careful with privacy policies and data handling declarations
2. **Age Rating**: Expect and set 17+ rating due to anonymous user-generated content
3. **Content Moderation**: Have a clear plan for content moderation to address reviewer concerns
4. **Regular Updates**: Plan for regular updates to show active maintenance
5. **User Support**: Set up proper support channels before submission