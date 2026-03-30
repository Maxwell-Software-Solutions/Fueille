'use client';

import { useRef, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { PlantMarker } from '@/lib/domain';

interface MarkerIconProps {
  marker: PlantMarker & { plant?: { name: string; thumbnailUrl?: string } };
  onClick?: () => void;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isDragging?: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragMove?: (posX: number, posY: number) => void;
  onDragEnd?: (posX: number, posY: number) => void;
}

export function MarkerIcon({
  marker,
  onClick,
  isSelected,
  isHighlighted = false,
  isDragging,
  draggable = false,
  onDragStart,
  onDragMove,
  onDragEnd,
}: MarkerIconProps) {
  const icon = marker.icon || '🌱';
  const label = marker.label || marker.plant?.name || 'Unknown Plant';
  const dragActive = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const getPercent = useCallback((clientX: number, clientY: number) => {
    // Walk up to find the layout image container (the relative parent with the <img>)
    const el = document.querySelector('[data-layout-canvas]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!draggable) return;
      e.preventDefault();
      e.stopPropagation();
      dragActive.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onDragStart?.();
    },
    [draggable, onDragStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragActive.current) return;
      e.preventDefault();
      e.stopPropagation();
      const pos = getPercent(e.clientX, e.clientY);
      if (pos) {
        lastPos.current = pos;
        onDragMove?.(pos.x, pos.y);
      }
    },
    [getPercent, onDragMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragActive.current) return;
      e.preventDefault();
      e.stopPropagation();
      dragActive.current = false;
      const pos = getPercent(e.clientX, e.clientY);
      if (pos) {
        onDragEnd?.(pos.x, pos.y);
      } else {
        onDragEnd?.(lastPos.current.x, lastPos.current.y);
      }
    },
    [getPercent, onDragEnd]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (draggable) {
        e.stopPropagation();
        return;
      }
      onClick?.();
    },
    [draggable, onClick]
  );

  return (
    <div
      className={cn(
        'absolute flex flex-col items-center gap-1 transition-all',
        !draggable && 'cursor-pointer hover:scale-110',
        draggable && 'cursor-grab active:cursor-grabbing',
        draggable && 'ring-2 ring-primary/50 rounded-full',
        isHighlighted && 'scale-125 z-20',
        isSelected && !isHighlighted && 'scale-125 z-10',
        isDragging && 'z-20 scale-110 opacity-80'
      )}
      style={{
        left: `${marker.positionX}%`,
        top: `${marker.positionY}%`,
        transform: `translate(-50%, -50%) rotate(${marker.rotation || 0}deg) scale(${marker.scale || 1})`,
      }}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Icon or thumbnail */}
      <div
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center text-2xl',
          'bg-white dark:bg-gray-800 shadow-md',
          isHighlighted && 'ring-4 ring-yellow-400 shadow-lg shadow-yellow-400/30',
          isSelected && !isHighlighted && 'ring-4 ring-primary',
          draggable && !isSelected && !isHighlighted && 'ring-2 ring-primary/40'
        )}
      >
        {marker.plant?.thumbnailUrl ? (
          <Image
            src={marker.plant.thumbnailUrl}
            alt={label}
            width={48}
            height={48}
            className="w-full h-full rounded-full object-cover"
            draggable={false}
          />
        ) : (
          <span>{icon}</span>
        )}
      </div>

      {/* Label */}
      <div
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium max-w-[8rem] truncate',
          'bg-black/60 text-white backdrop-blur-sm',
          'shadow-sm'
        )}
        title={label}
      >
        {label}
      </div>
    </div>
  );
}
