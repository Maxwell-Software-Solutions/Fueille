import { createId } from '@paralleldrive/cuid2';
import type { CareTask, CreateCareTask, UpdateCareTask, CareTaskFilter } from '../entities';
import { getDatabase } from '../database';

/**
 * Repository for CareTask entities
 */
export class CareTaskRepository {
  /**
   * Create a new care task
   */
  async create(data: CreateCareTask): Promise<CareTask> {
    const db = getDatabase();
    const now = new Date();

    const careTask: CareTask = {
      id: createId(),
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.careTasks.add(careTask);
    await this.queueSync('create', careTask);

    return careTask;
  }

  /**
   * Get a care task by ID
   */
  async getById(id: string): Promise<CareTask | undefined> {
    const db = getDatabase();
    return db.careTasks.get(id);
  }

  /**
   * Update a care task
   */
  async update(data: UpdateCareTask): Promise<CareTask | undefined> {
    const db = getDatabase();
    const existing = await db.careTasks.get(data.id);

    if (!existing) {
      return undefined;
    }

    const updated: CareTask = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    await db.careTasks.put(updated);
    await this.queueSync('update', updated);

    return updated;
  }

  /**
   * Soft delete a care task
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const existing = await db.careTasks.get(id);

    if (!existing) {
      return false;
    }

    const deleted: CareTask = {
      ...existing,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };

    await db.careTasks.put(deleted);
    await this.queueSync('delete', deleted);

    return true;
  }

  /**
   * Complete a care task
   */
  async complete(id: string): Promise<CareTask | undefined> {
    const db = getDatabase();
    const existing = await db.careTasks.get(id);

    if (!existing) {
      return undefined;
    }

    const now = new Date();
    const completed: CareTask = {
      ...existing,
      completedAt: now,
      snoozedUntil: null, // Clear snooze when completing
      updatedAt: now,
    };

    // Handle recurring tasks
    if (existing.repeatInterval && existing.dueAt) {
      completed.completedAt = now;
      // Calculate next due date based on repeat interval
      const nextDue = this.calculateNextDueDate(
        existing.dueAt,
        existing.repeatInterval,
        existing.repeatCustomDays
      );
      completed.dueAt = nextDue;
    }

    await db.careTasks.put(completed);
    await this.queueSync('update', completed);

    return completed;
  }

  /**
   * Snooze a care task until a specific time
   */
  async snooze(id: string, until: Date): Promise<CareTask | undefined> {
    const db = getDatabase();
    const existing = await db.careTasks.get(id);

    if (!existing) {
      return undefined;
    }

    const snoozed: CareTask = {
      ...existing,
      snoozedUntil: until,
      updatedAt: new Date(),
    };

    await db.careTasks.put(snoozed);
    await this.queueSync('update', snoozed);

    return snoozed;
  }

  /**
   * List care tasks with optional filtering
   */
  async list(filter?: CareTaskFilter): Promise<CareTask[]> {
    const db = getDatabase();
    let query = db.careTasks.toCollection();

    // Filter by deleted status
    if (!filter?.includeDeleted) {
      query = query.filter((task: CareTask) => !task.deletedAt);
    }

    let tasks = await query.toArray();

    // Filter by plantId
    if (filter?.plantId) {
      tasks = tasks.filter((task: CareTask) => task.plantId === filter.plantId);
    }

    // Filter by taskType
    if (filter?.taskType) {
      tasks = tasks.filter((task: CareTask) => task.taskType === filter.taskType);
    }

    // Filter by completion status
    if (filter?.isCompleted !== undefined) {
      tasks = tasks.filter((task: CareTask) =>
        filter.isCompleted ? !!task.completedAt : !task.completedAt
      );
    }

    // Filter by due/overdue status
    const now = new Date();
    if (filter?.isDue) {
      tasks = tasks.filter((task: CareTask) => {
        if (!task.dueAt || task.completedAt) return false;
        // Skip snoozed tasks
        if (task.snoozedUntil && task.snoozedUntil > now) return false;
        return task.dueAt <= now;
      });
    }

    if (filter?.isOverdue) {
      tasks = tasks.filter((task: CareTask) => {
        if (!task.dueAt || task.completedAt) return false;
        if (task.snoozedUntil && task.snoozedUntil > now) return false;
        return task.dueAt < now;
      });
    }

    return tasks.sort((a: CareTask, b: CareTask) => {
      // Sort by due date (soonest first), then by creation date
      if (a.dueAt && b.dueAt) {
        return a.dueAt.getTime() - b.dueAt.getTime();
      }
      if (a.dueAt) return -1;
      if (b.dueAt) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Calculate next due date for recurring tasks
   */
  private calculateNextDueDate(
    currentDue: Date,
    interval: CareTask['repeatInterval'],
    customDays?: number | null
  ): Date {
    const next = new Date(currentDue);

    switch (interval) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'custom':
        if (customDays) {
          next.setDate(next.getDate() + customDays);
        }
        break;
    }

    return next;
  }

  /**
   * Queue a change for sync
   */
  private async queueSync(
    operation: 'create' | 'update' | 'delete',
    task: CareTask
  ): Promise<void> {
    const db = getDatabase();

    await db.deviceSync.add({
      id: createId(),
      entityType: 'careTask',
      entityId: task.id,
      operation,
      data: JSON.stringify(task),
      createdAt: new Date(),
      syncedAt: null,
      retryCount: 0,
      lastError: null,
    });
  }
}

// Export singleton instance
export const careTaskRepository = new CareTaskRepository();
