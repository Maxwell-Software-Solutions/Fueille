/**
 * API Route: Plant Identification
 * POST /api/identify-plants
 *
 * Identifies plants from layout photos using AI vision models.
 * Cost-optimized: Gemini 1.5 Flash (FREE tier) with optional Plant.id fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  identifyPlantsFromLayout,
  isPlantIdentificationAvailable,
  type PlantIdentificationRequest,
  DEFAULT_IDENTIFICATION_CONFIG,
} from '@/lib/domain';

// Input validation schema
const RequestSchema = z.object({
  layoutId: z.string().min(1, 'Layout ID is required'),
  imageUrl: z.string().url().optional(),
  imageData: z.string().optional(),
  autoCreatePlants: z.boolean().default(true),
  autoCreateMarkers: z.boolean().default(true),
  // Allow custom config overrides
  config: z
    .object({
      model: z.enum(['gemini-1.5-flash', 'gemini-1.5-pro', 'gpt-4o-mini', 'plantid']).optional(),
      maxImageSize: z.number().positive().optional(),
      compressionQuality: z.number().min(0).max(1).optional(),
      enablePlantIdFallback: z.boolean().optional(),
    })
    .optional(),
});

/**
 * POST /api/identify-plants
 * Identify plants from a layout image
 */
export async function POST(req: NextRequest) {
  try {
    // Check if service is available
    const availability = isPlantIdentificationAvailable();
    if (!availability.available) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plant identification not available',
          message: availability.message,
        },
        { status: 503 }
      );
    }

    // Parse and validate request
    const body = await req.json();
    const validated = RequestSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validated.error.format(),
        },
        { status: 400 }
      );
    }

    const { layoutId, imageUrl, imageData, autoCreatePlants, autoCreateMarkers, config } =
      validated.data;

    // Validate that at least one image source is provided
    if (!imageUrl && !imageData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either imageUrl or imageData must be provided',
        },
        { status: 400 }
      );
    }

    // Build request
    const request: PlantIdentificationRequest = {
      layoutId,
      imageUrl,
      imageData,
      autoCreatePlants,
      autoCreateMarkers,
    };

    // Merge custom config with defaults
    const mergedConfig = {
      ...DEFAULT_IDENTIFICATION_CONFIG,
      ...config,
    };

    // Perform identification
    const result = await identifyPlantsFromLayout(request, mergedConfig);

    // Return result
    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Plant identification API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/identify-plants
 * Check availability and get provider info
 */
export async function GET() {
  const availability = isPlantIdentificationAvailable();

  return NextResponse.json({
    available: availability.available,
    providers: availability.providers,
    message: availability.message,
    config: {
      defaultModel: DEFAULT_IDENTIFICATION_CONFIG.model,
      maxImageSize: DEFAULT_IDENTIFICATION_CONFIG.maxImageSize,
      compressionQuality: DEFAULT_IDENTIFICATION_CONFIG.compressionQuality,
      plantIdFallbackEnabled: DEFAULT_IDENTIFICATION_CONFIG.enablePlantIdFallback,
    },
  });
}
