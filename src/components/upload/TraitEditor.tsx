import { useState, useCallback } from 'react';
import type { Trait } from '../../types/card';
import './traits.css';

export interface TraitEditorProps {
  traits: Trait[];
  onTraitsChange: (traits: Trait[]) => void;
  cardId: string;
}

function generateId(): string {
  return `trait-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * TraitEditor — add yes/no questions to a card for use during gameplay.
 *
 * Each trait is a question ("Do they wear glasses?") paired with a yes/no
 * answer for this specific card.  During the game, a questioner asks the
 * question and the card-holder answers Yes or No; other players eliminate
 * cards that don't match.
 *
 * Interactions:
 * - Type a question, select Yes or No (default Yes), click Add or press Enter
 * - Click the Yes/No pill on any saved question to flip its answer
 * - Click × to remove a question
 * - Duplicate questions (case-insensitive) are silently rejected
 */
export default function TraitEditor({ traits, onTraitsChange, cardId }: TraitEditorProps) {
  const [question, setQuestion] = useState('');
  const [pendingAnswer, setPendingAnswer] = useState<boolean>(true); // default: Yes

  const handleAdd = useCallback(() => {
    const trimmed = question.trim();
    if (!trimmed) return;

    // Reject case-insensitive duplicates
    if (traits.some((t) => t.question.toLowerCase() === trimmed.toLowerCase())) return;

    onTraitsChange([
      ...traits,
      { id: generateId(), question: trimmed, answer: pendingAnswer },
    ]);
    setQuestion('');
    setPendingAnswer(true); // reset to Yes after each add
  }, [question, pendingAnswer, traits, onTraitsChange]);

  const handleToggleAnswer = useCallback(
    (id: string) => {
      onTraitsChange(traits.map((t) => (t.id === id ? { ...t, answer: !t.answer } : t)));
    },
    [traits, onTraitsChange]
  );

  const handleRemove = useCallback(
    (id: string) => {
      onTraitsChange(traits.filter((t) => t.id !== id));
    },
    [traits, onTraitsChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  const inputId = `trait-input-${cardId}`;

  return (
    <div className="trait-editor">
      {/* Saved questions */}
      <div className="trait-editor-display" role="region" aria-label="Current questions">
        {traits.length === 0 ? (
          <p className="trait-editor-empty-state">No questions yet — add yes/no questions below.</p>
        ) : (
          <ul className="trait-editor-list" aria-label="Questions list">
            {traits.map((trait) => (
              <li key={trait.id} className="trait-editor-item">
                <span className="trait-editor-question">{trait.question}</span>
                <button
                  type="button"
                  className={`trait-editor-answer-toggle${trait.answer ? ' answer-yes' : ' answer-no'}`}
                  onClick={() => handleToggleAnswer(trait.id)}
                  aria-label={`Answer for "${trait.question}": ${trait.answer ? 'Yes' : 'No'} — click to flip`}
                  title="Click to flip Yes / No"
                >
                  {trait.answer ? 'Yes' : 'No'}
                </button>
                <button
                  type="button"
                  className="trait-editor-remove-button"
                  onClick={() => handleRemove(trait.id)}
                  aria-label={`Remove question: ${trait.question}`}
                  title="Remove this question"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add-question input row */}
      <div className="trait-editor-input-group">
        <label htmlFor={inputId} className="trait-editor-label">
          Add a yes/no question
        </label>
        <div className="trait-editor-input-wrapper">
          <input
            id={inputId}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.currentTarget.value)}
            onKeyDown={handleKeyDown}
            placeholder='e.g., "Do they wear glasses?"'
            className="trait-editor-input"
            aria-describedby={`${inputId}-hint`}
          />
          {/* Answer preset — what the answer is for this card */}
          <div
            className="trait-editor-answer-preset-group"
            role="group"
            aria-label="Answer for this card"
          >
            <button
              type="button"
              className={`trait-editor-answer-preset${pendingAnswer ? ' active' : ''}`}
              onClick={() => setPendingAnswer(true)}
              aria-pressed={pendingAnswer}
            >
              Yes
            </button>
            <button
              type="button"
              className={`trait-editor-answer-preset${!pendingAnswer ? ' active' : ''}`}
              onClick={() => setPendingAnswer(false)}
              aria-pressed={!pendingAnswer}
            >
              No
            </button>
          </div>
          <button
            type="button"
            className="trait-editor-add-button"
            onClick={handleAdd}
            aria-label="Add question"
          >
            Add
          </button>
        </div>
        <small id={`${inputId}-hint`} className="trait-editor-hint">
          Press Enter or click Add. Toggle Yes / No to set the answer for this card.
        </small>
      </div>
    </div>
  );
}
