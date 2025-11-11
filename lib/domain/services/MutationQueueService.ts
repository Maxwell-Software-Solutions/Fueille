import { getDatabase } from '../database';
import type { DeviceSync } from '../entities';

/**
 * Mutation Queue Service
 * Manages offline mutations and syncs them when online
 * Implements last-write-wins conflict resolution via updatedAt timestamps
 */
export class MutationQueueService {
  /**
   * Get all pending (un-synced) mutations
   */
  async getPending(): Promise<DeviceSync[]> {
    const db = getDatabase();
    return db.deviceSync
      .where('syncedAt')
      .equals(null as any) // Query for null values
      .sortBy('createdAt');
  }

  /**
   * Get pending mutations for a specific entity type
   */
  async getPendingByType(entityType: DeviceSync['entityType']): Promise<DeviceSync[]> {
    const db = getDatabase();
    return db.deviceSync
      .where('entityType')
      .equals(entityType)
      .and((sync: DeviceSync) => sync.syncedAt === null)
      .sortBy('createdAt');
  }

  /**
   * Mark a mutation as successfully synced
   */
  async markSynced(id: string): Promise<void> {
    const db = getDatabase();
    const sync = await db.deviceSync.get(id);

    if (sync) {
      await db.deviceSync.update(id, {
        syncedAt: new Date(),
        lastError: null,
      });
    }
  }

  /**
   * Mark a mutation as failed with error message
   */
  async markFailed(id: string, error: string): Promise<void> {
    const db = getDatabase();
    const sync = await db.deviceSync.get(id);

    if (sync) {
      await db.deviceSync.update(id, {
        retryCount: sync.retryCount + 1,
        lastError: error,
      });
    }
  }

  /**
   * Get mutation count by status
   */
  async getCounts(): Promise<{ total: number; pending: number; synced: number; failed: number }> {
    const db = getDatabase();
    const all = await db.deviceSync.toArray();

    return {
      total: all.length,
      pending: all.filter((s: DeviceSync) => s.syncedAt === null && s.retryCount === 0).length,
      synced: all.filter((s: DeviceSync) => s.syncedAt !== null).length,
      failed: all.filter((s: DeviceSync) => s.syncedAt === null && s.retryCount > 0).length,
    };
  }

  /**
   * Clear old synced mutations (cleanup)
   * Keeps mutations synced within the last N days
   */
  async clearOldSynced(daysToKeep: number = 7): Promise<number> {
    const db = getDatabase();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const oldSynced = await db.deviceSync.where('syncedAt').below(cutoff).toArray();

    const ids = oldSynced.map((s: DeviceSync) => s.id);
    await db.deviceSync.bulkDelete(ids);

    return ids.length;
  }

  /**
   * Resolve conflicts using last-write-wins strategy
   * Compare updatedAt timestamps between local and remote versions
   */
  resolveConflict<T extends { updatedAt: Date }>(local: T, remote: T): T {
    // Last-write-wins: keep the version with the most recent updatedAt
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();

    return localTime > remoteTime ? local : remote;
  }

  /**
   * Batch mutations for efficient sync
   * Groups by entity type and operation
   */
  async batchPending(): Promise<Map<string, DeviceSync[]>> {
    const pending = await this.getPending();
    const batches = new Map<string, DeviceSync[]>();

    for (const sync of pending) {
      const key = `${sync.entityType}:${sync.operation}`;
      if (!batches.has(key)) {
        batches.set(key, []);
      }
      batches.get(key)!.push(sync);
    }

    return batches;
  }

  /**
   * Get statistics about the mutation queue
   */
  async getStats(): Promise<{
    pending: number;
    synced: number;
    failed: number;
    oldestPending?: Date;
    newestSynced?: Date;
    failureRate: number;
  }> {
    const db = getDatabase();
    const all = await db.deviceSync.toArray();

    const pending = all.filter((s: DeviceSync) => s.syncedAt === null && s.retryCount === 0);
    const synced = all.filter((s: DeviceSync) => s.syncedAt !== null);
    const failed = all.filter((s: DeviceSync) => s.syncedAt === null && s.retryCount > 0);

    const oldestPending =
      pending.length > 0
        ? new Date(Math.min(...pending.map((s: DeviceSync) => s.createdAt.getTime())))
        : undefined;

    const newestSynced =
      synced.length > 0
        ? new Date(Math.max(...synced.map((s: DeviceSync) => s.syncedAt!.getTime())))
        : undefined;

    const failureRate = all.length > 0 ? failed.length / all.length : 0;

    return {
      pending: pending.length,
      synced: synced.length,
      failed: failed.length,
      oldestPending,
      newestSynced,
      failureRate,
    };
  }
}

// Export singleton instance
export const mutationQueueService = new MutationQueueService();
