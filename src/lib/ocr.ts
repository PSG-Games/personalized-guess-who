/**
 * In-browser OCR module using Tesseract.js v7
 * Extracts text and bounding boxes from images entirely in the browser.
 */

import Tesseract from 'tesseract.js';

export interface TextBlock {
  text: string;
  confidence: number; // 0-100 scale (matches Tesseract's native confidence range)
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

let worker: Tesseract.Worker | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the Tesseract worker (lazy-loaded on first use).
 *
 * Tesseract.js v7 loads and initializes the language model in a single step —
 * pass the language code(s) directly to createWorker() and the worker is ready
 * to recognize immediately. There is no separate loadLanguage()/initialize().
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
      worker = await Tesseract.createWorker('eng');
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
function normalizeBoundingBox(bbox: { x0: number; y0: number; x1: number; y1: number }) {
  return {
    x: bbox.x0,
    y: bbox.y0,
    width: bbox.x1 - bbox.x0,
    height: bbox.y1 - bbox.y0,
  };
}

/**
 * Flatten Tesseract's nested page structure (blocks -> paragraphs -> lines)
 * into a single list of line-level text blocks. Line granularity gives us
 * usable bounding boxes for name-to-face pairing without being as noisy as
 * word-level output or as coarse as block-level output.
 */
function extractLines(page: Tesseract.Page): Tesseract.Line[] {
  const blocks = page.blocks ?? [];
  const lines: Tesseract.Line[] = [];

  for (const block of blocks) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        lines.push(line);
      }
    }
  }

  return lines;
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
    const lines = extractLines(result.data);

    const textBlocks: TextBlock[] = lines.map((line) => ({
      text: line.text || '',
      // Tesseract reports confidence on a 0-100 scale already — no rescaling needed.
      confidence: Math.round(line.confidence || 0),
      boundingBox: normalizeBoundingBox(line.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 }),
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
