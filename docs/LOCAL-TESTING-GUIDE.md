# Local Device Testing Guide

This guide covers various methods for testing native mobile capabilities (camera, notifications, geolocation) without deploying to a physical device.

## Quick Start

### Method 1: Chrome DevTools Device Emulation (Easiest)

Perfect for testing responsive UI and basic mobile APIs.

**Steps:**

1. Start dev server: `pnpm dev`
2. Open Chrome: http://localhost:3002
3. Press `F12` → Click device toolbar icon (or `Ctrl+Shift+M`)
4. Select device preset (e.g., "iPhone 14 Pro") or set custom dimensions
5. Test camera capture: Uses desktop webcam via HTML5 `capture="environment"`
6. Test notifications: Desktop notifications API works

**Limitations:**

- Camera captures from webcam, not simulated phone camera
- No native mobile bridge (falls back to web APIs)
- No access to device sensors beyond what Web APIs provide

---

### Method 2: Capacitor with Browser (Recommended for PWA Testing)

Best for testing PWA features with native bridge preview.

**Setup:**

```powershell
# Install Capacitor (if not already added)
pnpm add @capacitor/core @capacitor/cli
pnpm add @capacitor/camera @capacitor/local-notifications @capacitor/filesystem

# Initialize Capacitor
npx cap init "Plant Tracker" "com.planttracker.app"

# Build Next.js and sync
pnpm build
npx cap add android
npx cap add ios
npx cap sync
```

**Run in browser with live reload:**

```powershell
# Start Next.js dev server
pnpm dev

# In another terminal, serve with Capacitor
npx cap serve
```

This opens browser with Capacitor plugins available via `window.Capacitor`.

**Test native bridge:**

```typescript
import { Camera } from '@capacitor/camera';

// In your NativePlantBridge implementation
async takePhoto() {
  const image = await Camera.getPhoto({
    quality: 90,
    resultType: 'dataUrl',
    source: 'camera', // or 'photos' for gallery
  });
  return { uri: image.dataUrl };
}
```

---

### Method 3: Android Studio Emulator (Full Native Testing)

Most accurate simulation of real Android device with camera support.

**Prerequisites:**

- Android Studio installed with SDK Tools
- At least 8GB RAM available

**Setup:**

```powershell
# Build production Next.js bundle
pnpm build

# Open Android Studio
npx cap open android
```

**Create AVD (Android Virtual Device):**

1. In Android Studio: `Tools > Device Manager`
2. Click `Create Device`
3. Select device (e.g., Pixel 6)
4. Download system image (API 33+ recommended)
5. Finish setup

**Enable virtual camera:**

1. In AVD settings, set:
   - Front camera: `VirtualScene` or `Webcam0`
   - Back camera: `VirtualScene` or `Webcam0`
2. Virtual scene provides animated environment

**Run app:**

1. Click green play button in Android Studio
2. App installs and launches on emulator
3. Test camera: Opens virtual camera with scene
4. Test notifications: Shows Android notifications

**Hot reload during development:**

```powershell
# Terminal 1: Run dev server
pnpm dev

# Terminal 2: In android/ directory
./gradlew installDebug

# Update capacitor.config.ts server.url to http://10.0.2.2:3002
# 10.0.2.2 is the host machine from emulator's perspective
```

---

### Method 4: iOS Simulator (macOS only)

**Prerequisites:**

- macOS with Xcode installed

**Setup:**

```powershell
# Build and open Xcode
pnpm build
npx cap open ios
```

**Run:**

1. Select simulator (e.g., iPhone 14)
2. Click play button
3. Test camera: Uses simulated camera with test pattern

**Note:** iOS simulator has no real camera; shows static test image or requires photo library import.

---

## Testing Camera Features

### Desktop Browser (Chrome DevTools)

```javascript
// HTML5 camera input (works in all browsers)
<input type="file" accept="image/*" capture="environment" />

// Test: Triggers webcam prompt on desktop
// Result: Desktop camera capture, compressed to JPEG
```

### Capacitor Camera Plugin

```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Take photo from camera
const photo = await Camera.getPhoto({
  quality: 90,
  allowEditing: false,
  resultType: CameraResultType.DataUrl,
  source: CameraSource.Camera, // or CameraSource.Photos
});

// Result in Android emulator: Virtual scene or webcam
// Result in browser: Desktop webcam
```

---

## Testing Notifications

### Web Notifications API (Browser)

```typescript
// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  new Notification('Plant Care Reminder', {
    body: 'Time to water your Monstera!',
    icon: '/icons/icon-192.png',
  });
}

// Test in Chrome: Desktop notification appears
```

### Capacitor Local Notifications (Native)

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

// Schedule notification
await LocalNotifications.schedule({
  notifications: [
    {
      id: 1,
      title: 'Plant Care Reminder',
      body: 'Time to water your Monstera!',
      schedule: { at: new Date(Date.now() + 5000) }, // 5 seconds
    },
  ],
});

// Test in emulator: Native Android/iOS notification
```

---

## Debugging Tips

### Chrome Remote Debugging (Android)

1. Enable USB debugging on physical device
2. Connect via USB
3. Chrome → `chrome://inspect` → Select device
4. Inspect WebView with full DevTools

### Safari Web Inspector (iOS)

1. Enable Web Inspector in iOS Settings → Safari → Advanced
2. Connect device via USB
3. Safari → Develop → [Device Name] → Localhost

### Console Logs in Emulators

**Android Studio:**

- View → Tool Windows → Logcat
- Filter by package: `com.planttracker.app`

**Xcode:**

- View → Debug Area → Show Debug Area
- Console shows `console.log()` output

### Network Inspection

```typescript
// In capacitor.config.ts, enable server mode for hot reload
{
  server: {
    url: 'http://10.0.2.2:3002', // Android emulator host
    cleartext: true,
  }
}
```

---

## Comparing Testing Methods

| Feature           | Chrome DevTools | Capacitor Browser | Android Emulator | iOS Simulator   |
| ----------------- | --------------- | ----------------- | ---------------- | --------------- |
| **Setup Time**    | < 1 min         | ~5 min            | ~30 min          | ~20 min (macOS) |
| **Camera**        | Desktop webcam  | Desktop webcam    | Virtual scene    | Test pattern    |
| **Notifications** | Desktop         | Desktop           | Native Android   | Native iOS      |
| **Performance**   | Native browser  | Browser           | Near-native      | Near-native     |
| **Hot Reload**    | ✅ Instant      | ✅ Fast           | ⚠️ Slow          | ⚠️ Slow         |
| **Best For**      | UI testing      | PWA features      | Android testing  | iOS testing     |

---

## Recommended Workflow

1. **Daily Development:** Chrome DevTools device emulation
   - Fast iteration on UI/UX
   - Test camera capture with webcam
   - Test responsive layouts

2. **Weekly Testing:** Capacitor browser serve
   - Verify PWA functionality
   - Test service worker caching
   - Validate Web APIs

3. **Pre-Release:** Android Studio emulator + iOS Simulator
   - Full native feature testing
   - Performance profiling
   - Screenshot generation for stores

4. **Final QA:** Physical devices
   - Real-world camera quality
   - Network conditions (airplane mode, slow 3G)
   - Battery impact testing

---

## Mobile Bridge Testing

### Update Native Bridge for Capacitor

Edit `mobile-wrapper/nativeBridge.ts`:

```typescript
import { Camera, CameraResultType } from '@capacitor/camera';
import { LocalNotifications } from '@capacitor/local-notifications';

if (typeof window !== 'undefined' && window.Capacitor) {
  window.NativePlantBridge = {
    async takePhoto() {
      try {
        const photo = await Camera.getPhoto({
          quality: 85,
          resultType: CameraResultType.DataUrl,
          source: 'camera',
        });
        return { uri: photo.dataUrl };
      } catch (error) {
        return { canceled: true };
      }
    },

    async pickImage() {
      try {
        const photo = await Camera.getPhoto({
          quality: 85,
          resultType: CameraResultType.DataUrl,
          source: 'photos',
        });
        return { uri: photo.dataUrl };
      } catch (error) {
        return { canceled: true };
      }
    },

    async scheduleNotification(payload) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: parseInt(payload.id),
              title: payload.title,
              body: payload.body || '',
              schedule: payload.at ? { at: new Date(payload.at) } : undefined,
            },
          ],
        });
        return { scheduled: true };
      } catch (error) {
        return { scheduled: false };
      }
    },
  };
}
```

### Test Bridge in Console

```javascript
// Open DevTools console in browser/emulator
window.NativePlantBridge.takePhoto().then((result) => console.log('Photo result:', result));

window.NativePlantBridge.scheduleNotification({
  id: '1',
  title: 'Test',
  body: 'Testing notifications',
}).then((result) => console.log('Notification result:', result));
```

---

## Troubleshooting

### Camera not working in emulator

- **Android:** Check AVD camera settings (VirtualScene or Webcam0)
- **iOS:** Simulator has limited camera; use Photos permission instead
- **Browser:** Grant camera permission in browser settings

### Notifications not showing

- **Android:** Check system notification permissions in Settings
- **iOS:** Request notification permissions via `LocalNotifications.requestPermissions()`
- **Browser:** Ensure `Notification.permission === 'granted'`

### Hot reload not working

- Check `capacitor.config.ts` server URL matches dev server
- Android emulator: Use `10.0.2.2` instead of `localhost`
- Clear app data and reinstall

### Build errors

```powershell
# Clear caches and rebuild
Remove-Item -Recurse -Force .next
pnpm build
npx cap sync
```

---

## Next Steps

1. Install Capacitor plugins (see Method 2 above)
2. Test camera capture in Chrome DevTools
3. Set up Android emulator for native testing
4. Implement dark mode (see `MILESTONE-5-DARK-MODE.md`)
5. Add notification scheduler (see `MILESTONE-5-NOTIFICATIONS.md`)
