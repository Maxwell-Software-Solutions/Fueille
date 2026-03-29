/**
 * Playwright seed fixture — helpers for seeding/clearing IndexedDB in E2E tests.
 *
 * Usage:
 *   import { test, expect } from '@/tests/e2e/fixtures/seed.fixture';
 *
 *   test('my test', async ({ page, seedPage }) => {
 *     await seedPage();   // load default.json into IndexedDB, then reload
 *     // ... assertions against seeded data
 *   });
 *
 * How it works:
 *   SeedPanel registers window.__seedDatabase on mount by loading /mock-data/current.json.
 *   The fixture waits for that global to appear, then calls it via page.evaluate().
 */

import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Wait for SeedPanel to register window.__seedDatabase (up to 10 s). */
async function waitForSeedGlobal(page: Page): Promise<void> {
  await page.waitForFunction(() => '__seedDatabase' in window, { timeout: 10_000 });
}

/**
 * Seed the page's IndexedDB with the default fixture (seed=42) and reload.
 * Assumes the app is already loaded (navigate first with page.goto).
 */
export async function seedPage(page: Page): Promise<void> {
  await waitForSeedGlobal(page);
  await page.evaluate(() => (window as unknown as { __seedDatabase: (mode: string) => void }).__seedDatabase('replace'));
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Clear all IndexedDB data and reload.
 */
export async function clearPage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const { clearDatabase } = await import('/lib/domain/database.js' as string);
    await clearDatabase();
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
}

// Extended Playwright test fixture with seedPage / clearPage attached to page context
export const test = base.extend<{
  /** Seed the current page's IndexedDB with default fixture (seed=42), then reload. */
  seedPage: () => Promise<void>;
  /** Clear all IndexedDB data, then reload. */
  clearPage: () => Promise<void>;
}>({
  seedPage: async ({ page }, use) => {
    await use(() => seedPage(page));
  },
  clearPage: async ({ page }, use) => {
    await use(() => clearPage(page));
  },
});

export { expect };
