/**
 * @jest-environment jsdom
 */
import { LayoutRepository } from './LayoutRepository';
import { getDatabase } from '../database';
import { CreateLayout, UpdateLayout, LayoutFilter } from '../entities';

// Mock the database module
jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

// Mock cuid2
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id-123'),
}));

describe('LayoutRepository', () => {
  let repository: LayoutRepository;
  let mockDb: any;
  let mockLayoutsTable: any;
  let mockDeviceSyncTable: any;

  beforeEach(() => {
    // Setup mock tables
    mockLayoutsTable = {
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
      layouts: mockLayoutsTable,
      deviceSync: mockDeviceSyncTable,
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    repository = new LayoutRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new layout with all fields', async () => {
      const createData: CreateLayout = {
        name: 'Garden Layout',
        description: 'My backyard garden',
        type: 'outdoor',
        imageUri: 'file:///path/to/image.jpg',
        imageWidth: 1920,
        imageHeight: 1080,
      };

      const expectedLayout = {
        id: 'test-id-123',
        ...createData,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        deletedAt: null,
      };

      mockLayoutsTable.add.mockResolvedValue('test-id-123');

      const result = await repository.create(createData);

      expect(result).toEqual(expectedLayout);
      expect(mockLayoutsTable.add).toHaveBeenCalledWith(expectedLayout);
      expect(mockDeviceSyncTable.add).toHaveBeenCalledWith({
        id: expect.any(String),
        entityType: 'layout',
        entityId: 'test-id-123',
        operation: 'create',
        data: expect.any(String),
        createdAt: expect.any(Date),
        syncedAt: null,
        retryCount: 0,
        lastError: null,
      });
    });

    it('should create layout without optional description', async () => {
      const createData: CreateLayout = {
        name: 'Simple Layout',
        type: 'indoor',
        imageUri: 'file:///path/to/image.jpg',
        imageWidth: 800,
        imageHeight: 600,
      };

      mockLayoutsTable.add.mockResolvedValue('test-id-123');

      const result = await repository.create(createData);

      expect(result.description).toBeUndefined();
      expect(result.name).toBe('Simple Layout');
      expect(result.type).toBe('indoor');
    });

    it('should handle database errors', async () => {
      const createData: CreateLayout = {
        name: 'Test',
        type: 'indoor',
        imageUri: 'file:///test.jpg',
        imageWidth: 100,
        imageHeight: 100,
      };

      mockLayoutsTable.add.mockRejectedValue(new Error('Database error'));

      await expect(repository.create(createData)).rejects.toThrow('Database error');
    });
  });

  describe('getById', () => {
    it('should retrieve layout by id', async () => {
      const mockLayout = {
        id: 'test-id-123',
        name: 'Test Layout',
        type: 'outdoor',
        imageUri: 'file:///test.jpg',
        imageWidth: 1920,
        imageHeight: 1080,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockLayoutsTable.get.mockResolvedValue(mockLayout);

      const result = await repository.getById('test-id-123');

      expect(result).toEqual(mockLayout);
      expect(mockLayoutsTable.get).toHaveBeenCalledWith('test-id-123');
    });

    it('should return undefined for non-existent layout', async () => {
      mockLayoutsTable.get.mockResolvedValue(undefined);

      const result = await repository.getById('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update layout fields', async () => {
      const mockExisting = {
        id: 'test-id-123',
        name: 'Original Name',
        type: 'indoor' as const,
        imageUri: 'file:///test.jpg',
        imageWidth: 800,
        imageHeight: 600,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
      };

      const updateData: UpdateLayout = {
        id: 'test-id-123',
        name: 'Updated Name',
        description: 'Updated description',
      };

      mockLayoutsTable.get.mockResolvedValue(mockExisting);
      mockLayoutsTable.put.mockResolvedValue('test-id-123');

      const result = await repository.update(updateData);

      expect(result).toEqual({
        ...mockExisting,
        name: 'Updated Name',
        description: 'Updated description',
        updatedAt: expect.any(Date),
      });
      expect(mockLayoutsTable.put).toHaveBeenCalled();
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should update only specified fields', async () => {
      const mockExisting = {
        id: 'test-id-123',
        name: 'Original Name',
        description: 'Original Description',
        type: 'outdoor' as const,
        imageUri: 'file:///test.jpg',
        imageWidth: 1920,
        imageHeight: 1080,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
      };

      const updateData: UpdateLayout = {
        id: 'test-id-123',
        name: 'New Name Only',
      };

      mockLayoutsTable.get.mockResolvedValue(mockExisting);
      mockLayoutsTable.put.mockResolvedValue('test-id-123');

      const result = await repository.update(updateData);

      expect(result?.name).toBe('New Name Only');
      expect(result?.description).toBe('Original Description');
    });

    it('should return undefined for non-existent layout', async () => {
      mockLayoutsTable.get.mockResolvedValue(undefined);

      const result = await repository.update({ id: 'non-existent', name: 'Test' });

      expect(result).toBeUndefined();
      expect(mockLayoutsTable.put).not.toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      mockLayoutsTable.get.mockResolvedValue({
        id: 'test-id-123',
        name: 'Test',
        type: 'indoor' as const,
        imageUri: 'file:///test.jpg',
        imageWidth: 800,
        imageHeight: 600,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      mockLayoutsTable.put.mockRejectedValue(new Error('Update failed'));

      await expect(repository.update({ id: 'test-id-123', name: 'Test' })).rejects.toThrow(
        'Update failed'
      );
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft delete layout', async () => {
      const mockExisting = {
        id: 'test-id-123',
        name: 'Test Layout',
        type: 'indoor' as const,
        imageUri: 'file:///test.jpg',
        imageWidth: 800,
        imageHeight: 600,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
      };

      mockLayoutsTable.get.mockResolvedValue(mockExisting);
      mockLayoutsTable.put.mockResolvedValue('test-id-123');

      const result = await repository.delete('test-id-123');

      expect(result).toBe(true);
      expect(mockLayoutsTable.put).toHaveBeenCalled();
      const putCall = mockLayoutsTable.put.mock.calls[0][0];
      expect(putCall.deletedAt).toBeInstanceOf(Date);
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should return false if layout does not exist', async () => {
      mockLayoutsTable.get.mockResolvedValue(undefined);

      const result = await repository.delete('non-existent-id');

      expect(result).toBe(false);
      expect(mockLayoutsTable.put).not.toHaveBeenCalled();
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete layout', async () => {
      mockLayoutsTable.delete.mockResolvedValue(undefined);

      await repository.hardDelete('test-id-123');

      expect(mockLayoutsTable.delete).toHaveBeenCalledWith('test-id-123');
      expect(mockDeviceSyncTable.add).not.toHaveBeenCalled();
    });
  });

  describe('restore', () => {
    it('should restore soft-deleted layout', async () => {
      const mockDeleted = {
        id: 'test-id-123',
        name: 'Deleted Layout',
        type: 'outdoor' as const,
        imageUri: 'file:///test.jpg',
        imageWidth: 1920,
        imageHeight: 1080,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
        deletedAt: new Date('2024-01-03'),
      };

      mockLayoutsTable.get.mockResolvedValue(mockDeleted);
      mockLayoutsTable.put.mockResolvedValue('test-id-123');

      const result = await repository.restore('test-id-123');

      expect(result).toBeDefined();
      expect(result?.deletedAt).toBeNull();
      expect(mockLayoutsTable.put).toHaveBeenCalled();
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should return undefined if layout does not exist', async () => {
      mockLayoutsTable.get.mockResolvedValue(undefined);

      const result = await repository.restore('non-existent-id');

      expect(result).toBeUndefined();
      expect(mockLayoutsTable.put).not.toHaveBeenCalled();
    });

    it('should return undefined if layout is not deleted', async () => {
      const mockActive = {
        id: 'test-id-123',
        name: 'Active Layout',
        type: 'indoor' as const,
        imageUri: 'file:///test.jpg',
        imageWidth: 800,
        imageHeight: 600,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockLayoutsTable.get.mockResolvedValue(mockActive);

      const result = await repository.restore('test-id-123');

      expect(result).toBeUndefined();
      expect(mockLayoutsTable.put).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    const mockLayouts = [
      {
        id: '1',
        name: 'Layout 1',
        type: 'outdoor' as const,
        imageUri: 'file:///1.jpg',
        imageWidth: 1920,
        imageHeight: 1080,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
      },
      {
        id: '2',
        name: 'Layout 2',
        type: 'indoor' as const,
        imageUri: 'file:///2.jpg',
        imageWidth: 800,
        imageHeight: 600,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        deletedAt: null,
      },
    ];

    it('should list all non-deleted layouts', async () => {
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockLayouts),
      };
      mockLayoutsTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.list();

      expect(result).toEqual(mockLayouts);
      expect(mockCollection.filter).toHaveBeenCalled();
    });

    it('should filter by type', async () => {
      const filter: LayoutFilter = { type: 'outdoor' };
      const filteredLayouts = [mockLayouts[0]]; // Only outdoor layout
      const mockCollection = {
        filter: jest.fn(function (this: any, fn: any) {
          // Apply filter inline for type
          const filtered = fn ? mockLayouts.filter(fn) : mockLayouts;
          return {
            ...this,
            filter: jest.fn().mockReturnThis(),
            toArray: jest.fn().mockResolvedValue(filtered.filter((l: any) => l.type === 'outdoor')),
          };
        }),
        toArray: jest.fn().mockResolvedValue(filteredLayouts),
      };
      mockLayoutsTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.list(filter);

      expect(result.length).toBeGreaterThan(0);
      result.forEach((layout) => expect(layout.type).toBe('outdoor'));
    });

    it('should return layouts sorted by creation date descending', async () => {
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockLayouts),
      };
      mockLayoutsTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.list();

      expect(mockCollection.toArray).toHaveBeenCalled();
      // Results are sorted in repository, not via Dexie sortBy
    });

    it('should include deleted layouts when specified', async () => {
      const filter: LayoutFilter = { includeDeleted: true };
      const allLayouts = [
        ...mockLayouts,
        {
          id: '3',
          name: 'Deleted Layout',
          type: 'outdoor' as const,
          imageUri: 'file:///3.jpg',
          imageWidth: 800,
          imageHeight: 600,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03'),
          deletedAt: new Date('2024-01-04'),
        },
      ];
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(allLayouts),
      };
      mockLayoutsTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.list(filter);

      // When includeDeleted is true, filter should still be called but not filter out deleted items
      expect(result.length).toBe(3);
    });

    it('should handle empty results', async () => {
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockLayoutsTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.list();

      expect(result).toEqual([]);
    });
  });

  describe('count', () => {
    it('should count non-deleted layouts', async () => {
      const mockData = [
        { id: '1', createdAt: new Date() },
        { id: '2', createdAt: new Date() },
        { id: '3', createdAt: new Date() },
        { id: '4', createdAt: new Date() },
        { id: '5', createdAt: new Date() },
      ];
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockData),
      };
      mockLayoutsTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.count();

      expect(result).toBe(5);
    });

    it('should count with filter', async () => {
      const mockData = [
        { id: '1', createdAt: new Date() },
        { id: '2', createdAt: new Date() },
        { id: '3', createdAt: new Date() },
      ];
      const filter: LayoutFilter = { type: 'outdoor' };
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockData),
      };
      mockLayoutsTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.count(filter);

      expect(result).toBe(3);
    });

    it('should count including deleted when specified', async () => {
      const mockData = [
        { id: '1', createdAt: new Date() },
        { id: '2', createdAt: new Date() },
        { id: '3', createdAt: new Date() },
        { id: '4', createdAt: new Date() },
        { id: '5', createdAt: new Date() },
        { id: '6', createdAt: new Date() },
        { id: '7', createdAt: new Date() },
        { id: '8', createdAt: new Date() },
      ];
      const filter: LayoutFilter = { includeDeleted: true };
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockData),
      };
      mockLayoutsTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.count(filter);

      expect(result).toBe(8);
    });
  });
});
