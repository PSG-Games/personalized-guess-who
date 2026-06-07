import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TraitEditor from './TraitEditor';

describe('TraitEditor', () => {
  const mockOnTraitsChange = vi.fn();

  beforeEach(() => {
    mockOnTraitsChange.mockClear();
  });

  describe('rendering', () => {
    it('should render with an empty state when no traits are provided', () => {
      render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

      expect(screen.getByLabelText(/add a trait/i)).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /current traits/i })).toBeInTheDocument();
    });

    it('should display existing traits as tags', () => {
      const traits = ['funny', 'tall', 'mysterious'];
      render(
        <TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
      );

      traits.forEach((trait) => {
        expect(screen.getByText(trait)).toBeInTheDocument();
      });
    });

    it('should render remove button for each trait', () => {
      const traits = ['funny', 'tall'];
      render(
        <TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
      );

      const removeButtons = screen.getAllByLabelText(/remove trait/i);
      expect(removeButtons).toHaveLength(2);
    });

    it('should show empty state message when traits list is empty', () => {
      render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

      expect(screen.getByText(/no traits yet/i)).toBeInTheDocument();
    });
  });

  describe('adding traits', () => {
    it('should add a trait when user types and presses Enter', async () => {
      const user = userEvent.setup();
      render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

      const input = screen.getByLabelText(/add a trait/i) as HTMLInputElement;
      await user.type(input, 'funny');
      await user.keyboard('{Enter}');

      expect(mockOnTraitsChange).toHaveBeenCalledWith(['funny']);
      expect(input.value).toBe(''); // Input should be cleared
    });

    it('should trim whitespace from trait input', async () => {
      const user = userEvent.setup();
      render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

      const input = screen.getByLabelText(/add a trait/i);
      await user.type(input, '  mysterious  ');
      await user.keyboard('{Enter}');

      expect(mockOnTraitsChange).toHaveBeenCalledWith(['mysterious']);
    });

    it('should not add empty traits', async () => {
      const user = userEvent.setup();
      render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

      const input = screen.getByLabelText(/add a trait/i);
      await user.type(input, '   '); // Only whitespace
      await user.keyboard('{Enter}');

      expect(mockOnTraitsChange).not.toHaveBeenCalled();
    });

    it('should not add duplicate traits', async () => {
      const user = userEvent.setup();
      const traits = ['funny'];
      render(
        <TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
      );

      const input = screen.getByLabelText(/add a trait/i);
      await user.type(input, 'funny');
      await user.keyboard('{Enter}');

      expect(mockOnTraitsChange).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive duplicate detection', async () => {
      const user = userEvent.setup();
      const traits = ['Funny'];
      render(
        <TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
      );

      const input = screen.getByLabelText(/add a trait/i);
      await user.type(input, 'funny');
      await user.keyboard('{Enter}');

      expect(mockOnTraitsChange).not.toHaveBeenCalled();
    });

    it('should add trait with click on add button', async () => {
      const user = userEvent.setup();
      render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

      const input = screen.getByLabelText(/add a trait/i);
      const button = screen.getByRole('button', { name: /add trait/i });

      await user.type(input, 'tall');
      await user.click(button);

      expect(mockOnTraitsChange).toHaveBeenCalledWith(['tall']);
    });
  });

  describe('removing traits', () => {
    it('should remove a trait when remove button is clicked', async () => {
      const user = userEvent.setup();
      const traits = ['funny', 'tall'];
      render(
        <TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
      );

      const removeButtons = screen.getAllByLabelText(/remove trait: funny/i);
      await user.click(removeButtons[0]);

      expect(mockOnTraitsChange).toHaveBeenCalledWith(['tall']);
    });

    it('should remove trait by index correctly', async () => {
      const user = userEvent.setup();
      const traits = ['funny', 'tall', 'mysterious'];
      render(
        <TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
      );

      // Remove the middle one
      const removeButtons = screen.getAllByLabelText(/remove trait: tall/i);
      await user.click(removeButtons[0]);

      expect(mockOnTraitsChange).toHaveBeenCalledWith(['funny', 'mysterious']);
    });

    it('should support Backspace in input to remove last trait', async () => {
      const user = userEvent.setup();
      const traits = ['funny', 'tall'];
      const { rerender } = render(
        <TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
      );

      const input = screen.getByLabelText(/add a trait/i) as HTMLInputElement;
      input.focus();

      // Backspace in empty input should remove last trait
      await user.keyboard('{Backspace}');

      expect(mockOnTraitsChange).toHaveBeenCalledWith(['funny']);

      // Update the component with new traits
      rerender(
        <TraitEditor traits={['funny']} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
      );

      // Clear the mock for the second backspace test
      mockOnTraitsChange.mockClear();

      // Focus the input again
      input.focus();
      await user.keyboard('{Backspace}');

      expect(mockOnTraitsChange).toHaveBeenCalledWith([]);
    });
  });

  describe('keyboard interaction', () => {
    it('should support focus management with Tab key', async () => {
      const user = userEvent.setup();
      render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

      const input = screen.getByLabelText(/add a trait/i);
      const addButton = screen.getByRole('button', { name: /add trait/i });

      input.focus();
      expect(document.activeElement).toBe(input);

      await user.keyboard('{Tab}');
      expect(document.activeElement).toBe(addButton);
    });

    it('should clear input after successfully adding a trait', async () => {
      const user = userEvent.setup();
      render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

      const input = screen.getByLabelText(/add a trait/i) as HTMLInputElement;
      await user.type(input, 'funny');
      await user.keyboard('{Enter}');

      expect(input.value).toBe('');
    });
  });

  describe('accessibility', () => {
    it('should have proper label for input field', () => {
      render(<TraitEditor traits={[]} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

      const input = screen.getByLabelText(/add a trait/i);
      expect(input).toHaveAttribute('id');
    });

    it('should have descriptive aria-label on remove buttons', () => {
      const traits = ['funny'];
      render(
        <TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
      );

      const removeButton = screen.getByLabelText(/remove trait: funny/i);
      expect(removeButton).toBeInTheDocument();
    });

    it('should have a region for displaying traits', () => {
      render(<TraitEditor traits={['funny']} onTraitsChange={mockOnTraitsChange} cardId="card-1" />);

      expect(screen.getByRole('region', { name: /current traits/i })).toBeInTheDocument();
    });

    it('should have proper semantic structure', () => {
      const traits = ['funny', 'tall'];
      render(
        <TraitEditor traits={traits} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
      );

      // Should use list structure for traits
      const traitsList = screen.getByRole('list', { name: /traits list/i });
      expect(traitsList).toBeInTheDocument();

      const items = within(traitsList).getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });
  });

  describe('props updates', () => {
    it('should update when traits prop changes', () => {
      const { rerender } = render(
        <TraitEditor traits={['funny']} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
      );

      expect(screen.getByText('funny')).toBeInTheDocument();

      rerender(
        <TraitEditor traits={['funny', 'tall']} onTraitsChange={mockOnTraitsChange} cardId="card-1" />
      );

      expect(screen.getByText('funny')).toBeInTheDocument();
      expect(screen.getByText('tall')).toBeInTheDocument();
    });
  });
});
