import '@testing-library/jest-dom';

// Enable IndexedDB support in jsdom test environment
// jsdom should provide it by default, but ensure it's in the global scope
if (typeof globalThis !== 'undefined' && typeof globalThis.indexedDB === 'undefined' && typeof window !== 'undefined' && window.indexedDB) {
  (globalThis as any).indexedDB = window.indexedDB;
}

