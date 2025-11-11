import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Reset document classes
    document.documentElement.classList.remove('dark');

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false, // Default to light mode
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  it('should render theme toggle button', async () => {
    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  it('should default to system preference (light)', async () => {
    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByLabelText(/switch to dark mode/i);
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('🌙');
    });
  });

  it('should default to system preference (dark)', async () => {
    // Mock dark mode preference
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByLabelText(/switch to light mode/i);
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('☀️');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should toggle from light to dark', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
      expect(button).toHaveTextContent('☀️');
    });
  });

  it('should toggle from dark to light', async () => {
    const user = userEvent.setup();
    localStorage.setItem('theme', 'dark');

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button');
    await user.click(button);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem('theme')).toBe('light');
      expect(button).toHaveTextContent('🌙');
    });
  });

  it('should load saved theme from localStorage', async () => {
    localStorage.setItem('theme', 'dark');

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(screen.getByLabelText(/switch to light mode/i)).toBeInTheDocument();
    });
  });

  it('should persist theme choice on toggle', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button');

    // Toggle to dark
    await user.click(button);
    expect(localStorage.getItem('theme')).toBe('dark');

    // Toggle back to light
    await user.click(button);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('should apply dark class to html element', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button');

    // Initially light (no dark class)
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Toggle to dark
    await user.click(button);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    // Toggle back to light
    await user.click(button);
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('should update when system preference changes (if no saved preference)', async () => {
    const listeners: Array<(e: MediaQueryListEvent) => void> = [];

    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn((_, handler) => {
        listeners.push(handler);
      }),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    // Simulate system preference change
    listeners.forEach((listener) => {
      listener({ matches: true, media: '(prefers-color-scheme: dark)' } as MediaQueryListEvent);
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
});
