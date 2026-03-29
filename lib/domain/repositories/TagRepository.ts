import { createId } from '@paralleldrive/cuid2';
import type { Tag, CreateTag, UpdateTag, PlantTag } from '../entities';
import { getDatabase } from '../database';

export class TagRepository {
  async create(data: CreateTag): Promise<Tag> {
    const db = getDatabase();
    const now = new Date();

    const tag: Tag = {
      id: createId(),
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.tags.add(tag);
    await this.queueSync('create', tag);

    return tag;
  }

  async getById(id: string): Promise<Tag | undefined> {
    const db = getDatabase();
    return db.tags.get(id);
  }

  async update(data: UpdateTag): Promise<Tag | undefined> {
    const db = getDatabase();
    const existing = await db.tags.get(data.id);

    if (!existing) {
      return undefined;
    }

    const updated: Tag = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    await db.tags.put(updated);
    await this.queueSync('update', updated);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const existing = await db.tags.get(id);

    if (!existing) {
      return false;
    }

    const deleted: Tag = {
      ...existing,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };

    await db.tags.put(deleted);
    await this.queueSync('delete', deleted);

    return true;
  }

  async list(includeDeleted?: boolean): Promise<Tag[]> {
    const db = getDatabase();
    let query = db.tags.toCollection();

    if (!includeDeleted) {
      query = query.filter((t) => !t.deletedAt);
    }

    const tags = await query.toArray();
    return tags.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTagsForPlant(plantId: string): Promise<Tag[]> {
    const db = getDatabase();
    const plantTags = await db.plantTags
      .where('plantId')
      .equals(plantId)
      .filter((pt) => !pt.deletedAt)
      .toArray();

    const tags: Tag[] = [];
    for (const pt of plantTags) {
      const tag = await db.tags.get(pt.tagId);
      if (tag && !tag.deletedAt) {
        tags.push(tag);
      }
    }

    return tags;
  }

  async getTagsWithPlantCount(): Promise<Array<Tag & { plantCount: number }>> {
    const db = getDatabase();
    const tags = await this.list();

    const result: Array<Tag & { plantCount: number }> = [];
    for (const tag of tags) {
      const count = await db.plantTags
        .where('tagId')
        .equals(tag.id)
        .filter((pt) => !pt.deletedAt)
        .count();
      result.push({ ...tag, plantCount: count });
    }

    return result;
  }

  async addTagToPlant(plantId: string, tagId: string): Promise<PlantTag> {
    const db = getDatabase();
    const now = new Date();

    const plantTag: PlantTag = {
      id: createId(),
      plantId,
      tagId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.plantTags.add(plantTag);

    return plantTag;
  }

  async removeTagFromPlant(plantId: string, tagId: string): Promise<void> {
    const db = getDatabase();
    const existing = await db.plantTags
      .where('plantId')
      .equals(plantId)
      .filter((pt) => pt.tagId === tagId && !pt.deletedAt)
      .first();

    if (existing) {
      await db.plantTags.put({
        ...existing,
        deletedAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  async setTagsForPlant(plantId: string, tagIds: string[]): Promise<void> {
    const db = getDatabase();

    // Soft-delete all existing tags for this plant
    const existing = await db.plantTags
      .where('plantId')
      .equals(plantId)
      .filter((pt) => !pt.deletedAt)
      .toArray();

    for (const pt of existing) {
      await db.plantTags.put({
        ...pt,
        deletedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Add each new tag
    for (const tagId of tagIds) {
      await this.addTagToPlant(plantId, tagId);
    }
  }

  private async queueSync(operation: 'create' | 'update' | 'delete', tag: Tag): Promise<void> {
    const db = getDatabase();

    await db.deviceSync.add({
      id: createId(),
      entityType: 'tag',
      entityId: tag.id,
      operation,
      data: JSON.stringify(tag),
      createdAt: new Date(),
      syncedAt: null,
      retryCount: 0,
      lastError: null,
    });
  }
}

export const tagRepository = new TagRepository();
