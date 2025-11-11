// Thin, provider-agnostic TypeScript interface for a native bridge.
// Mobile wrappers should expose a concrete implementation on window.NativePlantBridge.

export type PhotoResult = { uri?: string; canceled?: boolean };

export interface NativePlantBridge {
  takePhoto: () => Promise<PhotoResult>;
  pickImage: () => Promise<PhotoResult>;
  scheduleNotification: (payload: { id: string; title: string; body?: string; at?: string }) => Promise<{ scheduled: boolean }>;
}

declare global {
  interface Window {
    NativePlantBridge?: NativePlantBridge;
  }
}

// Web fallback (no-op) — implementations should be provided by the wrapper
if (typeof window !== 'undefined' && !window.NativePlantBridge) {
  window.NativePlantBridge = {
    async takePhoto() {
      return { canceled: true };
    },
    async pickImage() {
      return { canceled: true };
    },
    async scheduleNotification() {
      return { scheduled: false };
    },
  };
}

export default window.NativePlantBridge;
