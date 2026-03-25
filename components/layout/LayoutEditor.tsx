'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identificationResult, setIdentificationResult] = useState<string | null>(null);

  const handleImageClick = useCallback(
    async (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isAddingMarker || !selectedPlantId) return;

      const canvas = (e.currentTarget as HTMLElement).querySelector('[data-layout-canvas]');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (x < 0 || x > 100 || y < 0 || y > 100) return;

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

  const handleMarkerMove = useCallback(
    async (markerId: string, posX: number, posY: number) => {
      await plantMarkerRepository.updatePosition(markerId, posX, posY);
      onMarkersChange?.();
    },
    [onMarkersChange]
  );

  const handleDeleteMarker = async (markerId: string) => {
    if (!confirm('Remove this plant from the layout?')) return;
    await plantMarkerRepository.delete(markerId);
    onMarkersChange?.();
  };

  const toggleMoveMode = () => {
    setMoveMode((m) => !m);
    // Exit add mode when entering move mode
    if (!moveMode) {
      setIsAddingMarker(false);
      setSelectedPlantId(null);
    }
  };

  const toggleAddMode = () => {
    setIsAddingMarker((a) => !a);
    // Exit move mode when entering add mode
    if (!isAddingMarker) {
      setMoveMode(false);
    }
  };

  const handleIdentifyPlants = async () => {
    const imageSource = layout.imageUri || layout.remoteImageUrl;
    if (!imageSource) {
      setIdentificationResult('No layout image available');
      return;
    }

    setIsIdentifying(true);
    setIdentificationResult(null);

    try {
      const { identifyPlant } = await import('@/lib/ai/localPlantIdentifier');
      const results = await identifyPlant(imageSource, 5);
      const top = results[0];
      if (top) {
        setIdentificationResult(
          `Top prediction: ${top.label} (${(top.score * 100).toFixed(1)}%) — local AI`
        );
      } else {
        setIdentificationResult('No predictions returned');
      }
    } catch (error) {
      console.error('Plant identification error:', error);
      setIdentificationResult(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsIdentifying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-2 items-center flex-wrap">
        <Button
          onClick={toggleAddMode}
          variant={isAddingMarker ? 'default' : 'outline'}
          size="default"
        >
          {isAddingMarker ? 'Cancel' : 'Add Plant'}
        </Button>

        <Button
          onClick={toggleMoveMode}
          variant={moveMode ? 'default' : 'outline'}
          size="default"
        >
          {moveMode ? 'Done Moving' : 'Move Plants'}
        </Button>

        <Button
          onClick={handleIdentifyPlants}
          disabled={isIdentifying || !layout.imageUri}
          variant="outline"
          size="default"
        >
          {isIdentifying ? 'Identifying...' : 'Identify with AI'}
        </Button>

        {isAddingMarker && (
          <select
            value={selectedPlantId || ''}
            onChange={(e) => setSelectedPlantId(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
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

      {/* Status messages */}
      {identificationResult && (
        <div
          className={`p-4 rounded-lg text-sm ${
            identificationResult.startsWith('Identified')
              ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100'
              : 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100'
          }`}
        >
          {identificationResult}
        </div>
      )}

      {isAddingMarker && selectedPlantId && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
          Tap on the layout to place the plant marker
        </div>
      )}

      {moveMode && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-900 dark:text-amber-100">
          Drag any plant marker to reposition it
        </div>
      )}

      {/* Layout viewer */}
      <div
        onClick={isAddingMarker ? handleImageClick : undefined}
        className={isAddingMarker && selectedPlantId ? 'cursor-crosshair' : ''}
      >
        <LayoutViewer
          layout={layout}
          markers={markers}
          editable
          moveMode={moveMode}
          onMarkerMove={handleMarkerMove}
          onMarkerClick={(marker) => {
            if (!moveMode && marker.plantId) {
              router.push(`/plants/${marker.plantId}`);
            }
          }}
        />
      </div>
    </div>
  );
}
