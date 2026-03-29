
import type { Faker } from '@faker-js/faker';
import type { PlantMarker } from '../../../lib/domain/entities';

const PLANT_ICONS = ['🌿', '🌱', '🌵', '🌸', '🍀', '🌺', '🪴', '🌻'];

/**
 * Build 4–8 plant markers for a layout.
 * Positions are kept in 10–90% range to avoid edge placement.
 * Plant IDs are sampled (without replacement) from the available pool.
 */
export function buildPlantMarkersForLayout(
  layoutId: string,
  availablePlantIds: string[],
  faker: Faker,
): PlantMarker[] {
  const minMarkers = Math.min(4, availablePlantIds.length);
  const count = faker.number.int({ min: minMarkers, max: Math.min(8, availablePlantIds.length) });
  const selectedPlantIds = faker.helpers.arrayElements(availablePlantIds, count);

  return selectedPlantIds.map((plantId) => {
    const createdAt = faker.date.past({ years: 0.5 });
    return {
      id: faker.string.uuid(),
      layoutId,
      plantId,
      positionX: faker.number.float({ min: 10, max: 90, fractionDigits: 1 }),
      positionY: faker.number.float({ min: 10, max: 90, fractionDigits: 1 }),
      icon: faker.helpers.maybe(() => faker.helpers.arrayElement(PLANT_ICONS), { probability: 0.4 }),
      rotation: faker.helpers.maybe(() => faker.number.int({ min: 0, max: 360 }), { probability: 0.2 }),
      scale: faker.helpers.maybe(() => faker.number.float({ min: 0.8, max: 1.5, fractionDigits: 1 }), { probability: 0.3 }),
      label: undefined,
      createdAt,
      updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
      deletedAt: null,
    };
  });
}
