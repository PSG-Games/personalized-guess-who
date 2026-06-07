import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const window = dom.window;

console.log('FileReader available:', typeof window.FileReader);
console.log('FileReader:', window.FileReader);

// Test FileReader
const reader = new window.FileReader();
console.log('FileReader instance created');

const blob = new window.Blob(['test'], { type: 'image/png' });
console.log('Blob created:', blob);

reader.readAsDataURL(blob);
console.log('readAsDataURL called');

// Check if it triggers
setTimeout(() => {
  console.log('Result:', reader.result ? 'Got result' : 'No result yet');
  process.exit(0);
}, 100);
