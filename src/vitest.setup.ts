import '@testing-library/jest-dom';

// Enable IndexedDB support in jsdom test environment
// jsdom should provide it by default, but ensure it's in the global scope
if (typeof global.indexedDB === 'undefined' && typeof window !== 'undefined' && window.indexedDB) {
  (global as any).indexedDB = window.indexedDB;
}

