/**
 * Domain Layer - Entities, Repositories, and Services
 * Provides offline-first data access for the Plant Tracking app
 */

// Core entities and types
export * from './entities';

// Database
export { getDatabase, initDatabase, clearDatabase, getDb } from './database';

// Repositories
export { plantRepository, PlantRepository } from './repositories/PlantRepository';
export { careTaskRepository, CareTaskRepository } from './repositories/CareTaskRepository';
export { photoRepository, PhotoRepository } from './repositories/PhotoRepository';

// Services
export { mutationQueueService, MutationQueueService } from './services/MutationQueueService';
export { notificationScheduler, NotificationScheduler } from './services/NotificationScheduler';
export { deepLinkService, DeepLinkService } from './services/DeepLinkService';
export type { DeepLink, DeepLinkType } from './services/DeepLinkService';
export { telemetry, TelemetryService } from './services/TelemetryService';
export type {
  TelemetryEvent,
  TelemetryProvider,
  TelemetryProperties,
} from './services/TelemetryService';
