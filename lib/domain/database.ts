import Dexie, { type EntityTable } from 'dexie';
import type {
  Plant,
  CareTask,
  Photo,
  Tag,
  PlantTag,
  DeviceSync,
  SyncCursor,
  Layout,
  PlantMarker,
} from './entities';

/**
 * IndexedDB database for offline-first plant tracking
 * Uses Dexie.js for type-safe IndexedDB access
 */
export class PlantDatabase extends Dexie {
  // Type-safe tables
  plants!: EntityTable<Plant, 'id'>;
  careTasks!: EntityTable<CareTask, 'id'>;
  photos!: EntityTable<Photo, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  plantTags!: EntityTable<PlantTag, 'id'>;
  deviceSync!: EntityTable<DeviceSync, 'id'>;
  syncCursor!: EntityTable<SyncCursor, 'id'>;
  layouts!: EntityTable<Layout, 'id'>;
  plantMarkers!: EntityTable<PlantMarker, 'id'>;

  constructor() {
    super('PlantTrackerDB');

    // Schema version 1
    this.version(1).stores({
      plants: 'id, name, species, location, createdAt, updatedAt, deletedAt',
      careTasks:
        'id, plantId, taskType, dueAt, completedAt, snoozedUntil, createdAt, updatedAt, deletedAt',
      photos: 'id, plantId, takenAt, uploadedAt, createdAt, updatedAt, deletedAt',
      tags: 'id, name, createdAt, updatedAt, deletedAt',
      plantTags: 'id, plantId, tagId, createdAt, updatedAt, deletedAt',
      deviceSync: 'id, entityType, entityId, operation, syncedAt, createdAt',
      syncCursor: 'id, lastSyncAt',
    });

    // Schema version 2 - Add layout tables
    this.version(2).stores({
      layouts: 'id, name, type, createdAt, updatedAt, deletedAt',
      plantMarkers: 'id, layoutId, plantId, createdAt, updatedAt, deletedAt',
    });
  }
}

/**
 * Singleton database instance
 * Ensures only one connection across the app
 */
let dbInstance: PlantDatabase | null = null;

export function getDatabase(): PlantDatabase {
  if (typeof window === 'undefined') {
    // Server-side: return a dummy instance that throws on use
    throw new Error('Database can only be accessed on the client side');
  }

  if (!dbInstance) {
    dbInstance = new PlantDatabase();
  }

  return dbInstance;
}

/**
 * Initialize the database and run any necessary setup
 */
export async function initDatabase(): Promise<void> {
  const db = getDatabase();

  // Ensure database is open
  await db.open();

  // Check if we need to initialize sync cursor
  const cursor = await db.syncCursor.get('default');
  if (!cursor) {
    await db.syncCursor.add({
      id: 'default',
      lastSyncAt: new Date(0), // Start from epoch
      updatedAt: new Date(),
    });
  }
}

/**
 * Clear all data from the database (useful for testing/reset)
 */
export async function clearDatabase(): Promise<void> {
  const db = getDatabase();
  await db.delete();
  // Recreate after delete
  dbInstance = null;
  await initDatabase();
}

/**
 * Export the database instance for direct use
 * Use a getter function to avoid initialization during SSR
 */
export function getDb(): PlantDatabase | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return getDatabase();
}
