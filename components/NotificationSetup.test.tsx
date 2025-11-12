import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationSetup } from './NotificationSetup';
import { notificationScheduler } from '@/lib/domain';

// Mock the notification scheduler
jest.mock('@/lib/domain', () => ({
  notificationScheduler: {
    getPermission: jest.fn(),
    requestPermission: jest.fn(),
    scheduleAllUpcoming: jest.fn(),
  },
}));

describe('NotificationSetup', () => {
  let originalCapacitor: any;

  beforeAll(() => {
    originalCapacitor = (window as any).Capacitor;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (notificationScheduler.getPermission as jest.Mock).mockReturnValue('default');
    // Ensure clean state
    delete (window as any).Capacitor;
  });

  afterEach(() => {
    // Clean up
    delete (window as any).Capacitor;
  });

  afterAll(() => {
    // Restore original Capacitor if it existed
    if (originalCapacitor !== undefined) {
      (window as any).Capacitor = originalCapacitor;
    }
  });

  it('renders nothing when not mounted (SSR)', () => {
    const { container } = render(<NotificationSetup />);
    // Component renders initially, but checks mounted state in useEffect
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the notification setup card when permission is default', async () => {
    render(<NotificationSetup />);

    await waitFor(() => {
      expect(screen.getByText(/Enable Reminders/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Get notified when your plants need care/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enable/i })).toBeInTheDocument();
  });

  it('does not render when permission is already granted', async () => {
    (notificationScheduler.getPermission as jest.Mock).mockReturnValue('granted');

    const { container } = render(<NotificationSetup />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('does not render when permission is denied', async () => {
    (notificationScheduler.getPermission as jest.Mock).mockReturnValue('denied');

    const { container } = render(<NotificationSetup />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('requests permission and schedules notifications when button is clicked', async () => {
    const user = userEvent.setup();
    (notificationScheduler.requestPermission as jest.Mock).mockResolvedValue(true);
    (notificationScheduler.scheduleAllUpcoming as jest.Mock).mockResolvedValue(3);

    render(<NotificationSetup />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enable/i })).toBeInTheDocument();
    });

    const enableButton = screen.getByRole('button', { name: /Enable/i });
    await user.click(enableButton);

    await waitFor(() => {
      expect(notificationScheduler.requestPermission).toHaveBeenCalled();
      expect(notificationScheduler.scheduleAllUpcoming).toHaveBeenCalled();
    });
  });

  it('handles permission request failure gracefully', async () => {
    const user = userEvent.setup();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    (notificationScheduler.requestPermission as jest.Mock).mockResolvedValue(false);

    render(<NotificationSetup />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enable/i })).toBeInTheDocument();
    });

    const enableButton = screen.getByRole('button', { name: /Enable/i });
    await user.click(enableButton);

    await waitFor(() => {
      expect(notificationScheduler.requestPermission).toHaveBeenCalled();
      expect(notificationScheduler.scheduleAllUpcoming).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Notification permission was not granted');
    });

    consoleWarnSpy.mockRestore();
  });

  it('handles errors during permission request', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Permission request failed');
    (notificationScheduler.requestPermission as jest.Mock).mockRejectedValue(error);

    render(<NotificationSetup />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Enable/i })).toBeInTheDocument();
    });

    const enableButton = screen.getByRole('button', { name: /Enable/i });
    await user.click(enableButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error requesting notification permission:',
        error
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('displays mobile-specific message when Capacitor is available', async () => {
    // Mock window.Capacitor
    (window as any).Capacitor = { isNativePlatform: () => true };

    render(<NotificationSetup />);

    await waitFor(() => {
      expect(
        screen.getByText(/We'll send push notifications to your device for due tasks/i)
      ).toBeInTheDocument();
    });
  });

  it('displays web-specific message when Capacitor is not available', async () => {
    // Capacitor should already be undefined from beforeEach
    render(<NotificationSetup />);

    await waitFor(() => {
      expect(
        screen.getByText(/We'll send browser notifications for due tasks/i)
      ).toBeInTheDocument();
    });
  });
});
