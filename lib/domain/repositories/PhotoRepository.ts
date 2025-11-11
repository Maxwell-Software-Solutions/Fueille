import { createId } from '@paralleldrive/cuid2';
import type { Photo, CreatePhoto, UpdatePhoto, PhotoFilter } from '../entities';
import { getDatabase } from '../database';

/**
 * Repository for Photo entities
 */
export class PhotoRepository {
  /**
   * Create a new photo
   */
  async create(data: CreatePhoto): Promise<Photo> {
    const db = getDatabase();
    const now = new Date();

    const photo: Photo = {
      id: createId(),
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.photos.add(photo);
    await this.queueSync('create', photo);

    return photo;
  }

  /**
   * Get a photo by ID
   */
  async getById(id: string): Promise<Photo | undefined> {
    const db = getDatabase();
    return db.photos.get(id);
  }

  /**
   * Update a photo
   */
  async update(data: UpdatePhoto): Promise<Photo | undefined> {
    const db = getDatabase();
    const existing = await db.photos.get(data.id);

    if (!existing) {
      return undefined;
    }

    const updated: Photo = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    await db.photos.put(updated);
    await this.queueSync('update', updated);

    return updated;
  }

  /**
   * Soft delete a photo
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const existing = await db.photos.get(id);

    if (!existing) {
      return false;
    }

    const deleted: Photo = {
      ...existing,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };

    await db.photos.put(deleted);
    await this.queueSync('delete', deleted);

    return true;
  }

  /**
   * List photos with optional filtering
   */
  async list(filter?: PhotoFilter): Promise<Photo[]> {
    const db = getDatabase();
    let query = db.photos.toCollection();

    // Filter by deleted status
    if (!filter?.includeDeleted) {
      query = query.filter((photo: Photo) => !photo.deletedAt);
    }

    let photos = await query.toArray();

    // Filter by plantId
    if (filter?.plantId) {
      photos = photos.filter((photo: Photo) => photo.plantId === filter.plantId);
    }

    return photos.sort((a: Photo, b: Photo) => b.takenAt.getTime() - a.takenAt.getTime());
  }

  /**
   * Queue a change for sync
   */
  private async queueSync(operation: 'create' | 'update' | 'delete', photo: Photo): Promise<void> {
    const db = getDatabase();

    await db.deviceSync.add({
      id: createId(),
      entityType: 'photo',
      entityId: photo.id,
      operation,
      data: JSON.stringify(photo),
      createdAt: new Date(),
      syncedAt: null,
      retryCount: 0,
      lastError: null,
    });
  }
}

// Export singleton instance
export const photoRepository = new PhotoRepository();
