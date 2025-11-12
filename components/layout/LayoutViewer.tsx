'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MarkerIcon } from './MarkerIcon';
import { ZoomPanContainer } from './ZoomPanContainer';
import type { Layout, PlantMarker } from '@/lib/domain';

interface LayoutViewerProps {
  layout: Layout;
  markers: Array<PlantMarker & { plant?: any }>;
  onMarkerClick?: (marker: PlantMarker) => void;
  editable?: boolean;
}

export function LayoutViewer({
  layout,
  markers,
  onMarkerClick,
  editable = false,
}: LayoutViewerProps) {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const handleMarkerClick = (marker: PlantMarker) => {
    setSelectedMarkerId(marker.id);
    onMarkerClick?.(marker);
  };

  return (
    <ZoomPanContainer>
      <div className="relative">
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
          />
        )}

        {/* Plant markers */}
        {markers.map((marker) => (
          <MarkerIcon
            key={marker.id}
            marker={marker}
            onClick={() => handleMarkerClick(marker)}
            isSelected={selectedMarkerId === marker.id}
          />
        ))}
      </div>
    </ZoomPanContainer>
  );
}
