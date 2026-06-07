/**
 * In-browser OCR module using Tesseract.js
 * Extracts text and bounding boxes from images entirely in the browser.
 */

import { createWorker } from 'tesseract.js';

export interface TextBlock {
  text: string;
  confidence: number; // 0-100 scale
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let worker: any = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the Tesseract worker (lazy-loaded on first use)
 */
async function initializeWorker(): Promise<void> {
  if (worker) {
    return;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;

  initPromise = (async () => {
    try {
      worker = createWorker();
      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
    } catch (error) {
      // Clean up if initialization fails
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // Ignore termination errors
        }
        worker = null;
      }
      isInitializing = false;
      initPromise = null;
      throw error;
    }

    isInitializing = false;
  })();

  await initPromise;
}

/**
 * Normalize bounding box from Tesseract format to standard format
 * Tesseract returns bbox as { x0, y0, x1, y1 }
 * We convert to { x, y, width, height }
 */
function normalizeBoundingBox(bbox: {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}) {
  return {
    x: bbox.x0,
    y: bbox.y0,
    width: bbox.x1 - bbox.x0,
    height: bbox.y1 - bbox.y0,
  };
}

/**
 * Perform OCR on an image and extract text blocks with bounding boxes
 * @param imageSource - Data URL or image path
 * @returns Array of text blocks with confidence and bounding box coordinates
 */
export async function performOCR(imageSource: string): Promise<TextBlock[]> {
  try {
    // Validate image source
    if (!imageSource || typeof imageSource !== 'string') {
      return [];
    }

    // Initialize worker if needed
    await initializeWorker();

    if (!worker) {
      throw new Error('Failed to initialize OCR worker');
    }

    // Run OCR recognition
    const result = await worker.recognize(imageSource);

    // Extract text blocks from result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textBlocks: TextBlock[] = ((result as any).data?.lines || []).map((line: any) => ({
      text: line.text || '',
      confidence: Math.round((line.confidence || 0) * 100), // Convert to 0-100 scale
      boundingBox: normalizeBoundingBox(
        line.bbox || {
          x0: 0,
          y0: 0,
          x1: 0,
          y1: 0,
        }
      ),
    }));

    return textBlocks;
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
}

/**
 * Clean up the worker and free resources
 * Call this when done with OCR processing
 */
export async function cleanupWorker(): Promise<void> {
  if (worker) {
    try {
      await worker.terminate();
    } catch (error) {
      console.error('Error terminating OCR worker:', error);
    } finally {
      worker = null;
      isInitializing = false;
      initPromise = null;
    }
  }
}
