## Milestone 2 — Domain & Data Layer

## Summary

This PR implements the offline-first data layer using IndexedDB (via Dexie.js). It adds domain entities (Plant, CareTask, Photo, Tag), repository patterns for CRUD operations, and an offline mutation queue with last-write-wins conflict resolution.

## What changed

### Core Domain Entities (`lib/domain/entities.ts`)

- **Plant**: name, species, location, notes, thumbnail
- **CareTask**: title, description, taskType, dueAt, completedAt, snoozedUntil, repeat intervals
- **Photo**: localUri, remoteUrl, thumbnail, dimensions, taken/uploaded timestamps
- **Tag**: name, color for plant categorization
- **PlantTag**: many-to-many relationship between plants and tags
- **DeviceSync**: tracks offline mutations for sync queue
- **SyncCursor**: tracks last sync timestamp for pull operations

All entities include:

- `id` (cuid for collision-resistant IDs)
- `createdAt`, `updatedAt` (for conflict resolution)
- `deletedAt` (soft delete support)

### Database Layer (`lib/domain/database.ts`)

- **Dexie.js wrapper** with TypeScript type safety
- IndexedDB schema with indexed fields for query performance
- Singleton pattern to prevent multiple connections
- Initialization and cleanup utilities

### Repository Layer (`lib/domain/repositories/`)

- **PlantRepository**: CRUD operations with soft delete, restore, filtering by tags/species/location
- **CareTaskRepository**: CRUD + complete/snooze actions, recurring task support, due/overdue filtering
- Auto-queuing of mutations to DeviceSync table for offline sync

### Mutation Queue Service (`lib/domain/services/MutationQueueService.ts`)

- Tracks all local changes (create/update/delete) for sync
- Last-write-wins conflict resolution via `updatedAt` comparison
- Batch operations for efficient sync
- Statistics and cleanup utilities
- Retry tracking and error logging

### App Integration

- **DatabaseInitializer** component (`components/DatabaseInitializer.tsx`): initializes IndexedDB on app startup
- **app/layout.tsx**: dynamically imports DatabaseInitializer (client-side only)

### Dependencies Added

- `dexie@4.2.1` - Type-safe IndexedDB wrapper
- `@paralleldrive/cuid2@3.0.4` - Collision-resistant unique IDs

## How to test (Web)

### 1. Install dependencies and build

```powershell
pnpm install
pnpm build
pnpm dev
```

### 2. Verify database initialization

Open http://localhost:3001 (or 3000) in Chrome/Edge:

1. Open DevTools → Console
2. Look for: `✓ IndexedDB initialized`
3. Go to DevTools → Application → Storage → IndexedDB
4. Verify `PlantTrackerDB` database exists with tables:
   - plants
   - careTasks
   - photos
   - tags
   - plantTags
   - deviceSync
   - syncCursor

### 3. Test repository operations (browser console)

```javascript
// Import the domain layer
const { plantRepository } = await import('/lib/domain/index.ts');

// Create a plant
const plant = await plantRepository.create({
  name: 'Snake Plant',
  species: 'Sansevieria trifasciata',
  location: 'Living Room',
  notes: 'Low light, water every 2 weeks',
});

console.log('Created plant:', plant);

// List all plants
const plants = await plantRepository.list();
console.log('All plants:', plants);

// Update the plant
const updated = await plantRepository.update({
  id: plant.id,
  notes: 'Very low maintenance!',
});

console.log('Updated plant:', updated);

// Check mutation queue
const { mutationQueueService } = await import('/lib/domain/index.ts');
const pending = await mutationQueueService.getPending();
console.log('Pending sync mutations:', pending);
```

### 4. Test offline behavior

1. Create some plants using the console commands above
2. Open DevTools → Network tab → Toggle "Offline"
3. Create more plants (they queue for sync)
4. Check DevTools → Application → IndexedDB → PlantTrackerDB → deviceSync
5. Verify mutations are queued with `syncedAt: null`

### 5. Test CareTask repository

```javascript
const { careTaskRepository } = await import('/lib/domain/index.ts');

// Create a care task
const task = await careTaskRepository.create({
  plantId: '<plant-id-from-above>',
  title: 'Water plant',
  description: 'Give it a good soak',
  taskType: 'water',
  dueAt: new Date(Date.now() + 86400000), // Due tomorrow
  repeatInterval: 'weekly',
});

console.log('Created task:', task);

// Complete the task
const completed = await careTaskRepository.complete(task.id);
console.log('Completed task (next due date calculated):', completed);

// List overdue tasks
const overdue = await careTaskRepository.list({ isOverdue: true });
console.log('Overdue tasks:', overdue);
```

### 6. Test conflict resolution

```javascript
const { mutationQueueService } = await import('/lib/domain/index.ts');

// Create two versions of the same entity with different timestamps
const local = {
  id: '123',
  name: 'Local Plant',
  updatedAt: new Date('2025-11-11T12:00:00Z'),
};

const remote = {
  id: '123',
  name: 'Remote Plant',
  updatedAt: new Date('2025-11-11T11:00:00Z'),
};

const winner = mutationQueueService.resolveConflict(local, remote);
console.log('Winner (most recent):', winner); // Should be local (12:00 > 11:00)
```

## How to test (Mobile wrapper)

Same as Milestone 1 - the database layer works identically in mobile WebView environments. IndexedDB is supported in all modern WebView implementations (Android WebView, WKWebView on iOS).

Test that data persists across app restarts by:

1. Creating plants in the mobile app
2. Closing the app completely
3. Reopening and verifying data is still there

## Architecture notes

### Why IndexedDB + Dexie?

- **IndexedDB** is the standard for client-side storage with robust support across web and mobile WebViews
- **Dexie.js** provides type-safe, Promise-based API (much easier than raw IndexedDB)
- Works offline by default
- No vendor lock-in (pure browser API)

### Why soft deletes?

- Enables sync of deletions to server
- Users can restore accidentally deleted items
- Audit trail for debugging

### Why last-write-wins?

- Simple conflict resolution strategy
- Works well for single-user scenarios
- `updatedAt` timestamp provides clear ordering
- Can be enhanced with CRDTs/OT later if needed

### Why mutation queue?

- Captures all local changes for sync
- Survives app restarts (stored in IndexedDB)
- Enables retry logic for failed syncs
- Batch operations reduce network overhead

## Data flow

```
User Action → Repository (CRUD) → IndexedDB (Dexie)
                   ↓
            DeviceSync Queue
                   ↓
         (Milestone 3: Sync Service)
                   ↓
            Server Endpoints
```

## Technical decisions

### Repository pattern

- Thin abstraction over Dexie (not over-engineered)
- Encapsulates business logic (e.g., recurring tasks)
- Easy to test and mock

### CUID vs UUID

- CUIDs are shorter (25 chars vs 36)
- Collision-resistant (127-bit entropy)
- Sortable by creation time
- Better for IndexedDB keys

### Timestamps as Date objects

- Dexie handles Date serialization automatically
- Easier to work with than Unix timestamps
- Direct comparison for conflict resolution

## Known limitations

- **No server sync yet** (Milestone 3)
- **No photo storage** implementation yet (Milestone 3)
- **No tag repository** (simple enough to add when needed for UI)
- **Single-device focused** (multi-device sync in Milestone 3)

## Next steps (Milestone 3)

- Implement server sync endpoints (pull/push)
- Add session authentication
- Photo upload with resumable support
- Multi-device conflict scenarios

## Files changed

### Added

- `lib/domain/entities.ts` - TypeScript entity interfaces
- `lib/domain/database.ts` - Dexie wrapper and initialization
- `lib/domain/repositories/PlantRepository.ts` - Plant CRUD operations
- `lib/domain/repositories/CareTaskRepository.ts` - CareTask CRUD operations
- `lib/domain/services/MutationQueueService.ts` - Offline sync queue
- `lib/domain/index.ts` - Barrel export for domain layer
- `components/DatabaseInitializer.tsx` - Client component for DB init

### Modified

- `app/layout.tsx` - Added DatabaseInitializer component
- `package.json` - Added dexie and cuid2 dependencies

### Dependencies

```json
{
  "dexie": "4.2.1",
  "@paralleldrive/cuid2": "3.0.4"
}
```

## Acceptance criteria

- [x] Build passes without errors
- [x] IndexedDB initializes on app startup
- [x] Plant CRUD operations work
- [x] CareTask CRUD operations work
- [x] Soft delete and restore work
- [x] Mutations queue to DeviceSync table
- [x] Last-write-wins conflict resolution implemented
- [x] Recurring tasks calculate next due date correctly
- [x] Data persists across page refreshes
- [x] Works offline (no network required)

## Troubleshooting

**"Database can only be accessed on the client side" error**

- This is expected on server-side renders
- Components using the database must be client components (`"use client"`)
- Or use dynamic imports with `ssr: false`

**IndexedDB not showing in DevTools**

- Make sure you're on http://localhost (not file://)
- Some browsers restrict IndexedDB on insecure origins
- Try Chrome/Edge DevTools → Application → Clear site data and refresh

**TypeScript errors with Dexie**

- Ensure `@types/node` is installed
- Run `pnpm install` to get latest type definitions
- Dexie includes its own TypeScript definitions

## Performance notes

- IndexedDB is asynchronous (non-blocking)
- Dexie uses efficient indexes for queries
- Batch operations are faster than individual adds
- Current schema supports ~10k records easily
- For larger datasets, consider pagination/virtual scrolling

---

_Ready for Milestone 3: Sync & Auth_
