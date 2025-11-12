/**
 * Types and schemas for AI-powered plant identification
 */

import { z } from 'zod';

/**
 * Identified plant information from AI vision model
 */
export interface IdentifiedPlant {
  name: string;
  species?: string;
  commonName?: string;
  scientificName?: string;
  description: string;
  careInstructions: string;
  confidence: number; // 0-1 confidence score
  positionX?: number; // Optional relative position % in layout
  positionY?: number;
  source: 'gemini' | 'plantid' | 'manual'; // Which AI model identified it
}

/**
 * Plant identification request
 */
export interface PlantIdentificationRequest {
  layoutId: string;
  imageUrl?: string; // Layout image URL
  imageData?: string; // Base64 data URL
  autoCreatePlants?: boolean; // Auto-create Plant entities
  autoCreateMarkers?: boolean; // Auto-create PlantMarker entities
}

/**
 * Plant identification response
 */
export interface PlantIdentificationResponse {
  success: boolean;
  plants: IdentifiedPlant[];
  layoutId: string;
  createdPlantIds?: string[]; // IDs of created Plant entities
  createdMarkerIds?: string[]; // IDs of created PlantMarker entities
  processingTimeMs: number;
  error?: string;
}

/**
 * Zod schema for AI vision model output
 * Used with generateObject() for structured responses
 */
export const IdentifiedPlantSchema = z.object({
  name: z.string().describe('Common name of the plant'),
  species: z.string().optional().describe('Species name if identifiable'),
  commonName: z.string().optional().describe('Most common name for the plant'),
  scientificName: z.string().optional().describe('Scientific/Latin name if known'),
  description: z
    .string()
    .describe('Brief description of the plant including appearance and characteristics'),
  careInstructions: z
    .string()
    .describe('Basic care instructions including light, water, temperature requirements'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score from 0-1 for this identification'),
  positionX: z.number().optional().describe('Relative X position in layout (0-100%)'),
  positionY: z.number().optional().describe('Relative Y position in layout (0-100%)'),
});

/**
 * Zod schema for batch plant identification response
 */
export const PlantIdentificationOutputSchema = z.object({
  plants: z
    .array(IdentifiedPlantSchema)
    .describe('Array of all plants identified in the layout image'),
  overallConfidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Overall confidence in the identification results'),
  notes: z
    .string()
    .optional()
    .describe('Additional notes about the identification or image quality'),
});

/**
 * Configuration for plant identification service
 */
export interface PlantIdentificationConfig {
  model: 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gpt-4o-mini' | 'plantid';
  maxImageSize: number; // Max dimension in pixels
  compressionQuality: number; // 0-1
  enablePlantIdFallback: boolean; // Use Plant.id API if confidence < threshold
  plantIdConfidenceThreshold: number; // Trigger fallback if below this
  cacheResults: boolean; // Cache results in database
  cacheDurationDays: number;
}

/**
 * Default configuration prioritizing cost
 */
export const DEFAULT_IDENTIFICATION_CONFIG: PlantIdentificationConfig = {
  model: 'gemini-1.5-flash',
  maxImageSize: 768,
  compressionQuality: 0.85,
  enablePlantIdFallback: false, // Disabled by default (requires API key)
  plantIdConfidenceThreshold: 0.6,
  cacheResults: true,
  cacheDurationDays: 30,
};

/**
 * Plant.id API types (for fallback/upgrade path)
 */
export interface PlantIdRequest {
  images: string[]; // Base64 encoded images
  modifiers: string[];
  plant_language: string;
  plant_details: string[];
}

export interface PlantIdResponse {
  suggestions: Array<{
    id: string;
    plant_name: string;
    plant_details: {
      common_names: string[];
      scientific_name: string;
      wiki_description?: {
        value: string;
      };
      taxonomy?: {
        family: string;
        genus: string;
      };
    };
    probability: number;
  }>;
  health_assessment?: any;
}
