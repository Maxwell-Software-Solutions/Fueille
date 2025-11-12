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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-4 items-center">
        <Button
          onClick={() => setIsAddingMarker(!isAddingMarker)}
          variant={isAddingMarker ? 'default' : 'outline'}
        >
          {isAddingMarker ? 'Cancel' : 'Add Plant'}
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
