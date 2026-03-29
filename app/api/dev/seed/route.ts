/**
 * Dev-only API route: GET /api/dev/seed
 *
 * Generates a mock fixture on the server side (Node.js) and returns JSON.
 * Only available in development; returns 404 in production.
 *
 * Query params:
 *   ?random=1            — use Date.now() as seed
 *   ?seed=<N>            — custom seed (default: 42)
 *   ?plants=<N>          — number of plants (default: 20)
 *   ?preset=minimal|large|stress
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return new NextResponse('Not found', { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const isRandom = searchParams.get('random') === '1';
  const seedParam = searchParams.get('seed');
  const plantsParam = searchParams.get('plants');
  const preset = (searchParams.get('preset') ?? 'default') as
    | 'default'
    | 'minimal'
    | 'large'
    | 'stress';

  // Dynamically import (server-side Node.js only)
  const { faker } = await import('@faker-js/faker');
  const { buildTags } = await import('@/scripts/seed/builders/tag.builder');
  const { buildPlants } = await import('@/scripts/seed/builders/plant.builder');
  const { buildPlantTags } = await import('@/scripts/seed/builders/plantTag.builder');
  const { buildCareTasksForPlant } = await import('@/scripts/seed/builders/careTask.builder');
  const { buildPhoto } = await import('@/scripts/seed/builders/photo.builder');
  const { buildLayouts } = await import('@/scripts/seed/builders/layout.builder');
  const { buildPlantMarkersForLayout } = await import('@/scripts/seed/builders/plantMarker.builder');

  const presetCounts: Record<string, number> = {
    default: 20,
    minimal: 5,
    large: 100,
    stress: 500,
  };

  const plantCount = plantsParam ? parseInt(plantsParam, 10) : (presetCounts[preset] ?? 20);
  const seed = isRandom ? Date.now() : (seedParam ? parseInt(seedParam, 10) : 42);

  faker.seed(seed);

  const tags = buildTags(faker);
  const plants = buildPlants(plantCount, faker);
  const plantIds = plants.map((p) => p.id);
  const plantTags = buildPlantTags(plantIds, faker);
  const photos = plants.map((p, i) => buildPhoto(p.id, i, faker));
  const careTasks = plants.flatMap((p) => buildCareTasksForPlant(p.id, faker));
  const layouts = buildLayouts(3, faker);
  const plantMarkers = layouts.flatMap((l) =>
    buildPlantMarkersForLayout(l.id, plantIds, faker),
  );

  const fixture = {
    meta: {
      seed,
      generatedAt: new Date().toISOString(),
      version: '1',
      plantCount,
    },
    tags,
    plants,
    plantTags,
    photos,
    careTasks,
    layouts,
    plantMarkers,
    syncCursor: [
      {
        id: 'default',
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  return NextResponse.json(fixture);
}
