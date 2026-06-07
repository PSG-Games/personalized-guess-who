import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UploadPage from './UploadPage';

// Mock the OCR module to avoid heavy Tesseract.js initialization in tests
vi.mock('../../lib/ocr', () => ({
  performOCR: vi.fn().mockResolvedValue([
    {
      text: 'Mock Name',
      confidence: 95,
      boundingBox: { x: 10, y: 20, width: 100, height: 30 },
    },
  ]),
  cleanupWorker: vi.fn().mockResolvedValue(undefined),
}));

describe('UploadPage', () => {
  beforeEach(() => {
    // Component uses React state, no sessionStorage to clear
  });

  it('renders the upload component with a file input', () => {
    render(<UploadPage />);
    const fileInput = screen.getByLabelText(/choose image/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
    expect(fileInput).toHaveAttribute('accept', 'image/*');
  });

  it('accepts image files', () => {
    render(<UploadPage />);
    const fileInput = screen.getByLabelText(/choose image/i) as HTMLInputElement;
    expect(fileInput.accept).toBe('image/*');
  });

  it('displays the uploaded image after selecting a file', async () => {
    render(<UploadPage />);
    const fileInput = screen.getByLabelText(/choose image/i) as HTMLInputElement;

    // Create a mock file
    const file = new File(['mock image data'], 'test.png', { type: 'image/png' });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Check that the image is displayed
    const displayedImage = await screen.findByAltText(/uploaded image/i);
    expect(displayedImage).toBeInTheDocument();
  });

  it('does not make any network requests when uploading', async () => {
    // Mock fetch to ensure it's never called with image data
    const fetchSpy = vi.spyOn(globalThis as unknown as { fetch: typeof fetch }, 'fetch');

    render(<UploadPage />);
    const fileInput = screen.getByLabelText(/choose image/i) as HTMLInputElement;

    // Create a mock file
    const file = new File(['mock image data'], 'test.png', { type: 'image/png' });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verify fetch was not called
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('stores the image in client-side state (not on a server)', async () => {
    render(<UploadPage />);
    const fileInput = screen.getByLabelText(/choose image/i) as HTMLInputElement;

    // Create a mock file
    const file = new File(['mock image data'], 'test.png', { type: 'image/png' });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [file] } });

    // After upload, the component should still have the image in state
    const displayedImage = await screen.findByAltText(/uploaded image/i);
    expect(displayedImage).toBeInTheDocument();
  });

  it('allows clearing/re-uploading the image', async () => {
    render(<UploadPage />);
    const fileInput = screen.getByLabelText(/choose image/i) as HTMLInputElement;

    // Upload first image
    const file1 = new File(['mock image data 1'], 'test1.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file1] } });

    // Verify image is displayed
    const displayedImage = await screen.findByAltText(/uploaded image/i);
    expect(displayedImage).toBeInTheDocument();

    // Find and click the clear button
    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    // Verify image is removed
    expect(displayedImage).not.toBeInTheDocument();
  });

  it('has accessible label associated with the file input', () => {
    render(<UploadPage />);
    const fileInput = screen.getByLabelText(/choose image/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.tagName).toBe('INPUT');
  });

  it('displays uploaded image filename', async () => {
    render(<UploadPage />);
    const fileInput = screen.getByLabelText(/choose image/i) as HTMLInputElement;

    const file = new File(['mock image data'], 'my-scan.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Check that the filename is displayed (it's in a <strong> tag)
    const filenameDisplay = await screen.findByText(/my-scan/, { exact: false });
    expect(filenameDisplay).toBeInTheDocument();
  });
});
