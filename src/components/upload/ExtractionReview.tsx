import { useState, useCallback } from 'react';
import type { DraftCard } from '../../types/card';
import CardReviewItem from './CardReviewItem';
import FaceCropEditor from './FaceCropEditor';
import './extraction-review.css';

export interface ExtractionReviewProps {
  draftCards: DraftCard[];
  onCardsApproved: (cards: DraftCard[]) => void;
}

/**
 * ExtractionReview - Compound component for reviewing and correcting draft cards
 *
 * Parent component that manages state for:
 * - Which cards are being reviewed (not discarded)
 * - Current edits to card names
 * - Which card is being re-cropped
 *
 * Children:
 * - CardReviewItem: Displays individual card and handles editing/discarding
 * - FaceCropEditor: Modal for adjusting face crop boundaries
 *
 * Data flow:
 * - Parent owns state of all cards
 * - CardReviewItem receives state + callbacks, emits changes back up
 * - FaceCropEditor is a controlled modal with callbacks
 */
export default function ExtractionReview({
  draftCards,
  onCardsApproved,
}: ExtractionReviewProps) {
  // State: current edits to card names
  const [editedNames, setEditedNames] = useState<Map<string, string>>(
    new Map(draftCards.map((card) => [card.faceId, card.matchedName || '']))
  );

  // State: which cards are discarded
  const [discardedFaceIds, setDiscardedFaceIds] = useState<Set<string>>(new Set());

  // State: which card is being re-cropped (null = modal closed)
  const [recropFaceId, setRecropFaceId] = useState<string | null>(null);

  // Callback: user edited a card's name
  const handleNameChange = useCallback((faceId: string, newName: string) => {
    setEditedNames((prev) => new Map(prev).set(faceId, newName));
  }, []);

  // Callback: user clicked discard button
  const handleDiscard = useCallback((faceId: string) => {
    setDiscardedFaceIds((prev) => new Set(prev).add(faceId));
  }, []);

  // Callback: user clicked re-crop button
  const handleRecropStart = useCallback((faceId: string) => {
    setRecropFaceId(faceId);
  }, []);

  // Callback: user saved the face crop
  const handleRecropSave = useCallback(() => {
    setRecropFaceId(null);
  }, []);

  // Callback: user cancelled the face crop editor
  const handleRecropCancel = useCallback(() => {
    setRecropFaceId(null);
  }, []);

  // Callback: user clicked approve all cards
  const handleApproveAll = useCallback(() => {
    // Filter out discarded cards and apply edits
    const approvedCards: DraftCard[] = [];

    for (const card of draftCards) {
      if (discardedFaceIds.has(card.faceId)) {
        continue;
      }

      const editedName = editedNames.get(card.faceId) || '';

      // Validate: all cards must have a name
      if (!editedName.trim()) {
        alert(`Card requires a name. Please enter a name or discard the card.`);
        return;
      }

      approvedCards.push({
        ...card,
        matchedName: editedName.trim(),
      });
    }

    onCardsApproved(approvedCards);
  }, [draftCards, discardedFaceIds, editedNames, onCardsApproved]);

  // Get the card being re-cropped
  const cardBeingRecropped = recropFaceId
    ? draftCards.find((c) => c.faceId === recropFaceId)
    : null;

  // Filter cards: only show non-discarded cards
  const visibleCards = draftCards.filter((card) => !discardedFaceIds.has(card.faceId));

  if (draftCards.length === 0) {
    return (
      <section className="extraction-review" aria-label="Card review and correction">
        <h3 className="extraction-review-title">Review and Correct Cards</h3>
        <div className="extraction-review-empty">
          <p>No cards to review yet. Upload an image to get started.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="extraction-review" aria-label="Card review and correction">
      <h3 className="extraction-review-title">Review and Correct Cards</h3>
      <p className="extraction-review-subtitle">
        Review each card below. You can edit names, discard bad extractions, or adjust face crops.
        {visibleCards.length !== draftCards.length && (
          <>
            {' '}
            <strong>{draftCards.length - visibleCards.length} card(s) discarded</strong>
          </>
        )}
      </p>

      <div className="extraction-review-grid">
        {visibleCards.length === 0 ? (
          <div className="extraction-review-all-discarded">
            <p>All cards have been discarded.</p>
            <button
              className="extraction-review-undo"
              onClick={() => setDiscardedFaceIds(new Set())}
              aria-label="Undo all discards"
            >
              Undo All Discards
            </button>
          </div>
        ) : (
          visibleCards.map((card) => (
            <CardReviewItem
              key={card.faceId}
              card={card}
              editedName={editedNames.get(card.faceId) || ''}
              onNameChange={(newName) => handleNameChange(card.faceId, newName)}
              onDiscard={() => handleDiscard(card.faceId)}
              onRecropStart={() => handleRecropStart(card.faceId)}
            />
          ))
        )}
      </div>

      <div className="extraction-review-actions">
        <button
          className="extraction-review-approve-button"
          onClick={handleApproveAll}
          disabled={visibleCards.length === 0}
          aria-label="Approve all cards and proceed to trait entry"
        >
          Approve All Cards
        </button>
      </div>

      {cardBeingRecropped && (
        <FaceCropEditor
          card={cardBeingRecropped}
          onSave={handleRecropSave}
          onCancel={handleRecropCancel}
        />
      )}
    </section>
  );
}
