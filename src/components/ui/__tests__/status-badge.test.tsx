import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../status-badge';

describe('StatusBadge', () => {
  it('says every status in a word, never colour alone', () => {
    const { rerender } = render(<StatusBadge status="draft" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();

    rerender(<StatusBadge status="finalized" />);
    expect(screen.getByText('Finalized')).toBeInTheDocument();

    rerender(<StatusBadge status="void" />);
    expect(screen.getByText('Void')).toBeInTheDocument();
  });

  it('carries no icon: the word is the whole badge', () => {
    const { container } = render(<StatusBadge status="finalized" />);
    expect(container.querySelectorAll('svg')).toHaveLength(0);
  });
});
