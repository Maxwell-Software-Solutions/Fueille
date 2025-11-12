'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register service worker for offline support and caching
    if ('serviceWorker' in navigator) {
      const register = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          // Optional: claim clients and listen for updates
          if (reg.waiting) {
            // skipWaiting could be implemented later
          }
          console.log('Service worker registered', reg.scope);
        } catch (err) {
          console.warn('Service worker registration failed', err);
        }
      };

      register();
    }

    // Import and initialize the native bridge
    // This will set up proper Capacitor integration or web fallback
    import('@/mobile-wrapper/nativeBridge').catch((err) => {
      console.warn('Failed to load native bridge:', err);
    });
  }, []);

  return null;
}
