'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { PlantMarker } from '@/lib/domain';

interface MarkerIconProps {
  marker: PlantMarker & { plant?: { name: string; thumbnailUrl?: string } };
  onClick?: () => void;
  isSelected?: boolean;
  isDragging?: boolean;
}

export function MarkerIcon({ marker, onClick, isSelected, isDragging }: MarkerIconProps) {
  const icon = marker.icon || '🌱';
  const label = marker.label || marker.plant?.name || 'Unknown Plant';

  return (
    <div
      className={cn(
        'absolute flex flex-col items-center gap-1 cursor-pointer transition-all',
        'hover:scale-110',
        isSelected && 'scale-125 z-10',
        isDragging && 'opacity-50'
      )}
      style={{
        left: `${marker.positionX}%`,
        top: `${marker.positionY}%`,
        transform: `translate(-50%, -50%) rotate(${marker.rotation || 0}deg) scale(${marker.scale || 1})`,
      }}
      onClick={onClick}
    >
      {/* Icon or thumbnail */}
      <div
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center text-2xl',
          'bg-white dark:bg-gray-800 shadow-md',
          isSelected && 'ring-4 ring-primary'
        )}
      >
        {marker.plant?.thumbnailUrl ? (
          <Image
            src={marker.plant.thumbnailUrl}
            alt={label}
            width={48}
            height={48}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span>{icon}</span>
        )}
      </div>

      {/* Label */}
      <div
        className={cn(
          'px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap',
          'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm',
          'shadow-md'
        )}
      >
        {label}
      </div>
    </div>
  );
}
