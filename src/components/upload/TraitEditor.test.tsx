import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TraitEditor from './TraitEditor';
import type { Trait } from '../../types/card';

function makeTrait(overrides: Partial<Trait> = {}): Trait {
  return {
    id: `t-${Math.random()}`,
    question: 'Do they wear glasses?',
    answer: true,
    ...overrides,
  };
}

describe('TraitEditor', () => {
  const mockOnTraitsChange = vi.fn();

  beforeEach(() => {
    mockOnTraitsChange.mockClear();
  });

  // ── Rendering ────────────────────────────────────────────

  it('renders the question input field', () => {
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);
    expect(screen.getByLabelText(/add a yes\/no question/i)).toBeInTheDocument();
  });

  it('renders the questions region', () => {
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);
    expect(screen.getByRole('region', { name: /current questions/i })).toBeInTheDocument();
  });

  it('shows empty state when no traits are provided', () => {
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);
    expect(screen.getByText(/no questions yet/i)).toBeInTheDocument();
  });

  it('displays existing trait questions', () => {
    const traits = [
      makeTrait({ question: 'Do they wear glasses?' }),
      makeTrait({ question: 'Are they left-handed?' }),
    ];
    render(<TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    expect(screen.getByText('Do they wear glasses?')).toBeInTheDocument();
    expect(screen.getByText('Are they left-handed?')).toBeInTheDocument();
  });

  it('shows Yes for traits with answer=true', () => {
    const traits = [makeTrait({ question: 'Do they wear glasses?', answer: true })];
    render(<TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const toggle = screen.getByRole('button', {
      name: /Answer for "Do they wear glasses\?": Yes/i,
    });
    expect(toggle).toHaveTextContent('Yes');
  });

  it('shows No for traits with answer=false', () => {
    const traits = [makeTrait({ question: 'Do they wear glasses?', answer: false })];
    render(<TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const toggle = screen.getByRole('button', {
      name: /Answer for "Do they wear glasses\?": No/i,
    });
    expect(toggle).toHaveTextContent('No');
  });

  it('renders a remove button for each trait', () => {
    const traits = [
      makeTrait({ question: 'Wears glasses?' }),
      makeTrait({ question: 'Left-handed?' }),
    ];
    render(<TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const removeButtons = screen.getAllByRole('button', { name: /remove question/i });
    expect(removeButtons).toHaveLength(2);
  });

  it('uses list structure for questions', () => {
    const traits = [makeTrait(), makeTrait({ question: 'Are they tall?' })];
    render(<TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const list = screen.getByRole('list', { name: /questions list/i });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
  });

  // ── Adding questions ─────────────────────────────────────

  it('adds a question with answer=Yes (default) when Enter is pressed', async () => {
    const user = userEvent.setup();
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const input = screen.getByLabelText(/add a yes\/no question/i);
    await user.type(input, 'Do they wear glasses?');
    await user.keyboard('{Enter}');

    expect(mockOnTraitsChange).toHaveBeenCalledOnce();
    const [newTraits] = mockOnTraitsChange.mock.calls[0];
    expect(newTraits).toHaveLength(1);
    expect(newTraits[0].question).toBe('Do they wear glasses?');
    expect(newTraits[0].answer).toBe(true);
    expect(typeof newTraits[0].id).toBe('string');
  });

  it('adds a question with answer=No when No preset is selected', async () => {
    const user = userEvent.setup();
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const noButton = screen.getByRole('button', { name: 'No' });
    await user.click(noButton);

    const input = screen.getByLabelText(/add a yes\/no question/i);
    await user.type(input, 'Are they short?');
    await user.keyboard('{Enter}');

    const [newTraits] = mockOnTraitsChange.mock.calls[0];
    expect(newTraits[0].answer).toBe(false);
  });

  it('adds a question via the Add button', async () => {
    const user = userEvent.setup();
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const input = screen.getByLabelText(/add a yes\/no question/i);
    await user.type(input, 'Do they play guitar?');
    await user.click(screen.getByRole('button', { name: /add question/i }));

    expect(mockOnTraitsChange).toHaveBeenCalledOnce();
    const [newTraits] = mockOnTraitsChange.mock.calls[0];
    expect(newTraits[0].question).toBe('Do they play guitar?');
  });

  it('trims whitespace from the question text', async () => {
    const user = userEvent.setup();
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const input = screen.getByLabelText(/add a yes\/no question/i);
    await user.type(input, '  Wears a hat?  ');
    await user.keyboard('{Enter}');

    const [newTraits] = mockOnTraitsChange.mock.calls[0];
    expect(newTraits[0].question).toBe('Wears a hat?');
  });

  it('does not add a question when the input is empty', async () => {
    const user = userEvent.setup();
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    await user.keyboard('{Enter}');
    expect(mockOnTraitsChange).not.toHaveBeenCalled();
  });

  it('does not add a question when the input is only whitespace', async () => {
    const user = userEvent.setup();
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const input = screen.getByLabelText(/add a yes\/no question/i);
    await user.type(input, '   ');
    await user.keyboard('{Enter}');

    expect(mockOnTraitsChange).not.toHaveBeenCalled();
  });

  it('rejects duplicate questions (case-insensitive)', async () => {
    const user = userEvent.setup();
    const existing = [makeTrait({ question: 'Wears glasses?' })];
    render(
      <TraitEditor traits={existing} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
    );

    const input = screen.getByLabelText(/add a yes\/no question/i);
    await user.type(input, 'wears glasses?');
    await user.keyboard('{Enter}');

    expect(mockOnTraitsChange).not.toHaveBeenCalled();
  });

  it('clears the input after a successful add', async () => {
    const user = userEvent.setup();
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const input = screen.getByLabelText(/add a yes\/no question/i) as HTMLInputElement;
    await user.type(input, 'Wears glasses?');
    await user.keyboard('{Enter}');

    expect(input.value).toBe('');
  });

  it('resets the pending answer to Yes after a successful add', async () => {
    const user = userEvent.setup();
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    // Select No
    await user.click(screen.getByRole('button', { name: 'No' }));
    // Add a question
    const input = screen.getByLabelText(/add a yes\/no question/i);
    await user.type(input, 'Short?');
    await user.keyboard('{Enter}');

    // The Yes preset should now be active again
    const yesButton = screen.getByRole('button', { name: 'Yes' });
    expect(yesButton).toHaveAttribute('aria-pressed', 'true');
  });

  // ── Toggling answers ──────────────────────────────────────

  it('toggles an answer from Yes to No when the pill is clicked', async () => {
    const user = userEvent.setup();
    const traits = [makeTrait({ id: 'id-1', question: 'Wears glasses?', answer: true })];
    render(<TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const toggle = screen.getByRole('button', {
      name: /Answer for "Wears glasses\?": Yes/i,
    });
    await user.click(toggle);

    const [newTraits] = mockOnTraitsChange.mock.calls[0];
    expect(newTraits[0].answer).toBe(false);
  });

  it('toggles an answer from No to Yes when the pill is clicked', async () => {
    const user = userEvent.setup();
    const traits = [makeTrait({ id: 'id-1', question: 'Wears glasses?', answer: false })];
    render(<TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const toggle = screen.getByRole('button', {
      name: /Answer for "Wears glasses\?": No/i,
    });
    await user.click(toggle);

    const [newTraits] = mockOnTraitsChange.mock.calls[0];
    expect(newTraits[0].answer).toBe(true);
  });

  it('only flips the toggled trait, leaving others unchanged', async () => {
    const user = userEvent.setup();
    const traits = [
      makeTrait({ id: 'id-1', question: 'Wears glasses?', answer: true }),
      makeTrait({ id: 'id-2', question: 'Is tall?', answer: false }),
    ];
    render(<TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const toggle = screen.getByRole('button', {
      name: /Answer for "Wears glasses\?": Yes/i,
    });
    await user.click(toggle);

    const [newTraits] = mockOnTraitsChange.mock.calls[0];
    expect(newTraits.find((t: Trait) => t.id === 'id-1')?.answer).toBe(false);
    expect(newTraits.find((t: Trait) => t.id === 'id-2')?.answer).toBe(false); // unchanged
  });

  // ── Removing questions ────────────────────────────────────

  it('removes a question when the × button is clicked', async () => {
    const user = userEvent.setup();
    const traits = [
      makeTrait({ id: 'id-1', question: 'Wears glasses?' }),
      makeTrait({ id: 'id-2', question: 'Is tall?' }),
    ];
    render(<TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const removeBtn = screen.getByRole('button', { name: /remove question: Wears glasses/i });
    await user.click(removeBtn);

    const [newTraits] = mockOnTraitsChange.mock.calls[0];
    expect(newTraits).toHaveLength(1);
    expect(newTraits[0].id).toBe('id-2');
  });

  // ── Accessibility ─────────────────────────────────────────

  it('has a label linked to the input', () => {
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);
    const input = screen.getByLabelText(/add a yes\/no question/i);
    expect(input).toHaveAttribute('id');
  });

  it('has descriptive aria-labels on the answer-toggle buttons', () => {
    const traits = [makeTrait({ question: 'Wears glasses?', answer: true })];
    render(<TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const toggle = screen.getByRole('button', {
      name: /Answer for "Wears glasses\?": Yes/i,
    });
    expect(toggle).toBeInTheDocument();
  });

  it('has descriptive aria-labels on the remove buttons', () => {
    const traits = [makeTrait({ question: 'Wears glasses?' })];
    render(<TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    expect(screen.getByRole('button', { name: /remove question: Wears glasses/i })).toBeInTheDocument();
  });

  it('marks the active preset button with aria-pressed=true', () => {
    render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

    const yesBtn = screen.getByRole('button', { name: 'Yes' });
    const noBtn = screen.getByRole('button', { name: 'No' });

    expect(yesBtn).toHaveAttribute('aria-pressed', 'true');
    expect(noBtn).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Props updates ─────────────────────────────────────────

  it('reflects updated traits when the prop changes', () => {
    const { rerender } = render(
      <TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
    );

    expect(screen.getByText(/no questions yet/i)).toBeInTheDocument();

    rerender(
      <TraitEditor
        traits={[makeTrait({ question: 'Wears glasses?' })]}
        onTraitsChange={mockOnTraitsChange}
        cardId="card-1"
      />
    );

    expect(screen.getByText('Wears glasses?')).toBeInTheDocument();
  });
});
