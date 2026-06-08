import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performOCR, cleanupWorker } from './ocr';

// Mock Tesseract.js
vi.mock('tesseract.js', () => {
  return {
    default: {
      createWorker: vi.fn(),
    },
  };
});

describe('OCR Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupWorker();
  });

  describe('performOCR', () => {
    it('should initialize the worker on first use', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWorker: any = {
        load: vi.fn().mockResolvedValue(undefined),
        loadLanguage: vi.fn().mockResolvedValue(undefined),
        initialize: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockResolvedValue({
          data: {
            lines: [
              {
                text: 'Hello World',
                confidence: 95,
                bbox: { x0: 10, y0: 20, x1: 100, y1: 40 },
              },
            ],
          },
        }),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      const Tesseract = await import('tesseract.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as any);

      const imageDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await performOCR(imageDataUrl);

      expect(Tesseract.default.createWorker).toHaveBeenCalled();
      expect(mockWorker.loadLanguage).toHaveBeenCalledWith('eng');
      expect(mockWorker.initialize).toHaveBeenCalledWith('eng');
    });

    it('should return structured text blocks with bounding boxes', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWorker: any = {
        load: vi.fn().mockResolvedValue(undefined),
        loadLanguage: vi.fn().mockResolvedValue(undefined),
        initialize: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockResolvedValue({
          data: {
            lines: [
              {
                text: 'Alice',
                confidence: 0.95,
                bbox: { x0: 10, y0: 20, x1: 100, y1: 40 },
              },
              {
                text: 'Bob',
                confidence: 0.88,
                bbox: { x0: 10, y0: 50, x1: 80, y1: 70 },
              },
            ],
          },
        }),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      const Tesseract = await import('tesseract.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as any);

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

    it('should reuse the worker on subsequent calls', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWorker: any = {
        load: vi.fn().mockResolvedValue(undefined),
        loadLanguage: vi.fn().mockResolvedValue(undefined),
        initialize: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockResolvedValue({
          data: {
            lines: [
              {
                text: 'Test',
                confidence: 0.9,
                bbox: { x0: 0, y0: 0, x1: 50, y1: 20 },
              },
            ],
          },
        }),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      const Tesseract = await import('tesseract.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as any);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWorker: any = {
        loadLanguage: vi.fn().mockRejectedValue(new Error('WASM load failed')),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      const Tesseract = await import('tesseract.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as any);

      const imageDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await expect(performOCR(imageDataUrl)).rejects.toThrow('WASM load failed');
    });

    it('should handle OCR recognition errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWorker: any = {
        load: vi.fn().mockResolvedValue(undefined),
        loadLanguage: vi.fn().mockResolvedValue(undefined),
        initialize: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockRejectedValue(new Error('Image recognition failed')),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      const Tesseract = await import('tesseract.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as any);

      const imageDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      await expect(performOCR(imageDataUrl)).rejects.toThrow('Image recognition failed');
    });

    it('should handle invalid image input', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWorker: any = {
        load: vi.fn().mockResolvedValue(undefined),
        loadLanguage: vi.fn().mockResolvedValue(undefined),
        initialize: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockResolvedValue({
          data: { lines: [] },
        }),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      const Tesseract = await import('tesseract.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as any);

      const imageDataUrl = 'invalid-data-url';

      // The function should return an empty array for invalid input
      const result = await performOCR(imageDataUrl);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('cleanupWorker', () => {
    it('should terminate the worker', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockWorker: any = {
        load: vi.fn().mockResolvedValue(undefined),
        loadLanguage: vi.fn().mockResolvedValue(undefined),
        initialize: vi.fn().mockResolvedValue(undefined),
        recognize: vi.fn().mockResolvedValue({
          data: { lines: [] },
        }),
        terminate: vi.fn().mockResolvedValue(undefined),
      };

      const Tesseract = await import('tesseract.js');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(Tesseract.default.createWorker).mockResolvedValue(mockWorker as any);

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
