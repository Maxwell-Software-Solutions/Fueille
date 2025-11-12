import { deepLinkService, DeepLinkService, DeepLink } from './DeepLinkService';

describe('DeepLinkService', () => {
  describe('parseDeepLink', () => {
    it('should parse custom scheme URLs', () => {
      const link = deepLinkService.parseDeepLink('fueille://plant/abc123');
      expect(link).toEqual({ type: 'plant', id: 'abc123' });
    });

    it('should parse web URLs', () => {
      const link = deepLinkService.parseDeepLink('https://app.fueille.com/plants/abc123');
      expect(link).toEqual({ type: 'plant', id: 'abc123' });
    });

    it('should parse relative paths', () => {
      const link = deepLinkService.parseDeepLink('/plants/abc123');
      expect(link).toEqual({ type: 'plant', id: 'abc123' });
    });

    it('should handle task URLs', () => {
      const link = deepLinkService.parseDeepLink('fueille://task/task-123');
      expect(link).toEqual({ type: 'task', id: 'task-123' });
    });

    it('should handle home URL', () => {
      const link = deepLinkService.parseDeepLink('fueille://');
      expect(link).toEqual({ type: 'home' });
    });

    it('should handle URLs with actions', () => {
      const link = deepLinkService.parseDeepLink('/plants/abc123/edit');
      expect(link).toEqual({ type: 'plant', id: 'abc123', action: 'edit' });
    });

    it('should return null for invalid URLs', () => {
      const link = deepLinkService.parseDeepLink('invalid://unknown/path');
      expect(link).toBeNull();
    });

    it('should handle plural routes', () => {
      const link1 = deepLinkService.parseDeepLink('/plant/abc123');
      const link2 = deepLinkService.parseDeepLink('/plants/abc123');
      expect(link1).toEqual(link2);
    });
  });

  describe('createDeepLink', () => {
    it('should create plant deep link', () => {
      const url = deepLinkService.createDeepLink('plant', 'abc123');
      expect(url).toBe('/plants/abc123');
    });

    it('should create task deep link', () => {
      const url = deepLinkService.createDeepLink('task', 'task-123');
      expect(url).toBe('/tasks/task-123');
    });

    it('should create home deep link', () => {
      const url = deepLinkService.createDeepLink('home');
      expect(url).toBe('/');
    });

    it('should create deep link with action', () => {
      const url = deepLinkService.createDeepLink('plant', 'abc123', 'edit');
      expect(url).toBe('/plants/abc123/edit');
    });

    it('should handle missing ID for plant', () => {
      const url = deepLinkService.createDeepLink('plant');
      expect(url).toBe('/plants');
    });
  });

  describe('navigate', () => {
    it('should construct correct plant URL from deep link', () => {
      const url = deepLinkService.createDeepLink('plant', 'abc123');
      expect(url).toBe('/plants/abc123');
    });

    it('should construct correct home URL from deep link', () => {
      const url = deepLinkService.createDeepLink('home');
      expect(url).toBe('/');
    });
  });

  describe('registerListener', () => {
    it('should register and call listener on custom event', () => {
      const mockHandler = jest.fn();
      const unregister = deepLinkService.registerListener(mockHandler);

      // Simulate deep link event
      const event = new CustomEvent('deeplink', {
        detail: { url: 'fueille://plant/abc123' },
      });
      window.dispatchEvent(event);

      expect(mockHandler).toHaveBeenCalledWith({ type: 'plant', id: 'abc123' });

      unregister();
    });

    it('should unregister listener', () => {
      const mockHandler = jest.fn();
      const unregister = deepLinkService.registerListener(mockHandler);
      unregister();

      const event = new CustomEvent('deeplink', {
        detail: { url: 'fueille://plant/abc123' },
      });
      window.dispatchEvent(event);

      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should not call listener for invalid URLs', () => {
      const mockHandler = jest.fn();
      deepLinkService.registerListener(mockHandler);

      const event = new CustomEvent('deeplink', {
        detail: { url: 'invalid://bad/url' },
      });
      window.dispatchEvent(event);

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = DeepLinkService.getInstance();
      const instance2 = DeepLinkService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
