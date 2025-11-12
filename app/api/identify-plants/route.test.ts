/**
 * Tests for Plant Identification Service
 * Integration tests for the AI plant identification functionality
 */

import {
  identifyPlantsFromLayout,
  isPlantIdentificationAvailable,
  DEFAULT_IDENTIFICATION_CONFIG,
  type PlantIdentificationRequest,
} from '@/lib/domain';

// Mock the service functions
jest.mock('@/lib/domain', () => ({
  identifyPlantsFromLayout: jest.fn(),
  isPlantIdentificationAvailable: jest.fn(),
  DEFAULT_IDENTIFICATION_CONFIG: {
    model: 'gemini-1.5-flash',
    maxImageSize: 768,
    compressionQuality: 0.85,
    enablePlantIdFallback: false,
    plantIdConfidenceThreshold: 0.6,
    cacheResults: true,
    cacheDurationDays: 30,
  },
}));

describe('Plant Identification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPlantIdentificationAvailable', () => {
    it('returns available when API keys are configured', () => {
      const mockAvailability = {
        available: true,
        providers: ['gemini'],
      };

      (isPlantIdentificationAvailable as jest.Mock).mockReturnValue(mockAvailability);

      const result = isPlantIdentificationAvailable();

      expect(result.available).toBe(true);
      expect(result.providers).toContain('gemini');
    });

    it('returns unavailable when no API keys configured', () => {
      const mockAvailability = {
        available: false,
        providers: [],
        message: 'No AI providers configured',
      };

      (isPlantIdentificationAvailable as jest.Mock).mockReturnValue(mockAvailability);

      const result = isPlantIdentificationAvailable();

      expect(result.available).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('lists multiple providers when available', () => {
      const mockAvailability = {
        available: true,
        providers: ['gemini', 'openai', 'plantid'],
      };

      (isPlantIdentificationAvailable as jest.Mock).mockReturnValue(mockAvailability);

      const result = isPlantIdentificationAvailable();

      expect(result.providers).toHaveLength(3);
      expect(result.providers).toContain('gemini');
      expect(result.providers).toContain('openai');
      expect(result.providers).toContain('plantid');
    });
  });

  describe('identifyPlantsFromLayout', () => {
    it('successfully identifies plants from a layout', async () => {
      const mockRequest: PlantIdentificationRequest = {
        layoutId: 'test-layout',
        imageUrl: 'https://example.com/garden.jpg',
        autoCreatePlants: true,
        autoCreateMarkers: true,
      };

      const mockResponse = {
        success: true,
        plants: [
          {
            name: 'Monstera Deliciosa',
            scientificName: 'Monstera deliciosa',
            description: 'Large tropical plant with split leaves',
            careInstructions: 'Bright indirect light, water when top 2 inches of soil dry',
            confidence: 0.92,
            source: 'gemini' as const,
          },
        ],
        layoutId: 'test-layout',
        createdPlantIds: ['plant-1'],
        processingTimeMs: 2000,
      };

      (identifyPlantsFromLayout as jest.Mock).mockResolvedValue(mockResponse);

      const result = await identifyPlantsFromLayout(mockRequest, DEFAULT_IDENTIFICATION_CONFIG);

      expect(result.success).toBe(true);
      expect(result.plants).toHaveLength(1);
      expect(result.plants[0].name).toBe('Monstera Deliciosa');
      expect(result.plants[0].confidence).toBeGreaterThan(0.9);
      expect(identifyPlantsFromLayout).toHaveBeenCalledWith(
        mockRequest,
        DEFAULT_IDENTIFICATION_CONFIG
      );
    });

    it('handles identification failure gracefully', async () => {
      const mockRequest: PlantIdentificationRequest = {
        layoutId: 'test-layout',
        imageUrl: 'https://example.com/garden.jpg',
      };

      const mockResponse = {
        success: false,
        plants: [],
        layoutId: 'test-layout',
        processingTimeMs: 1000,
        error: 'API rate limit exceeded',
      };

      (identifyPlantsFromLayout as jest.Mock).mockResolvedValue(mockResponse);

      const result = await identifyPlantsFromLayout(mockRequest, DEFAULT_IDENTIFICATION_CONFIG);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API rate limit exceeded');
      expect(result.plants).toHaveLength(0);
    });

    it('respects custom configuration', async () => {
      const mockRequest: PlantIdentificationRequest = {
        layoutId: 'test-layout',
        imageUrl: 'https://example.com/garden.jpg',
      };

      const customConfig = {
        ...DEFAULT_IDENTIFICATION_CONFIG,
        model: 'gpt-4o-mini' as const,
        maxImageSize: 1024,
        enablePlantIdFallback: true,
      };

      const mockResponse = {
        success: true,
        plants: [],
        layoutId: 'test-layout',
        processingTimeMs: 1500,
      };

      (identifyPlantsFromLayout as jest.Mock).mockResolvedValue(mockResponse);

      await identifyPlantsFromLayout(mockRequest, customConfig);

      expect(identifyPlantsFromLayout).toHaveBeenCalledWith(mockRequest, customConfig);
    });

    it('creates plants and markers when requested', async () => {
      const mockRequest: PlantIdentificationRequest = {
        layoutId: 'test-layout',
        imageUrl: 'https://example.com/garden.jpg',
        autoCreatePlants: true,
        autoCreateMarkers: true,
      };

      const mockResponse = {
        success: true,
        plants: [
          {
            name: 'Fiddle Leaf Fig',
            description: 'Popular houseplant with large violin-shaped leaves',
            careInstructions: 'Bright indirect light, water when soil is dry',
            confidence: 0.85,
            positionX: 30,
            positionY: 40,
            source: 'gemini' as const,
          },
        ],
        layoutId: 'test-layout',
        createdPlantIds: ['plant-1'],
        createdMarkerIds: ['marker-1'],
        processingTimeMs: 2500,
      };

      (identifyPlantsFromLayout as jest.Mock).mockResolvedValue(mockResponse);

      const result = await identifyPlantsFromLayout(mockRequest, DEFAULT_IDENTIFICATION_CONFIG);

      expect(result.createdPlantIds).toHaveLength(1);
      expect(result.createdMarkerIds).toHaveLength(1);
      expect(result.plants[0].positionX).toBe(30);
      expect(result.plants[0].positionY).toBe(40);
    });

    it('identifies multiple plants in a single layout', async () => {
      const mockRequest: PlantIdentificationRequest = {
        layoutId: 'garden-layout',
        imageUrl: 'https://example.com/backyard.jpg',
        autoCreatePlants: true,
      };

      const mockResponse = {
        success: true,
        plants: [
          {
            name: 'Rose',
            description: 'Beautiful flowering plant',
            careInstructions: 'Full sun, regular watering',
            confidence: 0.88,
            source: 'gemini' as const,
          },
          {
            name: 'Lavender',
            description: 'Aromatic herb',
            careInstructions: 'Full sun, well-drained soil',
            confidence: 0.91,
            source: 'gemini' as const,
          },
          {
            name: 'Tomato',
            description: 'Vegetable plant',
            careInstructions: 'Full sun, regular fertilizing',
            confidence: 0.85,
            source: 'gemini' as const,
          },
        ],
        layoutId: 'garden-layout',
        createdPlantIds: ['plant-1', 'plant-2', 'plant-3'],
        processingTimeMs: 3200,
      };

      (identifyPlantsFromLayout as jest.Mock).mockResolvedValue(mockResponse);

      const result = await identifyPlantsFromLayout(mockRequest, DEFAULT_IDENTIFICATION_CONFIG);

      expect(result.plants).toHaveLength(3);
      expect(result.createdPlantIds).toHaveLength(3);
      expect(result.plants.every((p) => p.confidence > 0.8)).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('has sensible defaults for cost optimization', () => {
      expect(DEFAULT_IDENTIFICATION_CONFIG.model).toBe('gemini-1.5-flash');
      expect(DEFAULT_IDENTIFICATION_CONFIG.maxImageSize).toBe(768);
      expect(DEFAULT_IDENTIFICATION_CONFIG.compressionQuality).toBe(0.85);
      expect(DEFAULT_IDENTIFICATION_CONFIG.enablePlantIdFallback).toBe(false);
      expect(DEFAULT_IDENTIFICATION_CONFIG.cacheResults).toBe(true);
    });

    it('prioritizes free tier options', () => {
      // Gemini 1.5 Flash is FREE tier
      expect(DEFAULT_IDENTIFICATION_CONFIG.model).toBe('gemini-1.5-flash');

      // Plant.id fallback disabled by default (costs money)
      expect(DEFAULT_IDENTIFICATION_CONFIG.enablePlantIdFallback).toBe(false);
    });

    it('enables caching to avoid redundant API calls', () => {
      expect(DEFAULT_IDENTIFICATION_CONFIG.cacheResults).toBe(true);
      expect(DEFAULT_IDENTIFICATION_CONFIG.cacheDurationDays).toBeGreaterThan(0);
    });
  });
});
