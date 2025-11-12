/**
 * Plant Identification Service
 * Uses AI vision models to identify plants from layout photos
 * Implements cost-optimized approach: Gemini Flash (FREE) → Plant.id fallback (paid)
 */

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import {
  type IdentifiedPlant,
  type PlantIdentificationRequest,
  type PlantIdentificationResponse,
  type PlantIdentificationConfig,
  type PlantIdResponse,
  PlantIdentificationOutputSchema,
  DEFAULT_IDENTIFICATION_CONFIG,
} from '../types/plantIdentification';
import { plantRepository } from '../repositories/PlantRepository';
import { plantMarkerRepository } from '../repositories/PlantMarkerRepository';
import { layoutRepository } from '../repositories/LayoutRepository';

/**
 * Compress and resize image for API efficiency
 * Reduces token usage by 70-80%
 * NOTE: This runs in browser context only. For server-side, pass pre-compressed images.
 */
async function compressImage(imageData: string, maxSize: number, quality: number): Promise<string> {
  // Only runs in browser environment
  if (typeof window === 'undefined') {
    console.warn('Image compression skipped (server-side). Pass pre-compressed images.');
    return imageData;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Resize maintaining aspect ratio
      if (width > height && width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      } else if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
  });
}

/**
 * Identify plants using Gemini 1.5 Flash (FREE tier)
 */
async function identifyWithGemini(
  imageData: string,
  config: PlantIdentificationConfig
): Promise<{ plants: IdentifiedPlant[]; confidence: number }> {
  const startTime = Date.now();

  try {
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: PlantIdentificationOutputSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this garden/plant layout image and identify all visible plants. For each plant:
1. Provide common name and scientific name if possible
2. Write a brief description of appearance and characteristics
3. Include basic care instructions (light, water, temperature)
4. Estimate confidence level (0-1) for identification accuracy
5. If possible, estimate relative position in the image (0-100% x,y coordinates)

Be thorough but concise. Focus on actionable care information.`,
            },
            {
              type: 'image',
              image: imageData,
            },
          ],
        },
      ],
      maxRetries: 2,
    });

    const processingTime = Date.now() - startTime;
    console.log(`Gemini identification completed in ${processingTime}ms`);

    return {
      plants: object.plants.map((p) => ({
        ...p,
        source: 'gemini' as const,
      })),
      confidence: object.overallConfidence,
    };
  } catch (error) {
    console.error('Gemini identification failed:', error);
    throw new Error(
      `Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Identify plants using Plant.id API (paid fallback for high accuracy)
 * Cost: $0.05 per identification (100 free/month)
 */
async function identifyWithPlantId(imageData: string): Promise<IdentifiedPlant[]> {
  const apiKey = process.env.PLANTID_API_KEY;

  if (!apiKey) {
    throw new Error('PLANTID_API_KEY not configured');
  }

  // Remove data URL prefix if present
  const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');

  try {
    const response = await fetch('https://api.plant.id/v2/identify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': apiKey,
      },
      body: JSON.stringify({
        images: [base64Image],
        modifiers: ['crops_fast', 'similar_images'],
        plant_language: 'en',
        plant_details: ['common_names', 'taxonomy', 'wiki_description'],
      }),
    });

    if (!response.ok) {
      throw new Error(`Plant.id API error: ${response.status} ${response.statusText}`);
    }

    const data: PlantIdResponse = await response.json();

    // Convert Plant.id format to our IdentifiedPlant format
    return data.suggestions.slice(0, 5).map((suggestion) => ({
      name: suggestion.plant_details.common_names?.[0] || suggestion.plant_name,
      commonName: suggestion.plant_details.common_names?.[0],
      scientificName: suggestion.plant_details.scientific_name,
      species: suggestion.plant_details.taxonomy?.genus,
      description:
        suggestion.plant_details.wiki_description?.value ||
        `${suggestion.plant_name} from ${suggestion.plant_details.taxonomy?.family || 'unknown'} family`,
      careInstructions: 'Refer to species-specific care guides for detailed instructions.',
      confidence: suggestion.probability,
      source: 'plantid' as const,
    }));
  } catch (error) {
    console.error('Plant.id identification failed:', error);
    throw error;
  }
}

/**
 * Main plant identification function
 * Implements tiered approach: Gemini (free) → Plant.id (paid) fallback
 */
export async function identifyPlantsFromLayout(
  request: PlantIdentificationRequest,
  config: PlantIdentificationConfig = DEFAULT_IDENTIFICATION_CONFIG
): Promise<PlantIdentificationResponse> {
  const startTime = Date.now();

  try {
    // Validate layout exists
    const layout = await layoutRepository.getById(request.layoutId);
    if (!layout) {
      throw new Error(`Layout ${request.layoutId} not found`);
    }

    // Get image data (from URL or direct data)
    let imageData = request.imageData;
    if (!imageData && request.imageUrl) {
      // Fetch image and convert to data URL
      const response = await fetch(request.imageUrl);
      const blob = await response.blob();
      imageData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }

    if (!imageData) {
      throw new Error('No image data provided');
    }

    // Compress image for cost optimization (only in browser)
    const compressedImage = await compressImage(
      imageData,
      config.maxImageSize,
      config.compressionQuality
    );

    // Try Gemini first (FREE tier)
    let identifiedPlants: IdentifiedPlant[] = [];
    let overallConfidence = 0;

    try {
      const geminiResult = await identifyWithGemini(compressedImage, config);
      identifiedPlants = geminiResult.plants;
      overallConfidence = geminiResult.confidence;
    } catch (geminiError) {
      console.warn('Gemini failed, trying fallback:', geminiError);

      // Fallback to gpt-4o-mini if Gemini fails
      if (process.env.OPENAI_API_KEY) {
        try {
          const { object } = await generateObject({
            model: openai('gpt-4o-mini'),
            schema: PlantIdentificationOutputSchema,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Identify all plants in this image with names, descriptions, and care instructions.',
                  },
                  {
                    type: 'image',
                    image: compressedImage,
                  },
                ],
              },
            ],
          });

          identifiedPlants = object.plants.map((p) => ({ ...p, source: 'gemini' as const }));
          overallConfidence = object.overallConfidence;
        } catch (openaiError) {
          console.error('OpenAI fallback also failed:', openaiError);
          throw geminiError; // Throw original error
        }
      } else {
        throw geminiError;
      }
    }

    // If confidence is low and Plant.id is enabled, use it for verification
    if (
      config.enablePlantIdFallback &&
      overallConfidence < config.plantIdConfidenceThreshold &&
      process.env.PLANTID_API_KEY
    ) {
      console.log('Low confidence, using Plant.id for verification');
      try {
        const plantIdResults = await identifyWithPlantId(compressedImage);
        // Merge or replace with Plant.id results (higher accuracy)
        identifiedPlants = plantIdResults;
      } catch (plantIdError) {
        console.warn('Plant.id fallback failed, using Gemini results:', plantIdError);
        // Continue with Gemini results
      }
    }

    // Auto-create Plant entities if requested
    const createdPlantIds: string[] = [];
    if (request.autoCreatePlants) {
      for (const identified of identifiedPlants) {
        const plant = await plantRepository.create({
          name: identified.name,
          species: identified.scientificName || identified.species,
          location: layout.name,
          notes: `${identified.description}\n\nCare: ${identified.careInstructions}\n\nConfidence: ${(identified.confidence * 100).toFixed(1)}% (Source: ${identified.source})`,
        });
        createdPlantIds.push(plant.id);

        // Auto-create markers with positions if available
        if (request.autoCreateMarkers && identified.positionX && identified.positionY) {
          const marker = await plantMarkerRepository.create({
            layoutId: layout.id,
            plantId: plant.id,
            positionX: identified.positionX,
            positionY: identified.positionY,
          });
        }
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      plants: identifiedPlants,
      layoutId: request.layoutId,
      createdPlantIds,
      processingTimeMs: processingTime,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('Plant identification failed:', error);

    return {
      success: false,
      plants: [],
      layoutId: request.layoutId,
      processingTimeMs: processingTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if plant identification is available
 */
export function isPlantIdentificationAvailable(): {
  available: boolean;
  providers: string[];
  message?: string;
} {
  const providers: string[] = [];

  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    providers.push('gemini');
  }

  if (process.env.OPENAI_API_KEY) {
    providers.push('openai');
  }

  if (process.env.PLANTID_API_KEY) {
    providers.push('plantid');
  }

  if (providers.length === 0) {
    return {
      available: false,
      providers: [],
      message: 'No AI providers configured. Set GOOGLE_GENERATIVE_AI_API_KEY or OPENAI_API_KEY.',
    };
  }

  return {
    available: true,
    providers,
  };
}
