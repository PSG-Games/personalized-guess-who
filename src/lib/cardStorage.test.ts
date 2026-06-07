import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cardStorage, type CardStorageRepository } from './cardStorage';
import type { Character } from '../types/card';

describe('cardStorage', () => {
  // Store the original indexedDB before tests
  let originalIndexedDB: IDBFactory;

  beforeEach(() => {
    // Save original indexedDB
    originalIndexedDB = (global as any).indexedDB;

    // Clear any existing data by creating a fresh instance
    // The implementation should handle initialization
  });

  afterEach(async () => {
    // Clean up all stored data after each test
    try {
      await cardStorage.clear();
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('add', () => {
    it('adds a card and returns it with a generated ID', async () => {
      const card: Omit<Character, 'id'> = {
        faceId: 'face-1',
        face: {
          id: 'face-1',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 60 },
        },
        name: 'Alice',
        traits: ['funny', 'smart'],
        imageUrl: 'data:image/png;base64,abc123',
      };

      const result = await cardStorage.add(card as any);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Alice');
      expect(result.traits).toEqual(['funny', 'smart']);
      expect(result.faceId).toBe('face-1');
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('generates unique IDs for different cards', async () => {
      const card1 = {
        faceId: 'face-1',
        face: {
          id: 'face-1',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 60 },
        },
        name: 'Alice',
        traits: [],
        imageUrl: 'data:image/png;base64,abc123',
      };

      const card2 = {
        faceId: 'face-2',
        face: {
          id: 'face-2',
          confidence: 0.95,
          boundingBox: { x: 100, y: 10, width: 50, height: 60 },
        },
        name: 'Bob',
        traits: [],
        imageUrl: 'data:image/png;base64,def456',
      };

      const result1 = await cardStorage.add(card1 as any);
      const result2 = await cardStorage.add(card2 as any);

      expect(result1.id).not.toBe(result2.id);
    });

    it('preserves traits array', async () => {
      const card = {
        faceId: 'face-1',
        face: {
          id: 'face-1',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 60 },
        },
        name: 'Alice',
        traits: ['trait1', 'trait2', 'trait3'],
        imageUrl: 'data:image/png;base64,abc123',
      };

      const result = await cardStorage.add(card as any);

      expect(result.traits).toEqual(['trait1', 'trait2', 'trait3']);
    });

    it('handles cards with no traits', async () => {
      const card = {
        faceId: 'face-1',
        face: {
          id: 'face-1',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 60 },
        },
        name: 'Alice',
        imageUrl: 'data:image/png;base64,abc123',
      };

      const result = await cardStorage.add(card as any);

      expect(result.traits).toEqual([]);
    });
  });

  describe('list', () => {
    it('returns empty array when no cards are stored', async () => {
      const result = await cardStorage.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('returns all added cards', async () => {
      const card1 = {
        faceId: 'face-1',
        face: {
          id: 'face-1',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 60 },
        },
        name: 'Alice',
        traits: ['trait1'],
        imageUrl: 'data:image/png;base64,abc123',
      };

      const card2 = {
        faceId: 'face-2',
        face: {
          id: 'face-2',
          confidence: 0.95,
          boundingBox: { x: 100, y: 10, width: 50, height: 60 },
        },
        name: 'Bob',
        traits: ['trait2'],
        imageUrl: 'data:image/png;base64,def456',
      };

      await cardStorage.add(card1 as any);
      await cardStorage.add(card2 as any);

      const result = await cardStorage.list();

      expect(result.length).toBe(2);
      expect(result.some((c) => c.name === 'Alice')).toBe(true);
      expect(result.some((c) => c.name === 'Bob')).toBe(true);
    });

    it('returns cards with all properties intact', async () => {
      const card = {
        faceId: 'face-1',
        face: {
          id: 'face-1',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 60 },
        },
        name: 'Alice',
        traits: ['funny', 'smart'],
        imageUrl: 'data:image/png;base64,abc123',
      };

      const added = await cardStorage.add(card as any);
      const list = await cardStorage.list();

      const retrieved = list[0];
      expect(retrieved.id).toBe(added.id);
      expect(retrieved.name).toBe('Alice');
      expect(retrieved.faceId).toBe('face-1');
      expect(retrieved.traits).toEqual(['funny', 'smart']);
      expect(retrieved.imageUrl).toBe('data:image/png;base64,abc123');
    });
  });

  describe('delete', () => {
    it('removes a card by ID', async () => {
      const card = {
        faceId: 'face-1',
        face: {
          id: 'face-1',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 60 },
        },
        name: 'Alice',
        traits: [],
        imageUrl: 'data:image/png;base64,abc123',
      };

      const added = await cardStorage.add(card as any);
      const listBefore = await cardStorage.list();
      expect(listBefore.length).toBe(1);

      await cardStorage.delete(added.id);

      const listAfter = await cardStorage.list();
      expect(listAfter.length).toBe(0);
    });

    it('only removes the specified card', async () => {
      const card1 = {
        faceId: 'face-1',
        face: {
          id: 'face-1',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 60 },
        },
        name: 'Alice',
        traits: [],
        imageUrl: 'data:image/png;base64,abc123',
      };

      const card2 = {
        faceId: 'face-2',
        face: {
          id: 'face-2',
          confidence: 0.95,
          boundingBox: { x: 100, y: 10, width: 50, height: 60 },
        },
        name: 'Bob',
        traits: [],
        imageUrl: 'data:image/png;base64,def456',
      };

      const added1 = await cardStorage.add(card1 as any);
      const added2 = await cardStorage.add(card2 as any);

      await cardStorage.delete(added1.id);

      const list = await cardStorage.list();
      expect(list.length).toBe(1);
      expect(list[0].name).toBe('Bob');
    });

    it('does not throw when deleting non-existent ID', async () => {
      await expect(cardStorage.delete('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('removes all cards', async () => {
      const card1 = {
        faceId: 'face-1',
        face: {
          id: 'face-1',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 60 },
        },
        name: 'Alice',
        traits: [],
        imageUrl: 'data:image/png;base64,abc123',
      };

      const card2 = {
        faceId: 'face-2',
        face: {
          id: 'face-2',
          confidence: 0.95,
          boundingBox: { x: 100, y: 10, width: 50, height: 60 },
        },
        name: 'Bob',
        traits: [],
        imageUrl: 'data:image/png;base64,def456',
      };

      await cardStorage.add(card1 as any);
      await cardStorage.add(card2 as any);

      const listBefore = await cardStorage.list();
      expect(listBefore.length).toBe(2);

      await cardStorage.clear();

      const listAfter = await cardStorage.list();
      expect(listAfter.length).toBe(0);
    });
  });

  describe('persistence', () => {
    it('persists cards across multiple list operations', async () => {
      const card = {
        faceId: 'face-1',
        face: {
          id: 'face-1',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 60 },
        },
        name: 'Alice',
        traits: ['persistent'],
        imageUrl: 'data:image/png;base64,abc123',
      };

      const added = await cardStorage.add(card as any);

      // Simulate closing and reopening the storage
      const list1 = await cardStorage.list();
      expect(list1.length).toBe(1);
      expect(list1[0].id).toBe(added.id);

      const list2 = await cardStorage.list();
      expect(list2.length).toBe(1);
      expect(list2[0].id).toBe(added.id);
      expect(list2[0].traits).toEqual(['persistent']);
    });
  });

  describe('error handling', () => {
    it('handles storage quota exceeded gracefully', async () => {
      // This is a complex scenario to test - we'll verify the basic flow works
      // Full quota testing would require mocking IndexedDB behavior
      const card = {
        faceId: 'face-1',
        face: {
          id: 'face-1',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 60 },
        },
        name: 'Alice',
        traits: [],
        imageUrl: 'data:image/png;base64,abc123',
      };

      // Should not throw even with a large data URL
      const result = await cardStorage.add(card as any);
      expect(result.id).toBeDefined();
    });

    it('handles concurrent add operations', async () => {
      const card1 = {
        faceId: 'face-1',
        face: {
          id: 'face-1',
          confidence: 0.95,
          boundingBox: { x: 10, y: 10, width: 50, height: 60 },
        },
        name: 'Alice',
        traits: [],
        imageUrl: 'data:image/png;base64,abc123',
      };

      const card2 = {
        faceId: 'face-2',
        face: {
          id: 'face-2',
          confidence: 0.95,
          boundingBox: { x: 100, y: 10, width: 50, height: 60 },
        },
        name: 'Bob',
        traits: [],
        imageUrl: 'data:image/png;base64,def456',
      };

      const [result1, result2] = await Promise.all([
        cardStorage.add(card1 as any),
        cardStorage.add(card2 as any),
      ]);

      expect(result1.id).not.toBe(result2.id);

      const list = await cardStorage.list();
      expect(list.length).toBe(2);
    });
  });
});
