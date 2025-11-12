'use client';

import { useState, useCallback } from 'react';
import { LayoutViewer } from './LayoutViewer';
import { Button } from '@/components/ui/button';
import { plantMarkerRepository, type Layout, type PlantMarker, type Plant } from '@/lib/domain';

interface LayoutEditorProps {
  layout: Layout;
  markers: Array<PlantMarker & { plant?: any }>;
  availablePlants: Plant[];
  onMarkersChange?: () => void;
}

export function LayoutEditor({
  layout,
  markers,
  availablePlants,
  onMarkersChange,
}: LayoutEditorProps) {
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<string | null>(null);

  const handleImageClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isAddingMarker || !selectedPlantId) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      await plantMarkerRepository.create({
        layoutId: layout.id,
        plantId: selectedPlantId,
        positionX: x,
        positionY: y,
      });

      setIsAddingMarker(false);
      setSelectedPlantId(null);
      onMarkersChange?.();
    },
    [isAddingMarker, selectedPlantId, layout.id, onMarkersChange]
  );

  const handleMarkerDragStart = (markerId: string) => {
    setDraggedMarkerId(markerId);
  };

  const handleMarkerDragEnd = async (markerId: string, newX: number, newY: number) => {
    await plantMarkerRepository.updatePosition(markerId, newX, newY);
    setDraggedMarkerId(null);
    onMarkersChange?.();
  };

  const handleDeleteMarker = async (markerId: string) => {
    if (!confirm('Remove this plant from the layout?')) return;
    await plantMarkerRepository.delete(markerId);
    onMarkersChange?.();
  };

  const handleIdentifyPlants = async () => {
    if (!layout.imageUri && !layout.remoteImageUrl) {
      setIdentificationResult('No layout image available');
      return;
    }

    setIsIdentifying(true);
    setIdentificationResult(null);

    try {
      const response = await fetch('/api/identify-plants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layoutId: layout.id,
          imageUrl: layout.remoteImageUrl,
          imageData: layout.imageUri,
          autoCreatePlants: true,
          autoCreateMarkers: true,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIdentificationResult(
          `✅ Identified ${result.plants.length} plant(s) in ${(result.processingTimeMs / 1000).toFixed(1)}s!`
        );
        onMarkersChange?.(); // Refresh to show new plants/markers
      } else {
        setIdentificationResult(`❌ Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Plant identification error:', error);
      setIdentificationResult(
        `❌ Failed to identify plants: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsIdentifying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-4 items-center flex-wrap">
        <Button
          onClick={() => setIsAddingMarker(!isAddingMarker)}
          variant={isAddingMarker ? 'default' : 'outline'}
        >
          {isAddingMarker ? 'Cancel' : 'Add Plant'}
        </Button>

        <Button
          onClick={handleIdentifyPlants}
          disabled={isIdentifying || !layout.imageUri}
          variant="outline"
        >
          {isIdentifying ? '🔍 Identifying...' : '🔍 Identify Plants with AI'}
        </Button>

        {isAddingMarker && (
          <select
            value={selectedPlantId || ''}
            onChange={(e) => setSelectedPlantId(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <option value="">Select a plant...</option>
            {availablePlants.map((plant) => (
              <option key={plant.id} value={plant.id}>
                {plant.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Identification result */}
      {identificationResult && (
        <div
          className={`p-4 rounded-lg ${
            identificationResult.startsWith('✅')
              ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100'
              : 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100'
          }`}
        >
          {identificationResult}
        </div>
      )}

      {/* Instructions */}
      {isAddingMarker && selectedPlantId && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          Click on the image to place the plant marker
        </div>
      )}

      {/* Layout viewer */}
      <div onClick={handleImageClick} className={isAddingMarker ? 'cursor-crosshair' : ''}>
        <LayoutViewer
          layout={layout}
          markers={markers}
          editable
          onMarkerClick={(marker) => {
            // Show edit options
            console.log('Edit marker', marker);
          }}
        />
      </div>
    </div>
  );
}
