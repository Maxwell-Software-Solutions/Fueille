'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  layoutRepository,
  plantMarkerRepository,
  type Layout,
  type PlantMarker,
  type Plant,
} from '@/lib/domain';
import { LayoutViewer } from '@/components/layout/LayoutViewer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LayoutDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [markers, setMarkers] = useState<Array<PlantMarker & { plant?: Plant }>>([]);
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
    } catch (error) {
      console.error('Failed to load layout:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!confirm('Delete this layout? Plant markers will be removed.')) return;

    try {
      await layoutRepository.delete(params.id);
      router.push('/layouts');
    } catch (error) {
      console.error('Failed to delete layout:', error);
    }
  };

  const handleMarkerClick = (marker: PlantMarker) => {
    // Navigate to plant detail
    if (marker.plantId) {
      router.push(`/plants/${marker.plantId}`);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-6 py-8">Loading...</div>;
  }

  if (!layout) {
    return null;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{layout.name}</h1>
          {layout.description && <p className="text-muted-foreground mt-2">{layout.description}</p>}
        </div>
        <div className="flex gap-2">
          <Link href={`/layouts/${layout.id}/edit`}>
            <Button variant="outline">Edit Layout</Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {/* Layout viewer */}
      <Card className="p-4 mb-8">
        <LayoutViewer layout={layout} markers={markers} onMarkerClick={handleMarkerClick} />
      </Card>

      {/* Plant list */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Plants in this layout ({markers.length})</h2>
        {markers.length === 0 ? (
          <p className="text-muted-foreground">
            No plants placed yet.{' '}
            <Link href={`/layouts/${layout.id}/edit`} className="text-primary hover:underline">
              Add plants
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {markers.map((marker) => (
              <li key={marker.id}>
                <Link
                  href={`/plants/${marker.plantId}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-2xl">{marker.icon || '🌱'}</span>
                  <span className="font-medium">{marker.plant?.name || 'Unknown'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
