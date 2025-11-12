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
    // Capacitor implementation - dynamically import when needed
    const initializeCapacitorBridge = async () => {
      try {
        // Dynamic imports to avoid issues during SSR
        const { LocalNotifications } = await import('@capacitor/local-notifications');

        window.NativePlantBridge = {
          async takePhoto() {
            console.warn('NativePlantBridge.takePhoto not implemented - install @capacitor/camera');
            return { canceled: true };
          },

          async pickImage() {
            console.warn('NativePlantBridge.pickImage not implemented - install @capacitor/camera');
            return { canceled: true };
          },

          async scheduleNotification(payload) {
            try {
              // Request permissions first
              const permResult = await LocalNotifications.requestPermissions();
              if (permResult.display !== 'granted') {
                console.warn('Notification permission not granted:', permResult);
                return { scheduled: false };
              }

              // Generate a numeric ID from the string ID (required by Capacitor)
              const numericId = Math.abs(hashCode(payload.id));

              // Schedule the notification
              const scheduleConfig: any = {
                notifications: [
                  {
                    id: numericId,
                    title: payload.title,
                    body: payload.body || '',
                    extra: payload.data || {},
                  },
                ],
              };

              // Add schedule time if provided
              if (payload.at) {
                scheduleConfig.notifications[0].schedule = {
                  at: new Date(payload.at),
                };
              }

              await LocalNotifications.schedule(scheduleConfig);
              console.log('Notification scheduled successfully:', numericId);
              return { scheduled: true };
            } catch (error) {
              console.error('Notification scheduling error:', error);
              return { scheduled: false };
            }
          },

          registerDeepLinkHandler(handler) {
            console.log('Deep link handler registered (Capacitor mode)');
            // Can be enhanced with App plugin for deep links
          },

          async triggerBackgroundSync() {
            console.log('Background sync triggered (Capacitor mode)');
            // Can be enhanced with BackgroundTask plugin
          },
        };
      } catch (error) {
        console.error('Failed to initialize Capacitor bridge:', error);
        // Fall back to web implementation
        initializeWebBridge();
      }
    };

    // Helper function to convert string ID to numeric ID
    function hashCode(str: string): number {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
    }

    // Initialize asynchronously
    initializeCapacitorBridge();
  } else {
    // Standard web fallback
    initializeWebBridge();
  }
}

function initializeWebBridge() {
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

export default window.NativePlantBridge;
