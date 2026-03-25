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
  const btnClass =
    'w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors';

  return (
    <div>
      {/* Controls bar — above the canvas */}
      <div className="flex items-center justify-end gap-1 mb-2 px-1">
        <button onClick={zoomOut} className={btnClass} title="Zoom out">
          <span className="font-bold text-base">−</span>
        </button>
        <span className="w-12 text-center text-xs font-medium tabular-nums text-muted-foreground">
          {zoomPercent}%
        </span>
        <button onClick={zoomIn} className={btnClass} title="Zoom in">
          <span className="font-bold text-base">+</span>
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={() => setPanEnabled((p) => !p)}
          className={cn(
            btnClass,
            panEnabled && 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
          title={panEnabled ? 'Lock view' : 'Pan image'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v12M2 8h12M8 2l-2 2M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2" />
          </svg>
        </button>
        {!isDefault && (
          <>
            <div className="w-px h-5 bg-border mx-1" />
            <button onClick={resetView} className={btnClass} title="Reset view">
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
          'relative w-full h-full overflow-hidden bg-gray-100 dark:bg-gray-900 rounded-lg touch-none',
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
