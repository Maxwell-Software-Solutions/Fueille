/**
 * seedDatabase — browser-side fixture loader.
 *
 * Reads a MockFixture and bulk-inserts all entities into Dexie.
 * Dev-only: never imported in production code.
 *
 * Usage:
 *   import { seedDatabase } from '@/lib/dev/seedDatabase';
 *   await seedDatabase(fixture);              // replace mode (default)
 *   await seedDatabase(fixture, 'merge');     // keep existing rows
 */

import { getDatabase } from '@/lib/domain/database';
import type {
  Plant,
  CareTask,
  Photo,
  Tag,
  PlantTag,
  Layout,
  PlantMarker,
  SyncCursor,
} from '@/lib/domain/entities';
import type { MockFixture } from '@/scripts/seed/generate-fixtures';

type SeedMode = 'replace' | 'merge';

/**
 * Coerce ISO-string dates in a fixture (from JSON.parse) back to Date objects.
 * Dexie stores Date objects; JSON serializes them as strings.
 */
function rehydrateDates<T extends object>(items: T[], dateFields: (keyof T)[]): T[] {
  return items.map((item) => {
    const copy = { ...item } as Record<string, unknown>;
    for (const field of dateFields) {
      const key = field as string;
      const val = copy[key];
      if (typeof val === 'string') {
        copy[key] = new Date(val);
      }
    }
    return copy as T;
  });
}

const COMMON_DATES = ['createdAt', 'updatedAt', 'deletedAt'] as const;

export async function seedDatabase(
  fixture: MockFixture,
  mode: SeedMode = 'replace',
): Promise<void> {
  const db = getDatabase();

  if (mode === 'replace') {
    await db.transaction(
      'rw',
      [
        db.plants,
        db.careTasks,
        db.photos,
        db.tags,
        db.plantTags,
        db.layouts,
        db.plantMarkers,
        db.syncCursor,
      ],
      async () => {
        await db.plants.clear();
        await db.careTasks.clear();
        await db.photos.clear();
        await db.tags.clear();
        await db.plantTags.clear();
        await db.layouts.clear();
        await db.plantMarkers.clear();
        await db.syncCursor.clear();
      },
    );
  }

  // Rehydrate dates (fixture JSON has ISO strings after JSON.parse round-trip)
  const plants = rehydrateDates(fixture.plants as unknown as Plant[], [
    ...COMMON_DATES,
  ]);
  const careTasks = rehydrateDates(fixture.careTasks as unknown as CareTask[], [
    ...COMMON_DATES,
    'dueAt',
    'completedAt',
    'snoozedUntil',
  ]);
  const photos = rehydrateDates(fixture.photos as unknown as Photo[], [
    ...COMMON_DATES,
    'takenAt',
    'uploadedAt',
  ]);
  const tags = rehydrateDates(fixture.tags as unknown as Tag[], [...COMMON_DATES]);
  const plantTags = rehydrateDates(fixture.plantTags as unknown as PlantTag[], [...COMMON_DATES]);
  const layouts = rehydrateDates(fixture.layouts as unknown as Layout[], [...COMMON_DATES]);
  const plantMarkers = rehydrateDates(
    fixture.plantMarkers as unknown as PlantMarker[],
    [...COMMON_DATES],
  );
  const syncCursors = rehydrateDates(fixture.syncCursor as unknown as SyncCursor[], [
    'lastSyncAt',
    'updatedAt',
  ]);

  // Bulk insert (bulkPut = upsert, safe for both replace and merge modes)
  await db.transaction(
    'rw',
    [
      db.plants,
      db.careTasks,
      db.photos,
      db.tags,
      db.plantTags,
      db.layouts,
      db.plantMarkers,
      db.syncCursor,
    ],
    async () => {
      // Strip internal _catalogIndex field added by plant builder
      const cleanPlants = plants.map(
        ({ _catalogIndex: _, ...p }: Plant & { _catalogIndex?: number }) => p,
      );
      await db.plants.bulkPut(cleanPlants);
      await db.careTasks.bulkPut(careTasks);
      await db.photos.bulkPut(photos);
      await db.tags.bulkPut(tags);
      await db.plantTags.bulkPut(plantTags);
      await db.layouts.bulkPut(layouts);
      await db.plantMarkers.bulkPut(plantMarkers);
      await db.syncCursor.bulkPut(syncCursors);
    },
  );
}

/**
 * Expose seedDatabase on window for Playwright page.evaluate() calls.
 * Call once after the app loads in dev mode.
 */
export function registerDevGlobals(fixture: MockFixture): void {
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__seedDatabase = (mode?: SeedMode) =>
      seedDatabase(fixture, mode);
    (window as unknown as Record<string, unknown>).__seedFixture = fixture;
  }
}
