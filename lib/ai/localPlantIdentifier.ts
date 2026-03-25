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
  let blobUrl: string | null = null;

  if (imageSource instanceof File) {
    blobUrl = URL.createObjectURL(imageSource);
    input = blobUrl;
  } else if (imageSource instanceof HTMLImageElement) {
    input = imageSource;
  } else {
    input = imageSource;
  }

  // SVGs can't be decoded by the model — rasterize to PNG data URL via canvas
  if (typeof input === 'string' && input.endsWith('.svg')) {
    input = await rasterizeSvg(input);
  }

  try {
    const results = (await classifierInstance(input, { topk: topK })) as ImageClassificationOutput;

    return results.map((r) => ({
      label: formatLabel(r.label),
      score: r.score,
    }));
  } finally {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
  }
}

/**
 * Render an SVG URL to a PNG blob URL via an offscreen canvas.
 */
async function rasterizeSvg(svgUrl: string, size = 224): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported'));
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load SVG'));
    img.src = svgUrl;
  });
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
