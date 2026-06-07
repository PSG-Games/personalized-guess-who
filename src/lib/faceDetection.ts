/**
 * Face detection module using MediaPipe Face Detector
 *
 * SPIKE DECISION: Chose MediaPipe over face-api.js
 * Rationale: Modern library, native ES6 support, better maintained
 * See SPIKE_REPORT.md for full evaluation
 */

import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';

export interface Face {
  id: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  crop?: ImageData;
}

let detector: FaceDetector | null = null;
let isInitializing = false;
let initPromise: Promise<FaceDetector | null> | null = null;

/**
 * Initialize MediaPipe Face Detector (lazy-loaded on first use)
 */
async function initializeDetector(): Promise<FaceDetector | null> {
  if (detector) {
    return detector;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;

  initPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );
      detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/face_short_range.tflite',
        },
        runningMode: 'IMAGE',
      });
      return detector;
    } catch (error) {
      console.error('Failed to initialize MediaPipe detector:', error);
      isInitializing = false;
      initPromise = null;
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

/**
 * Detect faces in an image using MediaPipe
 * @param imageDataUrl - Data URL of the image to detect faces in
 * @returns Array of detected faces with confidence and bounding boxes
 */
export async function detectFaces(imageDataUrl: string): Promise<Face[]> {
  try {
    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return [];
    }

    const det = await initializeDetector();
    if (!det) {
      throw new Error('Failed to initialize face detector');
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageDataUrl;

    const imageLoadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      setTimeout(() => reject(new Error('Image load timeout')), 10000);
    });

    const loadedImage = await imageLoadPromise;
    const detections = det.detectForVideo(loadedImage, Date.now());

    const faces: Face[] = detections.detections.map((detection, index) => {
      const bbox = detection.boundingBox;
      return {
        id: `face-${index}`,
        confidence: detection.categories[0]?.score || 0,
        boundingBox: {
          x: bbox.originX,
          y: bbox.originY,
          width: bbox.width,
          height: bbox.height,
        },
      };
    });

    return faces;
  } catch (error) {
    console.error('Face detection error:', error);
    throw error;
  }
}

/**
 * Clean up detector resources
 */
export async function cleanupDetector(): Promise<void> {
  if (detector) {
    try {
      detector.close();
    } catch (error) {
      console.error('Error closing face detector:', error);
    } finally {
      detector = null;
      isInitializing = false;
      initPromise = null;
    }
  }
}

/**
 * Extract a face crop from the image using bounding box
 * Useful for creating face thumbnails for the game cards
 */
export function extractFaceCrop(
  imageDataUrl: string,
  face: Face,
  padding: number = 10
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageDataUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate crop coordinates with padding
      const x = Math.max(0, face.boundingBox.x - padding);
      const y = Math.max(0, face.boundingBox.y - padding);
      const width = face.boundingBox.width + padding * 2;
      const height = face.boundingBox.height + padding * 2;

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw the cropped face
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

      resolve(canvas);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for crop'));
    };
  });
}
