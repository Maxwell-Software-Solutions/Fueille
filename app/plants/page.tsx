'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { plantRepository, tagRepository, type Plant, type Tag } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TagBadge } from '@/components/TagBadge';

export default function PlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [plantTagMap, setPlantTagMap] = useState<Record<string, Tag[]>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    try {
      const allPlants = await plantRepository.list();
      setPlants(allPlants);

      const tags = await tagRepository.list();
      setAllTags(tags);

      const tagMap: Record<string, Tag[]> = {};
      for (const plant of allPlants) {
        tagMap[plant.id] = await tagRepository.getTagsForPlant(plant.id);
      }
      setPlantTagMap(tagMap);
    } catch (error) {
      console.error('Failed to load plants:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFilterTag = (tagId: string) => {
    setFilterTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  useEffect(() => {
    if (filterTagIds.length > 0) {
      plantRepository.list({ tagIds: filterTagIds }).then(setPlants);
    } else {
      plantRepository.list().then(setPlants);
    }
  }, [filterTagIds]);

  const displayedPlants = searchQuery.trim()
    ? plants.filter((p) => {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.species ?? '').toLowerCase().includes(q) ||
          (p.location ?? '').toLowerCase().includes(q) ||
          (p.notes ?? '').toLowerCase().includes(q)
        );
      })
    : plants;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-medium">Loading plants...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">My Plants</h1>
        <Link href="/plants/new">
          <Button data-testid="add-plant-btn" size="lg">+ Add Plant</Button>
        </Link>
      </div>

      <div className="relative mb-4">
        <input
          data-testid="plant-search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, species, location..."
          className="w-full px-4 py-3 pr-10 neu-pressed rounded-xl bg-background focus:neu-flat transition-all outline-none focus:ring-2 focus:ring-primary/50"
        />
        {searchQuery && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchQuery('')}
          >
            ×
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {allTags.map((tag) => (
            <button key={tag.id} type="button" onClick={() => toggleFilterTag(tag.id)}>
              <TagBadge
                name={tag.name}
                color={filterTagIds.includes(tag.id) ? tag.color : undefined}
              />
            </button>
          ))}
        </div>
      )}

      {plants.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-2xl font-semibold mb-3">No plants yet</p>
          <p className="text-base text-muted-foreground mb-8">
            Start tracking your plants by adding your first one!
          </p>
          <Link href="/plants/new">
            <Button size="lg">Add Your First Plant</Button>
          </Link>
        </Card>
      ) : displayedPlants.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-2xl font-semibold mb-3">No plants match your search</p>
          <p className="text-base text-muted-foreground">
            Try a different search term or clear the filter.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPlants.map((plant) => (
            <Link key={plant.id} href={`/plants/${plant.id}`}>
              <Card data-testid="plant-card" className="p-5 neu-interactive cursor-pointer hover:neu-floating h-full">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden ${
                      plant.thumbnailUrl ? '' : 'neu-pressed'
                    }`}
                  >
                    {plant.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={plant.thumbnailUrl}
                        alt={plant.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl">🌱</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate mb-1">{plant.name}</h3>
                    {plant.species && (
                      <p className="text-sm text-muted-foreground truncate">{plant.species}</p>
                    )}
                    {plant.location && (
                      <p className="text-xs text-muted-foreground mt-2 truncate">
                        📍 {plant.location}
                      </p>
                    )}
                  </div>
                </div>
                {plant.notes && (
                  <p
                    className="text-sm text-muted-foreground mt-4 line-clamp-2 break-words"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {plant.notes}
                  </p>
                )}
                {plantTagMap[plant.id]?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {plantTagMap[plant.id].map((tag) => (
                      <TagBadge key={tag.id} name={tag.name} color={tag.color} />
                    ))}
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
