
import type { Faker } from '@faker-js/faker';
import type { Layout } from '../../../lib/domain/entities';

const LAYOUT_PRESETS: Omit<Layout, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'remoteImageUrl'>[] = [
  {
    name: 'Living Room',
    description: 'Main living space with south-facing windows',
    type: 'indoor',
    imageWidth: 1200,
    imageHeight: 800,
    imageUri: '/mock-images/layout-living-room.svg',
    thumbnailUri: '/mock-images/layout-living-room.svg',
  },
  {
    name: 'Backyard Garden',
    description: 'Raised beds and pots on the patio',
    type: 'outdoor',
    imageWidth: 1600,
    imageHeight: 900,
    imageUri: '/mock-images/layout-backyard.svg',
    thumbnailUri: '/mock-images/layout-backyard.svg',
  },
  {
    name: 'Balcony',
    description: 'Small balcony with east-facing exposure',
    type: 'outdoor',
    imageWidth: 800,
    imageHeight: 600,
    imageUri: '/mock-images/layout-balcony.svg',
    thumbnailUri: '/mock-images/layout-balcony.svg',
  },
];

export function buildLayout(index: number, faker: Faker): Layout {
  const preset = LAYOUT_PRESETS[index % LAYOUT_PRESETS.length];
  const createdAt = faker.date.past({ years: 0.5 });

  return {
    id: faker.string.uuid(),
    ...preset,
    remoteImageUrl: undefined,
    createdAt,
    updatedAt: faker.date.between({ from: createdAt, to: new Date() }),
    deletedAt: null,
  };
}

export function buildLayouts(count: number, faker: Faker): Layout[] {
  return Array.from({ length: count }, (_, i) => buildLayout(i, faker));
}
