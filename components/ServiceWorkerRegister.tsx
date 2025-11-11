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

    // Mobile-native bridge detection: expose a thin adapter on window
    try {
      // If a native bridge is present (in mobile wrapper), connect it
      // Otherwise expose a web fallback
      // @ts-ignore
      if (!window.NativePlantBridge) {
        // @ts-ignore
        window.NativePlantBridge = {
          async takePhoto() {
            // fallback to HTML input capture
            return { canceled: true };
          },
          async pickImage() {
            return { canceled: true };
          },
          async scheduleNotification(payload: any): Promise<{ scheduled: boolean }> {
            // No-op fallback
            return { scheduled: false };
          },
        };
      }
    } catch (e) {
      // ignore
    }
  }, []);

  return null;
}
