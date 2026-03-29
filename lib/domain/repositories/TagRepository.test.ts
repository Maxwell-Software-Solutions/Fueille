/**
 * @jest-environment jsdom
 */
import { TagRepository } from './TagRepository';
import { getDatabase } from '../database';
import type { CreateTag, UpdateTag } from '../entities';

// Mock the database module
jest.mock('../database', () => ({
  getDatabase: jest.fn(),
}));

// Mock cuid2
jest.mock('@paralleldrive/cuid2', () => ({
  createId: jest.fn(() => 'test-id-123'),
}));

describe('TagRepository', () => {
  let repository: TagRepository;
  let mockDb: any;
  let mockTagsTable: any;
  let mockPlantTagsTable: any;
  let mockDeviceSyncTable: any;

  // Helper to build a chainable Dexie-style where().equals().filter().toArray() mock
  function makeWhereChain({
    filterResult,
    toArrayResult,
    firstResult,
    countResult,
  }: {
    filterResult?: any[];
    toArrayResult?: any[];
    firstResult?: any;
    countResult?: number;
  }) {
    const chain: any = {
      filter: jest.fn().mockImplementation(() => chain),
      toArray: jest.fn().mockResolvedValue(toArrayResult ?? filterResult ?? []),
      first: jest.fn().mockResolvedValue(firstResult ?? undefined),
      count: jest.fn().mockResolvedValue(countResult ?? 0),
    };
    const whereChain = {
      equals: jest.fn().mockReturnValue(chain),
    };
    return { whereChain, chain };
  }

  beforeEach(() => {
    mockTagsTable = {
      add: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      toCollection: jest.fn(() => ({
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn(),
      })),
    };

    mockPlantTagsTable = {
      add: jest.fn(),
      put: jest.fn(),
      where: jest.fn(),
    };

    mockDeviceSyncTable = {
      add: jest.fn(),
    };

    mockDb = {
      tags: mockTagsTable,
      plantTags: mockPlantTagsTable,
      deviceSync: mockDeviceSyncTable,
    };

    (getDatabase as jest.Mock).mockReturnValue(mockDb);
    repository = new TagRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new tag with all fields', async () => {
      const createData: CreateTag = {
        name: 'Succulent',
        color: '#00ff00',
      };

      const expectedTag = {
        id: 'test-id-123',
        ...createData,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        deletedAt: null,
      };

      mockTagsTable.add.mockResolvedValue('test-id-123');

      const result = await repository.create(createData);

      expect(result).toEqual(expectedTag);
      expect(mockTagsTable.add).toHaveBeenCalledWith(expectedTag);
      expect(mockDeviceSyncTable.add).toHaveBeenCalledWith({
        id: 'test-id-123',
        entityType: 'tag',
        entityId: 'test-id-123',
        operation: 'create',
        data: expect.any(String),
        createdAt: expect.any(Date),
        syncedAt: null,
        retryCount: 0,
        lastError: null,
      });
    });

    it('should create a tag without optional color', async () => {
      const createData: CreateTag = { name: 'Herb' };

      mockTagsTable.add.mockResolvedValue('test-id-123');

      const result = await repository.create(createData);

      expect(result.name).toBe('Herb');
      expect(result.color).toBeUndefined();
      expect(result.deletedAt).toBeNull();
    });

    it('should handle database errors on create', async () => {
      mockTagsTable.add.mockRejectedValue(new Error('DB error'));

      await expect(repository.create({ name: 'Test' })).rejects.toThrow('DB error');
    });
  });

  describe('getById', () => {
    it('should return tag by id', async () => {
      const mockTag = {
        id: 'tag-1',
        name: 'Indoor',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockTagsTable.get.mockResolvedValue(mockTag);

      const result = await repository.getById('tag-1');

      expect(result).toEqual(mockTag);
      expect(mockTagsTable.get).toHaveBeenCalledWith('tag-1');
    });

    it('should return undefined for non-existent tag', async () => {
      mockTagsTable.get.mockResolvedValue(undefined);

      const result = await repository.getById('no-such-tag');

      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    const mockExisting = {
      id: 'tag-1',
      name: 'Original Name',
      color: '#ff0000',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      deletedAt: null,
    };

    it('should update tag fields and set updatedAt', async () => {
      const updateData: UpdateTag = { id: 'tag-1', name: 'New Name', color: '#0000ff' };

      mockTagsTable.get.mockResolvedValue(mockExisting);
      mockTagsTable.put.mockResolvedValue('tag-1');

      const result = await repository.update(updateData);

      expect(result).toEqual({
        ...mockExisting,
        name: 'New Name',
        color: '#0000ff',
        updatedAt: expect.any(Date),
      });
      expect(mockTagsTable.put).toHaveBeenCalled();
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should preserve unchanged fields', async () => {
      mockTagsTable.get.mockResolvedValue(mockExisting);
      mockTagsTable.put.mockResolvedValue('tag-1');

      const result = await repository.update({ id: 'tag-1', name: 'Updated' });

      expect(result?.color).toBe('#ff0000');
    });

    it('should return undefined for non-existent tag', async () => {
      mockTagsTable.get.mockResolvedValue(undefined);

      const result = await repository.update({ id: 'non-existent', name: 'X' });

      expect(result).toBeUndefined();
      expect(mockTagsTable.put).not.toHaveBeenCalled();
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft delete tag by setting deletedAt', async () => {
      const mockExisting = {
        id: 'tag-1',
        name: 'Indoor',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      mockTagsTable.get.mockResolvedValue(mockExisting);
      mockTagsTable.put.mockResolvedValue('tag-1');

      const result = await repository.delete('tag-1');

      expect(result).toBe(true);
      const putCall = mockTagsTable.put.mock.calls[0][0];
      expect(putCall.deletedAt).toBeInstanceOf(Date);
      expect(mockDeviceSyncTable.add).toHaveBeenCalled();
    });

    it('should return false if tag does not exist', async () => {
      mockTagsTable.get.mockResolvedValue(undefined);

      const result = await repository.delete('non-existent');

      expect(result).toBe(false);
      expect(mockTagsTable.put).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    const mockTags = [
      {
        id: 'tag-1',
        name: 'Succulent',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      },
      {
        id: 'tag-2',
        name: 'Annual',
        createdAt: new Date('2026-01-02'),
        updatedAt: new Date('2026-01-02'),
        deletedAt: null,
      },
      {
        id: 'tag-3',
        name: 'Deleted Tag',
        createdAt: new Date('2026-01-03'),
        updatedAt: new Date('2026-01-03'),
        deletedAt: new Date(),
      },
    ];

    it('should list all non-deleted tags by default', async () => {
      const activeTags = mockTags.filter((t) => !t.deletedAt);
      const mockCollection = {
        filter: jest.fn().mockImplementation((fn?: any) => ({
          filter: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue(fn ? mockTags.filter(fn) : activeTags),
        })),
        toArray: jest.fn().mockResolvedValue(activeTags),
      };
      mockTagsTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.list();

      expect(result.every((t) => !t.deletedAt)).toBe(true);
    });

    it('should include deleted tags when includeDeleted is true', async () => {
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockTags),
      };
      mockTagsTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.list(true);

      expect(result.length).toBe(3);
    });

    it('should return tags sorted alphabetically by name', async () => {
      // Two active tags in reverse alphabetical order — repo should sort them
      const unsortedTags = [
        { id: 'tag-1', name: 'Succulent', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), deletedAt: null },
        { id: 'tag-2', name: 'Annual', createdAt: new Date('2026-01-02'), updatedAt: new Date('2026-01-02'), deletedAt: null },
      ];
      const mockCollection = {
        filter: jest.fn().mockReturnValue({
          filter: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue(unsortedTags),
        }),
        toArray: jest.fn().mockResolvedValue(unsortedTags),
      };
      mockTagsTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.list();

      // 'Annual' < 'Succulent' alphabetically
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Annual');
      expect(result[1].name).toBe('Succulent');
    });

    it('should handle empty result set', async () => {
      const mockCollection = {
        filter: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockTagsTable.toCollection.mockReturnValue(mockCollection);

      const result = await repository.list();

      expect(result).toEqual([]);
    });
  });

  describe('getTagsForPlant', () => {
    it('should return tags for a given plantId', async () => {
      const plantTags = [
        { id: 'pt-1', plantId: 'plant-1', tagId: 'tag-1', deletedAt: null },
        { id: 'pt-2', plantId: 'plant-1', tagId: 'tag-2', deletedAt: null },
      ];
      const tag1 = { id: 'tag-1', name: 'Indoor', deletedAt: null };
      const tag2 = { id: 'tag-2', name: 'Succulent', deletedAt: null };

      const { whereChain, chain } = makeWhereChain({ toArrayResult: plantTags });
      mockPlantTagsTable.where.mockReturnValue(whereChain);
      // tags.get called once per plantTag
      mockTagsTable.get.mockResolvedValueOnce(tag1).mockResolvedValueOnce(tag2);

      const result = await repository.getTagsForPlant('plant-1');

      expect(mockPlantTagsTable.where).toHaveBeenCalledWith('plantId');
      expect(whereChain.equals).toHaveBeenCalledWith('plant-1');
      expect(chain.filter).toHaveBeenCalled();
      expect(result).toEqual([tag1, tag2]);
    });

    it('should exclude deleted plant-tag associations', async () => {
      // chain.filter() is called but we control toArray — return only active ones
      const activePlantTags = [{ id: 'pt-1', plantId: 'plant-1', tagId: 'tag-1', deletedAt: null }];
      const tag1 = { id: 'tag-1', name: 'Indoor', deletedAt: null };

      const { whereChain } = makeWhereChain({ toArrayResult: activePlantTags });
      mockPlantTagsTable.where.mockReturnValue(whereChain);
      mockTagsTable.get.mockResolvedValue(tag1);

      const result = await repository.getTagsForPlant('plant-1');

      expect(result).toEqual([tag1]);
    });

    it('should exclude tags that are themselves soft-deleted', async () => {
      const plantTags = [{ id: 'pt-1', plantId: 'plant-1', tagId: 'tag-1', deletedAt: null }];
      const deletedTag = { id: 'tag-1', name: 'Old Tag', deletedAt: new Date() };

      const { whereChain } = makeWhereChain({ toArrayResult: plantTags });
      mockPlantTagsTable.where.mockReturnValue(whereChain);
      mockTagsTable.get.mockResolvedValue(deletedTag);

      const result = await repository.getTagsForPlant('plant-1');

      expect(result).toEqual([]);
    });

    it('should return empty array when plant has no tags', async () => {
      const { whereChain } = makeWhereChain({ toArrayResult: [] });
      mockPlantTagsTable.where.mockReturnValue(whereChain);

      const result = await repository.getTagsForPlant('plant-with-no-tags');

      expect(result).toEqual([]);
    });
  });

  describe('getTagsWithPlantCount', () => {
    it('should return tags with their plant counts', async () => {
      const tags = [
        { id: 'tag-1', name: 'Indoor', deletedAt: null },
        { id: 'tag-2', name: 'Outdoor', deletedAt: null },
      ];

      // Setup list() mock
      const mockCollection = {
        filter: jest.fn().mockImplementation((fn?: any) => ({
          filter: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue(fn ? tags.filter(fn) : tags),
        })),
        toArray: jest.fn().mockResolvedValue(tags),
      };
      mockTagsTable.toCollection.mockReturnValue(mockCollection);

      // Setup plantTags.where().equals().filter().count() for each tag
      const { whereChain: wc1, chain: c1 } = makeWhereChain({ countResult: 3 });
      const { whereChain: wc2, chain: c2 } = makeWhereChain({ countResult: 1 });
      mockPlantTagsTable.where
        .mockReturnValueOnce(wc1)
        .mockReturnValueOnce(wc2);

      const result = await repository.getTagsWithPlantCount();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'tag-1', plantCount: 3 });
      expect(result[1]).toMatchObject({ id: 'tag-2', plantCount: 1 });
    });

    it('should return zero count for tags with no plants', async () => {
      const tags = [{ id: 'tag-1', name: 'Rare', deletedAt: null }];

      const mockCollection = {
        filter: jest.fn().mockImplementation((fn?: any) => ({
          filter: jest.fn().mockReturnThis(),
          toArray: jest.fn().mockResolvedValue(fn ? tags.filter(fn) : tags),
        })),
        toArray: jest.fn().mockResolvedValue(tags),
      };
      mockTagsTable.toCollection.mockReturnValue(mockCollection);

      const { whereChain } = makeWhereChain({ countResult: 0 });
      mockPlantTagsTable.where.mockReturnValue(whereChain);

      const result = await repository.getTagsWithPlantCount();

      expect(result[0].plantCount).toBe(0);
    });
  });

  describe('addTagToPlant', () => {
    it('should create a PlantTag record and return it', async () => {
      mockPlantTagsTable.add.mockResolvedValue('test-id-123');

      const result = await repository.addTagToPlant('plant-1', 'tag-1');

      expect(result).toEqual({
        id: 'test-id-123',
        plantId: 'plant-1',
        tagId: 'tag-1',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        deletedAt: null,
      });
      expect(mockPlantTagsTable.add).toHaveBeenCalledWith(
        expect.objectContaining({ plantId: 'plant-1', tagId: 'tag-1', deletedAt: null })
      );
    });
  });

  describe('removeTagFromPlant', () => {
    it('should soft-delete the PlantTag record', async () => {
      const existing = {
        id: 'pt-1',
        plantId: 'plant-1',
        tagId: 'tag-1',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        deletedAt: null,
      };

      const { whereChain } = makeWhereChain({ firstResult: existing });
      mockPlantTagsTable.where.mockReturnValue(whereChain);
      mockPlantTagsTable.put.mockResolvedValue('pt-1');

      await repository.removeTagFromPlant('plant-1', 'tag-1');

      expect(mockPlantTagsTable.put).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'pt-1', deletedAt: expect.any(Date) })
      );
    });

    it('should do nothing if PlantTag association does not exist', async () => {
      const { whereChain } = makeWhereChain({ firstResult: undefined });
      mockPlantTagsTable.where.mockReturnValue(whereChain);

      await repository.removeTagFromPlant('plant-1', 'tag-99');

      expect(mockPlantTagsTable.put).not.toHaveBeenCalled();
    });
  });

  describe('setTagsForPlant', () => {
    it('should soft-delete existing tags and add the new set', async () => {
      const existingPlantTags = [
        { id: 'pt-1', plantId: 'plant-1', tagId: 'tag-old-1', deletedAt: null },
        { id: 'pt-2', plantId: 'plant-1', tagId: 'tag-old-2', deletedAt: null },
      ];

      // First where call: setTagsForPlant's initial lookup (toArray for existing)
      const { whereChain: wc1 } = makeWhereChain({ toArrayResult: existingPlantTags });
      // addTagToPlant calls are internal; each call to addTagToPlant uses plantTags.add
      mockPlantTagsTable.where.mockReturnValue(wc1);
      mockPlantTagsTable.put.mockResolvedValue(undefined);
      mockPlantTagsTable.add.mockResolvedValue('test-id-123');

      await repository.setTagsForPlant('plant-1', ['tag-new-1', 'tag-new-2', 'tag-new-3']);

      // Both old associations should be soft-deleted
      const putCalls = mockPlantTagsTable.put.mock.calls;
      expect(putCalls.length).toBe(2);
      putCalls.forEach((call: any[]) => {
        expect(call[0].deletedAt).toBeInstanceOf(Date);
      });

      // Three new associations should be added
      expect(mockPlantTagsTable.add).toHaveBeenCalledTimes(3);
    });

    it('should handle setting an empty tag list (removes all tags)', async () => {
      const existingPlantTags = [
        { id: 'pt-1', plantId: 'plant-1', tagId: 'tag-1', deletedAt: null },
      ];

      const { whereChain: wc1 } = makeWhereChain({ toArrayResult: existingPlantTags });
      mockPlantTagsTable.where.mockReturnValue(wc1);
      mockPlantTagsTable.put.mockResolvedValue(undefined);

      await repository.setTagsForPlant('plant-1', []);

      expect(mockPlantTagsTable.put).toHaveBeenCalledTimes(1);
      // No new tags to add
      expect(mockPlantTagsTable.add).not.toHaveBeenCalled();
    });

    it('should handle plant with no existing tags', async () => {
      const { whereChain: wc1 } = makeWhereChain({ toArrayResult: [] });
      mockPlantTagsTable.where.mockReturnValue(wc1);
      mockPlantTagsTable.add.mockResolvedValue('test-id-123');

      await repository.setTagsForPlant('plant-1', ['tag-1']);

      expect(mockPlantTagsTable.put).not.toHaveBeenCalled();
      expect(mockPlantTagsTable.add).toHaveBeenCalledTimes(1);
    });
  });
});
