# Mobile Deployment Plan - iOS & Android App Stores

**Project:** Fueille Plant Care App  
**Created:** November 11, 2025  
**Timeline:** 5-6 weeks to first release

---

## 📋 Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Phase 1: Pre-Deployment Setup (Week 1)](#phase-1-pre-deployment-setup-week-1)
3. [Phase 2: iOS Setup (Week 2)](#phase-2-ios-setup-week-2)
4. [Phase 3: Android Setup (Week 3)](#phase-3-android-setup-week-3)
5. [Phase 4: Testing & QA (Week 4)](#phase-4-testing--qa-week-4)
6. [Phase 5: Submission & Review (Week 5)](#phase-5-submission--review-week-5)
7. [Phase 6: Post-Launch (Ongoing)](#phase-6-post-launch-ongoing)
8. [Quick Reference Commands](#quick-reference-commands)
9. [Cost Breakdown](#cost-breakdown)

---

## Current State Assessment

### ✅ What We Have

- Capacitor config example (`capacitor.config.ts.example`)
- PWA foundations (service worker, manifest.json)
- Mobile-native bridge architecture
- Camera & notification integration points
- Next.js 14 with App Router
- GraphQL API with Prisma ORM

### ❌ What We Need

- Capacitor dependencies installation
- Native platform projects initialization
- App Store developer accounts
- App assets (icons, screenshots)
- Store listing content

---

## Phase 1: Pre-Deployment Setup (Week 1)

### 1.1 Install Capacitor Dependencies

```powershell
# Add Capacitor core and CLI
pnpm add @capacitor/core @capacitor/cli

# Add platform-specific packages
pnpm add @capacitor/android @capacitor/ios

# Add required plugins
pnpm add @capacitor/camera @capacitor/local-notifications @capacitor/app @capacitor/filesystem @capacitor/network

# Add splash screen and status bar
pnpm add @capacitor/splash-screen @capacitor/status-bar
```

### 1.2 Configure Capacitor

```powershell
# Initialize Capacitor
npx cap init

# Copy the example config
Copy-Item capacitor.config.ts.example capacitor.config.ts
```

**Update `capacitor.config.ts`:**

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fueille.app', // CRITICAL: Use unique reverse domain
  appName: 'Fueille',
  webDir: 'out', // Next.js static export
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#10b981', // Brand color
      showSpinner: false,
    },
    Camera: {
      android: {
        allowEditing: false,
      },
      ios: {
        allowEditing: false,
      },
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#10b981',
    },
  },
};

export default config;
```

### 1.3 Update Build Configuration

**Add to `package.json` scripts:**

```json
{
  "scripts": {
    "mobile:build": "next build && next export",
    "mobile:copy": "pnpm mobile:build && npx cap copy",
    "mobile:sync": "pnpm mobile:build && npx cap sync",
    "mobile:open:ios": "npx cap open ios",
    "mobile:open:android": "npx cap open android",
    "mobile:run:ios": "pnpm mobile:sync && npx cap run ios",
    "mobile:run:android": "pnpm mobile:sync && npx cap run android"
  }
}
```

**Update `next.config.js` for static export:**

```javascript
module.exports = {
  output: 'export', // Required for Capacitor
  images: {
    unoptimized: true, // Static export requirement
  },
  // Disable features incompatible with static export
  trailingSlash: true,
  // ... rest of existing config
};
```

### 1.4 Week 1 Checklist

- [ ] Install all Capacitor dependencies
- [ ] Configure `capacitor.config.ts`
- [ ] Update build scripts
- [ ] Test static export: `pnpm mobile:build`
- [ ] Verify output in `out/` directory

---

## Phase 2: iOS Setup (Week 2)

### 2.1 Initialize iOS Platform

```powershell
# Add iOS platform
npx cap add ios

# Sync web assets
pnpm mobile:sync

# Open Xcode
pnpm mobile:open:ios
```

### 2.2 Apple Developer Account Setup

**Required Steps:**

1. **Enroll in Apple Developer Program**
   - Cost: $99/year
   - URL: https://developer.apple.com/programs/
   - Processing time: 24-48 hours

2. **Create App ID**
   - Login to developer.apple.com
   - Certificates, IDs & Profiles → Identifiers → App IDs
   - Bundle ID: `com.fueille.app`
   - Enable capabilities: Camera, Push Notifications

3. **Configure Signing Certificates**
   - Xcode → Preferences → Accounts
   - Add Apple ID
   - Download signing certificates

4. **Set Up Provisioning Profiles**
   - Development profile (for testing)
   - Distribution profile (for App Store)

### 2.3 App Store Connect Setup

**Create New App Listing:**

1. Login to https://appstoreconnect.apple.com
2. My Apps → + → New App
3. Fill in:
   - **Platform:** iOS
   - **App Name:** Fueille
   - **Primary Language:** English
   - **Bundle ID:** com.fueille.app
   - **SKU:** FUEILLE-001

**App Metadata:**

- **Subtitle:** Your Plant Care Companion (30 chars max)
- **Primary Category:** Lifestyle
- **Secondary Category:** Productivity
- **Privacy Policy URL:** https://fueille.app/privacy (create before submission)
- **Support URL:** https://fueille.app/support
- **Marketing URL:** https://fueille.app (optional)

### 2.4 Xcode Configuration

**Open Project:**

```powershell
pnpm mobile:open:ios
```

**In Xcode:**

1. **Select App Target**
   - Open `ios/App/App.xcworkspace` (NOT .xcodeproj)
   - Select "App" in project navigator

2. **Signing & Capabilities**
   - General tab
   - Signing → Enable "Automatically manage signing"
   - Team → Select your Apple Developer team
   - Bundle Identifier → Verify `com.fueille.app`

3. **Add Capabilities**
   - Click "+ Capability"
   - Add: Camera, Push Notifications
   - Background Modes → Background fetch (for notifications)

4. **Deployment Info**
   - Deployment Target: iOS 13.0 minimum
   - Device Orientation: Portrait, Landscape (as needed)

### 2.5 iOS Info.plist Privacy Entries

**Required Privacy Descriptions** (`ios/App/App/Info.plist`):

```xml
<key>NSCameraUsageDescription</key>
<string>Fueille needs camera access to capture photos of your plants for care tracking</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Fueille needs access to your photo library to select plant images</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Fueille saves plant photos to your library for your records</string>

<key>NSUserNotificationsUsageDescription</key>
<string>Fueille sends reminders to help you care for your plants on schedule</string>
```

### 2.6 iOS App Icons & Assets

**Required Icon Sizes:**

- 1024x1024 - App Store (PNG, no alpha)
- 180x180 - iPhone 3x (@3x)
- 120x120 - iPhone 2x (@2x)
- 167x167 - iPad Pro
- 152x152 - iPad 2x
- 76x76 - iPad 1x

**Generate Icons:**

```powershell
# Use existing script (if configured)
node scripts/generate-icons.js

# Or use online tools:
# - https://www.appicon.co/
# - https://capacitorjs.com/docs/guides/splash-screens-and-icons
```

**Add to Xcode:**

- Place icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### 2.7 iOS Build & Archive

**Development Build (Testing):**

```powershell
# Build for simulator
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  build
```

**Production Archive (App Store):**

```
In Xcode:
1. Product → Scheme → Edit Scheme → Run → Release
2. Product → Archive
3. Wait for archive to complete
4. Window → Organizer → Archives
5. Select archive → Distribute App
6. App Store Connect → Next
7. Upload → Next
8. Automatically manage signing → Next
9. Upload
```

### 2.8 TestFlight Setup

**After Upload:**

1. **App Store Connect** → TestFlight tab
2. **Missing Compliance** → Provide Export Compliance (usually "No" for non-encryption)
3. **Internal Testing:**
   - Add internal testers (up to 100)
   - Automatically available after processing (~5 min)
4. **External Testing:**
   - Create test group
   - Add external testers (up to 10,000)
   - Requires Beta App Review (1-2 days)

### 2.9 iOS Screenshots

**Required Sizes:**

- 6.7" (iPhone 14 Pro Max): 1290 x 2796
- 6.5" (iPhone 11 Pro Max): 1242 x 2688
- 5.5" (iPhone 8 Plus): 1242 x 2208

**Minimum:** 2 screenshots per size, up to 10 total

**Tools:**

- Xcode Simulator → Screenshot (Cmd+S)
- https://www.screensizes.app/
- https://appscreens.io/

### 2.10 Week 2 Checklist

- [ ] Apple Developer account enrolled
- [ ] App ID created with capabilities
- [ ] Xcode project configured with signing
- [ ] Info.plist privacy descriptions added
- [ ] App icons generated and added
- [ ] Test build runs on simulator
- [ ] Archive created successfully
- [ ] App uploaded to TestFlight
- [ ] Internal testers invited

---

## Phase 3: Android Setup (Week 3)

### 3.1 Initialize Android Platform

```powershell
# Add Android platform
npx cap add android

# Sync web assets
pnpm mobile:sync

# Open Android Studio
pnpm mobile:open:android
```

### 3.2 Google Play Console Setup

**Create Developer Account:**

1. **Enroll:**
   - URL: https://play.google.com/console/signup
   - Cost: $25 (one-time fee)
   - Processing: Immediate to 48 hours

2. **Create App:**
   - All Apps → Create App
   - App Name: Fueille
   - Default Language: English
   - App or Game: App
   - Free or Paid: Free
   - Accept declarations

3. **Set Up App:**
   - Dashboard → Set up your app
   - Complete all required sections

### 3.3 Android Studio Configuration

**Open Project:**

```powershell
pnpm mobile:open:android
```

**Project Structure:**

```
File → Project Structure
- Project SDK: Android API 34
- Gradle Version: 8.0+
- Android Gradle Plugin: 8.1.0+
```

**Update `android/app/build.gradle`:**

```gradle
android {
    namespace "com.fueille.app"
    compileSdk 34

    defaultConfig {
        applicationId "com.fueille.app"
        minSdk 24  // Covers 94% of devices
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}
```

### 3.4 Android Permissions

**Update `android/app/src/main/AndroidManifest.xml`:**

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Required Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <!-- Optional Features -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <application
        android:name=".MainApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>
```

### 3.5 Generate Signing Key

**Create Release Keystore:**

```powershell
# Generate key (valid for 10,000 days)
keytool -genkey -v -keystore fueille-release.keystore `
  -alias fueille `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000

# You'll be prompted for:
# - Keystore password (SAVE THIS!)
# - Key password (SAVE THIS!)
# - Your name, organization, location
```

**Move Keystore:**

```powershell
# Move to android/app directory
Move-Item fueille-release.keystore android\app\
```

**Create `android/key.properties`:**

```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=fueille
storeFile=fueille-release.keystore
```

**Update `android/app/build.gradle`:**

```gradle
// Add before android block
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config

    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Update `.gitignore`:**

```gitignore
# Signing files (NEVER commit these)
android/key.properties
android/app/*.keystore
android/app/*.jks
```

### 3.6 Android App Icons & Assets

**Required Assets:**

1. **App Icon:**
   - 512x512 PNG (32-bit with alpha)
   - Upload to Play Console

2. **Feature Graphic:**
   - 1024x500 PNG or JPEG
   - Required for Play Store listing

3. **Screenshots:**
   - Minimum 2 screenshots
   - Recommended: 4-8 screenshots
   - Phone: 16:9 or 9:16 ratio, min 320px
   - 7" Tablet: Optional
   - 10" Tablet: Optional

**Generate Icons:**

```powershell
# Use Android Asset Studio
# https://romannurik.github.io/AndroidAssetStudio/

# Or use existing script
node scripts/generate-icons.js
```

**Place icons in:**

- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- `android/app/src/main/res/mipmap-*/ic_launcher_round.png`

### 3.7 Build Android Release

**Generate AAB (App Bundle - for Play Store):**

```powershell
cd android
.\gradlew bundleRelease
```

**Output location:**

```
android/app/build/outputs/bundle/release/app-release.aab
```

**Generate APK (for testing):**

```powershell
cd android
.\gradlew assembleRelease
```

**Output location:**

```
android/app/build/outputs/apk/release/app-release.apk
```

### 3.8 Google Play Console Store Listing

**Complete Required Sections:**

1. **App Details**
   - App name: Fueille
   - Short description: (80 characters max)
     > "Track plant care tasks, capture photos, and get watering reminders for healthy plants"
   - Full description: (4000 characters max)
     > See section 3.9 for full description template

2. **Categorization**
   - App category: Lifestyle
   - Tags: Plants, Gardening, Home, Productivity

3. **Store Listing Contact Details**
   - Email: support@fueille.app
   - Phone: Optional
   - Website: https://fueille.app

4. **Graphics**
   - Upload app icon (512x512)
   - Upload feature graphic (1024x500)
   - Upload screenshots (2 minimum)

### 3.9 Store Description Template

**Full Description:**

```markdown
🌱 Fueille - Your Personal Plant Care Assistant

Never forget to water your plants again! Fueille helps you keep track of all your plant care tasks with smart reminders and beautiful photo journals.

✨ KEY FEATURES

📸 Photo Journal
• Capture and organize photos of your plants
• Track growth progress over time
• Add notes and observations

⏰ Smart Reminders
• Set watering schedules for each plant
• Get notifications when care tasks are due
• Customize reminder frequency

🌿 Plant Profiles
• Create detailed profiles for each plant
• Track watering, fertilizing, and repotting
• Record plant-specific care requirements

📱 Works Offline
• Access your plant data anytime
• Syncs automatically when online
• No internet required for core features

🎨 Beautiful & Simple
• Clean, intuitive interface
• Easy to navigate
• Designed for plant lovers

Whether you're a seasoned gardener or just starting your plant collection, Fueille makes plant care simple and enjoyable.

Download now and watch your plants thrive! 🌺
```

### 3.10 Content Rating

**Complete Questionnaire:**

1. Go to Play Console → Content Rating
2. Start Questionnaire
3. For Fueille, typical answers:
   - Violence: No
   - Sexuality: No
   - Language: No
   - Controlled Substances: No
   - Gambling: No
   - User Interaction: No (unless you add social features)
   - Personal Info: Yes (if collecting email, etc.)
   - Location: No (unless using GPS)

4. Submit for rating

**Expected Rating:** Everyone (suitable for all ages)

### 3.11 Data Safety Section

**Required by Google Play (NEW):**

Complete the data safety questionnaire:

1. **Data Collection**
   - Photos: Stored locally, not shared
   - Plant data: Stored locally, not shared
   - Analytics: (If using TelemetryService) Mention it

2. **Data Usage**
   - Purpose: App functionality
   - Optional or Required: Required for core features

3. **Data Sharing**
   - No data shared with third parties (unless using analytics services)

4. **Security Practices**
   - Data encrypted in transit: Yes (HTTPS)
   - Data encrypted at rest: Yes (device encryption)
   - User can request deletion: Yes

### 3.12 Week 3 Checklist

- [ ] Google Play Console account created
- [ ] Android Studio project configured
- [ ] Signing key generated and secured
- [ ] Permissions added to AndroidManifest.xml
- [ ] App icons generated and added
- [ ] Release AAB built successfully
- [ ] Store listing content prepared
- [ ] Content rating completed
- [ ] Data safety section completed
- [ ] Test APK installed on physical device

---

## Phase 4: Testing & QA (Week 4)

### 4.1 iOS TestFlight Testing

**Setup Internal Testing:**

1. App Store Connect → TestFlight
2. Internal Testing → Add testers
3. Testers automatically get access after build processing

**Setup External Testing:**

1. Create test group
2. Add external beta testers (up to 10,000)
3. Submit for Beta App Review (1-2 days)

**Testing Checklist:**

- [ ] App launches successfully
- [ ] Camera capture works
- [ ] Photo gallery integration works
- [ ] Notifications schedule correctly
- [ ] Offline mode functions
- [ ] Data persists after app restart
- [ ] No crashes on key flows
- [ ] UI displays correctly on different iPhone sizes
- [ ] Landscape mode works (if supported)
- [ ] Deep links work (if implemented)

**Device Coverage:**

Test on minimum:

- iPhone SE (small screen)
- iPhone 14 (standard)
- iPhone 14 Pro Max (large)
- iPad (if supporting tablets)

### 4.2 Android Internal Testing Track

**Setup Internal Testing:**

1. Google Play Console → Release → Testing → Internal testing
2. Create release
3. Upload AAB
4. Add release notes
5. Save and review
6. Start rollout to Internal testing

**Add Testers:**

1. Internal testing → Testers tab
2. Create email list
3. Add tester emails
4. Save

**Share Testing Link:**

Testers receive email with opt-in link or share directly:

```
https://play.google.com/apps/internaltest/XXXXXXXXXX
```

**Testing Checklist:**

- [ ] App installs from Play Store
- [ ] All permissions requested properly
- [ ] Camera functionality works
- [ ] Photo storage works
- [ ] Notifications appear correctly
- [ ] Offline functionality works
- [ ] No ANRs (Application Not Responding)
- [ ] No crashes
- [ ] UI renders on different screen sizes
- [ ] Different Android versions work (test 24-34)

**Device Coverage:**

Test on minimum:

- Samsung Galaxy (popular)
- Google Pixel (stock Android)
- OnePlus or Xiaomi (custom Android)
- Tablet (if supporting)
- Low-end device (Android 7-8)
- High-end device (Android 14)

### 4.3 Cross-Platform Testing

**Feature Parity Check:**

| Feature         | iOS | Android | Notes                    |
| --------------- | --- | ------- | ------------------------ |
| Photo capture   | ✓   | ✓       | Test camera permissions  |
| Photo gallery   | ✓   | ✓       | Test storage permissions |
| Notifications   | ✓   | ✓       | Test scheduling          |
| Offline mode    | ✓   | ✓       | Test Dexie database      |
| GraphQL sync    | ✓   | ✓       | Test network handling    |
| Plant CRUD      | ✓   | ✓       | Test all operations      |
| Task management | ✓   | ✓       | Test scheduling          |
| Theme toggle    | ✓   | ✓       | Test dark mode           |

**Performance Testing:**

```powershell
# Run Lighthouse CI for PWA baseline
pnpm test:perf

# Check metrics:
# - First Contentful Paint < 2s
# - Largest Contentful Paint < 2.5s
# - Time to Interactive < 3.5s
# - Cumulative Layout Shift < 0.1
```

### 4.4 User Acceptance Testing (UAT)

**Recruit Beta Testers:**

- Internal team: 5-10 people
- Friends/family: 10-20 people
- Public beta: 50-100 people (optional)

**Feedback Collection:**

Create feedback form (Google Forms/Typeform):

- Device type and OS version
- What worked well?
- What issues did you encounter?
- Feature requests
- Overall rating (1-5 stars)

**Common Issues to Watch:**

- Permission denial flows
- Network error handling
- Photo upload failures
- Notification not appearing
- App crashes on specific devices
- UI layout issues
- Performance on older devices

### 4.5 Automated Testing

**Add Mobile-Specific E2E Tests:**

Create `tests/e2e/mobile.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Mobile App', () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE
  });

  test('should load on mobile viewport', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Fueille/i })).toBeVisible();
  });

  test('should handle offline mode', async ({ page, context }) => {
    await page.goto('/');
    await context.setOffline(true);
    await expect(page.getByText(/offline/i)).toBeVisible();
  });

  test('should capture plant photo', async ({ page }) => {
    await page.goto('/plants/new');
    await page.getByRole('button', { name: /take photo/i }).click();
    // Mock camera permission
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
```

**Run tests:**

```powershell
pnpm test:e2e
```

### 4.6 Pre-Launch Checklist

**iOS:**

- [ ] TestFlight builds tested by 10+ users
- [ ] No critical bugs reported
- [ ] Screenshots finalized
- [ ] App description proofread
- [ ] Privacy policy published
- [ ] Support page published
- [ ] Age rating completed
- [ ] Export compliance answered

**Android:**

- [ ] Internal testing completed
- [ ] No crashes in Android Vitals
- [ ] All Play Console sections green
- [ ] Store listing finalized
- [ ] Content rating received
- [ ] Data safety section submitted
- [ ] Target audience set
- [ ] Pricing set (free)

### 4.7 Week 4 Checklist

- [ ] TestFlight testing completed (iOS)
- [ ] Internal testing completed (Android)
- [ ] Cross-platform feature parity verified
- [ ] Performance benchmarks met
- [ ] UAT feedback collected and addressed
- [ ] Critical bugs fixed
- [ ] E2E tests passing
- [ ] Store listings reviewed and approved by team

---

## Phase 5: Submission & Review (Week 5)

### 5.1 iOS App Store Submission

**Pre-Submission Final Check:**

- [ ] All app metadata complete
- [ ] Keywords optimized (100 char limit)
- [ ] Screenshots uploaded (all required sizes)
- [ ] App preview video (optional but recommended)
- [ ] Privacy policy URL active
- [ ] Support URL active
- [ ] Age rating completed
- [ ] Pricing set (free or paid)
- [ ] Availability set (all territories or specific)
- [ ] Test account credentials provided (if app requires login)

**Submit for Review:**

1. App Store Connect → My Apps → Fueille
2. iOS App → Version → 1.0
3. Build → Select TestFlight build
4. App Review Information:
   - Contact email
   - Contact phone
   - Demo account (if needed)
   - Notes for reviewer (explain key features)
5. Version Release: Manual or Automatic
6. Submit for Review

**App Review Notes Template:**

```
Thank you for reviewing Fueille!

KEY FEATURES TO TEST:
1. Create a new plant profile
2. Take or upload a plant photo
3. Set a watering reminder
4. Check notification after 5 minutes (we've set a test task)

DEMO ACCOUNT:
Email: demo@fueille.app
Password: TestDemo123

NOTES:
- App works fully offline after initial load
- Camera permission required for photo capture
- Notification permission optional but recommended
- All data stored locally, no cloud sync in v1.0

Please test on the main flow: Add Plant → Take Photo → Set Reminder
```

**Common Rejection Reasons & Solutions:**

| Rejection Reason              | Solution                                     |
| ----------------------------- | -------------------------------------------- |
| Missing privacy description   | Add all NSUsageDescription keys              |
| Broken features               | Test thoroughly on device before submission  |
| Inaccurate metadata           | Ensure description matches actual features   |
| Placeholder content           | Remove all Lorem Ipsum, test data            |
| Missing functionality         | Implement all advertised features            |
| Crashes                       | Fix all crash reports from TestFlight        |
| App doesn't do enough         | Add more features or better explain value    |
| Requires login without reason | Make app usable without login or explain why |

**Review Timeline:**

- **Average:** 24-48 hours
- **Complex apps:** 3-5 days
- **Rejection + resubmission:** Add 1-2 days

**After Approval:**

1. Choose release timing (immediate or scheduled)
2. Monitor crash reports (Xcode Organizer)
3. Watch for customer reviews
4. Respond to feedback

### 5.2 Android Play Store Submission

**Pre-Submission Final Check:**

- [ ] Production track configured
- [ ] Release notes written (500 chars, multiple languages optional)
- [ ] AAB uploaded and processed
- [ ] Version code incremented if resubmitting
- [ ] Store listing complete
- [ ] Pricing set (free or paid)
- [ ] Countries selected (all or specific)
- [ ] Content rating received
- [ ] Target audience confirmed (13+, everyone, etc.)
- [ ] Data safety form submitted

**Submit for Production:**

1. Google Play Console → Releases → Production
2. Create new release
3. Upload AAB (or select from library)
4. Release name: "1.0.0 - Initial Release"
5. Release notes (per language):

```
Welcome to Fueille! 🌱

What's new in v1.0.0:
• Create plant profiles with photos
• Set watering and care reminders
• Track plant growth over time
• Works offline - access anytime
• Beautiful, simple interface

Start your plant care journey today!
```

6. Review release → Start rollout to Production

**Rollout Options:**

- **Full rollout:** Release to 100% immediately
- **Staged rollout:** Release to 20%, then 50%, then 100% (recommended)
  - Helps catch device-specific issues
  - Can halt if critical bugs appear

**Pre-Launch Report:**

Google automatically tests on real devices:

1. Wait for report (appears after submission)
2. Review test results
3. Fix any critical issues before going live

**Review Timeline:**

- **Average:** 2-3 days
- **Fast track:** Sometimes within hours
- **Longer reviews:** Up to 7 days (rare)
- **Policy violations:** Rejection with explanation

**Common Rejection Reasons & Solutions:**

| Rejection Reason          | Solution                                      |
| ------------------------- | --------------------------------------------- |
| Content rating incomplete | Complete content rating questionnaire         |
| Broken app                | Test thoroughly on multiple devices           |
| Misleading description    | Ensure store listing accurately describes app |
| Privacy policy missing    | Add privacy policy if collecting any data     |
| Permissions not explained | Explain why permissions are needed            |
| Data safety incomplete    | Fill out all data safety sections             |
| Target audience incorrect | Set appropriate age range                     |
| Metadata policy violation | Review content policies                       |

**After Approval:**

1. App goes live within 1-2 hours
2. Check app is visible in Play Store
3. Monitor Android Vitals dashboard
4. Watch for user reviews
5. Respond to feedback within 24-48 hours

### 5.3 Post-Submission Monitoring

**First 24 Hours:**

- [ ] Verify app appears in both stores
- [ ] Test download and installation
- [ ] Check analytics start tracking
- [ ] Monitor crash reports
- [ ] Watch for initial reviews
- [ ] Share launch announcement

**First Week:**

- [ ] Daily crash report review
- [ ] Respond to user reviews
- [ ] Monitor analytics:
  - Downloads
  - Active users
  - Session duration
  - Retention rate
- [ ] Collect feedback for next update
- [ ] Fix critical bugs immediately

**Key Metrics to Track:**

| Metric            | Tool               | Target (Week 1) |
| ----------------- | ------------------ | --------------- |
| Downloads         | App/Play Console   | 100-500         |
| Crash-free rate   | Firebase/Analytics | >99%            |
| Ratings           | Store reviews      | >4.0 stars      |
| Retention (Day 1) | Analytics          | >40%            |
| Retention (Day 7) | Analytics          | >20%            |
| Session duration  | Analytics          | >3 minutes      |

### 5.4 Week 5 Checklist

- [ ] iOS submission completed
- [ ] Android submission completed
- [ ] Both apps approved and live
- [ ] Download links verified
- [ ] Crash monitoring active
- [ ] Analytics tracking working
- [ ] User review monitoring set up
- [ ] Support channels ready
- [ ] Launch announcement prepared

---

## Phase 6: Post-Launch (Ongoing)

### 6.1 Monitoring & Analytics

**iOS Monitoring (App Store Connect):**

- **App Analytics:**
  - App Units: Downloads
  - Impressions: Store page views
  - Product Page Views: Detail page views
  - Conversion rate: Views → Downloads
  - Retention: D1, D7, D30

- **Crash Reports (Xcode):**
  - Window → Organizer → Crashes
  - Review symbolicated crash logs
  - Prioritize by occurrence rate

- **Customer Reviews:**
  - Monitor daily
  - Respond to feedback
  - Track rating trends

**Android Monitoring (Play Console):**

- **Dashboard Metrics:**
  - Installs: New user downloads
  - Uninstalls: Churn rate
  - Crashes: Crash rate percentage
  - ANRs: App Not Responding rate
  - Ratings: Average star rating

- **Android Vitals:**
  - Crash rate: Must be <1.09%
  - ANR rate: Must be <0.47%
  - Wake locks: Monitor battery usage
  - Permissions: Denial rate

- **User Reviews:**
  - Reply to reviews (helps rating)
  - Track common issues
  - Feature requests

**Third-Party Analytics (Optional):**

Consider adding:

- Firebase Analytics (both platforms)
- Mixpanel (user behavior)
- Sentry (error tracking)
- Amplitude (product analytics)

### 6.2 Update Strategy

**Version Numbering:**

Follow semantic versioning:

- **Major (1.0.0 → 2.0.0):** Breaking changes, major features
- **Minor (1.0.0 → 1.1.0):** New features, non-breaking
- **Patch (1.0.0 → 1.0.1):** Bug fixes, minor tweaks

**iOS Version Updates:**

```
1. Increment version in Xcode:
   - Target → General → Version (1.0.1)
   - Build number (1 → 2, or unique per build)

2. Build and archive new version
3. Upload to TestFlight
4. Test with beta testers
5. Submit to App Store
```

**Android Version Updates:**

```gradle
// android/app/build.gradle
defaultConfig {
    versionCode 2  // Increment for each release (integer)
    versionName "1.0.1"  // User-facing version
}
```

```powershell
# Build new version
cd android
.\gradlew bundleRelease

# Upload to Play Console
# Production → New Release → Upload AAB
```

**Update Cadence:**

- **Critical bugs:** Within 24-48 hours
- **Minor bugs:** 1-2 weeks
- **New features:** 2-4 weeks
- **Major updates:** 2-3 months

**Release Notes Best Practices:**

```
✓ GOOD:
"Bug fixes and performance improvements:
• Fixed crash when taking photos on Android 13
• Improved notification reliability
• Faster plant list loading"

✗ BAD:
"Bug fixes and improvements"
```

### 6.3 User Support

**Support Channels:**

1. **In-App Support:**
   - Contact form
   - FAQ section
   - Tutorial/onboarding

2. **Email Support:**
   - support@fueille.app
   - Response time: <24 hours
   - Template responses for common issues

3. **Social Media:**
   - Twitter/X for updates
   - Instagram for community
   - Reddit for detailed discussions

4. **Documentation:**
   - Help center (help.fueille.app)
   - Video tutorials (YouTube)
   - Blog posts (blog.fueille.app)

**Common Support Issues:**

| Issue                     | Solution                  | Priority |
| ------------------------- | ------------------------- | -------- |
| Notifications not working | Check permissions guide   | High     |
| Photos not saving         | Storage permission        | High     |
| App crashes               | Collect logs, push update | Critical |
| Feature request           | Add to roadmap            | Medium   |
| Can't find feature        | Improve onboarding        | Medium   |
| Login issues              | Reset password flow       | High     |

### 6.4 App Store Optimization (ASO)

**iOS ASO Tactics:**

1. **Keywords (100 chars):**
   - Current: plant,care,garden,water,reminder,tracker,green
   - Research with: App Store Connect Search Ads
   - Update every 2-3 months

2. **Title (30 chars):**
   - "Fueille: Plant Care & Tracker"
   - Include main keyword

3. **Subtitle (30 chars):**
   - "Watering Reminders & Photos"
   - Include secondary keywords

4. **Screenshots:**
   - A/B test different layouts
   - Highlight key features
   - Include text overlays

**Android ASO Tactics:**

1. **Short Description (80 chars):**
   - Pack with keywords
   - Clear value proposition
   - Update based on search trends

2. **Full Description (4000 chars):**
   - First 2 lines crucial (visible without "more")
   - Use bullet points
   - Include all keywords naturally

3. **Feature Graphic:**
   - Eye-catching design
   - Shows app in action
   - Update seasonally

**A/B Testing:**

Both stores support testing:

- **iOS:** Custom Product Pages (up to 35)
- **Android:** Store Listing Experiments

Test variations:

- App icon colors/style
- Screenshot order
- Feature messaging
- Call-to-action text

### 6.5 Marketing & Growth

**Launch Campaign:**

Week 1:

- [ ] Social media announcement
- [ ] Email to existing users (if any)
- [ ] Product Hunt launch
- [ ] Reddit communities (r/houseplants, r/plantclinic)
- [ ] Facebook groups
- [ ] Press release to tech blogs

Ongoing:

- [ ] App Store feature request (pitch to editors)
- [ ] Influencer partnerships (plant bloggers)
- [ ] Content marketing (SEO blog posts)
- [ ] Paid ads (start small, $50-100/month)
- [ ] Referral program (invite friends)

**Acquisition Channels:**

| Channel           | Cost        | Effort | ROI        |
| ----------------- | ----------- | ------ | ---------- |
| Organic (ASO)     | Free        | Medium | High       |
| Social media      | Free-Low    | High   | Medium     |
| Content marketing | Low         | High   | High       |
| App Store ads     | Medium      | Low    | Medium     |
| Google Ads        | Medium      | Low    | Low-Medium |
| Influencers       | Medium-High | Medium | Variable   |
| PR outreach       | Free-Medium | High   | High       |

**Growth Metrics:**

Track weekly:

- Downloads (iOS + Android)
- DAU (Daily Active Users)
- MAU (Monthly Active Users)
- Retention (D1, D7, D30)
- Referral rate
- Cost per install (if running ads)

### 6.6 Continuous Improvement

**Feedback Loop:**

```
User Feedback → Prioritization → Development → Testing → Release → Monitor
        ↑                                                            ↓
        └────────────────────────────────────────────────────────────┘
```

**Prioritization Framework:**

Use RICE scoring:

- **R**each: How many users affected?
- **I**mpact: How much improvement?
- **C**onfidence: How sure are we?
- **E**ffort: How much work?

Score = (R × I × C) / E

**Feature Roadmap (Example):**

**Q1 2026:**

- Cloud sync across devices
- Plant species database
- Care tips integration
- Dark mode improvements

**Q2 2026:**

- Social features (share plants)
- Plant health diagnosis (AI)
- Widget for home screen
- Apple Watch app

**Q3 2026:**

- Premium features (analytics, unlimited plants)
- Integration with smart devices
- Community marketplace
- Seasonal care guides

### 6.7 Ongoing Checklist

**Daily:**

- [ ] Check crash reports
- [ ] Monitor critical errors
- [ ] Respond to user reviews

**Weekly:**

- [ ] Review analytics dashboard
- [ ] Analyze user behavior
- [ ] Plan content for social media
- [ ] Triage bug reports

**Monthly:**

- [ ] Review and update keywords/ASO
- [ ] Analyze retention cohorts
- [ ] Plan next update features
- [ ] Review competitor apps

**Quarterly:**

- [ ] Major feature releases
- [ ] Update screenshots/store listing
- [ ] Review pricing strategy
- [ ] User survey for feedback

---

## Quick Reference Commands

### Development

```powershell
# Web development
pnpm dev                    # Start Next.js dev server
pnpm build                  # Production build
pnpm test:all               # Run all tests

# Mobile development
pnpm mobile:build           # Build Next.js static export
pnpm mobile:sync            # Sync web to native projects
pnpm mobile:run:ios         # Run iOS simulator
pnpm mobile:run:android     # Run Android emulator
pnpm mobile:open:ios        # Open Xcode
pnpm mobile:open:android    # Open Android Studio
```

### iOS Commands

```powershell
# Capacitor
npx cap add ios             # Initialize iOS platform
npx cap copy ios            # Copy web assets
npx cap sync ios            # Full sync (copy + update)
npx cap open ios            # Open Xcode

# Xcode (command line)
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release archive

# TestFlight upload via Xcode
# Product → Archive → Distribute App → App Store Connect
```

### Android Commands

```powershell
# Capacitor
npx cap add android         # Initialize Android platform
npx cap copy android        # Copy web assets
npx cap sync android        # Full sync (copy + update)
npx cap open android        # Open Android Studio

# Gradle
cd android
.\gradlew assembleDebug     # Debug APK
.\gradlew assembleRelease   # Release APK
.\gradlew bundleRelease     # Release AAB (Play Store)
.\gradlew clean             # Clean build files
```

### Testing

```powershell
# Unit tests
pnpm test:unit              # Run Jest tests
pnpm test:unit:watch        # Watch mode
pnpm test:unit:coverage     # Coverage report

# E2E tests
pnpm test:e2e               # Run Playwright tests
pnpm test:e2e:headed        # Run with browser visible
pnpm test:e2e:ui            # Interactive UI mode

# Performance
pnpm test:perf              # Lighthouse CI
```

### Version Management

```powershell
# iOS (in Xcode)
# Target → General → Version → increment

# Android (in build.gradle)
# versionCode += 1
# versionName = "1.0.1"

# Capacitor config
# Update version in package.json (syncs automatically)
```

---

## Cost Breakdown

### Development Costs

| Item                         | Cost      | Frequency | Notes                           |
| ---------------------------- | --------- | --------- | ------------------------------- |
| **Apple Developer Program**  | $99       | Annual    | Required for iOS App Store      |
| **Google Play Console**      | $25       | One-time  | Required for Android Play Store |
| **App Icon Design**          | $50-500   | One-time  | Fiverr/99designs or DIY         |
| **Screenshots/Graphics**     | $100-1000 | One-time  | Professional designer optional  |
| **Privacy Policy Generator** | $0-50     | One-time  | Use Termly.io (free tier)       |
| **Domain Name**              | $10-15    | Annual    | fueille.app                     |
| **SSL Certificate**          | $0        | Free      | Let's Encrypt                   |
| **Testing Devices**          | $0-1000   | One-time  | Borrow or use emulators         |

**Year 1 Total:** $284-2,689

### Ongoing Operational Costs

| Item                           | Monthly Cost | Annual Cost | Notes                          |
| ------------------------------ | ------------ | ----------- | ------------------------------ |
| **Hosting (Vercel)**           | $0-20        | $0-240      | Hobby tier free, Pro $20/mo    |
| **Database (Supabase/Vercel)** | $0-25        | $0-300      | Free tier generous             |
| **Analytics (Firebase)**       | $0           | $0          | Free tier sufficient initially |
| **Error Tracking (Sentry)**    | $0-26        | $0-312      | Free tier available            |
| **Email (SendGrid)**           | $0-15        | $0-180      | For support emails             |
| **Customer Support Tool**      | $0-29        | $0-348      | Intercom/Zendesk (optional)    |

**Year 1 Operational:** $0-1,380

### Marketing Costs (Optional)

| Item                        | Cost         | Notes                        |
| --------------------------- | ------------ | ---------------------------- |
| **Apple Search Ads**        | $100-500/mo  | CPI typically $1-3           |
| **Google Ads**              | $100-500/mo  | Higher competition           |
| **Social Media Ads**        | $50-200/mo   | Facebook/Instagram           |
| **Influencer Partnerships** | $50-500/post | Micro-influencers affordable |
| **PR Services**             | $500-2000/mo | Optional, expensive          |

**Annual Marketing (if pursued):** $1,200-10,000+

### Total Cost Summary

**Minimum Launch (DIY everything):**

- Year 1: ~$300 (just developer accounts + domain)

**Recommended Launch (professional assets):**

- Year 1: ~$1,000 (includes design, modest marketing)

**Full Launch (with marketing):**

- Year 1: ~$5,000-10,000 (includes ads, professional services)

---

## Success Metrics

### Launch Targets (First 30 Days)

| Metric              | Conservative | Moderate | Aggressive |
| ------------------- | ------------ | -------- | ---------- |
| **Downloads**       | 500          | 2,000    | 10,000     |
| **DAU**             | 50           | 200      | 1,000      |
| **Retention (D7)**  | 20%          | 30%      | 40%        |
| **Rating**          | 4.0 ⭐       | 4.3 ⭐   | 4.5 ⭐     |
| **Reviews**         | 10           | 50       | 200        |
| **Crash-free rate** | 98%          | 99%      | 99.5%      |

### 6-Month Milestones

| Month   | Downloads Goal | MAU Goal | Key Focus               |
| ------- | -------------- | -------- | ----------------------- |
| Month 1 | 1,000          | 500      | Launch, bug fixes       |
| Month 2 | 2,500          | 1,500    | Stability, first update |
| Month 3 | 5,000          | 3,000    | Feature additions       |
| Month 4 | 8,000          | 5,000    | Marketing push          |
| Month 5 | 12,000         | 7,500    | Viral features          |
| Month 6 | 20,000         | 12,000   | Scaling infrastructure  |

### Long-Term Goals (12 Months)

- **50,000+ downloads** across both platforms
- **4.5+ star rating** on both stores
- **30%+ D7 retention** rate
- **15%+ D30 retention** rate
- **<1% crash rate** consistently
- **1,000+ reviews** combined
- **Top 100 in category** (Lifestyle/Home)

---

## Troubleshooting

### iOS Common Issues

**Problem:** "No such module '@capacitor/core'"

```powershell
# Solution: Install dependencies
pnpm install
npx cap sync ios
```

**Problem:** Signing failed in Xcode

```
Solution:
1. Xcode → Preferences → Accounts → Add Apple ID
2. Target → Signing & Capabilities → Select Team
3. Enable "Automatically manage signing"
```

**Problem:** App Store rejection - "Missing purpose string"

```
Solution: Add all required NSUsageDescription keys to Info.plist:
- NSCameraUsageDescription
- NSPhotoLibraryUsageDescription
- NSPhotoLibraryAddUsageDescription
```

**Problem:** TestFlight build not appearing

```
Solution: Wait for processing (5-30 minutes). Check:
1. Build processing status in App Store Connect
2. Export compliance answered
3. No missing entitlements
```

### Android Common Issues

**Problem:** "Could not resolve @capacitor/android"

```powershell
# Solution: Sync Capacitor
npx cap sync android
```

**Problem:** Gradle build fails

```powershell
# Solution: Clean and rebuild
cd android
.\gradlew clean
.\gradlew assembleDebug
```

**Problem:** App not signed for release

```
Solution: Verify android/key.properties exists and build.gradle references it correctly
```

**Problem:** Play Console rejection - "Missing content rating"

```
Solution:
1. Play Console → Content rating
2. Complete questionnaire
3. Submit for rating
4. Wait for rating certificate
5. Resubmit app
```

### Cross-Platform Issues

**Problem:** Camera not working

```
Solution:
1. Check permissions in AndroidManifest.xml / Info.plist
2. Request runtime permissions in code
3. Test on physical device (simulator limitations)
```

**Problem:** Notifications not appearing

```
Solution:
1. Check notification permissions granted
2. Verify plugin configuration in capacitor.config.ts
3. Test on physical device (emulator limitations)
4. Check OS notification settings
```

**Problem:** App crashes on older devices

```
Solution:
1. Check crash logs in Xcode Organizer / Play Console
2. Test on minimum supported OS versions
3. Add error boundaries in React code
4. Handle missing features gracefully
```

---

## Resources

### Official Documentation

- **Capacitor:** https://capacitorjs.com/docs
- **Apple Developer:** https://developer.apple.com/
- **Google Play Console:** https://support.google.com/googleplay/android-developer
- **Next.js:** https://nextjs.org/docs
- **App Store Connect:** https://developer.apple.com/app-store-connect/

### Tools & Services

- **App Icon Generator:** https://www.appicon.co/
- **Screenshot Generator:** https://www.screensizes.app/
- **Privacy Policy Generator:** https://www.termly.io/
- **ASO Tools:** https://www.appannie.com/, https://sensortower.com/
- **Analytics:** https://firebase.google.com/, https://mixpanel.com/

### Communities

- **Capacitor Discord:** https://discord.gg/capacitor
- **iOS Dev Reddit:** r/iOSProgramming
- **Android Dev Reddit:** r/androiddev
- **Indie Hackers:** https://www.indiehackers.com/
- **Product Hunt:** https://www.producthunt.com/

### Learning Resources

- **WWDC Videos:** https://developer.apple.com/videos/
- **Google I/O:** https://events.google.com/io/
- **Ray Wenderlich:** https://www.raywenderlich.com/
- **Udemy Courses:** App Store & Play Store submission guides

---

## Appendices

### A. Store Listing Examples

**Competitor Analysis:**

Study these successful plant care apps:

- **Planta** - Excellent onboarding screenshots
- **PictureThis** - Strong app icon, clear value prop
- **Flora** - Beautiful feature graphics
- **Vera** - Effective use of keywords

### B. Review Response Templates

**Positive Review:**

```
Thank you so much for your 5-star review! 🌱 We're thrilled Fueille is helping you care for your plants. If you have any feature suggestions, we'd love to hear them at support@fueille.app. Happy growing!
```

**Negative Review (Bug):**

```
We're sorry you experienced this issue! We take bugs seriously and would love to help. Could you email us at support@fueille.app with your device details? We're working on a fix for the next update. Thank you for your patience!
```

**Feature Request:**

```
Great suggestion! We've added this to our roadmap and will consider it for a future update. Follow us on [social media] for update announcements. Thank you for helping us improve Fueille! 🌿
```

### C. Beta Tester Invitation Template

```
Subject: Help test Fueille - Plant Care App 🌱

Hi [Name],

You're invited to beta test Fueille, a new plant care app that helps you never forget to water your plants again!

As a beta tester, you'll:
• Get early access to new features
• Help shape the app's development
• Contribute to the plant care community

iOS: [TestFlight Link]
Android: [Play Store Internal Testing Link]

What we need from you:
1. Test the app for 15-30 minutes
2. Try adding a plant, taking a photo, and setting a reminder
3. Fill out this quick feedback form: [Google Form Link]

Testing period: 1 week
Estimated time: 30 minutes

Thank you for helping us make Fueille amazing!

Best,
The Fueille Team
```

---

**Document Version:** 1.0  
**Last Updated:** November 11, 2025  
**Next Review:** Week 2 of deployment (update with actual progress)

---

## Change Log

| Date         | Version | Changes                         | Author           |
| ------------ | ------- | ------------------------------- | ---------------- |
| Nov 11, 2025 | 1.0     | Initial deployment plan created | Development Team |

---

**Questions or Issues?**
Contact: support@fueille.app  
Repository: https://github.com/Maxwell-Software-Solutions/Fueille
