import '@testing-library/jest-dom';

// Only mock window APIs in jsdom environment
if (typeof window !== 'undefined') {
  // Mock window.matchMedia (used by ThemeToggle and other components)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}
