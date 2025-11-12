/**
 * Core domain entities for the Plant Tracking app
 * All entities include:
 * - id: unique identifier (cuid)
 * - createdAt: timestamp when created
 * - updatedAt: timestamp when last modified (for conflict resolution)
 * - deletedAt: soft delete timestamp (null if not deleted)
 */

/**
 * Plant entity - represents a plant the user is tracking
 */
export interface Plant {
  id: string; // cuid
  name: string;
  species?: string;
  location?: string;
  notes?: string;
  thumbnailUrl?: string; // Local or remote thumbnail
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * CareTask entity - represents a care action for a plant
 */
export interface CareTask {
  id: string; // cuid
  plantId: string; // Foreign key to Plant
  title: string;
  description?: string;
  taskType: 'water' | 'fertilize' | 'prune' | 'repot' | 'other';
  dueAt?: Date | null; // When the task is due
  completedAt?: Date | null; // When completed (null if not done)
  snoozedUntil?: Date | null; // Snoozed until this time
  repeatInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom' | null;
  repeatCustomDays?: number | null; // For custom repeat intervals
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * Photo entity - represents a photo of a plant
 */
export interface Photo {
  id: string; // cuid
  plantId: string; // Foreign key to Plant
  localUri?: string; // Local file path/blob URL
  remoteUrl?: string; // Remote storage URL
  thumbnailUri?: string; // Local thumbnail
  width?: number;
  height?: number;
  takenAt: Date; // When photo was taken
  uploadedAt?: Date | null; // When uploaded to remote storage
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * Tag entity - for categorizing plants
 */
export interface Tag {
  id: string; // cuid
  name: string;
  color?: string; // Hex color for UI
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/**
 * PlantTag entity - many-to-many relationship between Plants and Tags
 */
export interface PlantTag {
  id: string; // cuid
  plantId: string;
  tagId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

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

/**
 * DeviceSync entity - tracks sync state for conflict resolution
 */
export interface DeviceSync {
  id: string; // cuid
  entityType: 'plant' | 'careTask' | 'photo' | 'tag' | 'plantTag' | 'layout' | 'plantMarker';
  entityId: string; // ID of the entity
  operation: 'create' | 'update' | 'delete';
  data: string; // JSON-serialized entity data
  createdAt: Date; // When the change was made locally
  syncedAt?: Date | null; // When successfully synced to server
  retryCount: number; // Number of sync attempts
  lastError?: string | null; // Last sync error message
}

/**
 * Sync cursor for pull operations
 */
export interface SyncCursor {
  id: string; // Always 'default' for single-device support
  lastSyncAt: Date; // Last successful pull timestamp
  updatedAt: Date;
}

/**
 * Helper type for creating new entities (without system fields)
 */
export type CreatePlant = Omit<Plant, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type CreateCareTask = Omit<CareTask, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type CreatePhoto = Omit<Photo, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type CreateTag = Omit<Tag, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type CreatePlantTag = Omit<PlantTag, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type CreateLayout = Omit<Layout, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
export type CreatePlantMarker = Omit<PlantMarker, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;

/**
 * Helper type for updating entities (partial with required id and updatedAt)
 */
export type UpdatePlant = Partial<Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>> & { id: string };
export type UpdateCareTask = Partial<Omit<CareTask, 'id' | 'createdAt' | 'updatedAt'>> & {
  id: string;
};
export type UpdatePhoto = Partial<Omit<Photo, 'id' | 'createdAt' | 'updatedAt'>> & { id: string };
export type UpdateTag = Partial<Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>> & { id: string };
export type UpdateLayout = Partial<Omit<Layout, 'id' | 'createdAt' | 'updatedAt'>> & {
  id: string;
};
export type UpdatePlantMarker = Partial<Omit<PlantMarker, 'id' | 'createdAt' | 'updatedAt'>> & {
  id: string;
};

/**
 * Query filters for listing entities
 */
export interface PlantFilter {
  tagIds?: string[];
  species?: string;
  location?: string;
  includeDeleted?: boolean;
}

export interface CareTaskFilter {
  plantId?: string;
  taskType?: CareTask['taskType'];
  isDue?: boolean; // Due now or overdue
  isOverdue?: boolean; // Only overdue
  isCompleted?: boolean;
  includeDeleted?: boolean;
}

export interface PhotoFilter {
  plantId?: string;
  includeDeleted?: boolean;
}

export interface LayoutFilter {
  type?: 'indoor' | 'outdoor';
  includeDeleted?: boolean;
}

export interface PlantMarkerFilter {
  layoutId?: string;
  plantId?: string;
  includeDeleted?: boolean;
}
