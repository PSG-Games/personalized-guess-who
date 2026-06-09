import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cardStorage } from './cardStorage';
import type { Character, Trait } from '../types/card';

function makeTrait(question: string, answer = true): Trait {
  return { id: `t-${question}`, question, answer };
}

function makeCard(overrides: Partial<Omit<Character, 'id'>> = {}): Omit<Character, 'id'> {
  return {
    faceId: 'face-1',
    face: {
      id: 'face-1',
      confidence: 0.95,
      boundingBox: { x: 10, y: 10, width: 50, height: 60 },
    },
    name: 'Alice',
    traits: [],
    imageUrl: 'data:image/png;base64,abc123',
    ...overrides,
  };
}

describe('cardStorage', () => {
  afterEach(async () => {
    try {
      await cardStorage.clear();
    } catch {
      // Ignore cleanup errors
    }
  });

  // ── add ──────────────────────────────────────────────────

  describe('add', () => {
    it('adds a card and returns it with a generated ID', async () => {
      const traits: Trait[] = [makeTrait('Is this person funny?'), makeTrait('Are they smart?')];
      const card = makeCard({ name: 'Alice', traits });

      const result = await cardStorage.add(card);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Alice');
      expect(result.traits).toEqual(traits);
      expect(result.faceId).toBe('face-1');
      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
    });

    it('generates unique IDs for different cards', async () => {
      const card1 = makeCard({ faceId: 'face-1', face: { id: 'face-1', confidence: 0.95, boundingBox: { x: 10, y: 10, width: 50, height: 60 } }, name: 'Alice' });
      const card2 = makeCard({ faceId: 'face-2', face: { id: 'face-2', confidence: 0.95, boundingBox: { x: 100, y: 10, width: 50, height: 60 } }, name: 'Bob', imageUrl: 'data:image/png;base64,def456' });

      const result1 = await cardStorage.add(card1);
      const result2 = await cardStorage.add(card2);

      expect(result1.id).not.toBe(result2.id);
    });

    it('preserves traits array', async () => {
      const traits: Trait[] = [
        makeTrait('Wears glasses?'),
        makeTrait('Is left-handed?'),
        makeTrait('Plays guitar?', false),
      ];
      const card = makeCard({ traits });

      const result = await cardStorage.add(card);

      expect(result.traits).toEqual(traits);
    });

    it('handles cards with no traits (defaults to empty array)', async () => {
      const { traits: _unused, ...cardWithoutTraits } = makeCard();
      const result = await cardStorage.add(cardWithoutTraits as Omit<Character, 'id'>);

      expect(result.traits).toEqual([]);
    });
  });

  // ── list ─────────────────────────────────────────────────

  describe('list', () => {
    it('returns empty array when no cards are stored', async () => {
      const result = await cardStorage.list();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('returns all added cards', async () => {
      await cardStorage.add(makeCard({ faceId: 'face-1', face: { id: 'face-1', confidence: 0.95, boundingBox: { x: 10, y: 10, width: 50, height: 60 } }, name: 'Alice' }));
      await cardStorage.add(makeCard({ faceId: 'face-2', face: { id: 'face-2', confidence: 0.95, boundingBox: { x: 100, y: 10, width: 50, height: 60 } }, name: 'Bob', imageUrl: 'data:image/png;base64,def456' }));

      const result = await cardStorage.list();

      expect(result.length).toBe(2);
      expect(result.some((c) => c.name === 'Alice')).toBe(true);
      expect(result.some((c) => c.name === 'Bob')).toBe(true);
    });

    it('returns cards with all properties intact', async () => {
      const traits: Trait[] = [makeTrait('Wears glasses?'), makeTrait('Is tall?')];
      const card = makeCard({ name: 'Alice', traits });

      const added = await cardStorage.add(card);
      const list = await cardStorage.list();

      const retrieved = list[0];
      expect(retrieved.id).toBe(added.id);
      expect(retrieved.name).toBe('Alice');
      expect(retrieved.faceId).toBe('face-1');
      expect(retrieved.traits).toEqual(traits);
      expect(retrieved.imageUrl).toBe('data:image/png;base64,abc123');
    });
  });

  // ── delete ───────────────────────────────────────────────

  describe('delete', () => {
    it('removes a card by ID', async () => {
      const added = await cardStorage.add(makeCard());
      expect((await cardStorage.list()).length).toBe(1);

      await cardStorage.delete(added.id);

      expect((await cardStorage.list()).length).toBe(0);
    });

    it('only removes the specified card', async () => {
      const added1 = await cardStorage.add(makeCard({ faceId: 'face-1', face: { id: 'face-1', confidence: 0.95, boundingBox: { x: 10, y: 10, width: 50, height: 60 } }, name: 'Alice' }));
      await cardStorage.add(makeCard({ faceId: 'face-2', face: { id: 'face-2', confidence: 0.95, boundingBox: { x: 100, y: 10, width: 50, height: 60 } }, name: 'Bob', imageUrl: 'data:image/png;base64,def456' }));

      await cardStorage.delete(added1.id);

      const list = await cardStorage.list();
      expect(list.length).toBe(1);
      expect(list[0].name).toBe('Bob');
    });

    it('does not throw when deleting a non-existent ID', async () => {
      await expect(cardStorage.delete('non-existent-id')).resolves.not.toThrow();
    });
  });

  // ── clear ────────────────────────────────────────────────

  describe('clear', () => {
    it('removes all cards', async () => {
      await cardStorage.add(makeCard({ faceId: 'face-1', face: { id: 'face-1', confidence: 0.95, boundingBox: { x: 10, y: 10, width: 50, height: 60 } }, name: 'Alice' }));
      await cardStorage.add(makeCard({ faceId: 'face-2', face: { id: 'face-2', confidence: 0.95, boundingBox: { x: 100, y: 10, width: 50, height: 60 } }, name: 'Bob', imageUrl: 'data:image/png;base64,def456' }));

      expect((await cardStorage.list()).length).toBe(2);

      await cardStorage.clear();

      expect((await cardStorage.list()).length).toBe(0);
    });
  });

  // ── persistence ──────────────────────────────────────────

  describe('persistence', () => {
    it('persists cards across multiple list calls', async () => {
      const persistTrait = makeTrait('Is this a persistent trait?');
      const card = makeCard({ traits: [persistTrait] });

      const added = await cardStorage.add(card);

      const list1 = await cardStorage.list();
      expect(list1.length).toBe(1);
      expect(list1[0].id).toBe(added.id);

      const list2 = await cardStorage.list();
      expect(list2.length).toBe(1);
      expect(list2[0].id).toBe(added.id);
      expect(list2[0].traits).toEqual([persistTrait]);
    });
  });

  // ── error handling ───────────────────────────────────────

  describe('error handling', () => {
    it('handles cards with a large imageUrl', async () => {
      const card = makeCard({ imageUrl: 'data:image/png;base64,' + 'A'.repeat(1000) });
      const result = await cardStorage.add(card);
      expect(result.id).toBeDefined();
    });

    it('handles concurrent add operations', async () => {
      const card1 = makeCard({ faceId: 'face-1', face: { id: 'face-1', confidence: 0.95, boundingBox: { x: 10, y: 10, width: 50, height: 60 } }, name: 'Alice' });
      const card2 = makeCard({ faceId: 'face-2', face: { id: 'face-2', confidence: 0.95, boundingBox: { x: 100, y: 10, width: 50, height: 60 } }, name: 'Bob', imageUrl: 'data:image/png;base64,def456' });

      const [result1, result2] = await Promise.all([
        cardStorage.add(card1),
        cardStorage.add(card2),
      ]);

      expect(result1.id).not.toBe(result2.id);
      expect((await cardStorage.list()).length).toBe(2);
    });
  });
});
