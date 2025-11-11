'use client';

import { useEffect, useState } from 'react';
import { initDatabase } from '@/lib/domain';

/**
 * DatabaseInitializer - Initialize IndexedDB on app startup
 * Runs on the client side to set up offline-first data layer
 */
export default function DatabaseInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        setInitialized(true);
        console.log('✓ IndexedDB initialized');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('✗ Failed to initialize database:', err);
      }
    };

    init();
  }, []);

  // Silent initialization - no UI rendered
  // Error state could be used for debugging
  if (error && process.env.NODE_ENV === 'development') {
    console.warn('Database initialization error:', error);
  }

  return null;
}
