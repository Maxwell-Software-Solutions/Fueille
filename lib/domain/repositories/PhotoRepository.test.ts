/**
 * @jest-environment jsdom
 */
import { PhotoRepository } from './PhotoRepository';
import { getDatabase } from '../database';
import type { CreatePhoto, UpdatePhoto, PhotoFilter } from '../entities';

// Mock the database module
jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

// Mock cuid2 with a counter so multiple createId() calls per test get distinct values
let idCounter = 0;
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => `test-id-${++idCounter}`),
}));

describe('PhotoRepository', () => {
  let repository: PhotoRepository;
  let mockDb: any;
  let mockPhotosTable: any;
  let mockDeviceSyncTable: any;

  beforeEach(() => {
    idCounter = 0;

    mockPhotosTable = {
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
      photos: mockPhotosTable,
      deviceSync: mockDeviceSyncTable,
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    repository = new PhotoRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new photo with all fields', async () => {
      const takenAt = new Date('2026-03-01T12:00:00.000Z');
      const createData: CreatePhoto = {
        plantId: 'plant-1',
        localUri: 'file:///photos/plant1.jpg',
        remoteUrl: 'https://cdn.example.com/plant1.jpg',
        thumbnailUri: 'file:///photos/plant1-thumb.jpg',
        width: 1920,
        height: 1080,
        takenAt,
      };

      mockPhotosTable.add.mockResolvedValue('test-id-1');

      const result = await repository.create(createData);

      expect(result).toEqual({
        id: 'test-id-1',
        ...createData,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        deletedAt: null,
      });
      expect(mockPhotosTable.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-id-1',
          plantId: 'plant-1',
          takenAt,
          deletedAt: null,
        })
      );
    });

    it('should create photo with only required fields', async () => {
      const takenAt = new Date('2026-03-15T08:30:00.000Z');
      const createData: CreatePhoto = {
        plantId: 'plant-2',
        takenAt,
      };

      mockPhotosTable.add.mockResolvedValue('test-id-1');

      const result = await repository.create(createData);

      expect(result.id).toBe('test-id-1');
      expect(result.plantId).toBe('plant-2');
      expect(result.takenAt).toEqual(takenAt);
      expect(result.deletedAt).toBeNull();
      expect(result.localUri).toBeUndefined();
      expect(result.remoteUrl).toBeUndefined();
    });

    it('should queue a deviceSync entry on create', async () => {
      const createData: CreatePhoto = {
        plantId: 'plant-1',
        takenAt: new Date('2026-03-01'),
      };

      mockPhotosTable.add.mockResolvedValue('test-id-1');

      await repository.create(createData);

      // First createId() call → photo id ('test-id-1')
      // Second createId() call → deviceSync id ('test-id-2')
      expect(mockDeviceSyncTable.add).toHaveBeenCalledWith({
        id: 'test-id-2',
        entityType: 'photo',
        entityId: 'test-id-1',
        operation: 'create',
        data: expect.any(String),
        createdAt: expect.any(Date),
        syncedAt: null,
        retryCount: 0,
        lastError: null,
      });
    });

    it('should handle database errors on create', async () => {
      mockPhotosTable.add.mockRejectedValue(new Error('DB write failed'));

      await expect(
        repository.create({ plantId: 'plant-1', takenAt: new Date() })
      ).rejects.toThrow('DB write failed');
    });
  });

  describe('getById', () => {
    it('should return a photo by id', async () => {
      const mockPhoto = {
        id: 'photo-1',
        plantId: 'plant-1',
        takenAt: new Date('2026-03-01'),
        createdAt: new Date('2026-03-01'),
        updatedAt: new Date('2026-03-01'),
        deletedAt: null,
      };

      mockPhotosTable.get.mockResolvedValue(mockPhoto);

      const result = await repository.getById('photo-1');

      expect(result).toEqual(mockPhoto);
      expect(mockPhotosTable.get).toHaveBeenCalledWith('photo-1');
    });

    it('should return undefined for a non-existent photo', async () => {
      mockPhotosTable.get.mockResolvedValue(undefined);

      const result = await repository.getById('does-not-exist');

      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    const mockExisting = {
      id: 'photo-1',
      plantId: 'plant-1',
      localUri: 'file:///photos/old.jpg',
      takenAt: new Date('2026-03-01T10:00:00.000Z'),
      createdAt: new Date('2026-03-01'),
      updatedAt: new Date('2026-03-01'),
      deletedAt: null,
    };

    it('should update photo fields and refresh updatedAt', async () => {
      const updateData: UpdatePhoto = {
        id: 'photo-1',
        remoteUrl: 'https://cdn.example.com/new.jpg',
      };

      mockPhotosTable.get.mockResolvedValue(mockExisting);
      mockPhotosTable.put.mockResolvedValue('photo-1');

      const result = await repository.update(updateData);

      expect(result).toEqual({
        ...mockExisting,
        remoteUrl: 'https://cdn.example.com/new.jpg',
        updatedAt: expect.any(Date),
      });
      expect(mockPhotosTable.put).toHaveBeenCalled();
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should preserve unchanged fields', async () => {
      const updateData: UpdatePhoto = {
        id: 'photo-1',
        remoteUrl: 'https://cdn.example.com/uploaded.jpg',
      };

      mockPhotosTable.get.mockResolvedValue(mockExisting);
      mockPhotosTable.put.mockResolvedValue('photo-1');

      const result = await repository.update(updateData);

      expect(result?.plantId).toBe('plant-1');
      expect(result?.localUri).toBe('file:///photos/old.jpg');
      expect(result?.takenAt).toEqual(new Date('2026-03-01T10:00:00.000Z'));
    });

    it('should return undefined for a non-existent photo', async () => {
      mockPhotosTable.get.mockResolvedValue(undefined);

      const result = await repository.update({ id: 'ghost', remoteUrl: 'https://example.com' });

      expect(result).toBeUndefined();
      expect(mockPhotosTable.put).not.toHaveBeenCalled();
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft delete a photo by setting deletedAt', async () => {
      const mockExisting = {
        id: 'photo-1',
        plantId: 'plant-1',
        takenAt: new Date('2026-03-01'),
        createdAt: new Date('2026-03-01'),
        updatedAt: new Date('2026-03-01'),
        deletedAt: null,
      };

      mockPhotosTable.get.mockResolvedValue(mockExisting);
      mockPhotosTable.put.mockResolvedValue('photo-1');

      const result = await repository.delete('photo-1');

      expect(result).toBe(true);
      const putArg = mockPhotosTable.put.mock.calls[0][0];
      expect(putArg.deletedAt).toBeInstanceOf(Date);
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should return false if photo does not exist', async () => {
      mockPhotosTable.get.mockResolvedValue(undefined);

      const result = await repository.delete('missing-photo');

      expect(result).toBe(false);
      expect(mockPhotosTable.put).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    const older = new Date('2026-01-01T10:00:00.000Z');
    const newer = new Date('2026-03-15T10:00:00.000Z');

    const mockPhotos = [
      {
        id: 'photo-1',
        plantId: 'plant-1',
        takenAt: older,
        createdAt: older,
        updatedAt: older,
        deletedAt: null,
      },
      {
        id: 'photo-2',
        plantId: 'plant-2',
        takenAt: newer,
        createdAt: newer,
        updatedAt: newer,
        deletedAt: null,
      },
      {
        id: 'photo-3',
        plantId: 'plant-1',
        takenAt: newer,
        createdAt: newer,
        updatedAt: newer,
        deletedAt: new Date('2026-03-20'),
      },
    ];

    function setupListMock(photos: any[]) {
      const mockCollection = {
        filter: jest.fn().mockImplementation(function (fn?: any) {
          const filtered = fn ? photos.filter(fn) : photos;
          return {
            filter: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValue(filtered),
          };
        }),
        toArray: jest.fn().mockResolvedValue(photos),
      };
      mockPhotosTable.toCollection.mockReturnValue(mockCollection);
    }

    it('should exclude deleted photos by default', async () => {
      setupListMock(mockPhotos.filter((p) => !p.deletedAt));

      const result = await repository.list();

      expect(result.every((p) => !p.deletedAt)).toBe(true);
    });

    it('should include deleted photos when includeDeleted is true', async () => {
      // When includeDeleted=true the filter predicate is skipped in the repo,
      // so we return the full list from toArray
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockPhotos),
      };
      mockPhotosTable.toCollection.mockReturnValue(mockCollection);

      const filter: PhotoFilter = { includeDeleted: true };
      const result = await repository.list(filter);

      expect(result.some((p) => !!p.deletedAt)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('should filter by plantId', async () => {
      const active = mockPhotos.filter((p) => !p.deletedAt);
      setupListMock(active);

      const filter: PhotoFilter = { plantId: 'plant-1' };
      const result = await repository.list(filter);

      expect(result.every((p) => p.plantId === 'plant-1')).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should sort results by takenAt descending (newest first)', async () => {
      const active = mockPhotos.filter((p) => !p.deletedAt);
      // Return them in oldest-first order — repo should sort
      const unsorted = [...active].sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(unsorted),
      };
      mockPhotosTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.list();

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].takenAt.getTime()).toBeGreaterThanOrEqual(
          result[i].takenAt.getTime()
        );
      }
    });

    it('should return empty array when no photos match', async () => {
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockPhotosTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.list();

      expect(result).toEqual([]);
    });
  });
});
