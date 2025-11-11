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
        <p className="text-lg">Loading plants...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Plants</h1>
        <Link href="/plants/new">
          <Button>+ Add Plant</Button>
        </Link>
      </div>

      {plants.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-xl mb-4">No plants yet</p>
          <p className="text-muted-foreground mb-6">
            Start tracking your plants by adding your first one!
          </p>
          <Link href="/plants/new">
            <Button>Add Your First Plant</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plants.map((plant) => (
            <Link key={plant.id} href={`/plants/${plant.id}`}>
              <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🌱</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{plant.name}</h3>
                    {plant.species && (
                      <p className="text-sm text-muted-foreground truncate">{plant.species}</p>
                    )}
                    {plant.location && (
                      <p className="text-xs text-muted-foreground mt-1">📍 {plant.location}</p>
                    )}
                  </div>
                </div>
                {plant.notes && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{plant.notes}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
