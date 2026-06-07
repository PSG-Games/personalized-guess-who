import { useState, useRef, useEffect } from 'react';
import type { DraftCard } from '../../types/card';

export interface FaceCropEditorProps {
  card: DraftCard;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * FaceCropEditor - Modal for adjusting face crop boundaries
 *
 * Displays:
 * - Original face bounding box from detection
 * - Adjustable crop boundaries (drag handles or number inputs)
 * - Real-time preview of the new crop
 * - Save/Cancel buttons
 *
 * Currently a simplified implementation that shows the crop editor UI.
 * In a real app, you'd:
 * 1. Canvas-render the original image with the crop box overlaid
 * 2. Allow dragging the corners/edges to adjust
 * 3. Update the DraftCard.face.boundingBox on save
 */
export default function FaceCropEditor({
  card,
  onSave,
  onCancel,
}: FaceCropEditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Local state for crop editing
  const [cropBox, setCropBox] = useState({
    x: card.face.boundingBox.x,
    y: card.face.boundingBox.y,
    width: card.face.boundingBox.width,
    height: card.face.boundingBox.height,
  });

  // Open the dialog on mount
  useEffect(() => {
    if (dialogRef.current && typeof dialogRef.current.showModal === 'function') {
      dialogRef.current.showModal();
    }
  }, []);

  // Handle closing the dialog
  const handleCancel = () => {
    if (dialogRef.current && typeof dialogRef.current.close === 'function') {
      dialogRef.current.close();
    }
    onCancel();
  };

  const handleSave = () => {
    if (dialogRef.current && typeof dialogRef.current.close === 'function') {
      dialogRef.current.close();
    }
    // TODO: In a real implementation, update card.face.boundingBox with cropBox
    // For now, just close the editor
    onSave();
  };

  // Handle number input changes
  const handleCropChange = (field: keyof typeof cropBox, value: number) => {
    setCropBox((prev) => ({
      ...prev,
      [field]: Math.max(0, value),
    }));
  };

  return (
    <dialog ref={dialogRef} className="face-crop-editor-dialog" aria-label="Face crop editor">
      <div className="face-crop-editor">
        <div className="face-crop-editor-header">
          <h3>Adjust Face Crop</h3>
          <button
            className="face-crop-editor-close"
            onClick={handleCancel}
            aria-label="Close crop editor"
          >
            ✕
          </button>
        </div>

        <div className="face-crop-editor-content">
          <div className="face-crop-editor-preview-section">
            <h4>Face Preview</h4>
            <div className="face-crop-editor-preview">
              <div
                className="face-crop-editor-preview-box"
                style={{
                  width: `${cropBox.width}px`,
                  height: `${cropBox.height}px`,
                  aspectRatio: `${cropBox.width} / ${cropBox.height}`,
                }}
              >
                <div className="face-crop-editor-preview-bg" />
              </div>
              <p className="face-crop-editor-preview-note">
                Face crop preview (dimensions: {cropBox.width} × {cropBox.height}px)
              </p>
            </div>
          </div>

          <div className="face-crop-editor-controls-section">
            <h4>Crop Boundaries</h4>
            <div className="face-crop-editor-controls">
              <div className="face-crop-editor-control">
                <label htmlFor="crop-x">X Position (px)</label>
                <input
                  id="crop-x"
                  type="number"
                  value={cropBox.x}
                  onChange={(e) => handleCropChange('x', parseInt(e.currentTarget.value, 10))}
                  className="face-crop-editor-input"
                />
              </div>

              <div className="face-crop-editor-control">
                <label htmlFor="crop-y">Y Position (px)</label>
                <input
                  id="crop-y"
                  type="number"
                  value={cropBox.y}
                  onChange={(e) => handleCropChange('y', parseInt(e.currentTarget.value, 10))}
                  className="face-crop-editor-input"
                />
              </div>

              <div className="face-crop-editor-control">
                <label htmlFor="crop-width">Width (px)</label>
                <input
                  id="crop-width"
                  type="number"
                  value={cropBox.width}
                  onChange={(e) => handleCropChange('width', parseInt(e.currentTarget.value, 10))}
                  className="face-crop-editor-input"
                />
              </div>

              <div className="face-crop-editor-control">
                <label htmlFor="crop-height">Height (px)</label>
                <input
                  id="crop-height"
                  type="number"
                  value={cropBox.height}
                  onChange={(e) => handleCropChange('height', parseInt(e.currentTarget.value, 10))}
                  className="face-crop-editor-input"
                />
              </div>
            </div>

            <div className="face-crop-editor-reset">
              <button
                className="face-crop-editor-reset-button"
                onClick={() => setCropBox({
                  x: card.face.boundingBox.x,
                  y: card.face.boundingBox.y,
                  width: card.face.boundingBox.width,
                  height: card.face.boundingBox.height,
                })}
              >
                Reset to Original
              </button>
            </div>
          </div>
        </div>

        <div className="face-crop-editor-actions">
          <button
            className="face-crop-editor-button face-crop-editor-cancel"
            onClick={handleCancel}
            aria-label="Cancel crop editing"
          >
            Cancel
          </button>
          <button
            className="face-crop-editor-button face-crop-editor-save"
            onClick={handleSave}
            aria-label="Apply crop changes"
          >
            Apply Crop
          </button>
        </div>
      </div>
    </dialog>
  );
}
