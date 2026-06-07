/**
 * Client-side image storage module.
 * All image data is stored in memory/component state.
 * NO network requests are made.
 */

export interface StoredImage {
  id: string;
  filename: string;
  dataUrl: string;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * Convert a File object to a data URL.
 * Uses FileReader API to read the file into memory.
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as string'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Create a stored image object from a File.
 * Entirely client-side operation.
 */
export const createStoredImage = async (file: File): Promise<StoredImage> => {
  const dataUrl = await fileToDataUrl(file);
  return {
    id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    filename: file.name,
    dataUrl,
    mimeType: file.type,
    uploadedAt: new Date(),
  };
};

/**
 * Validate that a file is an image.
 */
export const isValidImageFile = (file: File): boolean => {
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return validMimeTypes.includes(file.type);
};
