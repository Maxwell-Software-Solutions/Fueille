/**
 * Local plant identification using @huggingface/transformers.
 *
 * Runs entirely in the browser — no API keys or internet required after
 * the model is downloaded once (~90MB, cached in browser storage).
 *
 * Uses a Vision Transformer (ViT) image classifier trained on ImageNet.
 */

import { pipeline, env, type ImageClassificationOutput } from '@huggingface/transformers';

// Disable local model path checks (we always fetch from HF Hub)
env.allowLocalModels = false;

type ProgressCallback = (progress: {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}) => void;

export interface PlantIdentificationResult {
  label: string;
  score: number;
}

let classifierInstance: Awaited<ReturnType<typeof pipeline>> | null = null;
let loadingPromise: Promise<void> | null = null;

const MODEL_ID = 'Xenova/vit-base-patch16-224';

/**
 * Load the image classification model. Downloads on first use,
 * then cached in the browser for subsequent calls.
 */
export async function loadModel(onProgress?: ProgressCallback): Promise<void> {
  if (classifierInstance) return;

  // Prevent double-loading if called concurrently
  if (loadingPromise) {
    await loadingPromise;
    return;
  }

  loadingPromise = (async () => {
    classifierInstance = await pipeline('image-classification', MODEL_ID, {
      progress_callback: onProgress,
    });
  })();

  await loadingPromise;
  loadingPromise = null;
}

/**
 * Check if the model is loaded and ready.
 */
export function isModelLoaded(): boolean {
  return classifierInstance !== null;
}

/**
 * Identify a plant from an image.
 *
 * @param imageSource - A URL (blob:, data:, /path), HTMLImageElement, or File
 * @param topK - Number of top predictions to return (default 5)
 * @returns Sorted array of { label, score } predictions
 */
export async function identifyPlant(
  imageSource: string | HTMLImageElement | File,
  topK = 5,
  onProgress?: ProgressCallback,
): Promise<PlantIdentificationResult[]> {
  await loadModel(onProgress);

  if (!classifierInstance) {
    throw new Error('Model failed to load');
  }

  let input: string | HTMLImageElement;

  if (imageSource instanceof File) {
    // Convert File to a blob URL the model can read
    input = URL.createObjectURL(imageSource);
  } else {
    input = imageSource;
  }

  try {
    const results = (await classifierInstance(input, { topk: topK })) as ImageClassificationOutput;

    return results.map((r) => ({
      label: formatLabel(r.label),
      score: r.score,
    }));
  } finally {
    // Clean up blob URL if we created one
    if (imageSource instanceof File && typeof input === 'string') {
      URL.revokeObjectURL(input);
    }
  }
}

/**
 * Clean up ImageNet labels — they come as "n02123045 tabby, tabby_cat"
 */
function formatLabel(raw: string): string {
  // Remove synset ID prefix if present
  const cleaned = raw.replace(/^n\d+\s+/, '');
  // Title case and clean underscores
  return cleaned
    .split(',')[0]
    .trim()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
