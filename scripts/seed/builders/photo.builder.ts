
import type { Faker } from '@faker-js/faker';
import type { Photo } from '../../../lib/domain/entities';

/** Build 1 thumbnail photo per plant */
export function buildPhoto(plantId: string, catalogIndex: number, faker: Faker): Photo {
  const takenAt = faker.date.past({ years: 0.5 });
  const uploadedAt = faker.helpers.maybe(() =>
    faker.date.between({ from: takenAt, to: new Date() }),
    { probability: 0.7 },
  ) ?? null;

  return {
    id: faker.string.uuid(),
    plantId,
    localUri: `/mock-images/plant-${(catalogIndex % 20) + 1}.svg`,
    remoteUrl: uploadedAt
      ? `https://example-blob.vercel-storage.com/plants/plant-${(catalogIndex % 20) + 1}.svg`
      : undefined,
    thumbnailUri: `/mock-images/plant-${(catalogIndex % 20) + 1}.svg`,
    width: 1080,
    height: 1080,
    takenAt,
    uploadedAt,
    createdAt: takenAt,
    updatedAt: uploadedAt ?? takenAt,
    deletedAt: null,
  };
}
