# Mobile wrapper (provider-agnostic) — Milestone 1

This folder contains a small, provider-agnostic scaffold to host the built web app inside a native WebView wrapper (Android/iOS). The goal is to provide a single place to implement native bridge integrations (camera, notifications, file access) without coupling the app code to a specific vendor.

What this contains:

- `nativeBridge.ts` — TypeScript interface and a small web-hosted fallback. Mobile wrappers should provide a concrete implementation on `window.NativePlantBridge`.
- `host.html` — Example host HTML to load the built web app (useful when testing the wrapper in a WebView or browser).

How to use (provider-agnostic instructions):

1. Build the Next.js app for production: `pnpm build` and export or host the output so the WebView can load it. For simple tests you can `pnpm run start` and point the wrapper to `http://10.0.2.2:3000` (Android emulator) or your machine IP.

2. Choose a wrapper solution: Capacitor, Cordova, or a minimal native app with a WebView (React Native WebView, Android WebView, WKWebView). All wrappers should load the built web app URL.

3. Implement a native bridge on the WebView side that exposes `NativePlantBridge` on the window object, for example:

   window.NativePlantBridge = {
     takePhoto: async () => ({ uri: 'file://...' }),
     pickImage: async () => ({ uri: 'file://...' }),
     scheduleNotification: async (payload) => ({ scheduled: true })
   };

4. Test on device/emulator: run the wrapper and load the web app. The app will register the service worker (`/sw.js`) and fall back to a web-friendly bridge if a native bridge is not present.

Notes:
- This scaffold intentionally avoids vendor-specific code. Use this as a reference and implement provider-specific wiring in the native project.
- See the repo-level Milestone 1 README for exact testing steps.
