import { createId } from '@paralleldrive/cuid2';
import type { Layout, CreateLayout, UpdateLayout, LayoutFilter } from '../entities';
import { getDatabase } from '../database';

/**
 * Repository for Layout entities
 * Provides CRUD operations and query helpers
 */
export class LayoutRepository {
  /**
   * Create a new layout
   */
  async create(data: CreateLayout): Promise<Layout> {
    const db = getDatabase();
    const now = new Date();

    const layout: Layout = {
      id: createId(),
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.layouts.add(layout);

    // Queue for sync
    await this.queueSync('create', layout);

    return layout;
  }

  /**
   * Get a layout by ID
   */
  async getById(id: string): Promise<Layout | undefined> {
    const db = getDatabase();
    return db.layouts.get(id);
  }

  /**
   * Update a layout
   */
  async update(data: UpdateLayout): Promise<Layout | undefined> {
    const db = getDatabase();
    const existing = await db.layouts.get(data.id);

    if (!existing) {
      return undefined;
    }

    const updated: Layout = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    await db.layouts.put(updated);

    // Queue for sync
    await this.queueSync('update', updated);

    return updated;
  }

  /**
   * Soft delete a layout
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const existing = await db.layouts.get(id);

    if (!existing) {
      return false;
    }

    const deleted: Layout = {
      ...existing,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };

    await db.layouts.put(deleted);

    // Queue for sync
    await this.queueSync('delete', deleted);

    return true;
  }

  /**
   * Permanently delete a layout (hard delete)
   */
  async hardDelete(id: string): Promise<boolean> {
    const db = getDatabase();
    await db.layouts.delete(id);
    return true;
  }

  /**
   * Restore a soft-deleted layout
   */
  async restore(id: string): Promise<Layout | undefined> {
    const db = getDatabase();
    const existing = await db.layouts.get(id);

    if (!existing || !existing.deletedAt) {
      return undefined;
    }

    const restored: Layout = {
      ...existing,
      deletedAt: null,
      updatedAt: new Date(),
    };

    await db.layouts.put(restored);

    // Queue for sync
    await this.queueSync('update', restored);

    return restored;
  }

  /**
   * List all layouts with optional filtering
   */
  async list(filter?: LayoutFilter): Promise<Layout[]> {
    const db = getDatabase();
    let query = db.layouts.toCollection();

    // Filter by deleted status
    if (!filter?.includeDeleted) {
      query = query.filter((l) => !l.deletedAt);
    }

    // Filter by type
    if (filter?.type) {
      query = query.filter((l) => l.type === filter.type);
    }

    const layouts = await query.toArray();
    return layouts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Count layouts
   */
  async count(filter?: LayoutFilter): Promise<number> {
    const layouts = await this.list(filter);
    return layouts.length;
  }

  /**
   * Queue a change for sync
   */
  private async queueSync(
    operation: 'create' | 'update' | 'delete',
    layout: Layout
  ): Promise<void> {
    const db = getDatabase();

    await db.deviceSync.add({
      id: createId(),
      entityType: 'layout',
      entityId: layout.id,
      operation,
      data: JSON.stringify(layout),
      createdAt: new Date(),
      syncedAt: null,
      retryCount: 0,
      lastError: null,
    });
  }
}

// Export singleton instance
export const layoutRepository = new LayoutRepository();
