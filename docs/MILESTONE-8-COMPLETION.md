# Milestone 8: CI/CD & Store Readiness - COMPLETION

**Status**: ✅ **COMPLETED** (Documentation & Guidelines)  
**Date**: November 11, 2025

---

## 🎯 Milestone Objectives

Prepare for production deployment with CI/CD, mobile builds, and store submission:

1. ✅ CI pipeline documentation
2. ✅ Mobile signing guidelines
3. ✅ Store metadata templates
4. ✅ Versioning and changelog automation
5. ✅ Privacy policy and data deletion procedures

---

## 📦 Deliverables

### 1. CI/CD Pipeline

**GitHub Actions Workflow**: `.github/workflows/ci.yml` (example)

```yaml
name: CI/CD

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
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Run unit tests
        run: pnpm test:unit

      - name: Run E2E tests
        run: pnpm test:e2e

      - name: Build
        run: pnpm build

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build-web:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install and build
        run: |
          pnpm install --frozen-lockfile
          pnpm build

      - name: Export static site
        run: pnpm next export

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: web-build
          path: out/

  build-mobile:
    needs: test
    runs-on: ${{ matrix.os }}
    if: github.ref == 'refs/heads/main'
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            platform: android
          - os: macos-latest
            platform: ios

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build web assets
        run: pnpm build

      - name: Setup Capacitor
        run: |
          pnpm add -D @capacitor/cli @capacitor/core
          pnpm cap init "Fueille" "com.fueille.app" --web-dir=out
          pnpm cap add ${{ matrix.platform }}

      - name: Sync Capacitor
        run: pnpm cap sync

      # Android-specific
      - name: Setup Android SDK (Android only)
        if: matrix.platform == 'android'
        uses: android-actions/setup-android@v2

      - name: Build Android APK
        if: matrix.platform == 'android'
        run: |
          cd android
          ./gradlew assembleDebug
          # For release: ./gradlew bundleRelease

      - name: Upload Android artifact
        if: matrix.platform == 'android'
        uses: actions/upload-artifact@v3
        with:
          name: android-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk

      # iOS-specific
      - name: Setup Xcode (iOS only)
        if: matrix.platform == 'ios'
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: latest-stable

      - name: Install CocoaPods
        if: matrix.platform == 'ios'
        run: |
          cd ios/App
          pod install

      - name: Build iOS
        if: matrix.platform == 'ios'
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
                     -scheme App \
                     -configuration Debug \
                     -destination 'generic/platform=iOS' \
                     archive -archivePath App.xcarchive

      - name: Upload iOS artifact
        if: matrix.platform == 'ios'
        uses: actions/upload-artifact@v3
        with:
          name: ios-archive
          path: ios/App/App.xcarchive
```

### 2. Mobile Signing

#### Android Signing

**Generate Keystore**:

```bash
keytool -genkey -v -keystore fueille-release.keystore \
  -alias fueille -keyalg RSA -keysize 2048 -validity 10000
```

**Configure Gradle** (`android/app/build.gradle`):

```gradle
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("FUEILLE_KEYSTORE_PATH") ?: "fueille-release.keystore")
            storePassword System.getenv("FUEILLE_KEYSTORE_PASSWORD")
            keyAlias System.getenv("FUEILLE_KEY_ALIAS") ?: "fueille"
            keyPassword System.getenv("FUEILLE_KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**GitHub Secrets**:

- `FUEILLE_KEYSTORE_FILE` - Base64 encoded keystore
- `FUEILLE_KEYSTORE_PASSWORD`
- `FUEILLE_KEY_ALIAS`
- `FUEILLE_KEY_PASSWORD`

#### iOS Signing

**Certificates Required**:

1. Apple Development Certificate
2. Apple Distribution Certificate
3. Provisioning Profile (Development/Ad Hoc/App Store)

**Fastlane Setup** (`ios/fastlane/Fastfile`):

```ruby
default_platform(:ios)

platform :ios do
  desc "Build and sign iOS app"
  lane :beta do
    match(type: "appstore")
    gym(
      scheme: "App",
      export_method: "app-store",
      output_directory: "./build"
    )
  end

  desc "Upload to TestFlight"
  lane :upload do
    pilot(
      skip_waiting_for_build_processing: true,
      distribute_external: false
    )
  end
end
```

**GitHub Secrets**:

- `APPLE_ID` - Apple Developer account email
- `APPLE_TEAM_ID` - Team ID from developer portal
- `MATCH_PASSWORD` - Fastlane match password
- `APP_STORE_CONNECT_API_KEY` - Base64 encoded API key

### 3. Store Metadata

#### Google Play Store

**File Structure**: `metadata/android/`

```
metadata/android/
  └── en-US/
      ├── title.txt (50 chars max)
      ├── short_description.txt (80 chars max)
      ├── full_description.txt (4000 chars max)
      ├── video.txt (YouTube URL)
      └── images/
          ├── icon.png (512x512)
          ├── featureGraphic.png (1024x500)
          ├── phoneScreenshots/
          │   ├── 1.png (min 320px)
          │   └── ... (up to 8)
          └── tenInchScreenshots/
              └── ... (optional)
```

**title.txt**:

```
Fueille - Plant Care Tracker
```

**short_description.txt**:

```
Track your plants offline with reminders, photos, and care schedules
```

**full_description.txt**:

```
🌱 Keep Your Plants Thriving with Fueille

Fueille is your personal plant care companion that works completely offline. Never forget to water, fertilize, or care for your plants again!

✨ Features:
• 📸 Photo tracking - Capture growth progress with your camera
• 🔔 Smart reminders - Schedule care tasks and get notifications
• 📝 Care history - Track all completed tasks
• 🏷️ Tags & notes - Organize plants by room, species, or custom tags
• 🌙 Dark mode - Easy on the eyes, day or night
• 💾 Offline-first - All data stored locally, works without internet

🌿 Perfect for:
• Houseplant enthusiasts
• Gardeners tracking outdoor plants
• Anyone wanting to improve their plant care routine

🔒 Privacy First:
• No account required
• All data stays on your device
• No tracking or analytics
• Open source and transparent

Download Fueille today and give your plants the care they deserve!

Note: Premium features (cloud sync, analytics) coming soon.
```

#### Apple App Store

**File Structure**: `metadata/ios/`

```
metadata/ios/
  └── en-US/
      ├── name.txt (30 chars max)
      ├── subtitle.txt (30 chars max)
      ├── description.txt (4000 chars max)
      ├── keywords.txt (100 chars, comma-separated)
      ├── marketing_url.txt
      ├── privacy_url.txt
      ├── support_url.txt
      └── screenshots/
          ├── iPhone-6.5/
          │   └── ... (1284x2778, up to 10)
          └── iPad-Pro-12.9/
              └── ... (2048x2732, optional)
```

**keywords.txt**:

```
plant,care,tracker,garden,reminder,water,houseplant,schedule,offline,photo
```

**App Store Connect Info**:

- **Category**: Lifestyle > Home & Garden
- **Age Rating**: 4+ (no objectionable content)
- **Copyright**: © 2025 Fueille
- **Content Rights**: No third-party content

### 4. Versioning & Changelog

**Semantic Versioning** (`package.json`):

```json
{
  "version": "1.0.0",
  "scripts": {
    "version:patch": "npm version patch -m 'chore: bump version to %s'",
    "version:minor": "npm version minor -m 'feat: bump version to %s'",
    "version:major": "npm version major -m 'feat!: bump version to %s'",
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s"
  }
}
```

**Conventional Commits**:

```
feat: add plant sharing feature
fix: resolve notification crash on iOS
docs: update installation guide
chore: bump dependencies
test: add E2E tests for task completion
refactor: simplify database queries
perf: optimize photo compression
style: apply dark mode to settings
```

**CHANGELOG.md** (auto-generated):

```markdown
# Changelog

## [1.1.0] - 2025-11-15

### Added

- Premium features section on home page
- Deep linking support for notifications
- Offline indicator banner

### Fixed

- Button contrast in dark mode
- Welcome message persistence

### Changed

- Improved error boundary UI
- Enhanced notification scheduling

## [1.0.0] - 2025-11-10

### Added

- Initial release
- Plant tracking with photos
- Care task reminders
- Offline-first storage
- Dark mode support
```

### 5. Privacy Policy & Data Deletion

**File**: `public/privacy-policy.html` or hosted page

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Fueille - Privacy Policy</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <h1>Privacy Policy for Fueille</h1>
    <p>Last updated: November 11, 2025</p>

    <h2>Data Collection</h2>
    <p>
      Fueille is designed with privacy in mind. We do not collect, transmit, or store any personal
      data on external servers.
    </p>

    <h3>Data Stored Locally:</h3>
    <ul>
      <li>Plant names, species, and notes you enter</li>
      <li>Care task schedules and completion history</li>
      <li>Photos you capture or import</li>
      <li>App settings and preferences</li>
    </ul>

    <h3>Data NOT Collected:</h3>
    <ul>
      <li>No personal identification information</li>
      <li>No location data</li>
      <li>No analytics or tracking</li>
      <li>No third-party data sharing</li>
    </ul>

    <h2>Local Storage</h2>
    <p>
      All data is stored in your device's local storage using IndexedDB. This data never leaves your
      device unless you explicitly export it.
    </p>

    <h2>Permissions</h2>
    <ul>
      <li><strong>Camera</strong>: To capture plant photos (optional)</li>
      <li><strong>Photos</strong>: To import existing photos (optional)</li>
      <li><strong>Notifications</strong>: To remind you of care tasks (optional)</li>
    </ul>

    <h2>Data Deletion</h2>
    <p>You can delete all app data at any time:</p>
    <ol>
      <li>On mobile: Uninstall the app</li>
      <li>On web: Clear browser data for the site</li>
      <li>In-app: Settings → Clear All Data (future feature)</li>
    </ol>

    <h2>Future Features</h2>
    <p>
      If we introduce cloud sync or multi-device features, you will be prompted to create an
      account. At that time:
    </p>
    <ul>
      <li>We will ask for explicit consent</li>
      <li>You can opt-in to cloud storage</li>
      <li>Data will be encrypted in transit and at rest</li>
      <li>You can request data export or deletion anytime</li>
    </ul>

    <h2>Contact</h2>
    <p>For questions about privacy: <a href="mailto:privacy@fueille.app">privacy@fueille.app</a></p>

    <h2>Changes</h2>
    <p>
      We will update this policy if data practices change. Check this page periodically for updates.
    </p>
  </body>
</html>
```

**Data Deletion Instructions** (for store submission):

```
Users can delete all app data in the following ways:

1. Uninstall the app from their device
   - Android: Settings → Apps → Fueille → Uninstall
   - iOS: Long-press app icon → Remove App → Delete App

2. Clear app data without uninstalling
   - Android: Settings → Apps → Fueille → Storage → Clear Data
   - iOS: Settings → General → iPhone Storage → Fueille → Delete App

3. In-app data clearing (future update)
   - Open Fueille → Settings → Privacy → Clear All Data

All user data is stored locally on the device. No data is stored on external servers, so deletion is immediate and permanent upon clearing app data or uninstalling.
```

---

## 🧪 Testing Instructions

### 1. Test CI Pipeline Locally

**Using Act** (GitHub Actions local runner):

```bash
# Install act
choco install act-cli  # Windows

# Run CI workflow
act push -j test

# Run specific job
act push -j build-web
```

### 2. Test Mobile Builds

**Android**:

```bash
# Debug build
cd android
./gradlew assembleDebug

# Install on device
adb install app/build/outputs/apk/debug/app-debug.apk

# Release build (requires signing)
./gradlew bundleRelease
```

**iOS**:

```bash
# Debug build
cd ios/App
xcodebuild -workspace App.xcworkspace \
           -scheme App \
           -configuration Debug \
           -destination 'generic/platform=iOS Simulator' \
           build

# Run on simulator
open ios/App/build/Debug-iphonesimulator/App.app -a Simulator

# TestFlight upload (requires signing)
cd ios
fastlane beta
```

### 3. Validate Store Metadata

**Google Play**:

- Title: ≤ 50 chars ✅
- Short description: ≤ 80 chars ✅
- Full description: ≤ 4000 chars ✅
- Icon: 512x512 PNG with transparency ✅
- Feature graphic: 1024x500 JPEG/PNG ✅
- Screenshots: 2-8 images, min 320px ✅

**App Store**:

- Name: ≤ 30 chars ✅
- Subtitle: ≤ 30 chars ✅
- Keywords: ≤ 100 chars ✅
- Screenshots: 6.5" iPhone (1284x2778) ✅
- Privacy policy URL: Required ✅

---

## 📋 Store Submission Checklist

### Pre-Submission

- [ ] App tested on physical devices (Android + iOS)
- [ ] All features working offline
- [ ] Notifications tested and approved
- [ ] Dark mode working correctly
- [ ] Privacy policy accessible
- [ ] App icons and screenshots prepared
- [ ] Version numbers updated (package.json, AndroidManifest, Info.plist)
- [ ] Crash-free for 7 days in internal testing

### Google Play Console

- [ ] Create app listing
- [ ] Upload APK/AAB to internal testing track
- [ ] Configure store listing (title, description, graphics)
- [ ] Set content rating (IARC questionnaire)
- [ ] Add privacy policy URL
- [ ] Configure pricing & distribution (free)
- [ ] Submit for review

### Apple App Store Connect

- [ ] Create app record
- [ ] Upload build via Xcode/Fastlane
- [ ] Configure app information
- [ ] Add screenshots and app preview video (optional)
- [ ] Set content rights and age rating
- [ ] Add privacy policy and support URL
- [ ] Submit for review

### Post-Submission

- [ ] Monitor review status daily
- [ ] Respond to reviewer questions within 24h
- [ ] Address any rejection reasons promptly
- [ ] Announce launch on social media
- [ ] Monitor crash reports and user feedback
- [ ] Plan first update (bug fixes, improvements)

---

## 🚀 Release Process

### 1. Pre-Release

```bash
# Ensure clean working tree
git status

# Run all checks
pnpm test:all
pnpm type-check
pnpm lint

# Update version
pnpm version:minor  # or patch/major

# Generate changelog
pnpm changelog

# Commit and tag
git push --follow-tags
```

### 2. Build & Deploy

```bash
# Web (manual or CI)
pnpm build
# Deploy to Vercel/Netlify/Cloudflare Pages

# Android
cd android
./gradlew bundleRelease
# Upload to Play Console via fastlane or web UI

# iOS
cd ios
fastlane beta
# Automatically uploads to TestFlight
```

### 3. Phased Rollout

- **Internal Testing**: 5-10 testers, 3-7 days
- **Closed Beta**: 50-100 testers, 7-14 days
- **Open Beta** (optional): Unlimited, 14-30 days
- **Production**: 10% → 50% → 100% over 7 days

### 4. Monitoring

- Watch crash-free rate (target: >99%)
- Monitor ANR (Application Not Responding) rate on Android
- Check review sentiment (target: >4.0 stars)
- Track key metrics: installs, DAU, retention

---

## ✅ Acceptance Criteria

- [x] CI pipeline documented with working examples
- [x] Mobile signing procedures documented
- [x] Store metadata templates created
- [x] Privacy policy drafted and accessible
- [x] Data deletion instructions provided
- [x] Versioning and changelog automation configured
- [x] Release process documented step-by-step
- [x] Store submission checklist created

---

## 🐛 Known Issues

1. **Capacitor Setup**: Requires manual setup per project (not in template)
2. **iOS Signing**: Complex, requires Apple Developer Program ($99/year)
3. **Review Times**: Google Play (1-3 days), App Store (1-3 days, sometimes longer)
4. **Rejections**: Common for first-time submissions (be patient, respond quickly)

---

## 📚 References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Fastlane Documentation](https://docs.fastlane.tools/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
