/**
 * @jest-environment jsdom
 */
import { CareTaskRepository } from './CareTaskRepository';
import { getDatabase } from '../database';
import type { CreateCareTask, UpdateCareTask, CareTaskFilter } from '../entities';

// Mock the database module
jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

// Mock cuid2
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id-123'),
}));

describe('CareTaskRepository', () => {
  let repository: CareTaskRepository;
  let mockDb: any;
  let mockCareTasksTable: any;
  let mockDeviceSyncTable: any;

  beforeEach(() => {
    mockCareTasksTable = {
      add: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      toCollection: jest.fn(() => ({
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn(),
      })),
    };

    mockDeviceSyncTable = {
      add: jest.fn(),
    };

    mockDb = {
      careTasks: mockCareTasksTable,
      deviceSync: mockDeviceSyncTable,
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    repository = new CareTaskRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new care task with all fields', async () => {
      const createData: CreateCareTask = {
        plantId: 'plant-1',
        title: 'Water the plant',
        taskType: 'water',
        dueAt: new Date('2026-04-01'),
      };

      const expectedTask = {
        id: 'test-id-123',
        ...createData,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        deletedAt: null,
      };

      mockCareTasksTable.add.mockResolvedValue('test-id-123');

      const result = await repository.create(createData);

      expect(result).toEqual(expectedTask);
      expect(mockCareTasksTable.add).toHaveBeenCalledWith(expectedTask);
      expect(mockDeviceSyncTable.add).toHaveBeenCalledWith({
        id: 'test-id-123',
        entityType: 'careTask',
        entityId: 'test-id-123',
        operation: 'create',
        data: expect.any(String),
        createdAt: expect.any(Date),
        syncedAt: null,
        retryCount: 0,
        lastError: null,
      });
    });

    it('should create task without optional fields', async () => {
      const createData: CreateCareTask = {
        plantId: 'plant-1',
        title: 'Fertilize',
        taskType: 'fertilize',
      };

      mockCareTasksTable.add.mockResolvedValue('test-id-123');

      const result = await repository.create(createData);

      expect(result.id).toBe('test-id-123');
      expect(result.plantId).toBe('plant-1');
      expect(result.taskType).toBe('fertilize');
      expect(result.deletedAt).toBeNull();
    });

    it('should handle database errors on create', async () => {
      const createData: CreateCareTask = {
        plantId: 'plant-1',
        title: 'Water',
        taskType: 'water',
      };

      mockCareTasksTable.add.mockRejectedValue(new Error('Database error'));

      await expect(repository.create(createData)).rejects.toThrow('Database error');
    });
  });

  describe('getById', () => {
    it('should return task by id', async () => {
      const mockTask = {
        id: 'task-1',
        plantId: 'plant-1',
        title: 'Water',
        taskType: 'water' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockCareTasksTable.get.mockResolvedValue(mockTask);

      const result = await repository.getById('task-1');

      expect(result).toEqual(mockTask);
      expect(mockCareTasksTable.get).toHaveBeenCalledWith('task-1');
    });

    it('should return undefined for non-existent task', async () => {
      mockCareTasksTable.get.mockResolvedValue(undefined);

      const result = await repository.getById('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    const mockExisting = {
      id: 'task-1',
      plantId: 'plant-1',
      title: 'Original Title',
      taskType: 'water' as const,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      deletedAt: null,
    };

    it('should update task fields and set updatedAt', async () => {
      const updateData: UpdateCareTask = {
        id: 'task-1',
        title: 'Updated Title',
      };

      mockCareTasksTable.get.mockResolvedValue(mockExisting);
      mockCareTasksTable.put.mockResolvedValue('task-1');

      const result = await repository.update(updateData);

      expect(result).toEqual({
        ...mockExisting,
        title: 'Updated Title',
        updatedAt: expect.any(Date),
      });
      expect(mockCareTasksTable.put).toHaveBeenCalled();
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should preserve unchanged fields', async () => {
      const updateData: UpdateCareTask = {
        id: 'task-1',
        title: 'New Title',
      };

      mockCareTasksTable.get.mockResolvedValue(mockExisting);
      mockCareTasksTable.put.mockResolvedValue('task-1');

      const result = await repository.update(updateData);

      expect(result?.plantId).toBe('plant-1');
      expect(result?.taskType).toBe('water');
    });

    it('should return undefined for non-existent task', async () => {
      mockCareTasksTable.get.mockResolvedValue(undefined);

      const result = await repository.update({ id: 'non-existent', title: 'Test' });

      expect(result).toBeUndefined();
      expect(mockCareTasksTable.put).not.toHaveBeenCalled();
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft delete task by setting deletedAt', async () => {
      const mockExisting = {
        id: 'task-1',
        plantId: 'plant-1',
        title: 'Water',
        taskType: 'water' as const,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      mockCareTasksTable.get.mockResolvedValue(mockExisting);
      mockCareTasksTable.put.mockResolvedValue('task-1');

      const result = await repository.delete('task-1');

      expect(result).toBe(true);
      const putCall = mockCareTasksTable.put.mock.calls[0][0];
      expect(putCall.deletedAt).toBeInstanceOf(Date);
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should return false if task does not exist', async () => {
      mockCareTasksTable.get.mockResolvedValue(undefined);

      const result = await repository.delete('non-existent');

      expect(result).toBe(false);
      expect(mockCareTasksTable.put).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // yesterday
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow

    const mockTasks = [
      {
        id: 'task-1',
        plantId: 'plant-1',
        title: 'Water plant 1',
        taskType: 'water' as const,
        dueAt: pastDate,
        completedAt: null,
        snoozedUntil: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      },
      {
        id: 'task-2',
        plantId: 'plant-2',
        title: 'Fertilize plant 2',
        taskType: 'fertilize' as const,
        dueAt: futureDate,
        completedAt: null,
        snoozedUntil: null,
        createdAt: new Date('2026-01-02'),
        updatedAt: new Date('2026-01-02'),
        deletedAt: null,
      },
      {
        id: 'task-3',
        plantId: 'plant-1',
        title: 'Completed water task',
        taskType: 'water' as const,
        dueAt: pastDate,
        completedAt: new Date(),
        snoozedUntil: null,
        createdAt: new Date('2026-01-03'),
        updatedAt: new Date('2026-01-03'),
        deletedAt: null,
      },
      {
        id: 'task-4',
        plantId: 'plant-3',
        title: 'Deleted task',
        taskType: 'prune' as const,
        dueAt: null,
        completedAt: null,
        snoozedUntil: null,
        createdAt: new Date('2026-01-04'),
        updatedAt: new Date('2026-01-04'),
        deletedAt: new Date(),
      },
    ];

    function setupListMock(tasks: any[]) {
      const mockCollection = {
        filter: jest.fn().mockImplementation(function (fn?: any) {
          return {
            filter: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValue(fn ? tasks.filter(fn) : tasks),
          };
        }),
        toArray: jest.fn().mockResolvedValue(tasks),
      };
      mockCareTasksTable.toCollection.mockReturnValue(mockCollection);
    }

    it('should list only non-deleted tasks by default', async () => {
      setupListMock(mockTasks.filter((t) => !t.deletedAt));

      const result = await repository.list();

      expect(result.every((t) => !t.deletedAt)).toBe(true);
    });

    it('should filter by plantId', async () => {
      const activeTasks = mockTasks.filter((t) => !t.deletedAt);
      setupListMock(activeTasks);

      const filter: CareTaskFilter = { plantId: 'plant-1' };
      const result = await repository.list(filter);

      expect(result.every((t) => t.plantId === 'plant-1')).toBe(true);
    });

    it('should filter by taskType', async () => {
      const activeTasks = mockTasks.filter((t) => !t.deletedAt);
      setupListMock(activeTasks);

      const filter: CareTaskFilter = { taskType: 'water' };
      const result = await repository.list(filter);

      expect(result.every((t) => t.taskType === 'water')).toBe(true);
    });

    it('should filter isCompleted: true', async () => {
      const activeTasks = mockTasks.filter((t) => !t.deletedAt);
      setupListMock(activeTasks);

      const filter: CareTaskFilter = { isCompleted: true };
      const result = await repository.list(filter);

      expect(result.every((t) => !!t.completedAt)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter isCompleted: false', async () => {
      const activeTasks = mockTasks.filter((t) => !t.deletedAt);
      setupListMock(activeTasks);

      const filter: CareTaskFilter = { isCompleted: false };
      const result = await repository.list(filter);

      expect(result.every((t) => !t.completedAt)).toBe(true);
    });

    it('should filter isDue: true — tasks past due and not completed', async () => {
      const activeTasks = mockTasks.filter((t) => !t.deletedAt);
      setupListMock(activeTasks);

      const filter: CareTaskFilter = { isDue: true };
      const result = await repository.list(filter);

      result.forEach((t) => {
        expect(t.dueAt).toBeTruthy();
        expect(t.completedAt).toBeFalsy();
        expect(new Date(t.dueAt!).getTime()).toBeLessThanOrEqual(new Date().getTime() + 1000);
      });
    });

    it('should filter isOverdue: true — tasks strictly past due date', async () => {
      const activeTasks = mockTasks.filter((t) => !t.deletedAt);
      setupListMock(activeTasks);

      const filter: CareTaskFilter = { isOverdue: true };
      const result = await repository.list(filter);

      result.forEach((t) => {
        expect(t.completedAt).toBeFalsy();
        expect(new Date(t.dueAt!).getTime()).toBeLessThan(new Date().getTime());
      });
    });

    it('should include deleted tasks when includeDeleted is true', async () => {
      setupListMock(mockTasks);

      const filter: CareTaskFilter = { includeDeleted: true };
      const result = await repository.list(filter);

      expect(result.some((t) => !!t.deletedAt)).toBe(true);
    });

    it('should handle empty results', async () => {
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockCareTasksTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.list();

      expect(result).toEqual([]);
    });
  });

  describe('complete', () => {
    it('should complete a non-recurring task — sets completedAt, does not change dueAt', async () => {
      const mockTask = {
        id: 'task-1',
        plantId: 'plant-1',
        title: 'Water',
        taskType: 'water' as const,
        dueAt: new Date('2026-04-01'),
        completedAt: null,
        snoozedUntil: new Date('2026-04-02'), // should be cleared
        repeatInterval: null,
        repeatCustomDays: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      mockCareTasksTable.get.mockResolvedValue(mockTask);
      mockCareTasksTable.put.mockResolvedValue('task-1');

      const result = await repository.complete('task-1');

      expect(result).toBeDefined();
      expect(result!.completedAt).toBeInstanceOf(Date);
      expect(result!.snoozedUntil).toBeNull();
      // Non-recurring: dueAt stays the same (no next due calculated)
      expect(result!.dueAt).toEqual(new Date('2026-04-01'));
    });

    it('should return undefined for non-existent task', async () => {
      mockCareTasksTable.get.mockResolvedValue(undefined);

      const result = await repository.complete('non-existent');

      expect(result).toBeUndefined();
    });

    it('should complete a daily recurring task — sets next dueAt to +1 day', async () => {
      const due = new Date('2026-04-01T10:00:00.000Z');
      const mockTask = {
        id: 'task-1',
        plantId: 'plant-1',
        title: 'Daily water',
        taskType: 'water' as const,
        dueAt: due,
        completedAt: null,
        snoozedUntil: null,
        repeatInterval: 'daily' as const,
        repeatCustomDays: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      mockCareTasksTable.get.mockResolvedValue(mockTask);
      mockCareTasksTable.put.mockResolvedValue('task-1');

      const result = await repository.complete('task-1');

      expect(result).toBeDefined();
      expect(result!.completedAt).toBeInstanceOf(Date);
      const expectedNext = new Date(due);
      expectedNext.setDate(expectedNext.getDate() + 1);
      expect(result!.dueAt).toEqual(expectedNext);
    });

    it('should complete a weekly recurring task — sets next dueAt to +7 days', async () => {
      const due = new Date('2026-04-01T10:00:00.000Z');
      const mockTask = {
        id: 'task-1',
        plantId: 'plant-1',
        title: 'Weekly water',
        taskType: 'water' as const,
        dueAt: due,
        completedAt: null,
        snoozedUntil: null,
        repeatInterval: 'weekly' as const,
        repeatCustomDays: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      mockCareTasksTable.get.mockResolvedValue(mockTask);
      mockCareTasksTable.put.mockResolvedValue('task-1');

      const result = await repository.complete('task-1');

      const expectedNext = new Date(due);
      expectedNext.setDate(expectedNext.getDate() + 7);
      expect(result!.dueAt).toEqual(expectedNext);
    });

    it('should complete a biweekly recurring task — sets next dueAt to +14 days', async () => {
      const due = new Date('2026-04-01T10:00:00.000Z');
      const mockTask = {
        id: 'task-1',
        plantId: 'plant-1',
        title: 'Biweekly prune',
        taskType: 'prune' as const,
        dueAt: due,
        completedAt: null,
        snoozedUntil: null,
        repeatInterval: 'biweekly' as const,
        repeatCustomDays: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      mockCareTasksTable.get.mockResolvedValue(mockTask);
      mockCareTasksTable.put.mockResolvedValue('task-1');

      const result = await repository.complete('task-1');

      const expectedNext = new Date(due);
      expectedNext.setDate(expectedNext.getDate() + 14);
      expect(result!.dueAt).toEqual(expectedNext);
    });

    it('should complete a monthly recurring task — sets next dueAt to +1 month', async () => {
      const due = new Date('2026-04-01T10:00:00.000Z');
      const mockTask = {
        id: 'task-1',
        plantId: 'plant-1',
        title: 'Monthly fertilize',
        taskType: 'fertilize' as const,
        dueAt: due,
        completedAt: null,
        snoozedUntil: null,
        repeatInterval: 'monthly' as const,
        repeatCustomDays: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      mockCareTasksTable.get.mockResolvedValue(mockTask);
      mockCareTasksTable.put.mockResolvedValue('task-1');

      const result = await repository.complete('task-1');

      const expectedNext = new Date(due);
      expectedNext.setMonth(expectedNext.getMonth() + 1);
      expect(result!.dueAt).toEqual(expectedNext);
    });

    it('should complete a custom recurring task — sets next dueAt to +N days', async () => {
      const due = new Date('2026-04-01T10:00:00.000Z');
      const mockTask = {
        id: 'task-1',
        plantId: 'plant-1',
        title: 'Custom task',
        taskType: 'other' as const,
        dueAt: due,
        completedAt: null,
        snoozedUntil: null,
        repeatInterval: 'custom' as const,
        repeatCustomDays: 10,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      mockCareTasksTable.get.mockResolvedValue(mockTask);
      mockCareTasksTable.put.mockResolvedValue('task-1');

      const result = await repository.complete('task-1');

      const expectedNext = new Date(due);
      expectedNext.setDate(expectedNext.getDate() + 10);
      expect(result!.dueAt).toEqual(expectedNext);
    });

    it('should not advance dueAt for recurring task without a dueAt set', async () => {
      const mockTask = {
        id: 'task-1',
        plantId: 'plant-1',
        title: 'Water no due',
        taskType: 'water' as const,
        dueAt: null,
        completedAt: null,
        snoozedUntil: null,
        repeatInterval: 'weekly' as const,
        repeatCustomDays: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      mockCareTasksTable.get.mockResolvedValue(mockTask);
      mockCareTasksTable.put.mockResolvedValue('task-1');

      const result = await repository.complete('task-1');

      expect(result!.completedAt).toBeInstanceOf(Date);
      // No dueAt means no next date calculated — dueAt stays null
      expect(result!.dueAt).toBeNull();
    });
  });

  describe('snooze', () => {
    it('should set snoozedUntil on the task', async () => {
      const mockTask = {
        id: 'task-1',
        plantId: 'plant-1',
        title: 'Water',
        taskType: 'water' as const,
        dueAt: new Date('2026-04-01'),
        completedAt: null,
        snoozedUntil: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      const snoozeUntil = new Date('2026-04-05');
      mockCareTasksTable.get.mockResolvedValue(mockTask);
      mockCareTasksTable.put.mockResolvedValue('task-1');

      const result = await repository.snooze('task-1', snoozeUntil);

      expect(result).toBeDefined();
      expect(result!.snoozedUntil).toEqual(snoozeUntil);
      expect(result!.updatedAt).toBeInstanceOf(Date);
      expect(mockCareTasksTable.put).toHaveBeenCalledWith(
        expect.objectContaining({ snoozedUntil: snoozeUntil })
      );
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should return undefined for non-existent task', async () => {
      mockCareTasksTable.get.mockResolvedValue(undefined);

      const result = await repository.snooze('non-existent', new Date());

      expect(result).toBeUndefined();
    });

    it('should not modify other task fields when snoozing', async () => {
      const mockTask = {
        id: 'task-1',
        plantId: 'plant-1',
        title: 'Fertilize',
        taskType: 'fertilize' as const,
        dueAt: new Date('2026-04-01'),
        completedAt: null,
        snoozedUntil: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      const snoozeUntil = new Date('2026-04-03');
      mockCareTasksTable.get.mockResolvedValue(mockTask);
      mockCareTasksTable.put.mockResolvedValue('task-1');

      const result = await repository.snooze('task-1', snoozeUntil);

      expect(result!.plantId).toBe('plant-1');
      expect(result!.title).toBe('Fertilize');
      expect(result!.taskType).toBe('fertilize');
      expect(result!.completedAt).toBeNull();
    });
  });
});
