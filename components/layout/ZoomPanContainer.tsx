'use client';

import { useRef, useState, useCallback, type ReactNode } from 'react';

interface ZoomPanContainerProps {
  children: ReactNode;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
}

export function ZoomPanContainer({
  children,
  minZoom = 0.5,
  maxZoom = 3,
  initialZoom = 1,
}: ZoomPanContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      const newZoom = Math.min(maxZoom, Math.max(minZoom, zoom + delta));
      setZoom(newZoom);
    },
    [zoom, minZoom, maxZoom]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsPanning(true);
      setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPan({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y,
      });
    },
    [isPanning, startPos]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        setIsPanning(true);
        setStartPos({
          x: e.touches[0].clientX - pan.x,
          y: e.touches[0].clientY - pan.y,
        });
      }
    },
    [pan]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPanning || e.touches.length !== 1) return;
      setPan({
        x: e.touches[0].clientX - startPos.x,
        y: e.touches[0].clientY - startPos.y,
      });
    },
    [isPanning, startPos]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gray-100 dark:bg-gray-900 touch-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isPanning ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
