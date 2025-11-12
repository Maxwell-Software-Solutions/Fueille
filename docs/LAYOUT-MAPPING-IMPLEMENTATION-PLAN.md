# Layout Mapping Feature - Implementation Plan (Option A)

**Feature:** Garden/Room Layout Mapping with Plant Placement  
**Approach:** Image Upload + Interactive Markers  
**Created:** November 11, 2025  
**Updated:** November 11, 2025  
**Estimated Timeline:** 1-2 weeks  
**Architecture:** Local-first with Dexie IndexedDB (No GraphQL/Prisma)

---

## Executive Summary

Add the ability for users to upload photos of their garden or indoor spaces and place interactive markers to track where each plant is located. This solves the "Where did I put that plant?" problem with a simple, intuitive interface.

### Why Option A (Image + Markers)?

- ✅ **Quick to implement:** 1-2 weeks vs 2-4 weeks for drawing tools
- ✅ **Zero learning curve:** Everyone understands "pin on photo"
- ✅ **Mobile-first:** Perfect for Capacitor iOS/Android apps
- ✅ **Offline-first:** Uses existing Dexie database architecture
- ✅ **No backend changes:** Purely client-side with IndexedDB
- ✅ **Small bundle:** No additional dependencies required (custom zoom/pan)
- ✅ **Extensible:** Can enhance with AR or drawing tools later

### Architecture Decision: Local-First

This feature uses your **existing Dexie IndexedDB setup** - no GraphQL schema or Prisma models needed. All data stored locally, synced via existing offline-first architecture.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Model](#data-model)
3. [Implementation Steps](#implementation-steps)
4. [Component Design](#component-design)
5. [User Experience Flow](#user-experience-flow)
6. [Technical Details](#technical-details)
7. [Testing Strategy](#testing-strategy)
8. [Future Enhancements](#future-enhancements)

---

## Architecture Overview

### Technology Stack

```typescript
// Existing Infrastructure (Already Installed)
- Dexie.js - IndexedDB for offline storage
- @capacitor/camera - Photo capture
- Entity/Repository pattern - Following Plant, CareTask, Photo structure

// New Dependencies
NONE REQUIRED - Using custom implementations for:
- Zoom/Pan: CSS transforms + touch events
- Image storage: IndexedDB (data URLs initially, Vercel Blob later)
- State management: React hooks (following existing patterns)
```

### Key Architecture Decisions

1. **No GraphQL/Prisma:** Layouts are client-side only using Dexie
2. **No API routes:** All operations happen in IndexedDB
3. **Follows existing patterns:** LayoutRepository mirrors PlantRepository
4. **Offline-first:** Data synced via existing DeviceSync mechanism
5. **Custom zoom/pan:** No external libraries needed

### File Structure

```
lib/domain/
  entities.ts                    # Add Layout & PlantMarker interfaces ✨ UPDATE
  database.ts                    # Version 2: Add layouts & plantMarkers tables ✨ UPDATE
  index.ts                       # Export new repositories ✨ UPDATE
  repositories/
    LayoutRepository.ts          # CRUD for layouts (follows PlantRepository pattern) ✨ NEW
    PlantMarkerRepository.ts     # CRUD for markers (follows existing pattern) ✨ NEW

components/
  layout/                        # New directory ✨ NEW
    LayoutViewer.tsx             # Display layout with markers ✨ NEW
    LayoutEditor.tsx             # Edit/add markers ✨ NEW
    MarkerIcon.tsx               # Plant marker component ✨ NEW
    ZoomPanContainer.tsx         # Custom touch controls (no library) ✨ NEW

app/
  layouts/                       # New route group ✨ NEW
    page.tsx                     # List all layouts ✨ NEW
    [id]/
      page.tsx                   # View layout ✨ NEW
      edit/
        page.tsx                 # Edit layout ✨ NEW
    new/
      page.tsx                   # Create new layout ✨ NEW

tests/
  e2e/
    layouts.spec.ts              # E2E tests ✨ NEW

lib/domain/repositories/
  LayoutRepository.test.ts       # Unit tests ✨ NEW
  PlantMarkerRepository.test.ts  # Unit tests ✨ NEW

components/layout/
  *.test.tsx                     # Component tests ✨ NEW
```

**Note:** No changes to GraphQL schema, Prisma models, or API routes. This is purely client-side.

---

## Data Model

### Updated Entities (`lib/domain/entities.ts`)

```typescript
/**
 * Layout entity - represents a garden/room layout
 */
export interface Layout {
  id: string; // cuid
  name: string; // "Backyard Garden", "Living Room"
  description?: string; // Optional notes
  type: 'indoor' | 'outdoor'; // For future filtering/features
  imageUri?: string; // Local photo path/blob URL
  remoteImageUrl?: string; // Uploaded to Vercel Blob
  imageWidth: number; // Original image width in pixels
  imageHeight: number; // Original image height in pixels
  thumbnailUri?: string; // Smaller preview for list view
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * PlantMarker entity - represents a plant's position on a layout
 */
export interface PlantMarker {
  id: string; // cuid
  layoutId: string; // Foreign key to Layout
  plantId: string; // Foreign key to Plant
  positionX: number; // X coordinate as percentage (0-100)
  positionY: number; // Y coordinate as percentage (0-100)
  icon?: string; // Custom emoji or icon identifier
  rotation?: number; // Optional rotation in degrees (0-360)
  scale?: number; // Optional size multiplier (default 1.0)
  label?: string; // Optional custom label (overrides plant name)
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// Helper types
export type CreateLayout = Omit<Layout, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type UpdateLayout = Partial<Omit<Layout, 'id' | 'createdAt' | 'updatedAt'>> & { id: string };

export type CreatePlantMarker = Omit<PlantMarker, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type UpdatePlantMarker = Partial<Omit<PlantMarker, 'id' | 'createdAt' | 'updatedAt'>> & {
  id: string;
};

export interface LayoutFilter {
  type?: 'indoor' | 'outdoor';
  includeDeleted?: boolean;
}

export interface PlantMarkerFilter {
  layoutId?: string;
  plantId?: string;
  includeDeleted?: boolean;
}
```

### Database Schema Updates (`lib/domain/database.ts`)

```typescript
export class PlantDatabase extends Dexie {
  plants!: EntityTable<Plant, 'id'>;
  careTasks!: EntityTable<CareTask, 'id'>;
  photos!: EntityTable<Photo, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  plantTags!: EntityTable<PlantTag, 'id'>;
  deviceSync!: EntityTable<DeviceSync, 'id'>;
  syncCursor!: EntityTable<SyncCursor, 'id'>;

  // ✨ NEW TABLES
  layouts!: EntityTable<Layout, 'id'>;
  plantMarkers!: EntityTable<PlantMarker, 'id'>;

  constructor() {
    super('PlantTrackerDB');

    // Existing schema version 1
    this.version(1).stores({
      plants: 'id, name, species, location, createdAt, updatedAt, deletedAt',
      careTasks:
        'id, plantId, taskType, dueAt, completedAt, snoozedUntil, createdAt, updatedAt, deletedAt',
      photos: 'id, plantId, takenAt, uploadedAt, createdAt, updatedAt, deletedAt',
      tags: 'id, name, createdAt, updatedAt, deletedAt',
      plantTags: 'id, plantId, tagId, createdAt, updatedAt, deletedAt',
      deviceSync: 'id, entityType, entityId, operation, syncedAt, createdAt',
      syncCursor: 'id, lastSyncAt',
    });

    // ✨ NEW VERSION 2 - Add layout tables
    this.version(2).stores({
      layouts: 'id, name, type, createdAt, updatedAt, deletedAt',
      plantMarkers: 'id, layoutId, plantId, createdAt, updatedAt, deletedAt',
    });
  }
}
```

**Migration Note:** Dexie automatically handles schema upgrades. Existing users will seamlessly migrate from v1 to v2 when they open the app.

**DeviceSync Update:** Update `DeviceSync` entity type to include 'layout' and 'plantMarker':

```typescript
export interface DeviceSync {
  id: string;
  entityType: 'plant' | 'careTask' | 'photo' | 'tag' | 'plantTag' | 'layout' | 'plantMarker';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: string;
  createdAt: Date;
  syncedAt?: Date | null;
  retryCount: number;
  lastError?: string | null;
}
```

---

## Implementation Steps

### Overview: 3 Phases, 15 Tasks

**Phase 1: Database Layer** (Days 1-2)

- Update entities and database schema
- Create LayoutRepository
- Create PlantMarkerRepository

**Phase 2: UI Components** (Days 3-5)

- Build ZoomPanContainer (custom touch controls)
- Build MarkerIcon (plant markers)
- Build LayoutViewer (display)
- Build LayoutEditor (editing)

**Phase 3: Pages & Testing** (Days 6-10)

- Create all page routes (list, new, detail, edit)
- Add navigation links
- Write comprehensive tests (unit + E2E)

### Phase 1: Foundation (Days 1-2)

#### Step 1.1: Update Domain Entities

**File:** `lib/domain/entities.ts`

Add Layout and PlantMarker interfaces (see Data Model section above). Follow existing entity patterns.

**No Tests Required:** TypeScript compilation validates entity types.

#### Step 1.2: Update Database Schema

**File:** `lib/domain/database.ts`

- Add `layouts` and `plantMarkers` tables to PlantDatabase
- Increment version to 2 in constructor
- Update DeviceSync entity type union

**Tests:** `lib/domain/database.test.ts`

- Test schema migration from v1 to v2
- Verify new tables are created
- Test data persistence after migration

#### Step 1.3: Update Domain Index

**File:** `lib/domain/index.ts`

```typescript
// Add to existing exports
export { layoutRepository, LayoutRepository } from './repositories/LayoutRepository';
export { plantMarkerRepository, PlantMarkerRepository } from './repositories/PlantMarkerRepository';
```

#### Step 1.3: Create Layout Repository

**File:** `lib/domain/repositories/LayoutRepository.ts`

```typescript
import { createId } from '@paralleldrive/cuid2';
import type { Layout, CreateLayout, UpdateLayout, LayoutFilter } from '../entities';
import { getDatabase } from '../database';

export class LayoutRepository {
  /**
   * Create a new layout
   */
  async create(data: CreateLayout): Promise<Layout> {
    const db = getDatabase();
    const now = new Date();

    const layout: Layout = {
      id: createId(),
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.layouts.add(layout);
    await this.queueSync('create', layout);

    return layout;
  }

  /**
   * Get layout by ID with associated markers and plants
   */
  async getById(id: string): Promise<Layout | undefined> {
    const db = getDatabase();
    return db.layouts.get(id);
  }

  /**
   * Update layout
   */
  async update(data: UpdateLayout): Promise<Layout | undefined> {
    const db = getDatabase();
    const existing = await db.layouts.get(data.id);

    if (!existing) return undefined;

    const updated: Layout = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    await db.layouts.put(updated);
    await this.queueSync('update', updated);

    return updated;
  }

  /**
   * Soft delete layout
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const existing = await db.layouts.get(id);

    if (!existing) return false;

    const deleted: Layout = {
      ...existing,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };

    await db.layouts.put(deleted);
    await this.queueSync('delete', deleted);

    return true;
  }

  /**
   * List all layouts with filtering
   */
  async list(filter?: LayoutFilter): Promise<Layout[]> {
    const db = getDatabase();
    let query = db.layouts.toCollection();

    if (!filter?.includeDeleted) {
      query = query.filter((l) => !l.deletedAt);
    }

    if (filter?.type) {
      query = query.filter((l) => l.type === filter.type);
    }

    const layouts = await query.toArray();
    return layouts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Count layouts
   */
  async count(filter?: LayoutFilter): Promise<number> {
    const layouts = await this.list(filter);
    return layouts.length;
  }

  /**
   * Queue sync operation (follows existing pattern)
   */
  private async queueSync(
    operation: 'create' | 'update' | 'delete',
    layout: Layout
  ): Promise<void> {
    const db = getDatabase();
    await db.deviceSync.add({
      id: createId(),
      entityType: 'layout', // ✨ New entity type
      entityId: layout.id,
      operation,
      data: JSON.stringify(layout),
      createdAt: new Date(),
      syncedAt: null,
      retryCount: 0,
      lastError: null,
    });
  }
}

// Export singleton instance (follows existing pattern)
export const layoutRepository = new LayoutRepository();
```

**Tests:** `lib/domain/repositories/LayoutRepository.test.ts`

- Test CRUD operations
- Test filtering (type, deleted)
- Test soft delete / restore
- Test sync queue integration

#### Step 1.4: Create Plant Marker Repository

**File:** `lib/domain/repositories/PlantMarkerRepository.ts`

```typescript
import { createId } from '@paralleldrive/cuid2';
import type {
  PlantMarker,
  CreatePlantMarker,
  UpdatePlantMarker,
  PlantMarkerFilter,
} from '../entities';
import { getDatabase } from '../database';

export class PlantMarkerRepository {
  async create(data: CreatePlantMarker): Promise<PlantMarker> {
    const db = getDatabase();
    const now = new Date();

    const marker: PlantMarker = {
      id: createId(),
      ...data,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await db.plantMarkers.add(marker);
    await this.queueSync('create', marker);

    return marker;
  }

  async getById(id: string): Promise<PlantMarker | undefined> {
    const db = getDatabase();
    return db.plantMarkers.get(id);
  }

  async update(data: UpdatePlantMarker): Promise<PlantMarker | undefined> {
    const db = getDatabase();
    const existing = await db.plantMarkers.get(data.id);

    if (!existing) return undefined;

    const updated: PlantMarker = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };

    await db.plantMarkers.put(updated);
    await this.queueSync('update', updated);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const existing = await db.plantMarkers.get(id);

    if (!existing) return false;

    const deleted: PlantMarker = {
      ...existing,
      deletedAt: new Date(),
      updatedAt: new Date(),
    };

    await db.plantMarkers.put(deleted);
    await this.queueSync('delete', deleted);

    return true;
  }

  /**
   * List markers with filtering
   */
  async list(filter?: PlantMarkerFilter): Promise<PlantMarker[]> {
    const db = getDatabase();
    let query = db.plantMarkers.toCollection();

    if (!filter?.includeDeleted) {
      query = query.filter((m) => !m.deletedAt);
    }

    if (filter?.layoutId) {
      query = query.filter((m) => m.layoutId === filter.layoutId);
    }

    if (filter?.plantId) {
      query = query.filter((m) => m.plantId === filter.plantId);
    }

    return query.toArray();
  }

  /**
   * Get all markers for a layout with plant details
   */
  async getMarkersWithPlants(layoutId: string): Promise<Array<PlantMarker & { plant?: any }>> {
    const db = getDatabase();
    const markers = await this.list({ layoutId });

    // Hydrate with plant data
    const markersWithPlants = await Promise.all(
      markers.map(async (marker) => {
        const plant = await db.plants.get(marker.plantId);
        return { ...marker, plant };
      })
    );

    return markersWithPlants;
  }

  /**
   * Update marker position (frequent operation during drag)
   */
  async updatePosition(
    id: string,
    positionX: number,
    positionY: number
  ): Promise<PlantMarker | undefined> {
    return this.update({
      id,
      positionX,
      positionY,
    });
  }

  private async queueSync(
    operation: 'create' | 'update' | 'delete',
    marker: PlantMarker
  ): Promise<void> {
    const db = getDatabase();
    await db.deviceSync.add({
      id: createId(),
      entityType: 'plantMarker', // ✨ New entity type
      entityId: marker.id,
      operation,
      data: JSON.stringify(marker),
      createdAt: new Date(),
      syncedAt: null,
      retryCount: 0,
      lastError: null,
    });
  }
}

// Export singleton instance (follows existing pattern)
export const plantMarkerRepository = new PlantMarkerRepository();
```

**Tests:** `lib/domain/repositories/PlantMarkerRepository.test.ts`

- Test marker CRUD
- Test position updates
- Test filtering by layoutId/plantId
- Test getMarkersWithPlants hydration

---

### Phase 2: UI Components (Days 3-5)

#### Step 2.1: Zoom/Pan Container

**File:** `components/layout/ZoomPanContainer.tsx`

```typescript
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

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
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      setStartPos({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  }, [pan]);

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
```

**Tests:** `components/layout/ZoomPanContainer.test.tsx`

- Test zoom in/out
- Test pan/drag
- Test touch gestures
- Test zoom limits

#### Step 2.2: Marker Icon Component

**File:** `components/layout/MarkerIcon.tsx`

```typescript
'use client';

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
          'w-12 h-12 rounded-full neu-flat flex items-center justify-center text-2xl',
          'bg-white dark:bg-gray-800',
          isSelected && 'ring-4 ring-primary'
        )}
      >
        {marker.plant?.thumbnailUrl ? (
          <img
            src={marker.plant.thumbnailUrl}
            alt={label}
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
```

**Tests:** `components/layout/MarkerIcon.test.tsx`

- Render with plant data
- Render with custom icon
- Test click handler
- Test selected state

#### Step 2.3: Layout Viewer

**File:** `components/layout/LayoutViewer.tsx`

```typescript
'use client';

import { useState } from 'react';
import { MarkerIcon } from './MarkerIcon';
import { ZoomPanContainer } from './ZoomPanContainer';
import type { Layout, PlantMarker } from '@/lib/domain';

interface LayoutViewerProps {
  layout: Layout;
  markers: Array<PlantMarker & { plant?: any }>;
  onMarkerClick?: (marker: PlantMarker) => void;
  editable?: boolean;
}

export function LayoutViewer({ layout, markers, onMarkerClick, editable = false }: LayoutViewerProps) {
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
          <img
            src={layout.imageUri}
            alt={layout.name}
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
```

**Tests:** `components/layout/LayoutViewer.test.tsx`

- Render layout with image
- Render markers on layout
- Test marker selection
- Test zoom/pan integration

#### Step 2.4: Layout Editor

**File:** `components/layout/LayoutEditor.tsx`

```typescript
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

export function LayoutEditor({ layout, markers, availablePlants, onMarkersChange }: LayoutEditorProps) {
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
            className="px-4 py-2 rounded-lg neu-pressed"
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
      <div onClick={handleImageClick} className="cursor-pointer">
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
```

**Tests:** `components/layout/LayoutEditor.test.tsx`

- Test add marker mode
- Test marker placement
- Test marker deletion
- Test marker drag/reposition

---

### Phase 3: Pages & Routes (Days 6-7)

#### Step 3.1: Layouts List Page

**File:** `app/layouts/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { layoutRepository, type Layout } from '@/lib/domain';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LayoutsPage() {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLayouts();
  }, []);

  const loadLayouts = async () => {
    try {
      const data = await layoutRepository.list();
      setLayouts(data);
    } catch (error) {
      console.error('Failed to load layouts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-6 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Layout Maps</h1>
        <Link href="/layouts/new">
          <Button>Create Layout</Button>
        </Link>
      </div>

      {layouts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No layouts yet. Create your first garden or room map!
          </p>
          <Link href="/layouts/new">
            <Button>Create Layout</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {layouts.map((layout) => (
            <Link key={layout.id} href={`/layouts/${layout.id}`}>
              <Card className="neu-flat hover:neu-pressed transition-all cursor-pointer overflow-hidden">
                {layout.thumbnailUri && (
                  <img
                    src={layout.thumbnailUri}
                    alt={layout.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg">{layout.name}</h3>
                  {layout.description && (
                    <p className="text-sm text-muted-foreground mt-2">{layout.description}</p>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {layout.type}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Step 3.2: Create Layout Page

**File:** `app/layouts/new/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { layoutRepository } from '@/lib/domain';
import { PhotoCapture } from '@/components/PhotoCapture';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function NewLayoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<'details' | 'photo'>('details');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'outdoor' as 'indoor' | 'outdoor',
    imageUri: '',
    imageWidth: 0,
    imageHeight: 0,
  });

  const handlePhotoCapture = async (dataUrl: string) => {
    // Get image dimensions
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    setFormData({
      ...formData,
      imageUri: dataUrl,
      imageWidth: img.width,
      imageHeight: img.height,
    });
    setShowPhotoCapture(false);
    setStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.imageUri) return;

    try {
      const layout = await layoutRepository.create(formData);
      router.push(`/layouts/${layout.id}`);
    } catch (error) {
      console.error('Failed to create layout:', error);
      alert('Failed to create layout');
    }
  };

  if (showPhotoCapture) {
    return <PhotoCapture onCapture={handlePhotoCapture} onClose={() => setShowPhotoCapture(false)} />;
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Create Layout</h1>

      <Card className="p-8">
        {!formData.imageUri ? (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              First, take or upload a photo of your garden or room
            </p>
            <Button onClick={() => setShowPhotoCapture(true)} className="w-full">
              Take Photo
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Preview */}
            <div className="relative">
              <img
                src={formData.imageUri}
                alt="Layout preview"
                className="w-full h-auto rounded-lg"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">Layout Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Backyard Garden, Living Room"
                className="w-full px-4 py-2 rounded-lg neu-pressed"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional notes about this space"
                className="w-full px-4 py-2 rounded-lg neu-pressed"
                rows={3}
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'indoor' | 'outdoor' })}
                className="w-full px-4 py-2 rounded-lg neu-pressed"
              >
                <option value="outdoor">Outdoor (Garden, Patio)</option>
                <option value="indoor">Indoor (Room, Greenhouse)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                Create Layout
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
```

#### Step 3.3: View Layout Page

**File:** `app/layouts/[id]/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  layoutRepository,
  plantMarkerRepository,
  plantRepository,
  type Layout,
  type PlantMarker,
  type Plant,
} from '@/lib/domain';
import { LayoutViewer } from '@/components/layout/LayoutViewer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LayoutDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [markers, setMarkers] = useState<Array<PlantMarker & { plant?: Plant }>>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const layoutData = await layoutRepository.getById(params.id);
      if (!layoutData) {
        router.push('/layouts');
        return;
      }
      setLayout(layoutData);

      const markerData = await plantMarkerRepository.getMarkersWithPlants(params.id);
      setMarkers(markerData);
    } catch (error) {
      console.error('Failed to load layout:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!confirm('Delete this layout? Plant markers will be removed.')) return;

    try {
      await layoutRepository.delete(params.id);
      router.push('/layouts');
    } catch (error) {
      console.error('Failed to delete layout:', error);
    }
  };

  const handleMarkerClick = (marker: PlantMarker) => {
    // Navigate to plant detail
    if (marker.plantId) {
      router.push(`/plants/${marker.plantId}`);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-6 py-8">Loading...</div>;
  }

  if (!layout) {
    return null;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{layout.name}</h1>
          {layout.description && (
            <p className="text-muted-foreground mt-2">{layout.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/layouts/${layout.id}/edit`}>
            <Button variant="outline">Edit Layout</Button>
          </Link>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {/* Layout viewer */}
      <Card className="p-4 mb-8">
        <LayoutViewer layout={layout} markers={markers} onMarkerClick={handleMarkerClick} />
      </Card>

      {/* Plant list */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Plants in this layout ({markers.length})</h2>
        {markers.length === 0 ? (
          <p className="text-muted-foreground">
            No plants placed yet.{' '}
            <Link href={`/layouts/${layout.id}/edit`} className="text-primary hover:underline">
              Add plants
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {markers.map((marker) => (
              <li key={marker.id}>
                <Link
                  href={`/plants/${marker.plantId}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-2xl">{marker.icon || '🌱'}</span>
                  <span className="font-medium">{marker.plant?.name || 'Unknown'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
```

#### Step 3.4: Edit Layout Page

**File:** `app/layouts/[id]/edit/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  layoutRepository,
  plantMarkerRepository,
  plantRepository,
  type Layout,
  type PlantMarker,
  type Plant,
} from '@/lib/domain';
import { LayoutEditor } from '@/components/layout/LayoutEditor';
import { Button } from '@/components/ui/button';

export default function EditLayoutPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [markers, setMarkers] = useState<Array<PlantMarker & { plant?: Plant }>>([]);
  const [availablePlants, setAvailablePlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const layoutData = await layoutRepository.getById(params.id);
      if (!layoutData) {
        router.push('/layouts');
        return;
      }
      setLayout(layoutData);

      const markerData = await plantMarkerRepository.getMarkersWithPlants(params.id);
      setMarkers(markerData);

      const plants = await plantRepository.list();
      setAvailablePlants(plants);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !layout) {
    return <div className="container mx-auto px-6 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Edit {layout.name}</h1>
        <Button variant="outline" onClick={() => router.back()}>
          Done
        </Button>
      </div>

      <LayoutEditor
        layout={layout}
        markers={markers}
        availablePlants={availablePlants}
        onMarkersChange={loadData}
      />
    </div>
  );
}
```

---

### Phase 4: Testing & Polish (Days 8-10)

#### Step 4.1: Unit Tests

- Repository tests (CRUD operations)
- Component tests (rendering, interactions)
- Service tests (business logic)

#### Step 4.2: E2E Tests

**File:** `tests/e2e/layouts.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Layout Mapping', () => {
  test('should create new layout with photo', async ({ page }) => {
    await page.goto('/layouts');
    await page.click('text=Create Layout');

    // Mock photo capture
    // ... test flow

    await expect(page).toHaveURL(/\/layouts\/[a-z0-9]+$/);
  });

  test('should add plant markers to layout', async ({ page }) => {
    // ... test marker placement
  });

  test('should edit marker positions', async ({ page }) => {
    // ... test drag-drop
  });
});
```

#### Step 4.3: Integration Updates

- Add "Layouts" link to main navigation
- Update Plant detail page with "Show on layouts" button
- Add layouts count to dashboard/home page

---

## User Experience Flow

### Happy Path: Create First Layout

1. **Entry Point**
   - User navigates to "Layouts" from main nav
   - Sees empty state with "Create Layout" CTA

2. **Photo Capture**
   - Clicks "Create Layout"
   - Prompted to take or upload photo
   - Uses camera to capture garden/room
   - Photo preview shown

3. **Layout Details**
   - Enters name: "Backyard Garden"
   - Optional description
   - Selects type: "Outdoor"
   - Submits form

4. **Add First Marker**
   - Redirected to layout detail view
   - Clicks "Edit Layout"
   - Enters edit mode
   - Clicks "Add Plant"
   - Selects "Tomato" from plant dropdown
   - Clicks on image where tomato is located
   - Marker appears with tomato icon/thumbnail

5. **Add More Markers**
   - Repeats for other plants
   - Can drag markers to reposition
   - Can zoom/pan for precision

6. **View & Navigate**
   - Clicks "Done" to exit edit mode
   - Layout shows all plant markers
   - Clicks marker → navigates to plant detail
   - Can share layout (future feature)

---

## Technical Details

### Image Storage Strategy

**MVP (Local Only):**

```typescript
// Store as data URL in IndexedDB
const imageUri = canvas.toDataURL('image/jpeg', 0.8);
await layoutRepository.create({ imageUri, ... });
```

**Future (Cloud Upload):**

```typescript
// Upload to Vercel Blob
import { put } from '@vercel/blob';

const blob = await put(`layouts/${layoutId}.jpg`, file, {
  access: 'public',
  addRandomSuffix: true,
});

await layoutRepository.update({
  id: layoutId,
  remoteImageUrl: blob.url,
});
```

### Performance Considerations

**Image Optimization:**

- Compress photos to max 1920x1080
- Generate thumbnails (400x300) for list view
- Use progressive JPEG format
- Lazy load images in list

**Marker Rendering:**

- Use CSS transforms for positioning (GPU accelerated)
- Debounce drag events (16ms / 60fps)
- Virtualize markers if > 50 plants

**Offline Storage:**

- IndexedDB quota: ~50MB per origin
- Estimate: 20 layouts × 1MB each = 20MB
- Show warning at 80% quota usage

### Coordinate System

**Percentage-based positioning:**

```
(0, 0) = Top-left corner
(100, 100) = Bottom-right corner
(50, 50) = Center

Advantages:
- Responsive to window size
- Works on any device
- Simple calculations
```

### Accessibility

- **Keyboard navigation:** Tab through markers
- **Screen reader:** Announce marker labels
- **Touch targets:** Minimum 44x44px tap areas
- **Color contrast:** Ensure marker labels readable
- **Alt text:** Descriptive image alt attributes

---

## Testing Strategy

### Unit Tests (Target: 85% coverage)

```bash
pnpm test:unit
```

**Coverage:**

- ✅ Entity types (TypeScript compilation)
- ✅ Repositories (CRUD operations)
- ✅ Components (rendering, props)
- ✅ Services (business logic)

### E2E Tests (Playwright)

```bash
pnpm test:e2e
```

**Scenarios:**

- Create layout with photo
- Add/edit/delete markers
- Zoom/pan interactions
- Mobile touch gestures
- Navigate between layouts and plants

### Manual Testing Checklist

**Desktop:**

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Mobile:**

- [ ] iOS Safari (iPhone SE, iPhone 14)
- [ ] Android Chrome (Pixel, Samsung)
- [ ] Tablet (iPad, Android tablet)

**Features:**

- [ ] Photo capture works
- [ ] Image displays correctly
- [ ] Markers can be added
- [ ] Markers can be repositioned
- [ ] Zoom/pan smooth
- [ ] Touch gestures work
- [ ] Data persists offline
- [ ] Navigation flows work
- [ ] Delete confirmation works

---

## Future Enhancements

### Phase 2: Advanced Features

1. **Drawing Tools** (Option B elements)
   - Add shapes (rectangles, circles)
   - Draw freehand paths
   - Measurement tools
   - Grid overlay

2. **AR Mode** (Option C)
   - Use device camera with AR overlay
   - Place markers in 3D space
   - Persistent AR anchors

3. **Collaboration**
   - Share layouts with family/friends
   - Multi-user editing
   - Comments on markers

4. **Intelligence**
   - Auto-detect plants in photos
   - Suggest optimal plant placement
   - Sun exposure heatmap
   - Spacing recommendations

5. **Export/Print**
   - PDF export with plant list
   - Print-friendly layout
   - QR codes for markers
   - Garden planning mode

### Quick Wins (Low effort, high value)

- **Marker icons library:** Pre-made plant icons
- **Photo filters:** Enhance garden photos
- **Marker clustering:** Group nearby plants
- **Search layouts:** Filter by name/type
- **Duplicate layout:** Copy as template
- **Marker notes:** Add care reminders to markers

---

## Dependencies & Installation

### Required (Already Installed) ✅

```json
{
  "dexie": "^4.2.1", // IndexedDB wrapper
  "@capacitor/camera": "^6.x.x", // Photo capture
  "@paralleldrive/cuid2": "^3.0.4" // ID generation
}
```

### Optional Dependencies ❌

**NONE REQUIRED** - This feature uses:

- Custom zoom/pan (CSS transforms + touch events)
- Native HTML5 drag and drop
- Existing PhotoCapture component
- IndexedDB for image storage (data URLs)

### Future Enhancements (Optional)

```bash
# If you want to use a library instead of custom implementation:
pnpm add react-zoom-pan-pinch  # Pre-built zoom/pan

# For server-side image optimization (future):
pnpm add sharp  # Image processing
```

**Decision:** Start with custom implementation (0 dependencies), add libraries only if needed.

---

## Migration & Rollout

### Database Migration (Automatic)

Dexie will automatically upgrade from v1 to v2:

```typescript
// Users on v1 (no layouts tables)
// → App loads → Dexie detects version mismatch
// → Runs migration → Creates layouts & plantMarkers tables
// → Existing data (plants, photos, etc.) untouched
```

### Rollout Strategy

**Week 1: Internal Testing**

- Deploy to staging
- Team testing
- Fix critical bugs

**Week 2: Beta Release**

- Enable for 10% of users
- Monitor performance
- Collect feedback

**Week 3: Full Release**

- Roll out to 100%
- Announce feature
- Create tutorial content

### Feature Flag

```typescript
// lib/features.ts
export const features = {
  layoutMapping: process.env.NEXT_PUBLIC_ENABLE_LAYOUTS === '1',
};

// Conditionally show UI
{features.layoutMapping && <Link href="/layouts">Layouts</Link>}
```

---

## Success Metrics

### Launch Goals (30 days)

- **Adoption:** 30% of active users create at least 1 layout
- **Engagement:** Users with layouts open app 2x more frequently
- **Retention:** 50% of layout creators return weekly
- **Markers:** Average 5+ markers per layout
- **Errors:** <1% error rate on layout operations

### Analytics Events

```typescript
// Track with existing TelemetryService
telemetry.track('layout_created', { type: 'outdoor' });
telemetry.track('marker_added', { plantId, layoutId });
telemetry.track('layout_shared', { layoutId });
telemetry.track('layout_deleted', { markerCount });
```

---

## Support & Documentation

### User Guide Topics

1. **Getting Started**
   - How to create your first layout
   - Taking the perfect photo

2. **Adding Plants**
   - Placing markers accurately
   - Using zoom for precision
   - Organizing many plants

3. **Tips & Tricks**
   - Best camera angles
   - Indoor vs outdoor layouts
   - Using multiple layouts

4. **Troubleshooting**
   - Photo not loading
   - Markers not appearing
   - Performance issues

### FAQ

**Q: Can I use existing photos?**  
A: Yes! Upload from gallery or take new photo.

**Q: How many plants can I add to one layout?**  
A: Unlimited, but 20-30 recommended for performance.

**Q: Can I edit the background image later?**  
A: Not in MVP, but coming soon!

**Q: Does this work offline?**  
A: Yes! All data stored locally.

**Q: Can I share layouts with others?**  
A: Not yet, but planned for future update.

---

## Timeline Summary

| Phase       | Days        | Tasks          | Deliverables               | Architecture            |
| ----------- | ----------- | -------------- | -------------------------- | ----------------------- |
| **Phase 1** | 2           | Database Layer | Entities, schema v2, repos | Dexie IndexedDB         |
| **Phase 2** | 3           | UI Components  | Viewer, editor, zoom/pan   | Custom React components |
| **Phase 3** | 5           | Pages & Tests  | Routes, navigation, tests  | Client-side only        |
| **Total**   | **10 days** | **15 tasks**   | **Shippable feature**      | **No backend changes**  |

**Buffer:** +2-3 days for unexpected issues

**Total estimated:** 1.5-2 weeks for complete implementation

### Key Architectural Points

- ✅ **No GraphQL changes** - Purely client-side feature
- ✅ **No Prisma models** - Uses Dexie IndexedDB
- ✅ **No API routes** - All operations local
- ✅ **Follows existing patterns** - Mirrors Plant/CareTask structure
- ✅ **Offline-first** - Works without internet
- ✅ **Zero dependencies** - Custom zoom/pan implementation

---

## Approval Checklist

Before starting implementation:

- [ ] Architecture approved (local-first, no backend)
- [ ] UX flow validated (photo → markers → view)
- [ ] Entity schema reviewed (Layout + PlantMarker)
- [ ] Repository pattern confirmed (follows PlantRepository)
- [ ] Test coverage targets set (85% minimum)
- [ ] Success metrics defined (30% adoption)
- [ ] Feature flag strategy confirmed (optional)

### Technical Sign-offs

- [ ] **Database:** Dexie v2 migration approved
- [ ] **Components:** Custom zoom/pan vs library decision made
- [ ] **Storage:** IndexedDB (data URLs) → Vercel Blob (future) plan confirmed
- [ ] **Testing:** Unit + E2E coverage plan approved

---

## Questions & Decisions

### Open Questions

1. **Image compression:** What quality/size limits? (Recommend: 1920x1080, 0.8 JPEG quality)
2. **Marker limits:** Max markers per layout? (Recommend: Soft limit 50, warn at 30)
3. **Cloud storage:** Enable Vercel Blob upload immediately? (Recommend: MVP local-only)
4. **Share feature:** Priority for initial release? (Recommend: Defer to Phase 2)

### Technical Decisions

1. ✅ **Database:** Dexie IndexedDB (no GraphQL/Prisma)
2. ✅ **Coordinate system:** Percentage-based (0-100)
3. ✅ **Image storage:** Local IndexedDB (data URLs) initially, Vercel Blob later
4. ✅ **Zoom/pan:** Custom CSS transforms + touch events (no library)
5. ✅ **Marker icons:** Plant thumbnails + emoji fallback
6. ✅ **Sync:** Uses existing DeviceSync queue (offline-first)
7. ✅ **Pattern:** Follows PlantRepository/CareTaskRepository architecture

---

## Ready to Start Implementation? 🚀

### Phase 1 Checklist (Start Here)

**Day 1-2: Database Layer**

- [ ] Update `lib/domain/entities.ts` with Layout & PlantMarker interfaces
- [ ] Update `lib/domain/database.ts` to version 2 with new tables
- [ ] Update `lib/domain/entities.ts` DeviceSync type union
- [ ] Create `lib/domain/repositories/LayoutRepository.ts`
- [ ] Create `lib/domain/repositories/PlantMarkerRepository.ts`
- [ ] Update `lib/domain/index.ts` exports
- [ ] Write tests for repositories

**Validation:**

```bash
pnpm test:unit  # Should pass with new tests
pnpm type-check # TypeScript should compile
```

### Questions Before Starting?

**Q: Should we use a zoom/pan library or custom?**  
A: Start custom (0 dependencies), migrate to library if UX needs improve.

**Q: Store images in IndexedDB or Vercel Blob?**  
A: IndexedDB for MVP (offline-first), Vercel Blob in Phase 2.

**Q: Do we need GraphQL/Prisma changes?**  
A: No! This is purely client-side using Dexie.

**Q: How does this sync to server?**  
A: Uses existing DeviceSync queue, same as Plants/CareTasks.

---

**Next Steps:**

1. ✅ Review this updated plan
2. ⬜ Approve architecture decisions
3. ⬜ Begin Phase 1 implementation (database layer)
4. ⬜ Mark todo items as in-progress/completed
