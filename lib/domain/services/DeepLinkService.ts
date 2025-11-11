/**
 * Deep Link Service
 * Handles app links for opening specific plants or tasks
 * Supports both web URLs and mobile deep links
 */

export type DeepLinkType = 'plant' | 'task' | 'home';

export interface DeepLink {
  type: DeepLinkType;
  id?: string;
  action?: string;
}

export class DeepLinkService {
  private static instance: DeepLinkService;

  private constructor() {}

  static getInstance(): DeepLinkService {
    if (!DeepLinkService.instance) {
      DeepLinkService.instance = new DeepLinkService();
    }
    return DeepLinkService.instance;
  }

  /**
   * Parse a deep link URL into structured data
   * Supports:
   * - fueille://plant/{id}
   * - fueille://task/{id}
   * - https://app.fueille.com/plants/{id}
   * - /plants/{id}
   */
  parseDeepLink(url: string): DeepLink | null {
    try {
      // Handle custom scheme (mobile)
      if (url.startsWith('fueille://')) {
        const path = url.replace('fueille://', '');
        return this.parsePath(path);
      }

      // Handle web URLs or paths
      const urlObj = new URL(url, 'https://app.fueille.com');
      return this.parsePath(urlObj.pathname);
    } catch (error) {
      console.error('Failed to parse deep link:', error);
      return null;
    }
  }

  private parsePath(path: string): DeepLink | null {
    const segments = path.split('/').filter((s) => s);

    if (segments.length === 0) {
      return { type: 'home' };
    }

    const [type, id, action] = segments;

    if (type === 'plant' || type === 'plants') {
      return { type: 'plant', id, action };
    }

    if (type === 'task' || type === 'tasks') {
      return { type: 'task', id, action };
    }

    return null;
  }

  /**
   * Generate a deep link URL for a resource
   */
  createDeepLink(type: DeepLinkType, id?: string, action?: string): string {
    let path = '';

    switch (type) {
      case 'plant':
        path = id ? `/plants/${id}` : '/plants';
        break;
      case 'task':
        path = id ? `/tasks/${id}` : '/plants';
        break;
      case 'home':
        path = '/';
        break;
    }

    if (action) {
      path += `/${action}`;
    }

    return path;
  }

  /**
   * Navigate to a deep link (client-side)
   */
  navigate(link: DeepLink): void {
    if (typeof window === 'undefined') return;

    const path = this.createDeepLink(link.type, link.id, link.action);
    window.location.href = path;
  }

  /**
   * Register a listener for incoming deep links
   * Used by mobile wrapper to handle app launches
   */
  registerListener(callback: (link: DeepLink) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = (event: CustomEvent<{ url: string }>) => {
      const link = this.parseDeepLink(event.detail.url);
      if (link) {
        callback(link);
      }
    };

    window.addEventListener('deeplink' as any, handler);

    return () => {
      window.removeEventListener('deeplink' as any, handler);
    };
  }
}

export const deepLinkService = DeepLinkService.getInstance();
