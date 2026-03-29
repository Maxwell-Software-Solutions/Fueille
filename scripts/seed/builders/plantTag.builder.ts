import type { Faker } from '@faker-js/faker';
import type { PlantTag } from '../../../lib/domain/entities';
import { SEED_TAGS } from './tag.builder';

/**
 * Assign 1–3 tags to each plant.
 * Tags are selected pseudo-randomly but deterministically via faker.
 */
export function buildPlantTags(plantIds: string[], faker: Faker): PlantTag[] {
  const tagIds = SEED_TAGS.map((t) => t.id);
  const result: PlantTag[] = [];

  for (const plantId of plantIds) {
    const count = faker.number.int({ min: 1, max: 3 });
    const selected = faker.helpers.arrayElements(tagIds, count);

    for (const tagId of selected) {
      const createdAt = faker.date.past({ years: 0.5 });
      result.push({
        id: faker.string.uuid(),
        plantId,
        tagId,
        createdAt,
        updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
        deletedAt: null,
      });
    }
  }

  return result;
}
