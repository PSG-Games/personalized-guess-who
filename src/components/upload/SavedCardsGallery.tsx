import { useState, useEffect } from 'react';
import { cardStorage } from '../../lib/cardStorage';
import type { Character } from '../../types/card';
import './saved-cards-gallery.css';

export interface SavedCardsGalleryProps {
  onCardDeleted?: (id: string) => void;
  onAllCleared?: () => void;
}

/**
 * SavedCardsGallery - Display all persisted cards with options to delete them
 *
 * Features:
 * - Displays all saved cards from IndexedDB storage
 * - Shows card image, name, and traits for each card
 * - Delete individual cards
 * - Clear all cards at once
 * - Automatically refreshes when cards are loaded
 *
 * Props:
 * - onCardDeleted: Callback when a single card is deleted
 * - onAllCleared: Callback when all cards are cleared
 */
export default function SavedCardsGallery({ onCardDeleted, onAllCleared }: SavedCardsGalleryProps) {
  const [cards, setCards] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load cards from storage on mount
  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const savedCards = await cardStorage.list();
      setCards(savedCards);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cards';
      setError(errorMessage);
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await cardStorage.delete(id);
      setCards((prev) => prev.filter((card) => card.id !== id));
      onCardDeleted?.(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete card';
      setError(errorMessage);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all saved cards? This cannot be undone.')) {
      return;
    }

    try {
      await cardStorage.clear();
      setCards([]);
      setError(null);
      onAllCleared?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cards';
      setError(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <section className="saved-cards-gallery" aria-label="Saved cards gallery">
        <h3 className="saved-cards-gallery-title">Saved Cards</h3>
        <div className="saved-cards-loading" role="status" aria-live="polite">
          <p>Loading saved cards...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="saved-cards-gallery" aria-label="Saved cards gallery">
        <h3 className="saved-cards-gallery-title">Saved Cards</h3>
        <div className="saved-cards-error" role="alert">
          <p>Error loading cards: {error}</p>
          <button onClick={loadCards} className="saved-cards-retry-button">
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (cards.length === 0) {
    return (
      <section className="saved-cards-gallery" aria-label="Saved cards gallery">
        <h3 className="saved-cards-gallery-title">Saved Cards</h3>
        <div className="saved-cards-empty" role="status">
          <p>No saved cards yet. Upload an image and approve cards to save them.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="saved-cards-gallery" aria-label="Saved cards gallery">
      <div className="saved-cards-header">
        <h3 className="saved-cards-gallery-title">Saved Cards ({cards.length})</h3>
        <button
          onClick={handleClearAll}
          className="saved-cards-clear-all-button"
          aria-label="Clear all saved cards"
          title="Delete all saved cards"
        >
          Clear All
        </button>
      </div>

      <div className="saved-cards-grid">
        {cards.map((card) => (
          <div key={card.id} className="saved-card-item">
            <div className="saved-card-image-container">
              <img
                src={card.imageUrl}
                alt={`Card image for ${card.name}`}
                className="saved-card-image"
              />
            </div>

            <div className="saved-card-content">
              <h4 className="saved-card-name">{card.name}</h4>

              {card.traits && card.traits.length > 0 && (
                <div className="saved-card-traits">
                  <p className="saved-card-traits-label">Questions:</p>
                  <ul className="saved-card-traits-list">
                    {card.traits.map((trait) => (
                      <li key={trait.id} className="saved-card-trait-tag">
                        <span className="saved-card-trait-question">{trait.question}</span>
                        <span
                          className={`saved-card-trait-answer${trait.answer ? ' answer-yes' : ' answer-no'}`}
                        >
                          {trait.answer ? 'Yes' : 'No'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => handleDeleteCard(card.id)}
                className="saved-card-delete-button"
                aria-label={`Delete card: ${card.name}`}
                title={`Delete ${card.name}`}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
