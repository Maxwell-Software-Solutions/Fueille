'use client';

import { useEffect, useState } from 'react';
import { initDatabase } from '@/lib/domain';
import { getDatabase } from '@/lib/domain/database';

/**
 * DatabaseInitializer - Initialize IndexedDB on app startup
 * Runs on the client side to set up offline-first data layer.
 * In development, auto-seeds with mock data when the database is empty.
 */
export default function DatabaseInitializer() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();

        // Auto-seed in development when the database is empty
        if (process.env.NODE_ENV === 'development') {
          const db = getDatabase();
          const plantCount = await db.plants.count();
          if (plantCount === 0) {
            console.log('🌱 Empty database detected in dev — auto-seeding mock data…');
            const res = await fetch('/mock-data/current.json');
            if (res.ok) {
              const fixture = await res.json();
              const { seedDatabase } = await import('@/lib/dev/seedDatabase');
              await seedDatabase(fixture, 'replace');
              console.log(`✓ Auto-seeded ${fixture.meta.plantCount} plants (seed=${fixture.meta.seed})`);
              window.location.reload();
              return;
            }
          }
        }

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
