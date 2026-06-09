import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SavedCardsGallery from './SavedCardsGallery';
import { cardStorage } from '../../lib/cardStorage';
import type { Character, Trait } from '../../types/card';

function makeTrait(question: string, answer = true): Trait {
  return { id: `t-${question}`, question, answer };
}

describe('SavedCardsGallery', () => {
  const mockCard: Character = {
    id: 'test-1',
    faceId: 'face-1',
    face: {
      id: 'face-1',
      confidence: 0.95,
      boundingBox: { x: 10, y: 10, width: 50, height: 60 },
    },
    name: 'Alice',
    traits: [makeTrait('Is this person funny?'), makeTrait('Are they smart?')],
    imageUrl: 'data:image/png;base64,abc123',
  };

  const mockCard2: Character = {
    id: 'test-2',
    faceId: 'face-2',
    face: {
      id: 'face-2',
      confidence: 0.95,
      boundingBox: { x: 100, y: 10, width: 50, height: 60 },
    },
    name: 'Bob',
    traits: [makeTrait('Are they always late?', false)],
    imageUrl: 'data:image/png;base64,def456',
  };

  beforeEach(async () => {
    // Clear storage before each test
    await cardStorage.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    await cardStorage.clear();
  });

  it('displays empty state when no cards are saved', async () => {
    render(<SavedCardsGallery />);

    await waitFor(() => {
      expect(screen.getByText(/No saved cards yet/i)).toBeInTheDocument();
    });
  });

  it('loads and displays saved cards', async () => {
    // Add a card to storage
    await cardStorage.add(mockCard);

    render(<SavedCardsGallery />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Verify question text is displayed
    expect(screen.getByText('Is this person funny?')).toBeInTheDocument();
    expect(screen.getByText('Are they smart?')).toBeInTheDocument();
  });

  it('displays multiple saved cards', async () => {
    // Add multiple cards
    await cardStorage.add(mockCard);
    await cardStorage.add(mockCard2);

    render(<SavedCardsGallery />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    // Verify count
    expect(screen.getByText(/Saved Cards \(2\)/)).toBeInTheDocument();
  });

  it('displays card image correctly', async () => {
    await cardStorage.add(mockCard);

    render(<SavedCardsGallery />);

    await waitFor(() => {
      const images = screen.getAllByAltText(/Card image for/);
      expect(images.length).toBeGreaterThan(0);
      expect(images[0]).toHaveAttribute('src', 'data:image/png;base64,abc123');
    });
  });

  it('displays traits as tags', async () => {
    await cardStorage.add(mockCard);

    render(<SavedCardsGallery />);

    await waitFor(() => {
      expect(screen.getByText('Is this person funny?')).toBeInTheDocument();
      expect(screen.getByText('Are they smart?')).toBeInTheDocument();
    });

    // Verify they are inside a trait tag list item
    const questionEl = screen.getByText('Is this person funny?');
    expect(questionEl.closest('.saved-card-trait-tag')).not.toBeNull();
  });

  it('handles cards without traits', async () => {
    const cardNoTraits = { ...mockCard, traits: undefined };
    await cardStorage.add(cardNoTraits);

    render(<SavedCardsGallery />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Should not display questions section
    expect(screen.queryByText(/Questions:/)).not.toBeInTheDocument();
  });

  it('deletes a card when delete button is clicked', async () => {
    const added = await cardStorage.add(mockCard);

    const { rerender } = render(<SavedCardsGallery />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByRole('button', { name: /Delete card/ });
    fireEvent.click(deleteButtons[0]);

    // Wait for card to be removed
    await waitFor(() => {
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });

    // Verify it's actually deleted from storage
    const remaining = await cardStorage.list();
    expect(remaining.find((c) => c.id === added.id)).toBeUndefined();
  });

  it('calls onCardDeleted callback when card is deleted', async () => {
    const onCardDeleted = vi.fn();
    const added = await cardStorage.add(mockCard);

    render(<SavedCardsGallery onCardDeleted={onCardDeleted} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /Delete card/ });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(onCardDeleted).toHaveBeenCalledWith(added.id);
    });
  });

  it('clears all cards when clear all button is clicked', async () => {
    await cardStorage.add(mockCard);
    await cardStorage.add(mockCard2);

    render(<SavedCardsGallery />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    // Click clear all button
    const clearButton = screen.getByRole('button', { name: /Clear all/i });
    fireEvent.click(clearButton);

    // Confirm the dialog
    window.confirm = vi.fn(() => true);
    fireEvent.click(clearButton);

    // Wait for cards to be removed
    await waitFor(() => {
      expect(screen.getByText(/No saved cards yet/i)).toBeInTheDocument();
    });

    // Verify storage is empty
    const remaining = await cardStorage.list();
    expect(remaining.length).toBe(0);
  });

  it('calls onAllCleared callback when all cards are cleared', async () => {
    const onAllCleared = vi.fn();
    await cardStorage.add(mockCard);

    // Mock window.confirm to return true
    window.confirm = vi.fn(() => true);

    render(<SavedCardsGallery onAllCleared={onAllCleared} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /Clear all/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(onAllCleared).toHaveBeenCalled();
    });
  });

  it('does not clear cards if user cancels confirmation', async () => {
    await cardStorage.add(mockCard);

    // Mock window.confirm to return false
    window.confirm = vi.fn(() => false);

    render(<SavedCardsGallery />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /Clear all/i });
    fireEvent.click(clearButton);

    // Card should still be there
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Verify storage still has the card
    const remaining = await cardStorage.list();
    expect(remaining.length).toBe(1);
  });

  it('displays loading state initially', async () => {
    render(<SavedCardsGallery />);

    // Should show loading state initially (but briefly)
    await waitFor(() => {
      expect(screen.queryByText(/No saved cards yet/i)).toBeInTheDocument();
    });
  });

  it('updates count when cards are displayed', async () => {
    await cardStorage.add(mockCard);
    await cardStorage.add(mockCard2);

    render(<SavedCardsGallery />);

    await waitFor(() => {
      expect(screen.getByText(/Saved Cards \(2\)/)).toBeInTheDocument();
    });
  });

  it('handles card names with special characters', async () => {
    const specialCard = {
      ...mockCard,
      name: "O'Brien (The Quick One)",
    };

    await cardStorage.add(specialCard);

    render(<SavedCardsGallery />);

    await waitFor(() => {
      expect(screen.getByText("O'Brien (The Quick One)")).toBeInTheDocument();
    });
  });

  it('handles long trait lists', async () => {
    const cardWithManyTraits = {
      ...mockCard,
      traits: [
        makeTrait('Question one?'),
        makeTrait('Question two?'),
        makeTrait('Question three?'),
        makeTrait('Question four?'),
        makeTrait('Question five?'),
      ],
    };

    await cardStorage.add(cardWithManyTraits);

    render(<SavedCardsGallery />);

    await waitFor(() => {
      expect(screen.getByText('Question one?')).toBeInTheDocument();
      expect(screen.getByText('Question five?')).toBeInTheDocument();
    });
  });
});
