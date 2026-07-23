import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Paginator from '../Paginator';

describe('Paginator (un-measured jsdom fallback)', () => {
  it('renders all blocks and the zoom/pager controls', () => {
    render(<Paginator>{[<div key="a">Block A</div>, <div key="b">Block B</div>]}</Paginator>);
    expect(screen.getByText('Block A')).toBeInTheDocument();
    expect(screen.getByText('Block B')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^fit$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /100%/ })).toBeInTheDocument();
    expect(screen.getByText(/page 1 \//i)).toBeInTheDocument();
  });

  it('toggles zoom to 100%', async () => {
    const u = userEvent.setup();
    render(<Paginator>{[<div key="a">A</div>]}</Paginator>);
    await u.click(screen.getByRole('button', { name: /100%/ }));
    expect(screen.getByRole('button', { name: /100%/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
