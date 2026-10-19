import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';

describe('StatusBadge', () => {
  it('says every status in a word, never colour alone', () => {
    const { rerender } = render(<Badge status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();

    rerender(<Badge status="finalized" />);
    expect(screen.getByText('Finalized')).toBeInTheDocument();

    rerender(<Badge status="void" />);
    expect(screen.getByText('Void')).toBeInTheDocument();
  });

  /** §1.3: a badge is `rounded-sm`. The primitive is a pill; this one is not. */
  it('is a rectangle, not a pill', () => {
    render(<Badge status="draft" />);
    expect(screen.getByText('Draft')).toHaveClass('rounded-sm');
  });

  it('carries no icon: the word is the whole badge', () => {
    const { container } = render(<Badge status="finalized" />);
    expect(container.querySelectorAll('svg')).toHaveLength(0);
  });
});
