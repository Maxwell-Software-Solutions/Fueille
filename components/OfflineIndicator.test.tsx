import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from './OfflineIndicator';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('should not render when online initially', () => {
    render(<OfflineIndicator />);
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
  });

  it('should render when going offline', () => {
    render(<OfflineIndicator />);

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    window.dispatchEvent(new Event('offline'));

    expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
  });

  it('should show back online message when reconnecting', (done) => {
    render(<OfflineIndicator />);

    // Go offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    window.dispatchEvent(new Event('offline'));

    // Go back online
    Object.defineProperty(navigator, 'onLine', { value: true });
    window.dispatchEvent(new Event('online'));

    expect(screen.getByText(/back online/i)).toBeInTheDocument();

    // Should disappear after 2 seconds
    setTimeout(() => {
      expect(screen.queryByText(/back online/i)).not.toBeInTheDocument();
      done();
    }, 2100);
  });

  it('should show yellow banner when offline', () => {
    render(<OfflineIndicator />);

    Object.defineProperty(navigator, 'onLine', { value: false });
    window.dispatchEvent(new Event('offline'));

    const banner = screen.getByText(/you are offline/i).closest('div');
    expect(banner).toHaveClass('bg-yellow-500');
  });

  it('should show green banner when back online', () => {
    render(<OfflineIndicator />);

    Object.defineProperty(navigator, 'onLine', { value: false });
    window.dispatchEvent(new Event('offline'));

    Object.defineProperty(navigator, 'onLine', { value: true });
    window.dispatchEvent(new Event('online'));

    const banner = screen.getByText(/back online/i).closest('div');
    expect(banner).toHaveClass('bg-green-500');
  });
});
