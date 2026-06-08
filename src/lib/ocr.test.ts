import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performOCR, cleanupWorker } from './ocr';

// Mock Tesseract.js — v7 exposes a default export with createWorker(langs)
// that resolves directly to a ready-to-use worker (no separate
// loadLanguage()/initialize() calls).
vi.mock('tesseract.js', () => {
  return {
    default: {
      createWorker: vi.fn(),
    },
  };
});

/**
 * Build a Tesseract v7-shaped recognize() result.
 * Real output nests lines inside paragraphs inside blocks — the module under
 * test must flatten this structure, so the fixtures mirror it exactly rather
 * than taking a shortcut with a flat `lines` array.
 */
function buildRecognizeResult(
  lines: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }>
) {
  return {
    data: {
      blocks: [
        {
          paragraphs: [
            {
              lines,
            },
          ],
        },
      ],
    },
  };
}

function buildMockWorker(overrides: Record<string, unknown> = {}) {
  return {
    recognize: vi.fn().mockResolvedValue(buildRecognizeResult([])),
    terminate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('OCR Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupWorker();
  });

  describe('performOCR', () => {
    it('should initialize the worker with the English language on first use', async () => {
      const mockWorker = buildMockWorker({
        recognize: vi.fn().mockResolvedValue(
          buildRecognizeResult([
            { text: 'Hello World', confidence: 95, bbox: { x0: 10, y0: 20, x1: 100, y1: 40 } },
          ])
        ),
      });

      const Tesseract = await import('tesseract.js');
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as never);

      const imageDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await performOCR(imageDataUrl);

      // v7 loads and initializes the language model in one step — the
      // language is passed directly to createWorker, not via separate calls.
      expect(Tesseract.default.createWorker).toHaveBeenCalledWith('eng');
    });

    it('should return structured text blocks with bounding boxes', async () => {
      const mockWorker = buildMockWorker({
        recognize: vi.fn().mockResolvedValue(
          buildRecognizeResult([
            { text: 'Alice', confidence: 95.4, bbox: { x0: 10, y0: 20, x1: 100, y1: 40 } },
            { text: 'Bob', confidence: 88.2, bbox: { x0: 10, y0: 50, x1: 80, y1: 70 } },
          ])
        ),
      });

      const Tesseract = await import('tesseract.js');
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as never);

      const imageDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const result = await performOCR(imageDataUrl);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        text: 'Alice',
        confidence: 95,
        boundingBox: {
          x: 10,
          y: 20,
          width: 90,
          height: 20,
        },
      });
      expect(result[1]).toEqual({
        text: 'Bob',
        confidence: 88,
        boundingBox: {
          x: 10,
          y: 50,
          width: 70,
          height: 20,
        },
      });
    });

    it('preserves confidence on its native 0-100 scale without rescaling', async () => {
      // Tesseract reports confidence already in the 0-100 range (e.g. 99.8).
      // A naive "convert to percentage" multiply-by-100 would produce 9980 —
      // this test guards against that regression.
      const mockWorker = buildMockWorker({
        recognize: vi.fn().mockResolvedValue(
          buildRecognizeResult([
            { text: 'Crisp Scan', confidence: 99.8, bbox: { x0: 0, y0: 0, x1: 60, y1: 20 } },
          ])
        ),
      });

      const Tesseract = await import('tesseract.js');
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as never);

      const result = await performOCR('data:image/png;base64,abc');

      expect(result[0].confidence).toBe(100);
      expect(result[0].confidence).toBeLessThanOrEqual(100);
    });

    it('flattens lines nested inside multiple blocks and paragraphs', async () => {
      // Real pages can have several blocks (e.g. one per photo column), each
      // with multiple paragraphs. The module must walk the full tree, not
      // just the first block/paragraph.
      const mockWorker = buildMockWorker({
        recognize: vi.fn().mockResolvedValue({
          data: {
            blocks: [
              {
                paragraphs: [
                  { lines: [{ text: 'Block 1 Para 1', confidence: 90, bbox: { x0: 0, y0: 0, x1: 50, y1: 10 } }] },
                  { lines: [{ text: 'Block 1 Para 2', confidence: 85, bbox: { x0: 0, y0: 15, x1: 50, y1: 25 } }] },
                ],
              },
              {
                paragraphs: [
                  { lines: [{ text: 'Block 2 Para 1', confidence: 80, bbox: { x0: 60, y0: 0, x1: 110, y1: 10 } }] },
                ],
              },
            ],
          },
        }),
      });

      const Tesseract = await import('tesseract.js');
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as never);

      const result = await performOCR('data:image/png;base64,abc');

      expect(result.map((block) => block.text)).toEqual(['Block 1 Para 1', 'Block 1 Para 2', 'Block 2 Para 1']);
    });

    it('returns an empty array when the page has no blocks', async () => {
      const mockWorker = buildMockWorker({
        recognize: vi.fn().mockResolvedValue({ data: { blocks: null } }),
      });

      const Tesseract = await import('tesseract.js');
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as never);

      const result = await performOCR('data:image/png;base64,abc');

      expect(result).toEqual([]);
    });

    it('should reuse the worker on subsequent calls', async () => {
      const mockWorker = buildMockWorker({
        recognize: vi.fn().mockResolvedValue(
          buildRecognizeResult([{ text: 'Test', confidence: 90, bbox: { x0: 0, y0: 0, x1: 50, y1: 20 } }])
        ),
      });

      const Tesseract = await import('tesseract.js');
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as never);

      const imageDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // First call
      await performOCR(imageDataUrl);
      expect(Tesseract.default.createWorker).toHaveBeenCalledTimes(1);

      // Second call should reuse the worker
      await performOCR(imageDataUrl);
      expect(Tesseract.default.createWorker).toHaveBeenCalledTimes(1);
      expect(mockWorker.recognize).toHaveBeenCalledTimes(2);
    });

    it('should handle OCR initialization errors gracefully', async () => {
      const Tesseract = await import('tesseract.js');
      vi.mocked(Tesseract.default.createWorker).mockRejectedValue(new Error('WASM load failed'));

      const imageDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await expect(performOCR(imageDataUrl)).rejects.toThrow('WASM load failed');
    });

    it('should handle OCR recognition errors gracefully', async () => {
      const mockWorker = buildMockWorker({
        recognize: vi.fn().mockRejectedValue(new Error('Image recognition failed')),
      });

      const Tesseract = await import('tesseract.js');
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as never);

      const imageDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await expect(performOCR(imageDataUrl)).rejects.toThrow('Image recognition failed');
    });

    it('should handle invalid image input', async () => {
      const mockWorker = buildMockWorker();

      const Tesseract = await import('tesseract.js');
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as never);

      const imageDataUrl = 'invalid-data-url';

      // The function should return an empty array for invalid input
      const result = await performOCR(imageDataUrl);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('cleanupWorker', () => {
    it('should terminate the worker', async () => {
      const mockWorker = buildMockWorker();

      const Tesseract = await import('tesseract.js');
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as never);

      const imageDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // Initialize the worker
      await performOCR(imageDataUrl);

      // Clean it up
      await cleanupWorker();

      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it('should not throw if no worker is initialized', async () => {
      await expect(cleanupWorker()).resolves.not.toThrow();
    });
  });
});
