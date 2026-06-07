import type { Character } from '../types/card';

/**
 * Repository pattern for card storage.
 *
 * This interface defines the contract for persisting and retrieving cards.
 * The actual storage backend (IndexedDB, localStorage, etc.) is encapsulated
 * behind this interface, allowing easy swapping of storage mechanisms.
 *
 * This design follows the Repository Pattern from the ECC rules:
 * - Consistent interface over storage mechanics
 * - Backend agnostic (can swap IndexedDB for localStorage, API, etc.)
 * - Enables testing with mock implementations
 */
export interface CardStorageRepository {
  /**
   * Add a new card to storage.
   *
   * @param card - The card to add (without an ID, which will be generated)
   * @returns A promise that resolves to the card with a generated ID
   */
  add(card: Omit<Character, 'id'>): Promise<Character>;

  /**
   * Retrieve all cards from storage.
   *
   * @returns A promise that resolves to an array of all stored cards
   */
  list(): Promise<Character[]>;

  /**
   * Delete a card by ID.
   *
   * @param id - The ID of the card to delete
   * @returns A promise that resolves when the deletion is complete
   */
  delete(id: string): Promise<void>;

  /**
   * Clear all cards from storage.
   *
   * @returns A promise that resolves when all cards are deleted
   */
  clear(): Promise<void>;
}

/**
 * Constants for IndexedDB schema
 */
const DB_NAME = 'PersonalizedGuessWho';
const OBJECT_STORE_NAME = 'cards';
const DB_VERSION = 1;

/**
 * In-memory implementation of CardStorageRepository for testing.
 * Used when IndexedDB is not available.
 */
class InMemoryCardStorage implements CardStorageRepository {
  private cards: Map<string, Character> = new Map();

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async add(card: Omit<Character, 'id'>): Promise<Character> {
    const cardWithId: Character = {
      ...card,
      id: this.generateId(),
      traits: card.traits || [],
    };

    this.cards.set(cardWithId.id, cardWithId);
    return cardWithId;
  }

  async list(): Promise<Character[]> {
    return Array.from(this.cards.values()).map((card) => ({
      ...card,
      traits: card.traits || [],
    }));
  }

  async delete(id: string): Promise<void> {
    this.cards.delete(id);
  }

  async clear(): Promise<void> {
    this.cards.clear();
  }
}

/**
 * IndexedDB implementation of CardStorageRepository
 *
 * Stores Character cards in the browser's IndexedDB with:
 * - Database: PersonalizedGuessWho
 * - Object store: cards
 * - Key path: id (unique identifier)
 *
 * Cards persist across page reloads and are stored locally in the browser.
 */
class IndexedDBCardStorage implements CardStorageRepository {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the IndexedDB connection and schema.
   * Lazily initializes on first use.
   */
  private async ensureInitialized(): Promise<void> {
    // Return early if already initialized
    if (this.db !== null) {
      return;
    }

    // Return the existing initialization promise if in progress
    if (this.initPromise !== null) {
      return this.initPromise;
    }

    // Create and store the initialization promise
    this.initPromise = this.initializeDatabase();
    await this.initPromise;
  }

  /**
   * Open the IndexedDB database and create the schema if needed.
   */
  private initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if IndexedDB is available
      const idb = typeof indexedDB !== 'undefined' ? indexedDB : (global as any).indexedDB;

      if (!idb) {
        reject(new Error('IndexedDB is not available in this environment'));
        return;
      }

      const request = idb.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create the object store if it doesn't exist
        if (!db.objectStoreNames.contains(OBJECT_STORE_NAME)) {
          db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Generate a unique ID for a new card.
   * Uses timestamp-based ID generation (simple and collision-resistant).
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async add(card: Omit<Character, 'id'>): Promise<Character> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Create the card with a generated ID
    const cardWithId: Character = {
      ...card,
      id: this.generateId(),
      traits: card.traits || [],
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(OBJECT_STORE_NAME);
      const request = store.add(cardWithId);

      request.onerror = () => {
        reject(new Error(`Failed to add card: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve(cardWithId);
      };
    });
  }

  async list(): Promise<Character[]> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORE_NAME], 'readonly');
      const store = transaction.objectStore(OBJECT_STORE_NAME);
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error(`Failed to list cards: ${request.error}`));
      };

      request.onsuccess = () => {
        const cards = request.result as Character[];
        // Ensure traits array exists on all cards
        resolve(
          cards.map((card) => ({
            ...card,
            traits: card.traits || [],
          }))
        );
      };
    });
  }

  async delete(id: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(OBJECT_STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => {
        reject(new Error(`Failed to delete card: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async clear(): Promise<void> {
    await this.ensureInitialized();

    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([OBJECT_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(OBJECT_STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear cards: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }
}

/**
 * Create an appropriate card storage instance based on environment.
 * Uses IndexedDB in browsers, falls back to in-memory storage for testing.
 */
function createCardStorage(): CardStorageRepository {
  // Check if IndexedDB is available
  const idb = typeof indexedDB !== 'undefined' ? indexedDB : (global as any).indexedDB;

  if (!idb) {
    // Use in-memory storage in test environments where IndexedDB is not available
    return new InMemoryCardStorage();
  }

  return new IndexedDBCardStorage();
}

/**
 * Singleton instance of the card storage repository.
 * Use this to persist and retrieve cards in the application.
 *
 * Example usage:
 *   const card = await cardStorage.add(myCard);
 *   const allCards = await cardStorage.list();
 *   await cardStorage.delete(card.id);
 */
export const cardStorage: CardStorageRepository = createCardStorage();
