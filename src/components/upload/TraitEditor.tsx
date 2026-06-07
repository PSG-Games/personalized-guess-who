import { useState, useCallback } from 'react';
import './traits.css';

export interface TraitEditorProps {
  traits: string[];
  onTraitsChange: (traits: string[]) => void;
  cardId: string;
}

/**
 * TraitEditor - Component for managing custom traits/inside-jokes on a card
 *
 * Displays:
 * - List of current traits as tags/pills
 * - Input field to add new traits
 * - Remove button for each trait
 *
 * Behavior:
 * - Enter key adds a trait
 * - Backspace in empty input removes last trait
 * - Prevents duplicates (case-insensitive)
 * - Trims whitespace from input
 * - Calls onTraitsChange callback whenever traits are modified
 *
 * Accessibility:
 * - Proper labels for input
 * - ARIA labels for remove buttons
 * - Semantic list structure for traits
 * - Keyboard navigation support
 */
export default function TraitEditor({
  traits,
  onTraitsChange,
  cardId,
}: TraitEditorProps) {
  const [inputValue, setInputValue] = useState('');

  // Add a new trait
  const handleAddTrait = useCallback(() => {
    const trimmedValue = inputValue.trim();

    // Validation: empty strings
    if (!trimmedValue) {
      return;
    }

    // Validation: duplicates (case-insensitive)
    if (traits.some((t) => t.toLowerCase() === trimmedValue.toLowerCase())) {
      return;
    }

    // Add the trait and clear input
    onTraitsChange([...traits, trimmedValue]);
    setInputValue('');
  }, [inputValue, traits, onTraitsChange]);

  // Remove a trait by index
  const handleRemoveTrait = useCallback(
    (index: number) => {
      const newTraits = traits.filter((_, i) => i !== index);
      onTraitsChange(newTraits);
    },
    [traits, onTraitsChange]
  );

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTrait();
      } else if (e.key === 'Backspace' && inputValue === '' && traits.length > 0) {
        e.preventDefault();
        // Remove the last trait
        handleRemoveTrait(traits.length - 1);
      }
    },
    [inputValue, traits, handleAddTrait, handleRemoveTrait]
  );

  const inputId = `trait-input-${cardId}`;

  return (
    <div className="trait-editor">
      {/* Current traits list */}
      <div className="trait-editor-display" role="region" aria-label="Current traits">
        {traits.length === 0 ? (
          <p className="trait-editor-empty-state">No traits yet — add custom ones below!</p>
        ) : (
          <ul className="trait-editor-list" aria-label="Traits list">
            {traits.map((trait, index) => (
              <li key={`${trait}-${index}`} className="trait-editor-item">
                <span className="trait-editor-tag">{trait}</span>
                <button
                  type="button"
                  className="trait-editor-remove-button"
                  onClick={() => handleRemoveTrait(index)}
                  aria-label={`Remove trait: ${trait}`}
                  title={`Remove the '${trait}' trait`}
                >
                  <span className="trait-editor-remove-icon">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Input area to add traits */}
      <div className="trait-editor-input-group">
        <label htmlFor={inputId} className="trait-editor-label">
          Add a trait
        </label>
        <div className="trait-editor-input-wrapper">
          <input
            id={inputId}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., 'always late', 'tells jokes'"
            className="trait-editor-input"
            aria-describedby={`${inputId}-hint`}
          />
          <button
            type="button"
            className="trait-editor-add-button"
            onClick={handleAddTrait}
            aria-label="Add trait"
            title="Add this trait to the card"
          >
            Add
          </button>
        </div>
        <small id={`${inputId}-hint`} className="trait-editor-hint">
          Press Enter or click Add. Use Backspace in empty field to remove the last trait.
        </small>
      </div>
    </div>
  );
}
