'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { plantRepository, tagRepository, careTaskRepository } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TagPicker } from '@/components/TagPicker';
import { PLANT_CARE_LIBRARY, type PlantCareEntry } from '@/lib/plant-care-library';
import dynamic from 'next/dynamic';

const LocalPlantIdentifier = dynamic(
  () => import('@/components/LocalPlantIdentifier').then((m) => ({ default: m.LocalPlantIdentifier })),
  { ssr: false },
);

const DIFFICULTY_CLASSES: Record<PlantCareEntry['difficulty'], string> = {
  easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function LibraryModal({
  onSelect,
  onClose,
}: {
  onSelect: (entry: PlantCareEntry) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = PLANT_CARE_LIBRARY.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.commonName.toLowerCase().includes(q) ||
      entry.scientificName.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg max-h-[80vh] flex flex-col neu-flat rounded-2xl bg-background overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h2 className="text-lg font-semibold">Browse Plant Library</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-4 border-b border-border/30">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plants..."
            className="w-full px-3 py-2 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 text-sm">No plants match your search.</p>
          ) : (
            filtered.map((entry) => (
              <button
                key={entry.commonName}
                type="button"
                onClick={() => onSelect(entry)}
                className="w-full text-left p-3 rounded-xl hover:bg-muted transition-colors flex items-center gap-3"
              >
                <span className="text-2xl flex-shrink-0">{entry.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{entry.commonName}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-lg font-medium ${DIFFICULTY_CLASSES[entry.difficulty]}`}
                    >
                      {entry.difficulty.charAt(0).toUpperCase() + entry.difficulty.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground italic truncate">{entry.scientificName}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewPlantPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedLibraryEntry, setSelectedLibraryEntry] = useState<PlantCareEntry | null>(null);
  const [addDefaultTasks, setAddDefaultTasks] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    species: '',
    location: '',
    notes: '',
  });

  // Pre-fill from ?library=PlantName query param (coming from library page)
  useEffect(() => {
    const libraryName = searchParams.get('library');
    if (libraryName) {
      const entry = PLANT_CARE_LIBRARY.find(
        (e) => e.commonName.toLowerCase() === libraryName.toLowerCase()
      );
      if (entry) {
        applyLibraryEntry(entry);
      }
    }
  // applyLibraryEntry is stable (no deps) — only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyLibraryEntry(entry: PlantCareEntry) {
    setSelectedLibraryEntry(entry);
    setFormData((f) => ({
      ...f,
      name: f.name || entry.commonName,
      species: f.species || entry.scientificName,
    }));
  }

  const handleLibrarySelect = (entry: PlantCareEntry) => {
    applyLibraryEntry(entry);
    setShowLibrary(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const plant = await plantRepository.create({
        name: formData.name,
        species: formData.species || undefined,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
      });

      if (selectedTagIds.length > 0) {
        await tagRepository.setTagsForPlant(plant.id, selectedTagIds);
      }

      // Create default care tasks if user opted in and a library entry was selected
      if (addDefaultTasks && selectedLibraryEntry) {
        const today = new Date();
        await Promise.all(
          selectedLibraryEntry.defaultTasks.map((task) =>
            careTaskRepository.create({
              plantId: plant.id,
              title: task.title,
              taskType: task.taskType,
              dueAt: today,
              completedAt: null,
              snoozedUntil: null,
              repeatInterval: task.repeatInterval ?? null,
              repeatCustomDays: task.repeatCustomDays ?? null,
            })
          )
        );
      }

      router.push('/plants');
    } catch (error) {
      console.error('Failed to create plant:', error);
      alert('Failed to create plant. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Add New Plant</h1>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="name" className="block text-sm font-semibold">
                Plant Name *
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLibrary(true)}
              >
                Browse Library
              </Button>
            </div>
            <input
              data-testid="plant-name-input"
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., Snake Plant"
            />
            {selectedLibraryEntry && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {selectedLibraryEntry.emoji} Pre-filled from library: {selectedLibraryEntry.commonName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3">
              Identify from Photo
            </label>
            <LocalPlantIdentifier
              compact
              onResult={(label) => setFormData((f) => ({ ...f, species: label, name: f.name || label }))}
            />
          </div>

          <div>
            <label htmlFor="species" className="block text-sm font-semibold mb-3">
              Species
            </label>
            <input
              data-testid="plant-species-input"
              id="species"
              type="text"
              value={formData.species}
              onChange={(e) => setFormData({ ...formData, species: e.target.value })}
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., Sansevieria trifasciata"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-semibold mb-3">
              Location
            </label>
            <input
              data-testid="plant-location-input"
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g., Living Room"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-semibold mb-3">
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={5}
              placeholder="Care instructions, observations, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-3">Tags</label>
            <TagPicker selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} placeholder="Add tags..." />
          </div>

          {selectedLibraryEntry && selectedLibraryEntry.defaultTasks.length > 0 && (
            <div className="neu-pressed rounded-xl p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addDefaultTasks}
                  onChange={(e) => setAddDefaultTasks(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded"
                />
                <div>
                  <span className="text-sm font-semibold">Add default care tasks</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Create {selectedLibraryEntry.defaultTasks.length} recommended care task{selectedLibraryEntry.defaultTasks.length !== 1 ? 's' : ''} for {selectedLibraryEntry.commonName}
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="flex gap-4 pt-6">
            <Button data-testid="save-plant-btn" type="submit" disabled={saving || !formData.name.trim()} size="lg">
              {saving ? 'Saving...' : 'Save Plant'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={saving}
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {showLibrary && (
        <LibraryModal onSelect={handleLibrarySelect} onClose={() => setShowLibrary(false)} />
      )}
    </div>
  );
}
