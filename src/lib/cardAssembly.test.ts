import { describe, it, expect } from 'vitest';
import {
  assembleDraftCards,
  calculateDistance,
  findBestMatchForFace,
  findUnpairedTexts,
} from './cardAssembly';
import type { Face, TextBlock, DraftCard } from '../types/card';

describe('cardAssembly', () => {
  describe('calculateDistance', () => {
    it('calculates euclidean distance between two points', () => {
      // Two points: (0,0) and (3,4)
      // Distance should be 5 (3-4-5 triangle)
      const point1 = { x: 0, y: 0 };
      const point2 = { x: 3, y: 4 };
      const distance = calculateDistance(point1, point2);
      expect(distance).toBe(5);
    });

    it('calculates distance correctly for negative coordinates', () => {
      const point1 = { x: -1, y: -1 };
      const point2 = { x: 2, y: 3 };
      const distance = calculateDistance(point1, point2);
      expect(distance).toBeCloseTo(Math.sqrt(9 + 16)); // sqrt(25) = 5
    });

    it('returns 0 for identical points', () => {
      const point1 = { x: 10, y: 20 };
      const distance = calculateDistance(point1, point1);
      expect(distance).toBe(0);
    });
  });

  describe('Simple case: one face, one name below', () => {
    it('pairs a face with a text block directly below it', () => {
      const faces: Face[] = [
        {
          id: 'face-0',
          confidence: 0.95,
          boundingBox: { x: 100, y: 100, width: 60, height: 80 },
        },
      ];

      const texts: TextBlock[] = [
        {
          text: 'Alice',
          confidence: 95,
          boundingBox: { x: 105, y: 190, width: 50, height: 20 },
        },
      ];

      const result = assembleDraftCards(texts, faces);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        faceId: 'face-0',
        matchedName: 'Alice',
        matchedTextIndex: 0,
        pairingReason: 'proximity',
      });
      expect(result[0].confidence).toBeGreaterThan(0.7);
    });

    it('does not pair a text block that is too far away', () => {
      const faces: Face[] = [
        {
          id: 'face-0',
          confidence: 0.95,
          boundingBox: { x: 100, y: 100, width: 60, height: 80 },
        },
      ];

      const texts: TextBlock[] = [
        {
          text: 'Bob',
          confidence: 90,
          boundingBox: { x: 500, y: 500, width: 50, height: 20 },
        },
      ];

      const result = assembleDraftCards(texts, faces);

      expect(result).toHaveLength(1);
      expect(result[0].matchedName).toBeNull();
      expect(result[0].matchedTextIndex).toBeNull();
      expect(result[0].pairingReason).toBe('orphan');
    });
  });

  describe('Multiple faces: grid layout (yearbook style)', () => {
    it('correctly pairs 3x3 grid of faces with names below each (9 faces)', () => {
      // Simulate 3x3 grid layout: faces arranged in rows with names below
      const faces: Face[] = [
        // Row 1
        { id: 'face-0', confidence: 0.9, boundingBox: { x: 50, y: 50, width: 60, height: 80 } },
        { id: 'face-1', confidence: 0.92, boundingBox: { x: 150, y: 50, width: 60, height: 80 } },
        { id: 'face-2', confidence: 0.88, boundingBox: { x: 250, y: 50, width: 60, height: 80 } },
        // Row 2
        { id: 'face-3', confidence: 0.91, boundingBox: { x: 50, y: 180, width: 60, height: 80 } },
        { id: 'face-4', confidence: 0.89, boundingBox: { x: 150, y: 180, width: 60, height: 80 } },
        { id: 'face-5', confidence: 0.93, boundingBox: { x: 250, y: 180, width: 60, height: 80 } },
        // Row 3
        { id: 'face-6', confidence: 0.87, boundingBox: { x: 50, y: 310, width: 60, height: 80 } },
        { id: 'face-7', confidence: 0.9, boundingBox: { x: 150, y: 310, width: 60, height: 80 } },
        { id: 'face-8', confidence: 0.91, boundingBox: { x: 250, y: 310, width: 60, height: 80 } },
      ];

      const texts: TextBlock[] = [
        // Names for row 1
        { text: 'Alice', confidence: 95, boundingBox: { x: 55, y: 145, width: 50, height: 18 } },
        { text: 'Bob', confidence: 93, boundingBox: { x: 155, y: 145, width: 50, height: 18 } },
        { text: 'Charlie', confidence: 92, boundingBox: { x: 250, y: 145, width: 50, height: 18 } },
        // Names for row 2
        { text: 'Diana', confidence: 94, boundingBox: { x: 55, y: 275, width: 50, height: 18 } },
        { text: 'Eve', confidence: 96, boundingBox: { x: 155, y: 275, width: 50, height: 18 } },
        { text: 'Frank', confidence: 91, boundingBox: { x: 255, y: 275, width: 50, height: 18 } },
        // Names for row 3
        { text: 'Grace', confidence: 95, boundingBox: { x: 55, y: 405, width: 50, height: 18 } },
        { text: 'Henry', confidence: 94, boundingBox: { x: 155, y: 405, width: 50, height: 18 } },
        { text: 'Iris', confidence: 93, boundingBox: { x: 255, y: 405, width: 50, height: 18 } },
      ];

      const result = assembleDraftCards(texts, faces);

      expect(result).toHaveLength(9);

      // Verify each face got paired with its corresponding name
      const pairedNames = result.map((card) => card.matchedName);
      expect(pairedNames).toEqual(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris']);

      // All should have proximity pairing reason
      result.forEach((card) => {
        expect(card.pairingReason).toBe('proximity');
        expect(card.confidence).toBeGreaterThan(0.5);
      });
    });

    it('handles a 2x2 grid correctly', () => {
      const faces: Face[] = [
        { id: 'face-0', confidence: 0.9, boundingBox: { x: 50, y: 50, width: 60, height: 80 } },
        { id: 'face-1', confidence: 0.92, boundingBox: { x: 150, y: 50, width: 60, height: 80 } },
        { id: 'face-2', confidence: 0.88, boundingBox: { x: 50, y: 180, width: 60, height: 80 } },
        { id: 'face-3', confidence: 0.91, boundingBox: { x: 150, y: 180, width: 60, height: 80 } },
      ];

      const texts: TextBlock[] = [
        { text: 'Name1', confidence: 95, boundingBox: { x: 55, y: 145, width: 50, height: 18 } },
        { text: 'Name2', confidence: 93, boundingBox: { x: 155, y: 145, width: 50, height: 18 } },
        { text: 'Name3', confidence: 92, boundingBox: { x: 55, y: 275, width: 50, height: 18 } },
        { text: 'Name4', confidence: 94, boundingBox: { x: 155, y: 275, width: 50, height: 18 } },
      ];

      const result = assembleDraftCards(texts, faces);

      expect(result).toHaveLength(4);
      expect(result[0].matchedName).toBe('Name1');
      expect(result[1].matchedName).toBe('Name2');
      expect(result[2].matchedName).toBe('Name3');
      expect(result[3].matchedName).toBe('Name4');
    });
  });

  describe('Orphaned faces and names', () => {
    it('includes faces with no nearby text as orphans', () => {
      const faces: Face[] = [
        {
          id: 'face-0',
          confidence: 0.95,
          boundingBox: { x: 100, y: 100, width: 60, height: 80 },
        },
        {
          id: 'face-1',
          confidence: 0.9,
          boundingBox: { x: 500, y: 500, width: 60, height: 80 },
        },
      ];

      const texts: TextBlock[] = [
        {
          text: 'Alice',
          confidence: 95,
          boundingBox: { x: 105, y: 190, width: 50, height: 20 },
        },
      ];

      const result = assembleDraftCards(texts, faces);

      expect(result).toHaveLength(2);
      expect(result[0].matchedName).toBe('Alice');
      expect(result[0].pairingReason).toBe('proximity');
      expect(result[1].matchedName).toBeNull();
      expect(result[1].pairingReason).toBe('orphan');
    });

    it('excludes orphaned text blocks (no nearby face)', () => {
      const faces: Face[] = [
        {
          id: 'face-0',
          confidence: 0.95,
          boundingBox: { x: 100, y: 100, width: 60, height: 80 },
        },
      ];

      const texts: TextBlock[] = [
        {
          text: 'Alice',
          confidence: 95,
          boundingBox: { x: 105, y: 190, width: 50, height: 20 },
        },
        {
          text: 'Bob',
          confidence: 90,
          boundingBox: { x: 500, y: 500, width: 50, height: 20 },
        },
      ];

      const result = assembleDraftCards(texts, faces);

      expect(result).toHaveLength(1);
      expect(result[0].matchedName).toBe('Alice');
      // Bob should not appear anywhere in the results
      expect(result.some((card) => card.matchedName === 'Bob')).toBe(false);
    });

    it('handles empty inputs gracefully', () => {
      expect(assembleDraftCards([], [])).toEqual([]);
      expect(assembleDraftCards([], [{ id: 'f1', confidence: 0.9, boundingBox: { x: 0, y: 0, width: 10, height: 10 } }])).toHaveLength(1);
      expect(assembleDraftCards([{ text: 'orphan', confidence: 90, boundingBox: { x: 0, y: 0, width: 10, height: 10 } }], [])).toEqual([]);
    });
  });

  describe('List layout: names beside faces (roster style)', () => {
    it('pairs faces with names on the right side', () => {
      const faces: Face[] = [
        { id: 'face-0', confidence: 0.9, boundingBox: { x: 20, y: 20, width: 80, height: 100 } },
        { id: 'face-1', confidence: 0.92, boundingBox: { x: 20, y: 150, width: 80, height: 100 } },
        { id: 'face-2', confidence: 0.88, boundingBox: { x: 20, y: 280, width: 80, height: 100 } },
      ];

      const texts: TextBlock[] = [
        { text: 'Alice Smith', confidence: 94, boundingBox: { x: 120, y: 50, width: 80, height: 25 } },
        { text: 'Bob Jones', confidence: 96, boundingBox: { x: 120, y: 180, width: 80, height: 25 } },
        { text: 'Charlie Brown', confidence: 92, boundingBox: { x: 120, y: 310, width: 80, height: 25 } },
      ];

      const result = assembleDraftCards(texts, faces);

      expect(result).toHaveLength(3);
      expect(result[0].matchedName).toBe('Alice Smith');
      expect(result[1].matchedName).toBe('Bob Jones');
      expect(result[2].matchedName).toBe('Charlie Brown');
    });
  });

  describe('Confidence scoring', () => {
    it('assigns higher confidence to closer pairings', () => {
      const faces: Face[] = [
        {
          id: 'face-0',
          confidence: 0.95,
          boundingBox: { x: 100, y: 100, width: 60, height: 80 },
        },
      ];

      // Very close text
      const closeText: TextBlock = {
        text: 'Close',
        confidence: 95,
        boundingBox: { x: 105, y: 185, width: 50, height: 15 },
      };

      // Distant but within threshold
      const distantText: TextBlock = {
        text: 'Distant',
        confidence: 95,
        boundingBox: { x: 205, y: 285, width: 50, height: 15 },
      };

      const closeResult = assembleDraftCards([closeText], faces);
      const distantResult = assembleDraftCards([distantText], faces);

      expect(closeResult[0].confidence).toBeGreaterThan(distantResult[0].confidence);
    });

    it('calculates confidence based on both face and text detection confidence', () => {
      const highConfidenceFace: Face = {
        id: 'face-0',
        confidence: 0.99,
        boundingBox: { x: 100, y: 100, width: 60, height: 80 },
      };

      const lowConfidenceFace: Face = {
        id: 'face-1',
        confidence: 0.6,
        boundingBox: { x: 300, y: 100, width: 60, height: 80 },
      };

      const highConfidenceText: TextBlock = {
        text: 'High',
        confidence: 98,
        boundingBox: { x: 105, y: 185, width: 50, height: 15 },
      };

      const lowConfidenceText: TextBlock = {
        text: 'Low',
        confidence: 70,
        boundingBox: { x: 305, y: 185, width: 50, height: 15 },
      };

      const highResult = assembleDraftCards([highConfidenceText], [highConfidenceFace]);
      const lowResult = assembleDraftCards([lowConfidenceText], [lowConfidenceFace]);

      expect(highResult[0].confidence).toBeGreaterThan(lowResult[0].confidence);
    });
  });

  describe('Edge cases', () => {
    it('handles overlapping text blocks correctly', () => {
      // Two faces very close together with overlapping text nearby
      const faces: Face[] = [
        { id: 'face-0', confidence: 0.9, boundingBox: { x: 100, y: 100, width: 60, height: 80 } },
        { id: 'face-1', confidence: 0.9, boundingBox: { x: 140, y: 100, width: 60, height: 80 } },
      ];

      const texts: TextBlock[] = [
        { text: 'Alice', confidence: 95, boundingBox: { x: 90, y: 190, width: 50, height: 20 } },
        { text: 'Bob', confidence: 95, boundingBox: { x: 150, y: 190, width: 50, height: 20 } },
      ];

      const result = assembleDraftCards(texts, faces);

      expect(result).toHaveLength(2);
      // Should pair to closest text, not both to same text
      const names = new Set(result.map((c) => c.matchedName));
      expect(names.size).toBe(2);
    });

    it('pairs each text block to at most one face', () => {
      // One text, three nearby faces - should pick the closest
      const faces: Face[] = [
        { id: 'face-0', confidence: 0.9, boundingBox: { x: 50, y: 50, width: 60, height: 80 } },
        { id: 'face-1', confidence: 0.9, boundingBox: { x: 150, y: 50, width: 60, height: 80 } },
        { id: 'face-2', confidence: 0.9, boundingBox: { x: 250, y: 50, width: 60, height: 80 } },
      ];

      const texts: TextBlock[] = [
        { text: 'Middle', confidence: 95, boundingBox: { x: 155, y: 145, width: 50, height: 20 } },
      ];

      const result = assembleDraftCards(texts, faces);

      // Should have all 3 faces (orphaned ones)
      expect(result).toHaveLength(3);

      // Only face-1 (middle) should have the matched name
      expect(result[1].matchedName).toBe('Middle');
      expect(result[0].matchedName).toBeNull();
      expect(result[2].matchedName).toBeNull();
    });

    it('handles text at image edges', () => {
      const faces: Face[] = [
        { id: 'face-0', confidence: 0.9, boundingBox: { x: 10, y: 10, width: 60, height: 80 } },
        { id: 'face-1', confidence: 0.9, boundingBox: { x: 400, y: 10, width: 60, height: 80 } },
      ];

      const texts: TextBlock[] = [
        { text: 'EdgeLeft', confidence: 95, boundingBox: { x: 0, y: 100, width: 40, height: 20 } },
        { text: 'EdgeRight', confidence: 95, boundingBox: { x: 450, y: 100, width: 40, height: 20 } },
      ];

      const result = assembleDraftCards(texts, faces);

      expect(result).toHaveLength(2);
      expect(result[0].matchedName).toBe('EdgeLeft');
      expect(result[1].matchedName).toBe('EdgeRight');
    });

    it('handles single face with single name', () => {
      const faces: Face[] = [
        { id: 'face-0', confidence: 0.95, boundingBox: { x: 100, y: 100, width: 60, height: 80 } },
      ];

      const texts: TextBlock[] = [
        { text: 'Solo', confidence: 95, boundingBox: { x: 105, y: 190, width: 50, height: 20 } },
      ];

      const result = assembleDraftCards(texts, faces);

      expect(result).toHaveLength(1);
      expect(result[0].matchedName).toBe('Solo');
      expect(result[0].faceId).toBe('face-0');
    });
  });

  describe('Helper functions', () => {
    it('findBestMatchForFace returns closest text within threshold', () => {
      const face: Face = {
        id: 'face-0',
        confidence: 0.9,
        boundingBox: { x: 100, y: 100, width: 60, height: 80 },
      };

      const texts: TextBlock[] = [
        { text: 'Close', confidence: 95, boundingBox: { x: 105, y: 190, width: 50, height: 20 } },
        { text: 'VeryClose', confidence: 95, boundingBox: { x: 110, y: 185, width: 50, height: 20 } },
        { text: 'Far', confidence: 95, boundingBox: { x: 500, y: 500, width: 50, height: 20 } },
      ];

      const result = findBestMatchForFace(face, texts);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.textIndex).toBe(1); // VeryClose is closer
        expect(result.text.text).toBe('VeryClose');
      }
    });

    it('findBestMatchForFace returns null when no text is within threshold', () => {
      const face: Face = {
        id: 'face-0',
        confidence: 0.9,
        boundingBox: { x: 100, y: 100, width: 60, height: 80 },
      };

      const texts: TextBlock[] = [
        { text: 'VeryFar', confidence: 95, boundingBox: { x: 500, y: 500, width: 50, height: 20 } },
      ];

      const result = findBestMatchForFace(face, texts);
      expect(result).toBeNull();
    });

    it('findUnpairedTexts returns text blocks that were not paired to any face', () => {
      const faces: Face[] = [
        { id: 'face-0', confidence: 0.9, boundingBox: { x: 100, y: 100, width: 60, height: 80 } },
      ];

      const texts: TextBlock[] = [
        { text: 'Paired', confidence: 95, boundingBox: { x: 105, y: 190, width: 50, height: 20 } },
        { text: 'Unpaired', confidence: 95, boundingBox: { x: 500, y: 500, width: 50, height: 20 } },
      ];

      const pairingMap = new Map<number, string>(); // text index -> face id
      pairingMap.set(0, 'face-0');

      const unpaired = findUnpairedTexts(texts, pairingMap);

      expect(unpaired).toHaveLength(1);
      expect(unpaired[0]).toBe(1); // index of 'Unpaired'
    });
  });
});
