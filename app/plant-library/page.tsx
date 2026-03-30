'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLANT_CARE_LIBRARY, type PlantCareEntry } from '@/lib/plant-care-library';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const DIFFICULTY_LABELS: Record<PlantCareEntry['difficulty'], string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
};

const DIFFICULTY_CLASSES: Record<PlantCareEntry['difficulty'], string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const TASK_TYPE_EMOJI: Record<string, string> = {
  water: '💧',
  fertilize: '🌿',
  prune: '✂️',
  repot: '🪴',
  other: '📋',
};

function repeatLabel(interval: string | null, customDays: number | null): string {
  if (interval === 'daily') return 'Daily';
  if (interval === 'weekly') return 'Weekly';
  if (interval === 'biweekly') return 'Every 2 weeks';
  if (interval === 'monthly') return 'Monthly';
  if (customDays) return `Every ${customDays} days`;
  return 'As needed';
}

interface PlantCardProps {
  entry: PlantCareEntry;
}

function PlantCard({ entry }: PlantCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 neu-pressed rounded-2xl flex items-center justify-center flex-shrink-0">
          <span className="text-3xl">{entry.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-base">{entry.commonName}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-lg font-medium ${DIFFICULTY_CLASSES[entry.difficulty]}`}
            >
              {DIFFICULTY_LABELS[entry.difficulty]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground italic truncate">{entry.scientificName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Light</span>
          <p className="mt-0.5">{entry.light}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Water</span>
          <p className="mt-0.5">{entry.water}</p>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Hide Details' : 'View Details'}
        </Button>
        <Link href={`/plants/new?library=${encodeURIComponent(entry.commonName)}`}>
          <Button type="button" size="sm">
            Use This Plant
          </Button>
        </Link>
      </div>

      {expanded && (
        <div className="border-t pt-3 mt-1 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Default Care Tasks
          </p>
          {entry.defaultTasks.map((task, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span>{TASK_TYPE_EMOJI[task.taskType]}</span>
              <span className="flex-1">{task.title}</span>
              <span className="text-xs text-muted-foreground">
                {repeatLabel(task.repeatInterval, task.repeatCustomDays)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function PlantLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<PlantCareEntry['difficulty'] | 'all'>('all');

  const filtered = PLANT_CARE_LIBRARY.filter((entry) => {
    const matchesDifficulty = filterDifficulty === 'all' || entry.difficulty === filterDifficulty;
    if (!matchesDifficulty) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.commonName.toLowerCase().includes(q) ||
      entry.scientificName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Plant Care Library</h1>
        <p className="text-base text-muted-foreground">
          Browse common plants with default care schedules. Select one to pre-fill your new plant form.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or species..."
            className="w-full px-4 py-3 pr-10 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery('')}
            >
              &times;
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {(['all', 'easy', 'moderate', 'hard'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setFilterDifficulty(d)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterDifficulty === d
                  ? 'neu-pressed'
                  : 'neu-raised hover:neu-floating'
              }`}
            >
              {d === 'all' ? 'All' : DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-xl font-semibold mb-2">No plants found</p>
          <p className="text-base text-muted-foreground">Try a different search term or difficulty filter.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((entry) => (
            <PlantCard key={entry.commonName} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
