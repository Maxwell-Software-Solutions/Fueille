import { telemetry, TelemetryService } from './TelemetryService';

describe('TelemetryService', () => {
  beforeEach(() => {
    // Reset console spies
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = TelemetryService.getInstance();
      const instance2 = TelemetryService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('track', () => {
    it('should track events with properties', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      telemetry.track('plant_created', { plantId: 'abc123', tagCount: 2 });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Telemetry] Event: plant_created',
        expect.objectContaining({
          plantId: 'abc123',
          tagCount: 2,
          timestamp: expect.any(String),
          platform: expect.any(String),
        })
      );
    });

    it('should track events without properties', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      telemetry.track('app_opened');

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Telemetry] Event: app_opened',
        expect.objectContaining({
          timestamp: expect.any(String),
          platform: expect.any(String),
        })
      );
    });

    it('should not track when disabled', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      telemetry.setEnabled(false);
      telemetry.track('plant_created');

      expect(consoleSpy).not.toHaveBeenCalled();

      // Re-enable for other tests
      telemetry.setEnabled(true);
    });
  });

  describe('trackError', () => {
    it('should track errors with context', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const error = new Error('Test error');

      telemetry.trackError(error, { component: 'TestComponent' });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Telemetry] Error:',
        'Test error',
        expect.objectContaining({
          component: 'TestComponent',
          timestamp: expect.any(String),
          platform: expect.any(String),
        })
      );
    });

    it('should not track errors when disabled', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const error = new Error('Test error');

      telemetry.setEnabled(false);
      telemetry.trackError(error);

      expect(consoleSpy).not.toHaveBeenCalled();

      telemetry.setEnabled(true);
    });
  });

  describe('convenience methods', () => {
    it('should track plant created', () => {
      const trackSpy = jest.spyOn(telemetry, 'track');

      telemetry.plantCreated('plant-123', ['indoor', 'succulent']);

      expect(trackSpy).toHaveBeenCalledWith('plant_created', {
        plantId: 'plant-123',
        tagCount: 2,
      });
    });

    it('should track plant viewed', () => {
      const trackSpy = jest.spyOn(telemetry, 'track');

      telemetry.plantViewed('plant-123');

      expect(trackSpy).toHaveBeenCalledWith('plant_viewed', { plantId: 'plant-123' });
    });

    it('should track task completed', () => {
      const trackSpy = jest.spyOn(telemetry, 'track');

      telemetry.taskCompleted('task-123', 'plant-123', 'water');

      expect(trackSpy).toHaveBeenCalledWith('task_completed', {
        taskId: 'task-123',
        plantId: 'plant-123',
        taskType: 'water',
      });
    });

    it('should track photo captured', () => {
      const trackSpy = jest.spyOn(telemetry, 'track');

      telemetry.photoCaptured('plant-123', 'camera');

      expect(trackSpy).toHaveBeenCalledWith('photo_captured', {
        plantId: 'plant-123',
        source: 'camera',
      });
    });

    it('should track notification permission changes', () => {
      const trackSpy = jest.spyOn(telemetry, 'track');

      telemetry.notificationPermissionChanged(true);
      expect(trackSpy).toHaveBeenCalledWith('notification_permission_granted');

      telemetry.notificationPermissionChanged(false);
      expect(trackSpy).toHaveBeenCalledWith('notification_permission_denied');
    });
  });

  describe('custom provider', () => {
    it('should use custom provider', () => {
      const mockProvider = {
        trackEvent: jest.fn(),
        trackError: jest.fn(),
        identify: jest.fn(),
      };

      telemetry.setProvider(mockProvider);
      telemetry.track('plant_created', { plantId: 'abc' });

      expect(mockProvider.trackEvent).toHaveBeenCalledWith(
        'plant_created',
        expect.objectContaining({ plantId: 'abc' })
      );
    });
  });

  describe('global error reporting', () => {
    it('should expose reportError on window', () => {
      expect(typeof (window as any).reportError).toBe('function');
    });
  });
});
