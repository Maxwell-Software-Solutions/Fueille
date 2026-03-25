/**
 * @jest-environment node
 */
/**
 * Unit tests for the fixture generator builders.
 *
 * Run with: pnpm test:unit
 */

import { faker } from '@faker-js/faker';
import { buildTags } from './builders/tag.builder';
import { buildPlants } from './builders/plant.builder';
import { buildPlantTags } from './builders/plantTag.builder';
import { buildCareTasksForPlant } from './builders/careTask.builder';
import { buildPhoto } from './builders/photo.builder';
import { buildLayouts } from './builders/layout.builder';
import { buildPlantMarkersForLayout } from './builders/plantMarker.builder';
import { PLANT_CATALOG } from './constants/plant-catalog';
import { TASK_TEMPLATES } from './constants/task-templates';

describe('plant-catalog', () => {
  it('has 50 entries', () => {
    expect(PLANT_CATALOG).toHaveLength(50);
  });

  it('every entry has name, species, and location', () => {
    for (const entry of PLANT_CATALOG) {
      expect(entry.name).toBeTruthy();
      expect(entry.species).toBeTruthy();
      expect(entry.location).toBeTruthy();
    }
  });
});

describe('task-templates', () => {
  it('covers all taskTypes', () => {
    const taskTypes: (keyof typeof TASK_TEMPLATES)[] = [
      'water', 'fertilize', 'prune', 'repot', 'other',
    ];
    for (const type of taskTypes) {
      expect(TASK_TEMPLATES[type].length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('buildTags', () => {
  beforeEach(() => faker.seed(42));

  it('returns 5 tags', () => {
    const tags = buildTags(faker);
    expect(tags).toHaveLength(5);
  });

  it('each tag has id, name, color, createdAt, updatedAt', () => {
    const tags = buildTags(faker);
    for (const tag of tags) {
      expect(tag.id).toBeTruthy();
      expect(tag.name).toBeTruthy();
      expect(tag.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tag.createdAt).toBeInstanceOf(Date);
      expect(tag.updatedAt).toBeInstanceOf(Date);
    }
  });

  it('is deterministic with same seed', () => {
    faker.seed(42);
    const a = buildTags(faker);
    faker.seed(42);
    const b = buildTags(faker);
    expect(a.map((t) => t.id)).toEqual(b.map((t) => t.id));
  });
});

describe('buildPlants', () => {
  beforeEach(() => faker.seed(42));

  it('returns the requested count', () => {
    const plants = buildPlants(10, faker);
    expect(plants).toHaveLength(10);
  });

  it('each plant has required fields', () => {
    const plants = buildPlants(5, faker);
    for (const plant of plants) {
      expect(plant.id).toBeTruthy();
      expect(plant.name).toBeTruthy();
      expect(plant.species).toBeTruthy();
      expect(plant.createdAt).toBeInstanceOf(Date);
      expect(plant.updatedAt).toBeInstanceOf(Date);
      expect(plant.thumbnailUrl).toMatch(/^\/mock-images\/plant-\d+\.svg$/);
    }
  });

  it('is deterministic with same seed', () => {
    faker.seed(99);
    const a = buildPlants(5, faker);
    faker.seed(99);
    const b = buildPlants(5, faker);
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });
});

describe('buildPlantTags', () => {
  beforeEach(() => faker.seed(42));

  it('returns 1–3 tags per plant', () => {
    faker.seed(42);
    const plants = buildPlants(10, faker);
    const plantIds = plants.map((p) => p.id);

    faker.seed(42);
    buildPlants(10, faker); // advance rng same way
    const plantTags = buildPlantTags(plantIds, faker);

    // Each plantId should have 1–3 associated tags
    for (const plantId of plantIds) {
      const tags = plantTags.filter((pt) => pt.plantId === plantId);
      expect(tags.length).toBeGreaterThanOrEqual(1);
      expect(tags.length).toBeLessThanOrEqual(3);
    }
  });

  it('all tagIds reference valid SEED_TAGS', () => {
    const { SEED_TAGS } = require('./builders/tag.builder');
    const validTagIds = new Set(SEED_TAGS.map((t: { id: string }) => t.id));

    faker.seed(42);
    const plants = buildPlants(5, faker);
    const plantTags = buildPlantTags(plants.map((p) => p.id), faker);

    for (const pt of plantTags) {
      expect(validTagIds.has(pt.tagId)).toBe(true);
    }
  });
});

describe('buildCareTasksForPlant', () => {
  beforeEach(() => faker.seed(42));

  it('returns 2–5 tasks per plant', () => {
    for (let i = 0; i < 20; i++) {
      const tasks = buildCareTasksForPlant('plant-test-id', faker);
      expect(tasks.length).toBeGreaterThanOrEqual(2);
      expect(tasks.length).toBeLessThanOrEqual(5);
    }
  });

  it('all tasks reference the correct plantId', () => {
    const tasks = buildCareTasksForPlant('plant-abc', faker);
    for (const task of tasks) {
      expect(task.plantId).toBe('plant-abc');
    }
  });

  it('completed tasks have completedAt set', () => {
    faker.seed(42);
    // Generate many tasks to cover the completed path
    const allTasks = Array.from({ length: 100 }, () =>
      buildCareTasksForPlant('p', faker),
    ).flat();
    const completed = allTasks.filter((t) => t.completedAt !== null);
    // At least some tasks should be completed
    expect(completed.length).toBeGreaterThan(0);
    for (const t of completed) {
      expect(t.completedAt).toBeInstanceOf(Date);
    }
  });

  it('overdue tasks have no completedAt', () => {
    faker.seed(42);
    const allTasks = Array.from({ length: 50 }, () =>
      buildCareTasksForPlant('p', faker),
    ).flat();
    const now = new Date();
    const overdue = allTasks.filter((t) => t.dueAt && t.dueAt < now && t.completedAt === null);
    // Overdue tasks should exist (20% distribution)
    expect(overdue.length).toBeGreaterThan(0);
  });
});

describe('buildPhoto', () => {
  beforeEach(() => faker.seed(42));

  it('builds a photo with correct plantId', () => {
    const photo = buildPhoto('plant-123', 0, faker);
    expect(photo.plantId).toBe('plant-123');
    expect(photo.localUri).toMatch(/plant-1\.svg$/);
    expect(photo.takenAt).toBeInstanceOf(Date);
  });

  it('cycles through 20 image slots', () => {
    const photo0 = buildPhoto('p', 0, faker);
    const photo19 = buildPhoto('p', 19, faker);
    const photo20 = buildPhoto('p', 20, faker);
    expect(photo0.localUri).toBe('/mock-images/plant-1.svg');
    expect(photo19.localUri).toBe('/mock-images/plant-20.svg');
    expect(photo20.localUri).toBe('/mock-images/plant-1.svg'); // wraps
  });
});

describe('buildLayouts', () => {
  beforeEach(() => faker.seed(42));

  it('returns the requested count', () => {
    const layouts = buildLayouts(3, faker);
    expect(layouts).toHaveLength(3);
  });

  it('each layout has required fields', () => {
    const layouts = buildLayouts(3, faker);
    for (const layout of layouts) {
      expect(layout.id).toBeTruthy();
      expect(layout.name).toBeTruthy();
      expect(['indoor', 'outdoor']).toContain(layout.type);
      expect(layout.imageWidth).toBeGreaterThan(0);
      expect(layout.imageHeight).toBeGreaterThan(0);
    }
  });
});

describe('buildPlantMarkersForLayout', () => {
  beforeEach(() => faker.seed(42));

  it('returns 4–8 markers per layout', () => {
    const plantIds = Array.from({ length: 20 }, (_, i) => `plant-${i}`);
    for (let i = 0; i < 10; i++) {
      const markers = buildPlantMarkersForLayout('layout-1', plantIds, faker);
      expect(markers.length).toBeGreaterThanOrEqual(4);
      expect(markers.length).toBeLessThanOrEqual(8);
    }
  });

  it('positions are within 10–90% range', () => {
    const plantIds = Array.from({ length: 20 }, (_, i) => `plant-${i}`);
    const markers = buildPlantMarkersForLayout('layout-1', plantIds, faker);
    for (const marker of markers) {
      expect(marker.positionX).toBeGreaterThanOrEqual(10);
      expect(marker.positionX).toBeLessThanOrEqual(90);
      expect(marker.positionY).toBeGreaterThanOrEqual(10);
      expect(marker.positionY).toBeLessThanOrEqual(90);
    }
  });

  it('all markers reference valid plantIds', () => {
    const plantIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'];
    const markers = buildPlantMarkersForLayout('layout-x', plantIds, faker);
    const plantIdSet = new Set(plantIds);
    for (const marker of markers) {
      expect(plantIdSet.has(marker.plantId)).toBe(true);
    }
  });

  it('no duplicate plantIds within a single layout', () => {
    const plantIds = Array.from({ length: 20 }, (_, i) => `plant-${i}`);
    const markers = buildPlantMarkersForLayout('layout-1', plantIds, faker);
    const usedPlantIds = markers.map((m) => m.plantId);
    const uniqueIds = new Set(usedPlantIds);
    expect(uniqueIds.size).toBe(usedPlantIds.length);
  });
});

describe('fixture determinism', () => {
  it('same seed produces identical fixtures', () => {
    faker.seed(42);
    const plants1 = buildPlants(5, faker).map((p) => p.id);

    faker.seed(42);
    const plants2 = buildPlants(5, faker).map((p) => p.id);

    expect(plants1).toEqual(plants2);
  });

  it('different seeds produce different plant IDs', () => {
    faker.seed(1);
    const plants1 = buildPlants(5, faker).map((p) => p.id);

    faker.seed(2);
    const plants2 = buildPlants(5, faker).map((p) => p.id);

    expect(plants1).not.toEqual(plants2);
  });
});
