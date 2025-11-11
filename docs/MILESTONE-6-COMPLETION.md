# Milestone 6: Background Behaviors & Deep Links - COMPLETION

**Status**: ✅ **COMPLETED**  
**Date**: November 11, 2025

---

## 🎯 Milestone Objectives

Implement background behaviors, deep linking, error handling, and offline indicators for the Plant Tracking app:

1. ✅ Deep linking infrastructure for opening specific plants/tasks
2. ✅ Offline indicator showing network status
3. ✅ Global error boundary with recovery options
4. ✅ Native bridge updates for deep link handling
5. ✅ Enhanced notifications with deep link data

---

## 📦 Deliverables

### 1. Deep Link Service

**File**: `lib/domain/services/DeepLinkService.ts`

**Features**:

- Parse deep link URLs from multiple formats:
  - Custom scheme: `fueille://plant/{id}`
  - Web URLs: `https://app.fueille.com/plants/{id}`
  - Relative paths: `/plants/{id}`
- Generate deep links for plants, tasks, and home
- Register listeners for incoming deep links (mobile)
- Navigate to deep links programmatically

**API**:

```typescript
// Parse a URL into structured data
const link = deepLinkService.parseDeepLink('fueille://plant/abc123');
// { type: 'plant', id: 'abc123' }

// Generate a deep link
const url = deepLinkService.createDeepLink('plant', 'abc123');
// '/plants/abc123'

// Navigate to a deep link
deepLinkService.navigate({ type: 'plant', id: 'abc123' });

// Register mobile deep link handler
const unregister = deepLinkService.registerListener((link) => {
  console.log('Deep link received:', link);
});
```

### 2. Offline Indicator

**File**: `components/OfflineIndicator.tsx`

**Features**:

- Monitors `navigator.onLine` status
- Shows yellow banner when offline: "You are offline - Changes will be saved locally"
- Shows green banner when back online: "Back online" (auto-hides after 2s)
- Fixed positioning at top of screen
- Non-intrusive with smooth transitions

**Usage**:

- Automatically included in `app/layout.tsx`
- No configuration needed

### 3. Error Boundary

**File**: `components/ErrorBoundary.tsx`

**Features**:

- Catches React rendering errors
- Displays user-friendly error UI
- Shows error details in development mode
- Provides "Try Again" and "Go Home" actions
- Integrates with error reporting hooks (`window.reportError`)

**Usage**:

```tsx
<ErrorBoundary fallback={<CustomErrorUI />}>
  <YourApp />
</ErrorBoundary>
```

### 4. Native Bridge Updates

**File**: `mobile-wrapper/nativeBridge.ts`

**New APIs**:

```typescript
interface NativePlantBridge {
  // ... existing methods

  // Register handler for incoming deep links
  registerDeepLinkHandler?: (handler: (url: string) => void) => void;

  // Trigger background sync (future use)
  triggerBackgroundSync?: () => Promise<void>;

  // Enhanced notification with deep link data
  scheduleNotification: (payload: {
    id: string;
    title: string;
    body?: string;
    at?: string;
    data?: Record<string, any>; // NEW: for deep links
  }) => Promise<{ scheduled: boolean }>;
}
```

### 5. Enhanced Notification Scheduler

**File**: `lib/domain/services/NotificationScheduler.ts`

**Updates**:

- Integrates with deep link service
- Sends deep link data with mobile notifications
- Notification clicks navigate via deep links
- Falls back to web notifications if native unavailable

**Example**:

```typescript
// When notification is clicked, opens /plants/{plantId}
await notificationScheduler.scheduleForTask(task);
```

### 6. Layout Integration

**File**: `app/layout.tsx`

**Updates**:

- Wrapped entire app in `<ErrorBoundary>`
- Added `<OfflineIndicator />` component
- Dynamically imported for client-side only rendering

---

## 🧪 Testing Instructions

### 1. Offline Indicator

1. Open the app in a browser
2. Open DevTools → Network tab → Go offline
3. **Expected**: Yellow banner appears: "You are offline - Changes will be saved locally"
4. Go back online
5. **Expected**: Green banner appears: "Back online" (disappears after 2s)

### 2. Error Boundary

1. Create a component that throws an error:

```tsx
// In any page, temporarily add:
throw new Error('Test error boundary');
```

2. **Expected**: See error UI with "Something went wrong", "Try Again", and "Go Home" buttons
3. Click "Try Again" → component re-renders
4. Click "Go Home" → navigates to `/`

### 3. Deep Links (Web)

1. Open browser console and run:

```javascript
const { deepLinkService } = require('@/lib/domain');

// Parse a deep link
const link = deepLinkService.parseDeepLink('/plants/your-plant-id');
console.log(link); // { type: 'plant', id: 'your-plant-id' }

// Navigate to a plant
deepLinkService.navigate({ type: 'plant', id: 'your-plant-id' });
```

2. **Expected**: Navigates to plant detail page

### 4. Deep Links (Mobile)

**Note**: Requires Capacitor or native wrapper implementation

1. Configure deep link scheme in mobile wrapper:

```typescript
// In mobile-wrapper initialization
App.addListener('appUrlOpen', (event) => {
  window.NativePlantBridge.registerDeepLinkHandler?.((url) => {
    const link = deepLinkService.parseDeepLink(url);
    if (link) {
      deepLinkService.navigate(link);
    }
  });
});
```

2. Test with ADB (Android):

```bash
adb shell am start -W -a android.intent.action.VIEW -d "fueille://plant/abc123" com.yourapp
```

3. Test with simctl (iOS):

```bash
xcrun simctl openurl booted "fueille://plant/abc123"
```

4. **Expected**: App opens and navigates to plant detail page

### 5. Notification Deep Links

1. Create a plant and add a care task due in 1 minute
2. Grant notification permission
3. Wait for notification to appear
4. Click notification
5. **Expected**: App focuses and navigates to plant detail page

---

## 🏗️ Architecture Notes

### Deep Link Flow

```
Mobile OS / Web URL
    ↓
Native Bridge / Router
    ↓
DeepLinkService.parseDeepLink()
    ↓
DeepLinkService.navigate()
    ↓
Next.js Router (window.location.href)
    ↓
Plant/Task Detail Page
```

### Offline Detection

- Uses `navigator.onLine` API
- Event listeners: `window.addEventListener('online'/'offline')`
- Reactive state updates with `useState`
- Not 100% reliable (can show online when server unreachable)
- Good enough for UX feedback

### Error Recovery

- React Error Boundaries catch rendering errors only
- For async errors, use try/catch + error reporting
- Production: hide error details, show friendly message
- Development: show stack trace for debugging

---

## 🔄 Background Sync (Future)

**Note**: Background sync is **not implemented** in this milestone. It's reserved for when online sync is added.

**Placeholder API**:

```typescript
// Mobile wrapper should implement:
window.NativePlantBridge.triggerBackgroundSync = async () => {
  // Trigger native background task
  // Pull latest data from server
  // Push local mutations
};
```

**Platform Constraints**:

- **iOS**: Limited to 30s background fetch intervals
- **Android**: More flexible with WorkManager
- **Web**: Service Worker Background Sync API (limited browser support)

---

## 📝 Next Steps (Milestone 7)

1. **Testing Infrastructure**:
   - Unit tests for domain/data layer
   - Component tests for UI
   - E2E smoke tests

2. **Observability**:
   - Telemetry hooks (add plant, complete task)
   - Error reporting integration
   - Retention funnel tracking

3. **Quality Gates**:
   - Coverage thresholds
   - Performance budgets
   - Accessibility audits

---

## ✅ Acceptance Criteria

- [x] Deep links parse from multiple URL formats
- [x] Offline indicator shows network status changes
- [x] Error boundary catches and displays rendering errors
- [x] Native bridge supports deep link registration
- [x] Notifications include deep link data
- [x] All new components are client-side only (no SSR issues)
- [x] No breaking changes to existing features
- [x] TypeScript compiles without errors

---

## 🐛 Known Limitations

1. **Deep Links on Web**: Use `window.location.href` instead of Next.js router to ensure page reload
2. **Offline Detection**: Not 100% accurate; relies on browser's network status
3. **Error Boundary**: Only catches rendering errors, not async errors
4. **Background Sync**: Placeholder only; requires online sync implementation

---

## 📚 References

- [Deep Linking Best Practices](https://developer.apple.com/documentation/xcode/defining-a-custom-url-scheme-for-your-app)
- [Navigator.onLine MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
