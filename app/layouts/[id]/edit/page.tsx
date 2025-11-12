'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  layoutRepository,
  plantMarkerRepository,
  plantRepository,
  type Layout,
  type PlantMarker,
  type Plant,
} from '@/lib/domain';
import { LayoutEditor } from '@/components/layout/LayoutEditor';
import { Button } from '@/components/ui/button';

export default function EditLayoutPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [markers, setMarkers] = useState<Array<PlantMarker & { plant?: Plant }>>([]);
  const [availablePlants, setAvailablePlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const layoutData = await layoutRepository.getById(params.id);
      if (!layoutData) {
        router.push('/layouts');
        return;
      }
      setLayout(layoutData);

      const markerData = await plantMarkerRepository.getMarkersWithPlants(params.id);
      setMarkers(markerData);

      const plants = await plantRepository.list();
      setAvailablePlants(plants);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !layout) {
    return <div className="container mx-auto px-6 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Edit {layout.name}</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Done
        </Button>
      </div>

      <LayoutEditor
        layout={layout}
        markers={markers}
        availablePlants={availablePlants}
        onMarkersChange={loadData}
      />
    </div>
  );
}
