'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { plantRepository, type Plant } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function PlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    try {
      const allPlants = await plantRepository.list();
      setPlants(allPlants);
    } catch (error) {
      console.error('Failed to load plants:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <Button size="lg">+ Add Plant</Button>
        </Link>
      </div>

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plants.map((plant) => (
            <Link key={plant.id} href={`/plants/${plant.id}`}>
              <Card className="p-5 neu-interactive cursor-pointer hover:neu-floating h-full">
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
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
