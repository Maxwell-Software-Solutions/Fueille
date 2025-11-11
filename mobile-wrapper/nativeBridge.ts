// Thin, provider-agnostic TypeScript interface for a native bridge.
// Mobile wrappers should expose a concrete implementation on window.NativePlantBridge.

export type PhotoResult = { uri?: string; canceled?: boolean };

export interface NativePlantBridge {
  takePhoto: () => Promise<PhotoResult>;
  pickImage: () => Promise<PhotoResult>;
  scheduleNotification: (payload: {
    id: string;
    title: string;
    body?: string;
    at?: string;
    data?: Record<string, any>;
  }) => Promise<{ scheduled: boolean }>;
  registerDeepLinkHandler?: (handler: (url: string) => void) => void;
  triggerBackgroundSync?: () => Promise<void>;
}

declare global {
  interface Window {
    NativePlantBridge?: NativePlantBridge;
    Capacitor?: any; // Capacitor runtime detection
  }
}

// Web fallback (no-op) — implementations should be provided by the wrapper
if (typeof window !== 'undefined' && !window.NativePlantBridge) {
  // Check if Capacitor is available
  if (window.Capacitor) {
    // Capacitor implementation with dynamic imports
    // In a real Capacitor project, import from '@capacitor/camera' and '@capacitor/local-notifications'
    // Example implementation:
    /*
    import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
    import { LocalNotifications } from '@capacitor/local-notifications';

    window.NativePlantBridge = {
      async takePhoto() {
        try {
          const photo = await Camera.getPhoto({
            quality: 85,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Camera,
          });
          return { uri: photo.dataUrl };
        } catch (error) {
          console.error('Camera error:', error);
          return { canceled: true };
        }
      },

      async pickImage() {
        try {
          const photo = await Camera.getPhoto({
            quality: 85,
            allowEditing: false,
            resultType: CameraResultType.DataUrl,
            source: CameraSource.Photos,
          });
          return { uri: photo.dataUrl };
        } catch (error) {
          console.error('Photo picker error:', error);
          return { canceled: true };
        }
      },

      async scheduleNotification(payload) {
        try {
          await LocalNotifications.requestPermissions();
          await LocalNotifications.schedule({
            notifications: [{
              id: parseInt(payload.id),
              title: payload.title,
              body: payload.body || '',
              schedule: payload.at ? { at: new Date(payload.at) } : undefined,
            }],
          });
          return { scheduled: true };
        } catch (error) {
          console.error('Notification error:', error);
          return { scheduled: false };
        }
      },
    };
    */
  } else {
    // Standard web fallback
    window.NativePlantBridge = {
      async takePhoto() {
        console.warn('NativePlantBridge.takePhoto not implemented - use HTML5 camera input');
        return { canceled: true };
      },
      async pickImage() {
        console.warn('NativePlantBridge.pickImage not implemented - use file input');
        return { canceled: true };
      },
      async scheduleNotification() {
        console.warn(
          'NativePlantBridge.scheduleNotification not implemented - use Web Notifications API'
        );
        return { scheduled: false };
      },
      registerDeepLinkHandler(handler) {
        console.warn('NativePlantBridge.registerDeepLinkHandler not implemented on web');
        // Web can still handle navigation via router
      },
      async triggerBackgroundSync() {
        console.warn('NativePlantBridge.triggerBackgroundSync not implemented on web');
        // Web uses service worker background sync
      },
    };
  }
}

export default window.NativePlantBridge;
