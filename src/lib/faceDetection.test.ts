/**
 * Face detection tests using MediaPipe Face Detector
 *
 * Tests validate:
 * - Module structure and exports
 * - Input validation for invalid/null inputs
 * - Async interface correctness
 * - Cleanup lifecycle
 *
 * Note: Canvas/image-dependent tests are tested in browser (Task 5)
 * Node test environment lacks proper HTMLImageElement support for real detection
 */

import { describe, it, expect, afterAll } from 'vitest';
import { detectFaces, cleanupDetector } from './faceDetection';

describe('Face Detection: MediaPipe', () => {
  it('should handle invalid input gracefully', async () => {
    const faces = await detectFaces('');
    expect(Array.isArray(faces)).toBe(true);
    expect(faces.length).toBe(0);
  });

  it('should handle null input gracefully', async () => {
    const faces = await detectFaces(null as any);
    expect(Array.isArray(faces)).toBe(true);
    expect(faces.length).toBe(0);
  });

  it('should handle undefined input gracefully', async () => {
    const faces = await detectFaces(undefined as any);
    expect(Array.isArray(faces)).toBe(true);
    expect(faces.length).toBe(0);
  });

  it('should export correct interface', () => {
    expect(typeof detectFaces).toBe('function');
    expect(typeof cleanupDetector).toBe('function');
  });

  afterAll(async () => {
    await cleanupDetector();
  });
});
