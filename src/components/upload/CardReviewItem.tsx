import type { DraftCard } from '../../types/card';

export interface CardReviewItemProps {
  card: DraftCard;
  editedName: string;
  onNameChange: (newName: string) => void;
  onDiscard: () => void;
  onRecropStart: () => void;
}

/**
 * CardReviewItem - Child component for reviewing a single draft card
 *
 * Displays:
 * - Face crop preview
 * - Name text field (editable)
 * - Confidence indicator (color-coded)
 * - Action buttons: Save (implicit), Discard, Re-crop
 *
 * This is a presentational component - it doesn't manage state,
 * it just receives props and emits callbacks.
 */
export default function CardReviewItem({
  card,
  editedName,
  onNameChange,
  onDiscard,
  onRecropStart,
}: CardReviewItemProps) {
  // Determine confidence color based on 0-1 scale
  // Green: >= 0.7
  // Yellow: 0.5 - 0.7
  // Red: < 0.5
  const getConfidenceClass = (confidence: number): string => {
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  };

  const confidencePercentage = Math.round(card.confidence * 100);
  const confidenceClass = getConfidenceClass(card.confidence);

  // Create a canvas-based crop of the face from the original image
  // For now, we'll just show the bounding box region
  const faceBox = card.face.boundingBox;

  return (
    <article className="card-review-item" role="listitem">
      <div className="card-review-item-content">
        {/* Face crop preview */}
        <div className="card-review-item-face-preview">
          <div
            className="card-review-item-face-placeholder"
            style={{
              width: `${faceBox.width}px`,
              maxWidth: '100%',
              aspectRatio: `${faceBox.width} / ${faceBox.height}`,
            }}
            title="Face preview (click re-crop to adjust boundaries)"
          >
            <div className="card-review-item-face-bg" />
          </div>
        </div>

        {/* Card info: name field and confidence */}
        <div className="card-review-item-info">
          <div className="card-review-item-name-field">
            <label htmlFor={`card-name-${card.faceId}`} className="card-review-item-label">
              Name
            </label>
            <input
              id={`card-name-${card.faceId}`}
              type="text"
              value={editedName}
              onChange={(e) => onNameChange(e.currentTarget.value)}
              placeholder="Enter character name"
              className="card-review-item-input"
              aria-label={`Character name for card ${card.faceId}`}
            />
            {card.pairingReason === 'orphan' && (
              <small className="card-review-item-orphan-note">No text found nearby</small>
            )}
          </div>

          {/* Confidence indicator */}
          <div className={`card-review-item-confidence confidence-${confidenceClass}`}>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${confidencePercentage}%` }}
              />
            </div>
            <span className="confidence-text">{confidencePercentage}% confident</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="card-review-item-actions">
        <button
          className="card-review-item-button card-review-item-recrop"
          onClick={onRecropStart}
          title="Adjust the face crop boundaries"
          aria-label={`Re-crop face for ${editedName || 'card'}`}
        >
          Re-crop Face
        </button>
        <button
          className="card-review-item-button card-review-item-discard"
          onClick={onDiscard}
          title="Discard this card permanently"
          aria-label={`Discard card for ${editedName || 'unnamed'}`}
        >
          Discard
        </button>
      </div>
    </article>
  );
}
