import { createId } from '@paralleldrive/cuid2';
import type { Plant, CreatePlant, UpdatePlant, PlantFilter } from '../entities';
import { getDatabase } from '../database';

/**
 * Repository for Plant entities
 * Provides CRUD operations and query helpers
 */
export class PlantRepository {
  /**
   * Create a new plant
   */
  async create(data: CreatePlant): Promise<Plant> {
    const db = getDatabase();
    const now = new Date();

    const plant: Plant = {
      id: createId(),
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.plants.add(plant);

    // Queue for sync
    await this.queueSync('create', plant);

    return plant;
  }

  /**
   * Get a plant by ID
   */
  async getById(id: string): Promise<Plant | undefined> {
    const db = getDatabase();
    return db.plants.get(id);
  }

  /**
   * Update a plant
   */
  async update(data: UpdatePlant): Promise<Plant | undefined> {
    const db = getDatabase();
    const existing = await db.plants.get(data.id);

    if (!existing) {
      return undefined;
    }

    const updated: Plant = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    await db.plants.put(updated);

    // Queue for sync
    await this.queueSync('update', updated);

    return updated;
  }

  /**
   * Soft delete a plant
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const existing = await db.plants.get(id);

    if (!existing) {
      return false;
    }

    const deleted: Plant = {
      ...existing,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };

    await db.plants.put(deleted);

    // Queue for sync
    await this.queueSync('delete', deleted);

    return true;
  }

  /**
   * Permanently delete a plant (hard delete)
   */
  async hardDelete(id: string): Promise<boolean> {
    const db = getDatabase();
    await db.plants.delete(id);
    return true;
  }

  /**
   * Restore a soft-deleted plant
   */
  async restore(id: string): Promise<Plant | undefined> {
    const db = getDatabase();
    const existing = await db.plants.get(id);

    if (!existing || !existing.deletedAt) {
      return undefined;
    }

    const restored: Plant = {
      ...existing,
      deletedAt: null,
      updatedAt: new Date(),
    };

    await db.plants.put(restored);

    // Queue for sync
    await this.queueSync('update', restored);

    return restored;
  }

  /**
   * List all plants with optional filtering
   */
  async list(filter?: PlantFilter): Promise<Plant[]> {
    const db = getDatabase();
    let query = db.plants.toCollection();

    // Filter by deleted status
    if (!filter?.includeDeleted) {
      query = query.filter((p) => !p.deletedAt);
    }

    // Filter by species
    if (filter?.species) {
      query = query.filter((p) => p.species === filter.species);
    }

    // Filter by location
    if (filter?.location) {
      query = query.filter((p) => p.location === filter.location);
    }

    let plants = await query.toArray();

    // Filter by tags (requires join with plantTags)
    if (filter?.tagIds && filter.tagIds.length > 0) {
      const plantTags = await db.plantTags.where('tagId').anyOf(filter.tagIds).toArray();

      const plantIds = new Set(plantTags.map((pt) => pt.plantId));
      plants = plants.filter((p) => plantIds.has(p.id));
    }

    return plants.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Count plants
   */
  async count(filter?: PlantFilter): Promise<number> {
    const plants = await this.list(filter);
    return plants.length;
  }

  /**
   * Queue a change for sync
   */
  private async queueSync(operation: 'create' | 'update' | 'delete', plant: Plant): Promise<void> {
    const db = getDatabase();

    await db.deviceSync.add({
      id: createId(),
      entityType: 'plant',
      entityId: plant.id,
      operation,
      data: JSON.stringify(plant),
      createdAt: new Date(),
      syncedAt: null,
      retryCount: 0,
      lastError: null,
    });
  }
}

// Export singleton instance
export const plantRepository = new PlantRepository();
