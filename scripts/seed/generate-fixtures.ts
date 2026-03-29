#!/usr/bin/env tsx
/**
 * Fixture Generator — Fueille Mock Data
 *
 * Usage:
 *   pnpm seed:generate                         # seed=42, outputs fixtures/default.json
 *   pnpm seed:generate --random                # Date.now() seed, outputs fixtures/random-{ts}.json
 *   pnpm seed:generate --seed=123 --plants=50  # custom seed + scale
 *   pnpm seed:generate --preset=minimal        # 5 plants
 *   pnpm seed:generate --preset=large          # 100 plants
 *   pnpm seed:generate --preset=stress         # 500 plants
 */

import { faker } from '@faker-js/faker';
import { writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import type { SyncCursor } from '../../lib/domain/entities';
import { buildTags } from './builders/tag.builder';
import { buildPlants } from './builders/plant.builder';
import { buildPlantTags } from './builders/plantTag.builder';
import { buildCareTasksForPlant } from './builders/careTask.builder';
import { buildPhoto } from './builders/photo.builder';
import { buildLayouts } from './builders/layout.builder';
import { buildPlantMarkersForLayout } from './builders/plantMarker.builder';

// ── CLI arg parsing ────────────────────────────────────────────────────────────

interface CliArgs {
  seed: number;
  random: boolean;
  plants: number;
  preset: 'default' | 'minimal' | 'large' | 'stress';
  output?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { seed: 42, random: false, plants: 20, preset: 'default' };

  for (const arg of argv.slice(2)) {
    if (arg === '--random') {
      args.random = true;
    } else if (arg.startsWith('--seed=')) {
      args.seed = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--plants=')) {
      args.plants = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--preset=')) {
      args.preset = arg.split('=')[1] as CliArgs['preset'];
    } else if (arg.startsWith('--output=')) {
      args.output = arg.split('=')[1];
    }
  }

  // Apply preset plant counts (unless explicit --plants= was given)
  const hasExplicitPlants = argv.some((a) => a.startsWith('--plants='));
  if (!hasExplicitPlants) {
    const presetCounts: Record<CliArgs['preset'], number> = {
      default: 20,
      minimal: 5,
      large: 100,
      stress: 500,
    };
    args.plants = presetCounts[args.preset];
  }

  return args;
}

// ── Fixture type ───────────────────────────────────────────────────────────────

export interface MockFixture {
  meta: {
    seed: number;
    generatedAt: string;
    version: string;
    plantCount: number;
  };
  tags: ReturnType<typeof buildTags>;
  plants: ReturnType<typeof buildPlants>;
  plantTags: ReturnType<typeof buildPlantTags>;
  photos: ReturnType<typeof buildPhoto>[];
  careTasks: ReturnType<typeof buildCareTasksForPlant>[number][];
  layouts: ReturnType<typeof buildLayouts>;
  plantMarkers: ReturnType<typeof buildPlantMarkersForLayout>[number][];
  syncCursor: SyncCursor[];
}

// ── Generator ─────────────────────────────────────────────────────────────────

function generate(args: CliArgs): MockFixture {
  const seed = args.random ? Date.now() : args.seed;
  faker.seed(seed);

  // Tags (fixed set)
  const tags = buildTags(faker);

  // Plants
  const plants = buildPlants(args.plants, faker);
  const plantIds = plants.map((p) => p.id);

  // PlantTags (1–3 per plant)
  const plantTags = buildPlantTags(plantIds, faker);

  // Photos (1 per plant)
  const photos = plants.map((p, i) => buildPhoto(p.id, i, faker));

  // CareTasks (2–5 per plant)
  const careTasks = plants.flatMap((p) => buildCareTasksForPlant(p.id, faker));

  // Layouts (3)
  const layouts = buildLayouts(3, faker);

  // PlantMarkers (4–8 per layout)
  const plantMarkers = layouts.flatMap((l) =>
    buildPlantMarkersForLayout(l.id, plantIds, faker),
  );

  // SyncCursor
  const syncCursor: SyncCursor[] = [
    {
      id: 'default',
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  return {
    meta: {
      seed,
      generatedAt: new Date().toISOString(),
      version: '1',
      plantCount: args.plants,
    },
    tags,
    plants,
    plantTags,
    photos,
    careTasks,
    layouts,
    plantMarkers,
    syncCursor,
  };
}

// ── Output ────────────────────────────────────────────────────────────────────

function resolveOutputPath(args: CliArgs, seed: number): string {
  if (args.output) return args.output;
  const fixturesDir = join(process.cwd(), 'fixtures');
  mkdirSync(fixturesDir, { recursive: true });

  if (args.random) {
    return join(fixturesDir, `random-${seed}.json`);
  }
  if (args.preset !== 'default') {
    return join(fixturesDir, `${args.preset}.json`);
  }
  return join(fixturesDir, 'default.json');
}

// ── Entry point ───────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);
  const fixture = generate(args);
  const outPath = resolveOutputPath(args, fixture.meta.seed);

  writeFileSync(outPath, JSON.stringify(fixture, null, 2), 'utf-8');

  // If this is the default fixture, also sync it to public/mock-data/current.json
  // so the SeedPanel "Load Default" button can fetch it in the browser.
  const isDefault = !args.random && args.preset === 'default' && !args.output;
  if (isDefault) {
    const publicMockDir = join(process.cwd(), 'public', 'mock-data');
    mkdirSync(publicMockDir, { recursive: true });
    copyFileSync(outPath, join(publicMockDir, 'current.json'));
    console.log(`   → public/mock-data/current.json (synced)`);
  }

  console.log(`✅ Generated ${fixture.meta.plantCount} plants (seed=${fixture.meta.seed})`);
  console.log(`   → ${outPath}`);
  console.log(`   CareTasks: ${fixture.careTasks.length}`);
  console.log(`   PlantMarkers: ${fixture.plantMarkers.length}`);
}

main();
