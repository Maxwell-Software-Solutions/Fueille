'use client';

/**
 * SeedPanel — dev-only floating panel for managing mock data.
 *
 * Rendered only in NODE_ENV === 'development'.
 * Provides buttons to:
 *   - Load default fixture (seed=42)
 *   - Load a new random fixture (fresh faker seed)
 *   - Clear all data
 *
 * The panel is toggleable to stay out of the way during normal use.
 */

import { useState, useCallback, useEffect } from 'react';
import type { MockFixture } from '@/scripts/seed/generate-fixtures';

type Status = 'idle' | 'loading' | 'success' | 'error';

async function loadFixture(path: string): Promise<MockFixture> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch fixture: ${res.status}`);
  return res.json() as Promise<MockFixture>;
}

export function SeedPanel() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  // Register window.__seedDatabase on mount so Playwright can call it via page.evaluate()
  useEffect(() => {
    fetch('/mock-data/current.json')
      .then((r) => r.json())
      .then(async (fixture: MockFixture) => {
        const { registerDevGlobals } = await import('@/lib/dev/seedDatabase');
        registerDevGlobals(fixture);
      })
      .catch(() => {
        // Non-fatal: Playwright fixture won't be available but UI still works
      });
  }, []);

  const run = useCallback(async (action: () => Promise<void>) => {
    setStatus('loading');
    setMessage('');
    try {
      await action();
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const loadDefault = useCallback(() =>
    run(async () => {
      const { seedDatabase } = await import('@/lib/dev/seedDatabase');
      const fixture = await loadFixture('/mock-data/current.json');
      await seedDatabase(fixture, 'replace');
      setMessage(`Loaded ${fixture.meta.plantCount} plants (seed=${fixture.meta.seed})`);
      window.location.reload();
    }),
    [run],
  );

  const loadRandom = useCallback(() =>
    run(async () => {
      // Generate a new fixture client-side using faker in the browser
      // We do this by fetching the seed:generate endpoint (dev-only API route)
      const res = await fetch('/api/dev/seed?random=1');
      if (!res.ok) {
        throw new Error(`Seed API error: ${res.status}. Is dev server running?`);
      }
      const fixture: MockFixture = await res.json();
      const { seedDatabase } = await import('@/lib/dev/seedDatabase');
      await seedDatabase(fixture, 'replace');
      setMessage(`Loaded ${fixture.meta.plantCount} plants (seed=${fixture.meta.seed})`);
      window.location.reload();
    }),
    [run],
  );

  const clearAll = useCallback(() =>
    run(async () => {
      const { clearDatabase } = await import('@/lib/domain/database');
      await clearDatabase();
      setMessage('All data cleared.');
      window.location.reload();
    }),
    [run],
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-green-700 text-white text-xs font-mono px-2 py-1 rounded shadow-lg hover:bg-green-600 transition-colors"
        aria-label="Open seed panel"
        title="Dev: Seed Panel"
      >
        🌱 Seed
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-neutral-900 text-white rounded-lg shadow-2xl border border-neutral-700 text-sm font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700">
        <span className="font-semibold text-green-400">🌱 Seed Panel</span>
        <button
          onClick={() => setOpen(false)}
          className="text-neutral-400 hover:text-white transition-colors"
          aria-label="Close seed panel"
        >
          ✕
        </button>
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2">
        <button
          onClick={loadDefault}
          disabled={status === 'loading'}
          className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white px-3 py-1.5 rounded transition-colors"
        >
          Load Default (seed=42)
        </button>
        <button
          onClick={loadRandom}
          disabled={status === 'loading'}
          className="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-3 py-1.5 rounded transition-colors"
        >
          Load Random
        </button>
        <button
          onClick={clearAll}
          disabled={status === 'loading'}
          className="w-full bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1.5 rounded transition-colors"
        >
          Clear All Data
        </button>
      </div>

      {/* Status */}
      {status !== 'idle' && (
        <div
          className={`px-3 py-2 border-t border-neutral-700 text-xs ${
            status === 'loading'
              ? 'text-yellow-400'
              : status === 'success'
              ? 'text-green-400'
              : 'text-red-400'
          }`}
        >
          {status === 'loading' && '⏳ Working…'}
          {status === 'success' && `✓ ${message}`}
          {status === 'error' && `✗ ${message}`}
        </div>
      )}
    </div>
  );
}
