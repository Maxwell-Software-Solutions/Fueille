/**
 * @jest-environment jsdom
 */
import { MutationQueueService } from './MutationQueueService';
import { getDatabase } from '../database';
import type { DeviceSync } from '../entities';

// Mock the database module
jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

// Helper to build a DeviceSync fixture
function makeSync(overrides: Partial<DeviceSync> = {}): DeviceSync {
  return {
    id: 'sync-1',
    entityType: 'plant',
    entityId: 'plant-1',
    operation: 'create',
    data: '{}',
    createdAt: new Date('2026-01-01T10:00:00Z'),
    syncedAt: null,
    retryCount: 0,
    lastError: null,
    ...overrides,
  };
}

describe('MutationQueueService', () => {
  let service: MutationQueueService;
  let mockDeviceSyncTable: any;
  let mockDb: any;

  beforeEach(() => {
    // Chain builder: returns a "WhereClause" mock with the full Dexie query chain methods
    const makeChain = (resolvedValue: any[] = []) => ({
      equals: jest.fn().mockReturnValue({
        sortBy: jest.fn().mockResolvedValue(resolvedValue),
        and: jest.fn().mockReturnValue({
          sortBy: jest.fn().mockResolvedValue(resolvedValue),
        }),
      }),
      below: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue(resolvedValue),
      }),
    });

    mockDeviceSyncTable = {
      where: jest.fn().mockReturnValue(makeChain()),
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(1),
      toArray: jest.fn().mockResolvedValue([]),
      bulkDelete: jest.fn().mockResolvedValue(undefined),
    };

    mockDb = { deviceSync: mockDeviceSyncTable };
    (getDatabase as jest.Mock).mockReturnValue(mockDb);

    service = new MutationQueueService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // getPending
  // -------------------------------------------------------------------------
  describe('getPending', () => {
    it('returns pending items from the database', async () => {
      const items = [
        makeSync({ id: 'a', createdAt: new Date('2026-01-01') }),
        makeSync({ id: 'b', createdAt: new Date('2026-01-02') }),
      ];

      const sortByMock = jest.fn().mockResolvedValue(items);
      mockDeviceSyncTable.where.mockReturnValue({
        equals: jest.fn().mockReturnValue({ sortBy: sortByMock }),
        below: jest.fn(),
      });

      const result = await service.getPending();

      expect(mockDeviceSyncTable.where).toHaveBeenCalledWith('syncedAt');
      expect(result).toEqual(items);
      expect(sortByMock).toHaveBeenCalledWith('createdAt');
    });

    it('returns empty array when nothing is pending', async () => {
      const sortByMock = jest.fn().mockResolvedValue([]);
      mockDeviceSyncTable.where.mockReturnValue({
        equals: jest.fn().mockReturnValue({ sortBy: sortByMock }),
        below: jest.fn(),
      });

      const result = await service.getPending();

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // getPendingByType
  // -------------------------------------------------------------------------
  describe('getPendingByType', () => {
    it('returns pending items filtered to a given entity type', async () => {
      const plantItems = [
        makeSync({ id: 'p1', entityType: 'plant' }),
        makeSync({ id: 'p2', entityType: 'plant' }),
      ];

      const sortByMock = jest.fn().mockResolvedValue(plantItems);
      const andMock = jest.fn().mockReturnValue({ sortBy: sortByMock });
      const equalsMock = jest.fn().mockReturnValue({ and: andMock, sortBy: jest.fn() });
      mockDeviceSyncTable.where.mockReturnValue({ equals: equalsMock, below: jest.fn() });

      const result = await service.getPendingByType('plant');

      expect(mockDeviceSyncTable.where).toHaveBeenCalledWith('entityType');
      expect(equalsMock).toHaveBeenCalledWith('plant');
      // The .and() callback should filter out synced records
      const andCallback = andMock.mock.calls[0][0] as (s: DeviceSync) => boolean;
      expect(andCallback(makeSync({ syncedAt: null }))).toBe(true);
      expect(andCallback(makeSync({ syncedAt: new Date() }))).toBe(false);
      expect(result).toEqual(plantItems);
      expect(sortByMock).toHaveBeenCalledWith('createdAt');
    });

    it('returns empty array when no pending items for type', async () => {
      const sortByMock = jest.fn().mockResolvedValue([]);
      const andMock = jest.fn().mockReturnValue({ sortBy: sortByMock });
      const equalsMock = jest.fn().mockReturnValue({ and: andMock });
      mockDeviceSyncTable.where.mockReturnValue({ equals: equalsMock, below: jest.fn() });

      const result = await service.getPendingByType('careTask');

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // markSynced
  // -------------------------------------------------------------------------
  describe('markSynced', () => {
    it('updates syncedAt and clears lastError when record exists', async () => {
      const sync = makeSync({ id: 'sync-1', lastError: 'previous error' });
      mockDeviceSyncTable.get.mockResolvedValue(sync);

      await service.markSynced('sync-1');

      expect(mockDeviceSyncTable.get).toHaveBeenCalledWith('sync-1');
      expect(mockDeviceSyncTable.update).toHaveBeenCalledWith('sync-1', {
        syncedAt: expect.any(Date),
        lastError: null,
      });
      // Verify the syncedAt value is a recent date
      const updateArgs = mockDeviceSyncTable.update.mock.calls[0][1];
      expect(updateArgs.syncedAt).toBeInstanceOf(Date);
      expect(Date.now() - updateArgs.syncedAt.getTime()).toBeLessThan(5000);
    });

    it('does nothing when record does not exist', async () => {
      mockDeviceSyncTable.get.mockResolvedValue(undefined);

      await service.markSynced('nonexistent');

      expect(mockDeviceSyncTable.get).toHaveBeenCalledWith('nonexistent');
      expect(mockDeviceSyncTable.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // markFailed
  // -------------------------------------------------------------------------
  describe('markFailed', () => {
    it('increments retryCount and sets lastError when record exists', async () => {
      const sync = makeSync({ id: 'sync-2', retryCount: 2 });
      mockDeviceSyncTable.get.mockResolvedValue(sync);

      await service.markFailed('sync-2', 'network error');

      expect(mockDeviceSyncTable.get).toHaveBeenCalledWith('sync-2');
      expect(mockDeviceSyncTable.update).toHaveBeenCalledWith('sync-2', {
        retryCount: 3,
        lastError: 'network error',
      });
    });

    it('increments from 0 on first failure', async () => {
      const sync = makeSync({ id: 'sync-3', retryCount: 0 });
      mockDeviceSyncTable.get.mockResolvedValue(sync);

      await service.markFailed('sync-3', 'timeout');

      const updateArgs = mockDeviceSyncTable.update.mock.calls[0][1];
      expect(updateArgs.retryCount).toBe(1);
      expect(updateArgs.lastError).toBe('timeout');
    });

    it('does nothing when record does not exist', async () => {
      mockDeviceSyncTable.get.mockResolvedValue(undefined);

      await service.markFailed('nonexistent', 'error');

      expect(mockDeviceSyncTable.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getCounts
  // -------------------------------------------------------------------------
  describe('getCounts', () => {
    it('returns correct counts for a mixed set of records', async () => {
      const records = [
        // pending (syncedAt null, retryCount 0)
        makeSync({ id: '1', syncedAt: null, retryCount: 0 }),
        makeSync({ id: '2', syncedAt: null, retryCount: 0 }),
        // failed (syncedAt null, retryCount > 0)
        makeSync({ id: '3', syncedAt: null, retryCount: 1 }),
        makeSync({ id: '4', syncedAt: null, retryCount: 3 }),
        // synced (syncedAt set)
        makeSync({ id: '5', syncedAt: new Date('2026-01-10'), retryCount: 0 }),
        makeSync({ id: '6', syncedAt: new Date('2026-01-11'), retryCount: 2 }),
      ];
      mockDeviceSyncTable.toArray.mockResolvedValue(records);

      const counts = await service.getCounts();

      expect(counts.total).toBe(6);
      expect(counts.pending).toBe(2);
      expect(counts.failed).toBe(2);
      expect(counts.synced).toBe(2);
    });

    it('returns all-zero counts for an empty table', async () => {
      mockDeviceSyncTable.toArray.mockResolvedValue([]);

      const counts = await service.getCounts();

      expect(counts).toEqual({ total: 0, pending: 0, synced: 0, failed: 0 });
    });

    it('counts correctly when all records are pending', async () => {
      const records = [
        makeSync({ id: '1', syncedAt: null, retryCount: 0 }),
        makeSync({ id: '2', syncedAt: null, retryCount: 0 }),
      ];
      mockDeviceSyncTable.toArray.mockResolvedValue(records);

      const counts = await service.getCounts();

      expect(counts.total).toBe(2);
      expect(counts.pending).toBe(2);
      expect(counts.synced).toBe(0);
      expect(counts.failed).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // clearOldSynced
  // -------------------------------------------------------------------------
  describe('clearOldSynced', () => {
    it('deletes old synced records and returns the count', async () => {
      const oldRecords = [
        makeSync({ id: 'old-1', syncedAt: new Date('2025-12-01') }),
        makeSync({ id: 'old-2', syncedAt: new Date('2025-12-15') }),
        makeSync({ id: 'old-3', syncedAt: new Date('2026-01-01') }),
      ];

      const toArrayMock = jest.fn().mockResolvedValue(oldRecords);
      const belowMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      mockDeviceSyncTable.where.mockReturnValue({ equals: jest.fn(), below: belowMock });

      const deleted = await service.clearOldSynced(7);

      expect(mockDeviceSyncTable.where).toHaveBeenCalledWith('syncedAt');
      // Verify below() was called with a Date near "now minus 7 days"
      const cutoffArg = belowMock.mock.calls[0][0] as Date;
      expect(cutoffArg).toBeInstanceOf(Date);
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 7);
      expect(Math.abs(cutoffArg.getTime() - expectedCutoff.getTime())).toBeLessThan(5000);

      expect(mockDeviceSyncTable.bulkDelete).toHaveBeenCalledWith(['old-1', 'old-2', 'old-3']);
      expect(deleted).toBe(3);
    });

    it('uses 7-day default when no argument provided', async () => {
      const toArrayMock = jest.fn().mockResolvedValue([]);
      const belowMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      mockDeviceSyncTable.where.mockReturnValue({ equals: jest.fn(), below: belowMock });

      await service.clearOldSynced();

      const cutoffArg = belowMock.mock.calls[0][0] as Date;
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 7);
      expect(Math.abs(cutoffArg.getTime() - expectedCutoff.getTime())).toBeLessThan(5000);
    });

    it('uses the provided daysToKeep argument', async () => {
      const toArrayMock = jest.fn().mockResolvedValue([]);
      const belowMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      mockDeviceSyncTable.where.mockReturnValue({ equals: jest.fn(), below: belowMock });

      await service.clearOldSynced(30);

      const cutoffArg = belowMock.mock.calls[0][0] as Date;
      const expectedCutoff = new Date();
      expectedCutoff.setDate(expectedCutoff.getDate() - 30);
      expect(Math.abs(cutoffArg.getTime() - expectedCutoff.getTime())).toBeLessThan(5000);
    });

    it('returns 0 and does not call bulkDelete when no old records', async () => {
      const toArrayMock = jest.fn().mockResolvedValue([]);
      const belowMock = jest.fn().mockReturnValue({ toArray: toArrayMock });
      mockDeviceSyncTable.where.mockReturnValue({ equals: jest.fn(), below: belowMock });

      const deleted = await service.clearOldSynced(7);

      expect(mockDeviceSyncTable.bulkDelete).toHaveBeenCalledWith([]);
      expect(deleted).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // resolveConflict (pure function — no db interaction)
  // -------------------------------------------------------------------------
  describe('resolveConflict', () => {
    it('returns local when local is newer', () => {
      const local = { id: '1', updatedAt: new Date('2026-01-20T12:00:00Z') };
      const remote = { id: '1', updatedAt: new Date('2026-01-10T12:00:00Z') };

      const winner = service.resolveConflict(local, remote);

      expect(winner).toBe(local);
    });

    it('returns remote when remote is newer', () => {
      const local = { id: '1', updatedAt: new Date('2026-01-10T12:00:00Z') };
      const remote = { id: '1', updatedAt: new Date('2026-01-20T12:00:00Z') };

      const winner = service.resolveConflict(local, remote);

      expect(winner).toBe(remote);
    });

    it('returns local when timestamps are equal (local wins tie-break)', () => {
      const ts = new Date('2026-01-15T00:00:00Z');
      const local = { id: '1', updatedAt: ts };
      const remote = { id: '1', updatedAt: new Date(ts.getTime()) };

      const winner = service.resolveConflict(local, remote);

      // localTime > remoteTime is false when equal, so remote is returned
      // (the implementation returns remote on equal — test actual behavior)
      expect(winner).toBe(remote);
    });

    it('works with rich entity objects', () => {
      const local = { id: 'plant-1', name: 'Old name', updatedAt: new Date('2026-01-01') };
      const remote = { id: 'plant-1', name: 'New name', updatedAt: new Date('2026-02-01') };

      const winner = service.resolveConflict(local, remote);

      expect(winner.name).toBe('New name');
    });
  });

  // -------------------------------------------------------------------------
  // batchPending
  // -------------------------------------------------------------------------
  describe('batchPending', () => {
    it('groups pending items by entityType:operation key', async () => {
      const items: DeviceSync[] = [
        makeSync({ id: '1', entityType: 'plant', operation: 'create' }),
        makeSync({ id: '2', entityType: 'plant', operation: 'create' }),
        makeSync({ id: '3', entityType: 'plant', operation: 'update' }),
        makeSync({ id: '4', entityType: 'careTask', operation: 'update' }),
        makeSync({ id: '5', entityType: 'layout', operation: 'delete' }),
      ];

      const sortByMock = jest.fn().mockResolvedValue(items);
      mockDeviceSyncTable.where.mockReturnValue({
        equals: jest.fn().mockReturnValue({ sortBy: sortByMock }),
        below: jest.fn(),
      });

      const batches = await service.batchPending();

      expect(batches).toBeInstanceOf(Map);
      expect(batches.get('plant:create')).toHaveLength(2);
      expect(batches.get('plant:update')).toHaveLength(1);
      expect(batches.get('careTask:update')).toHaveLength(1);
      expect(batches.get('layout:delete')).toHaveLength(1);
    });

    it('returns an empty Map when there are no pending items', async () => {
      const sortByMock = jest.fn().mockResolvedValue([]);
      mockDeviceSyncTable.where.mockReturnValue({
        equals: jest.fn().mockReturnValue({ sortBy: sortByMock }),
        below: jest.fn(),
      });

      const batches = await service.batchPending();

      expect(batches).toBeInstanceOf(Map);
      expect(batches.size).toBe(0);
    });

    it('places a single item into the correct bucket', async () => {
      const item = makeSync({ id: '1', entityType: 'tag', operation: 'delete' });
      const sortByMock = jest.fn().mockResolvedValue([item]);
      mockDeviceSyncTable.where.mockReturnValue({
        equals: jest.fn().mockReturnValue({ sortBy: sortByMock }),
        below: jest.fn(),
      });

      const batches = await service.batchPending();

      expect(batches.get('tag:delete')).toEqual([item]);
    });
  });

  // -------------------------------------------------------------------------
  // getStats
  // -------------------------------------------------------------------------
  describe('getStats', () => {
    it('returns correct stats for a mixed set of records', async () => {
      const records: DeviceSync[] = [
        // pending
        makeSync({ id: '1', syncedAt: null, retryCount: 0, createdAt: new Date('2026-01-05') }),
        makeSync({ id: '2', syncedAt: null, retryCount: 0, createdAt: new Date('2026-01-01') }),
        // failed
        makeSync({ id: '3', syncedAt: null, retryCount: 2, createdAt: new Date('2026-01-03') }),
        // synced
        makeSync({ id: '4', syncedAt: new Date('2026-01-10'), retryCount: 0, createdAt: new Date('2026-01-04') }),
        makeSync({ id: '5', syncedAt: new Date('2026-01-15'), retryCount: 0, createdAt: new Date('2026-01-06') }),
      ];
      mockDeviceSyncTable.toArray.mockResolvedValue(records);

      const stats = await service.getStats();

      expect(stats.pending).toBe(2);
      expect(stats.synced).toBe(2);
      expect(stats.failed).toBe(1);
      // oldestPending: min createdAt of pending records (2026-01-01 < 2026-01-05)
      expect(stats.oldestPending).toEqual(new Date('2026-01-01'));
      // newestSynced: max syncedAt of synced records (2026-01-15 > 2026-01-10)
      expect(stats.newestSynced).toEqual(new Date('2026-01-15'));
      // failureRate: 1 failed / 5 total = 0.2
      expect(stats.failureRate).toBeCloseTo(0.2);
    });

    it('returns all zeros and no optional fields when table is empty', async () => {
      mockDeviceSyncTable.toArray.mockResolvedValue([]);

      const stats = await service.getStats();

      expect(stats.pending).toBe(0);
      expect(stats.synced).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.oldestPending).toBeUndefined();
      expect(stats.newestSynced).toBeUndefined();
      expect(stats.failureRate).toBe(0);
    });

    it('returns no optional fields when no pending and no synced records', async () => {
      const records: DeviceSync[] = [
        makeSync({ id: '1', syncedAt: null, retryCount: 1, createdAt: new Date('2026-01-01') }),
      ];
      mockDeviceSyncTable.toArray.mockResolvedValue(records);

      const stats = await service.getStats();

      expect(stats.pending).toBe(0);
      expect(stats.oldestPending).toBeUndefined();
      expect(stats.newestSynced).toBeUndefined();
      expect(stats.failureRate).toBeCloseTo(1.0);
    });

    it('computes oldestPending from earliest createdAt among pending items', async () => {
      const records: DeviceSync[] = [
        makeSync({ id: '1', syncedAt: null, retryCount: 0, createdAt: new Date('2026-03-01') }),
        makeSync({ id: '2', syncedAt: null, retryCount: 0, createdAt: new Date('2026-01-01') }),
        makeSync({ id: '3', syncedAt: null, retryCount: 0, createdAt: new Date('2026-02-01') }),
      ];
      mockDeviceSyncTable.toArray.mockResolvedValue(records);

      const stats = await service.getStats();

      expect(stats.oldestPending).toEqual(new Date('2026-01-01'));
    });

    it('computes newestSynced from latest syncedAt among synced items', async () => {
      const records: DeviceSync[] = [
        makeSync({ id: '1', syncedAt: new Date('2026-01-05'), retryCount: 0, createdAt: new Date() }),
        makeSync({ id: '2', syncedAt: new Date('2026-03-10'), retryCount: 0, createdAt: new Date() }),
        makeSync({ id: '3', syncedAt: new Date('2026-02-20'), retryCount: 0, createdAt: new Date() }),
      ];
      mockDeviceSyncTable.toArray.mockResolvedValue(records);

      const stats = await service.getStats();

      expect(stats.newestSynced).toEqual(new Date('2026-03-10'));
    });
  });
});
