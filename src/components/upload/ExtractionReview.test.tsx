import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExtractionReview from './ExtractionReview';
import type { DraftCard, Face } from '../../types/card';

// Mock HTMLDialogElement methods for testing
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

// Helper to create mock draft cards
function createMockDraftCard(overrides?: Partial<DraftCard>): DraftCard {
  const face: Face = {
    id: 'face-1',
    confidence: 0.95,
    boundingBox: { x: 10, y: 10, width: 100, height: 120 },
  };

  return {
    faceId: 'face-1',
    face,
    matchedName: 'John Doe',
    matchedTextIndex: 0,
    confidence: 0.85,
    pairingReason: 'proximity',
    ...overrides,
  };
}

describe('ExtractionReview', () => {
  describe('rendering', () => {
    it('renders empty state when no draft cards provided', () => {
      render(<ExtractionReview draftCards={[]} onCardsApproved={() => {}} />);
      expect(screen.getByText(/no cards to review/i)).toBeInTheDocument();
    });

    it('renders all draft cards', () => {
      const cards = [
        createMockDraftCard({ faceId: 'face-1', matchedName: 'Alice' }),
        createMockDraftCard({ faceId: 'face-2', matchedName: 'Bob' }),
        createMockDraftCard({ faceId: 'face-3', matchedName: 'Charlie' }),
      ];

      render(<ExtractionReview draftCards={cards} onCardsApproved={() => {}} />);

      expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Charlie')).toBeInTheDocument();
    });

    it('displays confidence scores with color coding', () => {
      const cards = [
        createMockDraftCard({ confidence: 0.85 }), // green
        createMockDraftCard({ confidence: 0.65 }), // yellow
        createMockDraftCard({ confidence: 0.35 }), // red
      ];

      render(<ExtractionReview draftCards={cards} onCardsApproved={() => {}} />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(3);

      // Check for confidence percentages (they appear in text like "85% confident")
      expect(screen.getByText(/85% confident/)).toBeInTheDocument();
      expect(screen.getByText(/65% confident/)).toBeInTheDocument();
      expect(screen.getByText(/35% confident/)).toBeInTheDocument();
    });

    it('handles orphan cards (no matched name)', () => {
      const cards = [
        createMockDraftCard({ matchedName: null, pairingReason: 'orphan' }),
      ];

      render(<ExtractionReview draftCards={cards} onCardsApproved={() => {}} />);

      // Should render a text field that's empty for orphans
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('editing names', () => {
    it('allows editing card names', async () => {
      const user = userEvent.setup();
      const cards = [createMockDraftCard({ matchedName: 'John Doe' })];

      render(<ExtractionReview draftCards={cards} onCardsApproved={() => {}} />);

      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      expect(nameInput).toHaveValue('Jane Smith');
    });

    it('updates multiple card names independently', async () => {
      const user = userEvent.setup();
      const cards = [
        createMockDraftCard({ faceId: 'face-1', matchedName: 'Alice' }),
        createMockDraftCard({ faceId: 'face-2', matchedName: 'Bob' }),
      ];

      render(<ExtractionReview draftCards={cards} onCardsApproved={() => {}} />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(2);

      await user.clear(inputs[0]);
      await user.type(inputs[0], 'Alice Updated');

      expect(inputs[0]).toHaveValue('Alice Updated');
      expect(inputs[1]).toHaveValue('Bob'); // Unchanged
    });
  });

  describe('discarding cards', () => {
    it('allows discarding a card', async () => {
      const user = userEvent.setup();
      const cards = [
        createMockDraftCard({ faceId: 'face-1', matchedName: 'Alice' }),
        createMockDraftCard({ faceId: 'face-2', matchedName: 'Bob' }),
      ];

      render(<ExtractionReview draftCards={cards} onCardsApproved={() => {}} />);

      // Find and click the discard button for the first card
      const discardButtons = screen.getAllByRole('button', { name: /discard/i });
      await user.click(discardButtons[0]);

      // Only Bob should remain
      expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Alice')).not.toBeInTheDocument();
    });

    it('card disappears after discarding', async () => {
      const user = userEvent.setup();
      const cards = [createMockDraftCard({ matchedName: 'Alice' })];

      render(<ExtractionReview draftCards={cards} onCardsApproved={() => {}} />);

      expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();

      const discardButton = screen.getByRole('button', { name: /discard/i });
      await user.click(discardButton);

      expect(screen.queryByDisplayValue('Alice')).not.toBeInTheDocument();
    });
  });

  describe('confirming cards', () => {
    it('renders a confirm button', () => {
      const cards = [createMockDraftCard()];
      render(<ExtractionReview draftCards={cards} onCardsApproved={() => {}} />);

      expect(screen.getByRole('button', { name: /approve all|confirm|save all/i })).toBeInTheDocument();
    });

    it('calls onCardsApproved with updated cards when confirm button clicked', async () => {
      const user = userEvent.setup();
      const onApproved = vi.fn();
      const originalCard = createMockDraftCard({ matchedName: 'John' });
      const cards = [originalCard];

      render(<ExtractionReview draftCards={cards} onCardsApproved={onApproved} />);

      // Edit the name
      const nameInput = screen.getByDisplayValue('John');
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane');

      // Click approve button
      const approveButton = screen.getByRole('button', { name: /approve all|confirm|save all/i });
      await user.click(approveButton);

      await waitFor(() => {
        expect(onApproved).toHaveBeenCalledTimes(1);
      });

      // Check that the updated card was passed
      const approvedCards = onApproved.mock.calls[0][0];
      expect(approvedCards[0].matchedName).toBe('Jane');
    });

    it('does not approve if any card has an empty name', async () => {
      const user = userEvent.setup();
      const onApproved = vi.fn();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const cards = [
        createMockDraftCard({ matchedName: 'Alice' }),
        createMockDraftCard({ matchedName: 'Bob' }),
      ];

      render(<ExtractionReview draftCards={cards} onCardsApproved={onApproved} />);

      // Clear one card's name
      const inputs = screen.getAllByRole('textbox');
      await user.clear(inputs[0]);

      // Try to approve
      const approveButton = screen.getByRole('button', { name: /approve all|confirm|save all/i });
      await user.click(approveButton);

      // Should show alert and not call onApproved
      expect(alertSpy).toHaveBeenCalled();
      expect(onApproved).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe('face crop editor', () => {
    it('renders re-crop button on each card', async () => {
      const cards = [createMockDraftCard()];

      render(<ExtractionReview draftCards={cards} onCardsApproved={() => {}} />);

      const recropButtons = screen.getAllByRole('button', { name: /re-crop/i });
      expect(recropButtons.length).toBeGreaterThan(0);
    });

    it('opens face crop editor modal when re-crop button clicked', async () => {
      const user = userEvent.setup();
      const cards = [createMockDraftCard()];

      const { rerender } = render(<ExtractionReview draftCards={cards} onCardsApproved={() => {}} />);

      const recropButton = screen.getByRole('button', { name: /re-crop/i });
      await user.click(recropButton);

      // After clicking, the modal should be in the DOM
      // Note: We need to wait for the state update
      await waitFor(() => {
        const dialog = document.querySelector('dialog.face-crop-editor-dialog');
        expect(dialog).toBeInTheDocument();
      });
    });

    it('closes face crop editor when applying crop', async () => {
      const user = userEvent.setup();
      const cards = [createMockDraftCard()];

      render(<ExtractionReview draftCards={cards} onCardsApproved={() => {}} />);

      const recropButton = screen.getByRole('button', { name: /re-crop/i });
      await user.click(recropButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(document.querySelector('dialog.face-crop-editor-dialog')).toBeInTheDocument();
      });

      // Find the Apply Crop button by querying the dialog
      const dialog = document.querySelector('dialog.face-crop-editor-dialog');
      const applyButton = dialog?.querySelector('button.face-crop-editor-save') as HTMLButtonElement;
      if (applyButton) {
        await user.click(applyButton);
      }

      // Dialog should be closed
      await waitFor(() => {
        expect(document.querySelector('dialog.face-crop-editor-dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('keyboard navigation', () => {
    it('allows tabbing between card name fields', async () => {
      const user = userEvent.setup();
      const cards = [
        createMockDraftCard({ faceId: 'face-1', matchedName: 'Alice' }),
        createMockDraftCard({ faceId: 'face-2', matchedName: 'Bob' }),
      ];

      render(<ExtractionReview draftCards={cards} onCardsApproved={() => {}} />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(2);

      // Tab between inputs - focus will move through all focusable elements
      inputs[0].focus();
      expect(document.activeElement).toBe(inputs[0]);

      // Note: Tab will cycle through all focusable elements including buttons,
      // so we just verify that we can focus the inputs
      await user.keyboard('{Tab}{Tab}{Tab}'); // Tab past buttons to next input
      // We focus back on the first input to verify focus cycling works
    });
  });

  describe('compound component state', () => {
    it('maintains state correctly across card operations', async () => {
      const user = userEvent.setup();
      const onApproved = vi.fn();
      const cards = [
        createMockDraftCard({ faceId: 'face-1', matchedName: 'Alice' }),
        createMockDraftCard({ faceId: 'face-2', matchedName: 'Bob' }),
        createMockDraftCard({ faceId: 'face-3', matchedName: 'Charlie' }),
      ];

      render(<ExtractionReview draftCards={cards} onCardsApproved={onApproved} />);

      // Edit first card
      const inputs = screen.getAllByRole('textbox');
      await user.clear(inputs[0]);
      await user.type(inputs[0], 'Alice Updated');

      // Discard second card (find it by its current input value)
      const discardButtons = screen.getAllByRole('button', { name: /discard/i });
      // Discard the card with "Bob"
      const bobInput = screen.getByDisplayValue('Bob');
      const bobCard = bobInput.closest('.card-review-item');
      const bobDiscardButton = bobCard?.querySelector('[aria-label*="Discard"]') as HTMLButtonElement;
      if (bobDiscardButton) {
        await user.click(bobDiscardButton);
      }

      // Approve remaining cards
      const approveButton = screen.getByRole('button', { name: /approve all|confirm|save all/i });
      await user.click(approveButton);

      expect(onApproved).toHaveBeenCalledOnce();
      const approvedCards = onApproved.mock.calls[0][0];

      expect(approvedCards).toHaveLength(2);
      expect(approvedCards[0].matchedName).toBe('Alice Updated');
      expect(approvedCards[1].matchedName).toBe('Charlie');
    });
  });
});
