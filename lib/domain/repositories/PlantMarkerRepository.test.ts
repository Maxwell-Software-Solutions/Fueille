/**
 * @jest-environment jsdom
 */
import { PlantMarkerRepository } from './PlantMarkerRepository';
import { getDatabase } from '../database';
import type { CreatePlantMarker, UpdatePlantMarker, PlantMarkerFilter } from '../entities';

// Mock the database module
jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

// Mock cuid2 with a counter so multiple createId() calls per test get distinct values
let idCounter = 0;
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => `test-id-${++idCounter}`),
}));

describe('PlantMarkerRepository', () => {
  let repository: PlantMarkerRepository;
  let mockDb: any;
  let mockMarkersTable: any;
  let mockPlantsTable: any;
  let mockDeviceSyncTable: any;

  beforeEach(() => {
    idCounter = 0;

    // toCollection returns a chainable object where each .filter() call
    // returns a new object that still has .filter() and .toArray().
    // We use a factory so each test can wire its own data.
    mockMarkersTable = {
      add: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      toCollection: jest.fn(),
    };

    mockPlantsTable = {
      get: jest.fn(),
    };

    mockDeviceSyncTable = {
      add: jest.fn(),
    };

    mockDb = {
      plantMarkers: mockMarkersTable,
      plants: mockPlantsTable,
      deviceSync: mockDeviceSyncTable,
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    repository = new PlantMarkerRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper: set up toCollection so that filter calls are applied to `data`.
  // The PlantMarkerRepository chains up to 3 .filter() calls, each returning
  // a new collection object.  We simulate this by applying each predicate lazily.
  function setupListMock(data: any[]) {
    const makeCollection = (current: any[]) => ({
      filter: jest.fn().mockImplementation((fn: any) => makeCollection(current.filter(fn))),
      toArray: jest.fn().mockResolvedValue(current),
    });
    mockMarkersTable.toCollection.mockReturnValue(makeCollection(data));
  }

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a marker with all fields', async () => {
      const createData: CreatePlantMarker = {
        layoutId: 'layout-1',
        plantId: 'plant-1',
        positionX: 25.5,
        positionY: 75.0,
        icon: '🌱',
        rotation: 45,
        scale: 1.2,
        label: 'My Fern',
      };

      mockMarkersTable.add.mockResolvedValue('test-id-1');

      const result = await repository.create(createData);

      expect(result).toEqual({
        id: 'test-id-1',
        ...createData,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        deletedAt: null,
      });
      expect(mockMarkersTable.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id-1',
          layoutId: 'layout-1',
          plantId: 'plant-1',
          positionX: 25.5,
          positionY: 75.0,
          deletedAt: null,
        })
      );
    });

    it('should create a marker with only required fields', async () => {
      const createData: CreatePlantMarker = {
        layoutId: 'layout-1',
        plantId: 'plant-2',
        positionX: 50,
        positionY: 50,
      };

      mockMarkersTable.add.mockResolvedValue('test-id-1');

      const result = await repository.create(createData);

      expect(result.id).toBe('test-id-1');
      expect(result.layoutId).toBe('layout-1');
      expect(result.plantId).toBe('plant-2');
      expect(result.deletedAt).toBeNull();
      expect(result.icon).toBeUndefined();
    });

    it('should queue a deviceSync entry on create', async () => {
      mockMarkersTable.add.mockResolvedValue('test-id-1');

      await repository.create({
        layoutId: 'layout-1',
        plantId: 'plant-1',
        positionX: 10,
        positionY: 20,
      });

      // First createId() → marker id ('test-id-1')
      // Second createId() → deviceSync id ('test-id-2')
      expect(mockDeviceSyncTable.add).toHaveBeenCalledWith({
        id: 'test-id-2',
        entityType: 'plantMarker',
        entityId: 'test-id-1',
        operation: 'create',
        data: expect.any(String),
        createdAt: expect.any(Date),
        syncedAt: null,
        retryCount: 0,
        lastError: null,
      });
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('should return a marker by id', async () => {
      const mockMarker = {
        id: 'marker-1',
        layoutId: 'layout-1',
        plantId: 'plant-1',
        positionX: 30,
        positionY: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockMarkersTable.get.mockResolvedValue(mockMarker);

      const result = await repository.getById('marker-1');

      expect(result).toEqual(mockMarker);
      expect(mockMarkersTable.get).toHaveBeenCalledWith('marker-1');
    });

    it('should return undefined for a non-existent marker', async () => {
      mockMarkersTable.get.mockResolvedValue(undefined);

      const result = await repository.getById('ghost-marker');

      expect(result).toBeUndefined();
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    const mockExisting = {
      id: 'marker-1',
      layoutId: 'layout-1',
      plantId: 'plant-1',
      positionX: 10,
      positionY: 20,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      deletedAt: null,
    };

    it('should update marker fields and set updatedAt', async () => {
      const updateData: UpdatePlantMarker = {
        id: 'marker-1',
        positionX: 55,
        positionY: 80,
        label: 'Moved',
      };

      mockMarkersTable.get.mockResolvedValue(mockExisting);
      mockMarkersTable.put.mockResolvedValue('marker-1');

      const result = await repository.update(updateData);

      expect(result).toEqual({
        ...mockExisting,
        positionX: 55,
        positionY: 80,
        label: 'Moved',
        updatedAt: expect.any(Date),
      });
      expect(mockMarkersTable.put).toHaveBeenCalled();
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should preserve unchanged fields', async () => {
      const updateData: UpdatePlantMarker = { id: 'marker-1', label: 'New Label' };

      mockMarkersTable.get.mockResolvedValue(mockExisting);
      mockMarkersTable.put.mockResolvedValue('marker-1');

      const result = await repository.update(updateData);

      expect(result?.layoutId).toBe('layout-1');
      expect(result?.plantId).toBe('plant-1');
      expect(result?.positionX).toBe(10);
      expect(result?.positionY).toBe(20);
    });

    it('should return undefined for a non-existent marker', async () => {
      mockMarkersTable.get.mockResolvedValue(undefined);

      const result = await repository.update({ id: 'ghost', positionX: 50, positionY: 50 });

      expect(result).toBeUndefined();
      expect(mockMarkersTable.put).not.toHaveBeenCalled();
    });
  });

  // ─── delete (soft) ─────────────────────────────────────────────────────────

  describe('delete (soft delete)', () => {
    it('should soft delete a marker by setting deletedAt', async () => {
      const mockExisting = {
        id: 'marker-1',
        layoutId: 'layout-1',
        plantId: 'plant-1',
        positionX: 10,
        positionY: 20,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      mockMarkersTable.get.mockResolvedValue(mockExisting);
      mockMarkersTable.put.mockResolvedValue('marker-1');

      const result = await repository.delete('marker-1');

      expect(result).toBe(true);
      const putArg = mockMarkersTable.put.mock.calls[0][0];
      expect(putArg.deletedAt).toBeInstanceOf(Date);
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should return false if marker does not exist', async () => {
      mockMarkersTable.get.mockResolvedValue(undefined);

      const result = await repository.delete('missing');

      expect(result).toBe(false);
      expect(mockMarkersTable.put).not.toHaveBeenCalled();
    });
  });

  // ─── hardDelete ────────────────────────────────────────────────────────────

  describe('hardDelete', () => {
    it('should permanently delete a marker from the database', async () => {
      mockMarkersTable.delete.mockResolvedValue(undefined);

      const result = await repository.hardDelete('marker-1');

      expect(result).toBe(true);
      expect(mockMarkersTable.delete).toHaveBeenCalledWith('marker-1');
      // Hard delete should NOT queue a sync entry
      expect(mockDeviceSyncTable.add).not.toHaveBeenCalled();
    });
  });

  // ─── restore ───────────────────────────────────────────────────────────────

  describe('restore', () => {
    it('should restore a soft-deleted marker and clear deletedAt', async () => {
      const mockDeleted = {
        id: 'marker-1',
        layoutId: 'layout-1',
        plantId: 'plant-1',
        positionX: 10,
        positionY: 20,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        deletedAt: new Date('2026-01-03'),
      };

      mockMarkersTable.get.mockResolvedValue(mockDeleted);
      mockMarkersTable.put.mockResolvedValue('marker-1');

      const result = await repository.restore('marker-1');

      expect(result).toBeDefined();
      expect(result?.deletedAt).toBeNull();
      expect(mockMarkersTable.put).toHaveBeenCalled();
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should return undefined if marker does not exist', async () => {
      mockMarkersTable.get.mockResolvedValue(undefined);

      const result = await repository.restore('ghost');

      expect(result).toBeUndefined();
      expect(mockMarkersTable.put).not.toHaveBeenCalled();
    });

    it('should return undefined if marker is not deleted', async () => {
      const mockActive = {
        id: 'marker-1',
        layoutId: 'layout-1',
        plantId: 'plant-1',
        positionX: 10,
        positionY: 20,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      mockMarkersTable.get.mockResolvedValue(mockActive);

      const result = await repository.restore('marker-1');

      expect(result).toBeUndefined();
      expect(mockMarkersTable.put).not.toHaveBeenCalled();
    });
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    const mockMarkers = [
      {
        id: 'm-1',
        layoutId: 'layout-A',
        plantId: 'plant-1',
        positionX: 10,
        positionY: 20,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      },
      {
        id: 'm-2',
        layoutId: 'layout-A',
        plantId: 'plant-2',
        positionX: 50,
        positionY: 60,
        createdAt: new Date('2026-01-02'),
        updatedAt: new Date('2026-01-02'),
        deletedAt: null,
      },
      {
        id: 'm-3',
        layoutId: 'layout-B',
        plantId: 'plant-1',
        positionX: 80,
        positionY: 80,
        createdAt: new Date('2026-01-03'),
        updatedAt: new Date('2026-01-03'),
        deletedAt: null,
      },
      {
        id: 'm-4',
        layoutId: 'layout-A',
        plantId: 'plant-3',
        positionX: 30,
        positionY: 40,
        createdAt: new Date('2026-01-04'),
        updatedAt: new Date('2026-01-04'),
        deletedAt: new Date('2026-01-05'),
      },
    ];

    it('should return only non-deleted markers by default', async () => {
      setupListMock(mockMarkers);

      const result = await repository.list();

      expect(result.every((m) => !m.deletedAt)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('should include deleted markers when includeDeleted is true', async () => {
      setupListMock(mockMarkers);

      const filter: PlantMarkerFilter = { includeDeleted: true };
      const result = await repository.list(filter);

      expect(result.length).toBe(4);
      expect(result.some((m) => !!m.deletedAt)).toBe(true);
    });

    it('should filter by layoutId', async () => {
      setupListMock(mockMarkers);

      const filter: PlantMarkerFilter = { layoutId: 'layout-A' };
      const result = await repository.list(filter);

      // layout-A has m-1, m-2 (active) and m-4 (deleted — excluded by default)
      expect(result.every((m) => m.layoutId === 'layout-A')).toBe(true);
      expect(result.length).toBe(2);
    });

    it('should filter by plantId', async () => {
      setupListMock(mockMarkers);

      const filter: PlantMarkerFilter = { plantId: 'plant-1' };
      const result = await repository.list(filter);

      expect(result.every((m) => m.plantId === 'plant-1')).toBe(true);
      expect(result.length).toBe(2); // m-1 and m-3 are both plant-1 and active
    });

    it('should combine layoutId and plantId filters', async () => {
      setupListMock(mockMarkers);

      const filter: PlantMarkerFilter = { layoutId: 'layout-A', plantId: 'plant-1' };
      const result = await repository.list(filter);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('m-1');
    });

    it('should return empty array when no markers match', async () => {
      setupListMock([]);

      const result = await repository.list();

      expect(result).toEqual([]);
    });
  });

  // ─── getMarkersWithPlants ──────────────────────────────────────────────────

  describe('getMarkersWithPlants', () => {
    it('should hydrate each marker with its plant data', async () => {
      const activeMarkers = [
        {
          id: 'm-1',
          layoutId: 'layout-1',
          plantId: 'plant-1',
          positionX: 10,
          positionY: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'm-2',
          layoutId: 'layout-1',
          plantId: 'plant-2',
          positionX: 50,
          positionY: 60,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      const plantMap: Record<string, any> = {
        'plant-1': {
          id: 'plant-1',
          name: 'Fern',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        'plant-2': {
          id: 'plant-2',
          name: 'Cactus',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      };

      setupListMock(activeMarkers);
      mockPlantsTable.get.mockImplementation((id: string) =>
        Promise.resolve(plantMap[id])
      );

      const result = await repository.getMarkersWithPlants('layout-1');

      expect(result).toHaveLength(2);
      expect(result[0].plant).toEqual(plantMap['plant-1']);
      expect(result[1].plant).toEqual(plantMap['plant-2']);
    });

    it('should include plant as undefined when plant record is missing', async () => {
      const markers = [
        {
          id: 'm-1',
          layoutId: 'layout-1',
          plantId: 'orphan-plant',
          positionX: 10,
          positionY: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      setupListMock(markers);
      mockPlantsTable.get.mockResolvedValue(undefined);

      const result = await repository.getMarkersWithPlants('layout-1');

      expect(result).toHaveLength(1);
      expect(result[0].plant).toBeUndefined();
    });

    it('should only return markers for the specified layoutId', async () => {
      // m-1 is layout-1, m-2 is layout-2 — list() is called with { layoutId }
      // so our filter chain applies; only layout-1 markers come through
      const allMarkers = [
        {
          id: 'm-1',
          layoutId: 'layout-1',
          plantId: 'plant-1',
          positionX: 10,
          positionY: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        {
          id: 'm-2',
          layoutId: 'layout-2',
          plantId: 'plant-2',
          positionX: 50,
          positionY: 60,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];

      setupListMock(allMarkers);
      mockPlantsTable.get.mockResolvedValue({ id: 'plant-1', name: 'Fern' });

      const result = await repository.getMarkersWithPlants('layout-1');

      expect(result.every((m) => m.layoutId === 'layout-1')).toBe(true);
    });
  });

  // ─── updatePosition ────────────────────────────────────────────────────────

  describe('updatePosition', () => {
    it('should call update with correct positionX and positionY', async () => {
      const mockExisting = {
        id: 'marker-1',
        layoutId: 'layout-1',
        plantId: 'plant-1',
        positionX: 10,
        positionY: 20,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      mockMarkersTable.get.mockResolvedValue(mockExisting);
      mockMarkersTable.put.mockResolvedValue('marker-1');

      const result = await repository.updatePosition('marker-1', 65.5, 30.2);

      expect(result).toBeDefined();
      expect(result?.positionX).toBe(65.5);
      expect(result?.positionY).toBe(30.2);
      const putArg = mockMarkersTable.put.mock.calls[0][0];
      expect(putArg.positionX).toBe(65.5);
      expect(putArg.positionY).toBe(30.2);
    });

    it('should return undefined for non-existent marker', async () => {
      mockMarkersTable.get.mockResolvedValue(undefined);

      const result = await repository.updatePosition('ghost', 50, 50);

      expect(result).toBeUndefined();
    });
  });

  // ─── count ─────────────────────────────────────────────────────────────────

  describe('count', () => {
    it('should return the count of non-deleted markers', async () => {
      const markers = [
        { id: 'm-1', layoutId: 'layout-1', plantId: 'p-1', positionX: 1, positionY: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: 'm-2', layoutId: 'layout-1', plantId: 'p-2', positionX: 2, positionY: 2, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: 'm-3', layoutId: 'layout-1', plantId: 'p-3', positionX: 3, positionY: 3, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
      ];

      setupListMock(markers);

      const result = await repository.count();

      expect(result).toBe(3);
    });

    it('should count with a layoutId filter', async () => {
      const markers = [
        { id: 'm-1', layoutId: 'layout-A', plantId: 'p-1', positionX: 1, positionY: 1, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: 'm-2', layoutId: 'layout-A', plantId: 'p-2', positionX: 2, positionY: 2, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
        { id: 'm-3', layoutId: 'layout-B', plantId: 'p-3', positionX: 3, positionY: 3, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
      ];

      setupListMock(markers);

      const result = await repository.count({ layoutId: 'layout-A' });

      expect(result).toBe(2);
    });

    it('should return 0 when no markers exist', async () => {
      setupListMock([]);

      const result = await repository.count();

      expect(result).toBe(0);
    });
  });
});
