import { useState } from 'react';
import { createStoredImage, isValidImageFile, type StoredImage } from '../../lib/imageStorage';
import './upload.css';

export default function UploadPage() {
  const [uploadedImage, setUploadedImage] = useState<StoredImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Validate the file is an image
    if (!isValidImageFile(file)) {
      setError('Please select a valid image file (PNG, JPG, GIF, or WebP)');
      return;
    }

    try {
      setError(null);
      const storedImage = await createStoredImage(file);
      setUploadedImage(storedImage);
    } catch (err) {
      setError('Failed to read the image file. Please try again.');
      console.error('Image read error:', err);
    }
  };

  const handleClear = () => {
    setUploadedImage(null);
    setError(null);
  };

  return (
    <div className="upload-page">
      <section className="upload-section" aria-label="Image upload">
        <h2>Upload Scanned Page</h2>
        <p className="upload-subtitle">
          Select a scanned image of a Guess Who game board to get started.
        </p>

        <div className="upload-input-container">
          <label htmlFor="image-input" className="upload-label">
            Choose image file
          </label>
          <input
            id="image-input"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="upload-input"
            aria-describedby="image-help"
          />
          <p id="image-help" className="upload-help-text">
            Accepted formats: PNG, JPG, GIF, WebP
          </p>
        </div>

        {error && (
          <div className="upload-error" role="alert">
            {error}
          </div>
        )}

        {uploadedImage && (
          <div className="uploaded-image-container">
            <div className="uploaded-image-info">
              <p className="uploaded-filename">
                <strong>File:</strong> {uploadedImage.filename}
              </p>
              <p className="uploaded-size">
                <strong>ID:</strong> {uploadedImage.id}
              </p>
            </div>

            <figure className="uploaded-image-figure">
              <img
                src={uploadedImage.dataUrl}
                alt="Uploaded image preview"
                className="uploaded-image"
              />
              <figcaption>Image preview - stored locally in your browser</figcaption>
            </figure>

            <button onClick={handleClear} className="clear-button">
              Clear and Upload New
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
