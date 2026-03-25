'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { MarkerIcon } from './MarkerIcon';
import { ZoomPanContainer } from './ZoomPanContainer';
import type { Layout, PlantMarker } from '@/lib/domain';

interface LayoutViewerProps {
  layout: Layout;
  markers: Array<PlantMarker & { plant?: any }>;
  onMarkerClick?: (marker: PlantMarker) => void;
  onMarkerMove?: (markerId: string, posX: number, posY: number) => void;
  editable?: boolean;
  moveMode?: boolean;
}

export function LayoutViewer({
  layout,
  markers,
  onMarkerClick,
  onMarkerMove,
  editable = false,
  moveMode = false,
}: LayoutViewerProps) {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [draggedMarkerId, setDraggedMarkerId] = useState<string | null>(null);
  // Local position overrides while dragging (for live preview)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const handleMarkerClick = useCallback(
    (marker: PlantMarker) => {
      setSelectedMarkerId(marker.id);
      onMarkerClick?.(marker);
    },
    [onMarkerClick]
  );

  const handleDragStart = useCallback((markerId: string) => {
    setDraggedMarkerId(markerId);
    setDragPos(null);
  }, []);

  const handleDragMove = useCallback(
    (markerId: string, posX: number, posY: number) => {
      if (draggedMarkerId === markerId) {
        setDragPos({ x: posX, y: posY });
      }
    },
    [draggedMarkerId]
  );

  const handleDragEnd = useCallback(
    (markerId: string, posX: number, posY: number) => {
      setDraggedMarkerId(null);
      setDragPos(null);
      onMarkerMove?.(markerId, posX, posY);
    },
    [onMarkerMove]
  );

  return (
    <ZoomPanContainer>
      <div className="relative" data-layout-canvas>
        {/* Layout background image */}
        {layout.imageUri && (
          <Image
            src={layout.imageUri}
            alt={layout.name}
            width={layout.imageWidth}
            height={layout.imageHeight}
            className="w-full h-auto"
            style={{
              maxWidth: layout.imageWidth,
              maxHeight: layout.imageHeight,
            }}
            draggable={false}
          />
        )}

        {/* Plant markers */}
        {markers.map((marker) => {
          // Apply live drag position if this marker is being dragged
          const isBeingDragged = draggedMarkerId === marker.id;
          const displayMarker =
            isBeingDragged && dragPos
              ? { ...marker, positionX: dragPos.x, positionY: dragPos.y }
              : marker;

          return (
            <MarkerIcon
              key={marker.id}
              marker={displayMarker}
              onClick={() => handleMarkerClick(marker)}
              isSelected={selectedMarkerId === marker.id}
              isDragging={isBeingDragged}
              draggable={moveMode}
              onDragStart={() => handleDragStart(marker.id)}
              onDragMove={(x, y) => handleDragMove(marker.id, x, y)}
              onDragEnd={(x, y) => handleDragEnd(marker.id, x, y)}
            />
          );
        })}
      </div>
    </ZoomPanContainer>
  );
}
