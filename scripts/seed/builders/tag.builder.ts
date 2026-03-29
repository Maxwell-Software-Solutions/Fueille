import type { Faker } from '@faker-js/faker';
import type { Tag } from '../../../lib/domain/entities';

/**
 * The 5 canonical tags used across the seed dataset.
 * Fixed so relational references stay stable across any seed run.
 */
export const SEED_TAGS: Omit<Tag, 'createdAt' | 'updatedAt'>[] = [
  { id: 'tag-tropical', name: 'Tropical', color: '#22c55e', deletedAt: null },
  { id: 'tag-succulent', name: 'Succulent', color: '#f59e0b', deletedAt: null },
  { id: 'tag-herb', name: 'Herb', color: '#84cc16', deletedAt: null },
  { id: 'tag-flowering', name: 'Flowering', color: '#ec4899', deletedAt: null },
  { id: 'tag-rare', name: 'Rare', color: '#8b5cf6', deletedAt: null },
];

export function buildTag(
  partial: Omit<Tag, 'createdAt' | 'updatedAt'>,
  faker: Faker,
): Tag {
  const createdAt = faker.date.past({ years: 1 });
  return {
    ...partial,
    createdAt,
    updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
  };
}

export function buildTags(faker: Faker): Tag[] {
  return SEED_TAGS.map((t) => buildTag(t, faker));
}
