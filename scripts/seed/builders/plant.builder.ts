import type { Faker } from '@faker-js/faker';
import type { Plant } from '../../../lib/domain/entities';
import { PLANT_CATALOG } from '../constants/plant-catalog';

export interface PlantWithIndex extends Plant {
  /** 1-based catalog index used to derive thumbnail URL */
  _catalogIndex: number;
}

export function buildPlant(
  faker: Faker,
  catalogIndex: number,
  overrides: Partial<Plant> = {},
): PlantWithIndex {
  const entry = PLANT_CATALOG[catalogIndex % PLANT_CATALOG.length];
  const createdAt = faker.date.past({ years: 0.5 });
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

  const plant: PlantWithIndex = {
    id: faker.string.uuid(),
    name: entry.name,
    species: entry.species,
    location: entry.location,
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.6 }) ?? undefined,
    thumbnailUrl: `/mock-images/plant-${(catalogIndex % 20) + 1}.svg`,
    createdAt,
    updatedAt,
    deletedAt: null,
    _catalogIndex: catalogIndex,
    ...overrides,
  };

  return plant;
}

export function buildPlants(count: number, faker: Faker): PlantWithIndex[] {
  return Array.from({ length: count }, (_, i) => buildPlant(faker, i));
}
