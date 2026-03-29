/**
 * @jest-environment node
 */
/**
 * Integration tests for seedDatabase.
 * Uses fake-indexeddb to run Dexie in-memory in Node.js.
 * Uses @jest-environment node (not jsdom) for structuredClone + TextEncoder availability.
 */

// Polyfill IndexedDB before importing Dexie
import 'fake-indexeddb/auto';

import { faker } from '@faker-js/faker';
import type { MockFixture } from '@/scripts/seed/generate-fixtures';
import { buildTags } from '@/scripts/seed/builders/tag.builder';
import { buildPlants } from '@/scripts/seed/builders/plant.builder';
import { buildPlantTags } from '@/scripts/seed/builders/plantTag.builder';
import { buildCareTasksForPlant } from '@/scripts/seed/builders/careTask.builder';
import { buildPhoto } from '@/scripts/seed/builders/photo.builder';
import { buildLayouts } from '@/scripts/seed/builders/layout.builder';
import { buildPlantMarkersForLayout } from '@/scripts/seed/builders/plantMarker.builder';

// Build a minimal fixture for testing (min 5 plants to satisfy marker count ≥ 4)
function buildTestFixture(plantCount = 5): MockFixture {
  faker.seed(42);
  const tags = buildTags(faker);
  const plants = buildPlants(plantCount, faker);
  const plantIds = plants.map((p) => p.id);
  const plantTags = buildPlantTags(plantIds, faker);
  const photos = plants.map((p, i) => buildPhoto(p.id, i, faker));
  const careTasks = plants.flatMap((p) => buildCareTasksForPlant(p.id, faker));
  const layouts = buildLayouts(1, faker);
  const plantMarkers = buildPlantMarkersForLayout(layouts[0].id, plantIds, faker);

  return {
    meta: { seed: 42, generatedAt: new Date().toISOString(), version: '1', plantCount },
    tags,
    plants,
    plantTags,
    photos,
    careTasks,
    layouts,
    plantMarkers,
    syncCursor: [{ id: 'default', lastSyncAt: new Date(), updatedAt: new Date() }],
  };
}

// We need a fresh DB instance per test to avoid cross-test contamination
// Dexie with fake-indexeddb supports this by giving each test a unique DB name
let dbInstanceCounter = 0;

// Override the singleton to get fresh instance per test
jest.mock('@/lib/domain/database', () => {
  const { Dexie } = require('dexie');

  function makeDb(name: string) {
    const db = new Dexie(name);
    db.version(1).stores({
      plants: 'id, name, species, location, createdAt, updatedAt, deletedAt',
      careTasks: 'id, plantId, taskType, dueAt, completedAt, createdAt, updatedAt, deletedAt',
      photos: 'id, plantId, takenAt, createdAt, updatedAt, deletedAt',
      tags: 'id, name, createdAt, updatedAt, deletedAt',
      plantTags: 'id, plantId, tagId, createdAt, updatedAt, deletedAt',
      deviceSync: 'id, entityType, entityId, operation, syncedAt, createdAt',
      syncCursor: 'id, lastSyncAt',
    });
    db.version(2).stores({
      layouts: 'id, name, type, createdAt, updatedAt, deletedAt',
      plantMarkers: 'id, layoutId, plantId, createdAt, updatedAt, deletedAt',
    });
    return db;
  }

  let _db: ReturnType<typeof makeDb> | null = null;

  return {
    getDatabase: () => {
      if (!_db) {
        _db = makeDb(`PlantTrackerDB-test-${++dbInstanceCounter}`);
      }
      return _db;
    },
    clearDatabase: async () => {
      if (_db) {
        await _db.delete();
        _db = null;
      }
      _db = makeDb(`PlantTrackerDB-test-${++dbInstanceCounter}`);
    },
  };
});

describe('seedDatabase', () => {
  // Reset singleton between tests by clearing the mock module cache approach
  beforeEach(() => {
    // Force a new DB instance for each test
    const mod = require('@/lib/domain/database');
    // Clear by calling clearDatabase
    jest.resetModules();
  });

  it('inserts all entity types in replace mode', async () => {
    const { seedDatabase } = await import('./seedDatabase');
    const { getDatabase } = await import('@/lib/domain/database');

    const fixture = buildTestFixture(3);
    await seedDatabase(fixture, 'replace');

    const db = getDatabase();
    const plants = await db.plants.toArray();
    expect(plants).toHaveLength(3);

    const tags = await db.tags.toArray();
    expect(tags).toHaveLength(5);

    const careTasks = await db.careTasks.toArray();
    expect(careTasks.length).toBeGreaterThanOrEqual(6); // 2–5 per plant

    const layouts = await db.layouts.toArray();
    expect(layouts).toHaveLength(1);
  });

  it('replaces existing data in replace mode', async () => {
    const { seedDatabase } = await import('./seedDatabase');
    const { getDatabase } = await import('@/lib/domain/database');

    const fixture1 = buildTestFixture(3);
    await seedDatabase(fixture1, 'replace');

    const fixture2 = buildTestFixture(5);
    await seedDatabase(fixture2, 'replace');

    const db = getDatabase();
    const plants = await db.plants.toArray();
    // Should have 5 plants (from fixture2), not 3+5=8
    expect(plants).toHaveLength(5);
  });

  it('rehydrates Date strings back to Date objects', async () => {
    const { seedDatabase } = await import('./seedDatabase');
    const { getDatabase } = await import('@/lib/domain/database');

    // Simulate JSON round-trip (dates become strings)
    const fixture = buildTestFixture(2);
    const jsonRoundTripped = JSON.parse(JSON.stringify(fixture)) as MockFixture;

    await seedDatabase(jsonRoundTripped, 'replace');

    const db = getDatabase();
    const plants = await db.plants.toArray();
    // Dates should be Date objects, not strings.
    // Use Object.prototype.toString instead of instanceof to handle cross-realm
    // Date classes (can happen when jest.resetModules() re-evaluates modules).
    expect(Object.prototype.toString.call(plants[0].createdAt)).toBe('[object Date]');
    expect(Object.prototype.toString.call(plants[0].updatedAt)).toBe('[object Date]');
  });

  it('all careTask plantIds reference existing plants', async () => {
    const { seedDatabase } = await import('./seedDatabase');
    const { getDatabase } = await import('@/lib/domain/database');

    const fixture = buildTestFixture(3);
    await seedDatabase(fixture, 'replace');

    const db = getDatabase();
    const plants = await db.plants.toArray();
    const careTasks = await db.careTasks.toArray();

    const plantIdSet = new Set(plants.map((p) => p.id));
    for (const task of careTasks) {
      expect(plantIdSet.has(task.plantId)).toBe(true);
    }
  });

  it('all plantMarker plantIds reference existing plants', async () => {
    const { seedDatabase } = await import('./seedDatabase');
    const { getDatabase } = await import('@/lib/domain/database');

    const fixture = buildTestFixture(5);
    await seedDatabase(fixture, 'replace');

    const db = getDatabase();
    const plants = await db.plants.toArray();
    const markers = await db.plantMarkers.toArray();

    const plantIdSet = new Set(plants.map((p) => p.id));
    for (const marker of markers) {
      expect(plantIdSet.has(marker.plantId)).toBe(true);
    }
  });

  it('syncCursor is seeded', async () => {
    const { seedDatabase } = await import('./seedDatabase');
    const { getDatabase } = await import('@/lib/domain/database');

    const fixture = buildTestFixture(2);
    await seedDatabase(fixture, 'replace');

    const db = getDatabase();
    const cursors = await db.syncCursor.toArray();
    expect(cursors).toHaveLength(1);
    expect(Object.prototype.toString.call(cursors[0].lastSyncAt)).toBe('[object Date]');
  });
});
