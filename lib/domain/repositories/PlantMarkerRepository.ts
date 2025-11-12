import { createId } from '@paralleldrive/cuid2';
import type {
  PlantMarker,
  CreatePlantMarker,
  UpdatePlantMarker,
  PlantMarkerFilter,
  Plant,
} from '../entities';
import { getDatabase } from '../database';

/**
 * Repository for PlantMarker entities
 * Provides CRUD operations and query helpers
 */
export class PlantMarkerRepository {
  /**
   * Create a new plant marker
   */
  async create(data: CreatePlantMarker): Promise<PlantMarker> {
    const db = getDatabase();
    const now = new Date();

    const marker: PlantMarker = {
      id: createId(),
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.plantMarkers.add(marker);

    // Queue for sync
    await this.queueSync('create', marker);

    return marker;
  }

  /**
   * Get a plant marker by ID
   */
  async getById(id: string): Promise<PlantMarker | undefined> {
    const db = getDatabase();
    return db.plantMarkers.get(id);
  }

  /**
   * Update a plant marker
   */
  async update(data: UpdatePlantMarker): Promise<PlantMarker | undefined> {
    const db = getDatabase();
    const existing = await db.plantMarkers.get(data.id);

    if (!existing) {
      return undefined;
    }

    const updated: PlantMarker = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    await db.plantMarkers.put(updated);

    // Queue for sync
    await this.queueSync('update', updated);

    return updated;
  }

  /**
   * Soft delete a plant marker
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const existing = await db.plantMarkers.get(id);

    if (!existing) {
      return false;
    }

    const deleted: PlantMarker = {
      ...existing,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };

    await db.plantMarkers.put(deleted);

    // Queue for sync
    await this.queueSync('delete', deleted);

    return true;
  }

  /**
   * Permanently delete a plant marker (hard delete)
   */
  async hardDelete(id: string): Promise<boolean> {
    const db = getDatabase();
    await db.plantMarkers.delete(id);
    return true;
  }

  /**
   * Restore a soft-deleted marker
   */
  async restore(id: string): Promise<PlantMarker | undefined> {
    const db = getDatabase();
    const existing = await db.plantMarkers.get(id);

    if (!existing || !existing.deletedAt) {
      return undefined;
    }

    const restored: PlantMarker = {
      ...existing,
      deletedAt: null,
      updatedAt: new Date(),
    };

    await db.plantMarkers.put(restored);

    // Queue for sync
    await this.queueSync('update', restored);

    return restored;
  }

  /**
   * List markers with optional filtering
   */
  async list(filter?: PlantMarkerFilter): Promise<PlantMarker[]> {
    const db = getDatabase();
    let query = db.plantMarkers.toCollection();

    // Filter by deleted status
    if (!filter?.includeDeleted) {
      query = query.filter((m) => !m.deletedAt);
    }

    // Filter by layoutId
    if (filter?.layoutId) {
      query = query.filter((m) => m.layoutId === filter.layoutId);
    }

    // Filter by plantId
    if (filter?.plantId) {
      query = query.filter((m) => m.plantId === filter.plantId);
    }

    return query.toArray();
  }

  /**
   * Get all markers for a layout with plant details
   */
  async getMarkersWithPlants(layoutId: string): Promise<Array<PlantMarker & { plant?: Plant }>> {
    const db = getDatabase();
    const markers = await this.list({ layoutId });

    // Hydrate with plant data
    const markersWithPlants = await Promise.all(
      markers.map(async (marker) => {
        const plant = await db.plants.get(marker.plantId);
        return { ...marker, plant };
      })
    );

    return markersWithPlants;
  }

  /**
   * Update marker position (frequent operation during drag)
   */
  async updatePosition(
    id: string,
    positionX: number,
    positionY: number
  ): Promise<PlantMarker | undefined> {
    return this.update({
      id,
      positionX,
      positionY,
    });
  }

  /**
   * Count markers
   */
  async count(filter?: PlantMarkerFilter): Promise<number> {
    const markers = await this.list(filter);
    return markers.length;
  }

  /**
   * Queue a change for sync
   */
  private async queueSync(
    operation: 'create' | 'update' | 'delete',
    marker: PlantMarker
  ): Promise<void> {
    const db = getDatabase();

    await db.deviceSync.add({
      id: createId(),
      entityType: 'plantMarker',
      entityId: marker.id,
      operation,
      data: JSON.stringify(marker),
      createdAt: new Date(),
      syncedAt: null,
      retryCount: 0,
      lastError: null,
    });
  }
}

// Export singleton instance
export const plantMarkerRepository = new PlantMarkerRepository();
