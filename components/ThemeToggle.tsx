'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark';

/**
 * Dark mode toggle component
 * Uses system preference as default, allows manual toggle between light/dark
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if user has a saved preference
    const savedTheme = localStorage.getItem('theme') as Theme | null;

    if (savedTheme) {
      // Use saved preference
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Use system preference as default
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      setTheme(systemPreference);
      applyTheme(systemPreference);
    }

    // Listen for system theme changes (only if no saved preference)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    root.classList.toggle('dark', newTheme === 'dark');
  };

  const toggleTheme = () => {
    const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <div className="w-11 h-11" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="neu-pressed rounded-xl hover:neu-floating transition-all"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className="text-2xl">{theme === 'light' ? '🌙' : '☀️'}</span>
    </Button>
  );
}
