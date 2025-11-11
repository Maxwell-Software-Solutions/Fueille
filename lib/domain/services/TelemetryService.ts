/**
 * Telemetry Service
 * Lightweight event tracking for user actions and app health
 * Provider-agnostic - can be hooked to any analytics backend
 */

export type TelemetryEvent =
  // Plant events
  | 'plant_created'
  | 'plant_updated'
  | 'plant_deleted'
  | 'plant_viewed'
  // Task events
  | 'task_created'
  | 'task_completed'
  | 'task_snoozed'
  | 'task_deleted'
  // Photo events
  | 'photo_captured'
  | 'photo_imported'
  | 'photo_deleted'
  // App lifecycle
  | 'app_opened'
  | 'app_installed'
  | 'notification_permission_granted'
  | 'notification_permission_denied'
  // Errors
  | 'error_occurred'
  | 'sync_failed';

export interface TelemetryProperties {
  [key: string]: string | number | boolean | undefined;
}

export interface TelemetryProvider {
  trackEvent(event: TelemetryEvent, properties?: TelemetryProperties): void;
  trackError(error: Error, context?: TelemetryProperties): void;
  identify(userId: string, traits?: TelemetryProperties): void;
}

/**
 * Console logger - development telemetry
 */
class ConsoleProvider implements TelemetryProvider {
  trackEvent(event: TelemetryEvent, properties?: TelemetryProperties): void {
    console.log(`[Telemetry] Event: ${event}`, properties || {});
  }

  trackError(error: Error, context?: TelemetryProperties): void {
    console.error(`[Telemetry] Error:`, error.message, context || {});
  }

  identify(userId: string, traits?: TelemetryProperties): void {
    console.log(`[Telemetry] Identify: ${userId}`, traits || {});
  }
}

/**
 * No-op provider - production with no analytics configured
 */
class NoOpProvider implements TelemetryProvider {
  trackEvent(): void {}
  trackError(): void {}
  identify(): void {}
}

export class TelemetryService {
  private static instance: TelemetryService;
  private provider: TelemetryProvider;
  private enabled: boolean = true;

  private constructor() {
    // Default to console in development, no-op in production
    this.provider =
      process.env.NODE_ENV === 'development' ? new ConsoleProvider() : new NoOpProvider();
  }

  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  /**
   * Set custom telemetry provider
   * Example: telemetry.setProvider(new MixpanelProvider(token))
   */
  setProvider(provider: TelemetryProvider): void {
    this.provider = provider;
  }

  /**
   * Enable/disable telemetry globally
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Track an event with optional properties
   */
  track(event: TelemetryEvent, properties?: TelemetryProperties): void {
    if (!this.enabled) return;

    try {
      this.provider.trackEvent(event, {
        timestamp: new Date().toISOString(),
        platform: this.getPlatform(),
        ...properties,
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  /**
   * Track an error with context
   */
  trackError(error: Error, context?: TelemetryProperties): void {
    if (!this.enabled) return;

    try {
      this.provider.trackError(error, {
        timestamp: new Date().toISOString(),
        platform: this.getPlatform(),
        ...context,
      });
    } catch (err) {
      console.error('Failed to track error:', err);
    }
  }

  /**
   * Identify a user (for future multi-device scenarios)
   */
  identify(userId: string, traits?: TelemetryProperties): void {
    if (!this.enabled) return;

    try {
      this.provider.identify(userId, traits);
    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  }

  /**
   * Detect platform (web/ios/android)
   */
  private getPlatform(): string {
    if (typeof window === 'undefined') return 'server';

    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    return 'web';
  }

  /**
   * Convenience methods for common events
   */
  plantCreated(plantId: string, tags?: string[]): void {
    this.track('plant_created', { plantId, tagCount: tags?.length || 0 });
  }

  plantViewed(plantId: string): void {
    this.track('plant_viewed', { plantId });
  }

  taskCompleted(taskId: string, plantId: string, taskType: string): void {
    this.track('task_completed', { taskId, plantId, taskType });
  }

  photoCaptured(plantId: string, source: 'camera' | 'file'): void {
    this.track('photo_captured', { plantId, source });
  }

  notificationPermissionChanged(granted: boolean): void {
    this.track(granted ? 'notification_permission_granted' : 'notification_permission_denied');
  }
}

// Export singleton
export const telemetry = TelemetryService.getInstance();

// Global error reporting hook for ErrorBoundary
if (typeof window !== 'undefined') {
  (window as any).reportError = (error: Error, context?: any) => {
    telemetry.trackError(error, context);
  };
}
