'use client';

import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

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
  const [panEnabled, setPanEnabled] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(maxZoom, z + 0.25));
  }, [maxZoom]);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(minZoom, z - 0.25));
  }, [minZoom]);

  const resetView = useCallback(() => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
    setPanEnabled(false);
  }, [initialZoom]);

  // Attach wheel handler imperatively so we can use { passive: false }
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      setZoom((z) => Math.min(maxZoom, Math.max(minZoom, z + delta)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [minZoom, maxZoom]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!panEnabled) return;
      setIsPanning(true);
      setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [panEnabled, pan]
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

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!panEnabled || e.touches.length !== 1) return;
      setIsPanning(true);
      setStartPos({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    },
    [panEnabled, pan]
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

  const zoomPercent = Math.round(zoom * 100);
  const isDefault = zoom === initialZoom && pan.x === 0 && pan.y === 0;

  return (
    <div className="relative">
      {/* Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md px-1.5 py-1 text-sm">
        <button
          onClick={zoomOut}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold"
          title="Zoom out"
        >
          −
        </button>
        <span className="w-10 text-center text-xs font-medium tabular-nums">{zoomPercent}%</span>
        <button
          onClick={zoomIn}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold"
          title="Zoom in"
        >
          +
        </button>
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-0.5" />
        <button
          onClick={() => setPanEnabled((p) => !p)}
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded transition-colors',
            panEnabled
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-gray-200 dark:hover:bg-gray-700'
          )}
          title={panEnabled ? 'Disable pan (click to lock)' : 'Enable pan (click to drag)'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v12M2 8h12M8 2l-2 2M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2" />
          </svg>
        </button>
        {!isDefault && (
          <>
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-0.5" />
            <button
              onClick={resetView}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Reset view"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1v4h4M13 13V9H9" />
                <path d="M2 9a5.5 5.5 0 019.5-3M12 5a5.5 5.5 0 01-9.5 3" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className={cn(
          'relative w-full h-full overflow-hidden bg-gray-100 dark:bg-gray-900 touch-none',
          panEnabled && 'cursor-grab',
          panEnabled && isPanning && 'cursor-grabbing'
        )}
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
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
