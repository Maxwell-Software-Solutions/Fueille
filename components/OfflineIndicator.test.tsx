import { render, screen, act, waitFor } from '@testing-library/react';
import { OfflineIndicator } from './OfflineIndicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
      configurable: true,
    });
  });

  it('should not render when online initially', () => {
    render(<OfflineIndicator />);
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it('should render when going offline', async () => {
    render(<OfflineIndicator />);

    // Simulate going offline
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    });
  });

  it('should show back online message when reconnecting', async () => {
    render(<OfflineIndicator />);

    // Go offline
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    });

    // Go back online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(screen.getByText(/back online/i)).toBeInTheDocument();
    });
  });

  it('should show offline message with appropriate styling', async () => {
    render(<OfflineIndicator />);

    await act(async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      const banner = screen.getByText(/you are offline/i).closest('div')?.parentElement;
      expect(banner).toBeInTheDocument();
      // Test that warning styling is applied (check parent div with bg color)
      expect(banner?.className).toMatch(/bg-yellow/);
    });
  });

  it('should show online message with appropriate styling', async () => {
    render(<OfflineIndicator />);

    await act(async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    });

    await act(async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      const banner = screen.getByText(/back online/i).closest('div')?.parentElement;
      expect(banner).toBeInTheDocument();
      // Test that success styling is applied (check parent div with bg color)
      expect(banner?.className).toMatch(/bg-green/);
    });
  });
});
