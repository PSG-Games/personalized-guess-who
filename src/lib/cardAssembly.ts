/**
 * Card assembly module: pairs faces with text (names) using spatial proximity heuristic
 *
 * This module takes OCR text blocks and face detection results and proposes pairings
 * based on how close text is to faces. It's intentionally simple (not ML-based) because:
 * 1. The heuristic will never be perfect
 * 2. Task 6 provides a review UI where users can fix pairings
 * 3. Simple proximity is good enough for real yearbooks, rosters, and group photos
 *
 * Algorithm:
 * - For each face, find the closest text block
 * - If distance <= DISTANCE_THRESHOLD, create a pairing
 * - Faces with no nearby text are included as "orphans" (user will name them)
 * - Text blocks with no nearby face are excluded (they'll clutter the interface)
 * - Each text can be paired to at most one face
 * - Confidence score depends on distance and detection confidences
 */

import type { Face, TextBlock, DraftCard } from '../types/card';

// Re-export for convenience
export type { Face, TextBlock, DraftCard };

/**
 * Maximum distance (in pixels) between face center and text block center
 * for them to be considered nearby enough to pair.
 *
 * Tuning notes:
 * - 100px: Conservative, only very close pairings
 * - 150px: Reasonable for yearbook/roster layouts
 * - 200px: Permissive, may pair far-away text
 * - Actual optimal value depends on image resolution and typical layout
 */
const DISTANCE_THRESHOLD = 150;

/**
 * Calculate euclidean distance between two 2D points
 * @param point1 - First point with x, y coordinates
 * @param point2 - Second point with x, y coordinates
 * @returns Distance in pixels
 */
export function calculateDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get the center point of a bounding box
 */
function getBoundingBoxCenter(bbox: { x: number; y: number; width: number; height: number }): { x: number; y: number } {
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
  };
}

/**
 * Result of finding a match for a face
 */
interface BestMatch {
  textIndex: number;
  text: TextBlock;
  distance: number;
}

/**
 * Find the best (closest) text block match for a face
 * Returns null if no text is within the distance threshold
 *
 * @param face - The face to match
 * @param texts - Available text blocks to search
 * @returns Match info with text index and distance, or null
 */
export function findBestMatchForFace(face: Face, texts: TextBlock[]): BestMatch | null {
  const faceCenter = getBoundingBoxCenter(face.boundingBox);

  let bestMatch: BestMatch | null = null;
  let bestDistance = DISTANCE_THRESHOLD;

  for (let i = 0; i < texts.length; i++) {
    const textCenter = getBoundingBoxCenter(texts[i].boundingBox);
    const distance = calculateDistance(faceCenter, textCenter);

    // Keep track of the closest text within threshold
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = {
        textIndex: i,
        text: texts[i],
        distance,
      };
    }
  }

  return bestMatch;
}

/**
 * Find all text block indices that were not paired to any face
 * @param texts - All text blocks
 * @param pairingMap - Map from text index to face id (represents current pairings)
 * @returns Array of text block indices that don't appear in pairingMap
 */
export function findUnpairedTexts(texts: TextBlock[], pairingMap: Map<number, string>): number[] {
  const unpaired: number[] = [];

  for (let i = 0; i < texts.length; i++) {
    if (!pairingMap.has(i)) {
      unpaired.push(i);
    }
  }

  return unpaired;
}

/**
 * Calculate confidence score for a face-text pairing
 *
 * Confidence depends on:
 * 1. Distance: closer text gets higher confidence
 * 2. Face detection confidence: detected faces get higher confidence
 * 3. Text OCR confidence: high-confidence text gets higher confidence
 *
 * Returns a value between 0 and 1
 */
function calculatePairingConfidence(face: Face, text: TextBlock, distance: number): number {
  // Distance component: closer = more confident
  // At threshold distance, contribution is ~0.3
  // At 0 distance, contribution is 1.0
  const distanceConfidence = Math.max(0, 1 - distance / DISTANCE_THRESHOLD);

  // Face detection confidence: normalize from 0-1 scale
  const faceConfidence = Math.min(1, Math.max(0, face.confidence));

  // Text OCR confidence: normalize from 0-100 scale to 0-1
  const textConfidence = Math.min(1, Math.max(0, text.confidence / 100));

  // Combine: weight distance heavily, then factor in detection confidences
  // Formula: 0.6 * distance + 0.2 * face + 0.2 * text
  const combined = 0.6 * distanceConfidence + 0.2 * faceConfidence + 0.2 * textConfidence;

  return Math.min(1, Math.max(0, combined));
}

/**
 * Main function: assemble draft cards by pairing faces with text blocks
 *
 * Algorithm:
 * 1. Build a mapping of all face-text pairs with distances
 * 2. Greedily assign each text to its closest face (tie-breaking: closest face wins)
 * 3. Include faces with no nearby text as "orphans"
 * 4. Calculate confidence score for each pairing
 * 5. Return draft cards ready for user review
 *
 * Key insight: We process from text perspective to ensure each text goes to its
 * closest face, preventing cases where face A grabs a text that's actually closer
 * to face B.
 *
 * @param textBlocks - Text blocks from OCR task
 * @param faces - Detected faces from face detection task
 * @returns Draft cards ready for user review and correction
 */
export function assembleDraftCards(textBlocks: TextBlock[], faces: Face[]): DraftCard[] {
  // Phase 1: Build a mapping of text -> closest face
  interface TextFaceMatch {
    textIndex: number;
    faceIndex: number;
    distance: number;
    confidence: number;
  }

  const matches: TextFaceMatch[] = [];

  for (let textIdx = 0; textIdx < textBlocks.length; textIdx++) {
    const text = textBlocks[textIdx];
    const textCenter = getBoundingBoxCenter(text.boundingBox);

    let bestFaceIdx = -1;
    let bestDistance = DISTANCE_THRESHOLD;

    // Find the closest face for this text
    for (let faceIdx = 0; faceIdx < faces.length; faceIdx++) {
      const face = faces[faceIdx];
      const faceCenter = getBoundingBoxCenter(face.boundingBox);
      const distance = calculateDistance(faceCenter, textCenter);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestFaceIdx = faceIdx;
      }
    }

    // If we found a face within threshold, record the match
    if (bestFaceIdx >= 0) {
      const confidence = calculatePairingConfidence(faces[bestFaceIdx], text, bestDistance);
      matches.push({
        textIndex: textIdx,
        faceIndex: bestFaceIdx,
        distance: bestDistance,
        confidence,
      });
    }
  }

  // Phase 2: Assign matches to faces, ensuring each text goes to exactly one face
  const textToFace = new Map<number, TextFaceMatch>();

  // Sort matches by distance (closest first) to handle assignments greedily
  matches.sort((a, b) => a.distance - b.distance);

  const usedFaceIndices = new Set<number>();

  for (const match of matches) {
    // Each text can only be assigned once (to its closest face)
    if (!textToFace.has(match.textIndex) && !usedFaceIndices.has(match.faceIndex)) {
      textToFace.set(match.textIndex, match);
      usedFaceIndices.add(match.faceIndex);
    }
  }

  // Phase 3: Build result cards
  const draftCards: DraftCard[] = [];

  for (let faceIdx = 0; faceIdx < faces.length; faceIdx++) {
    const face = faces[faceIdx];

    // Find if this face has a matched text
    let matchedName: string | null = null;
    let matchedTextIndex: number | null = null;
    let confidence = 0;

    for (const [textIdx, match] of textToFace) {
      if (match.faceIndex === faceIdx) {
        matchedName = textBlocks[textIdx].text;
        matchedTextIndex = textIdx;
        confidence = match.confidence;
        break;
      }
    }

    draftCards.push({
      faceId: face.id,
      face,
      matchedName,
      matchedTextIndex,
      confidence,
      pairingReason: matchedName ? 'proximity' : 'orphan',
    });
  }

  return draftCards;
}
