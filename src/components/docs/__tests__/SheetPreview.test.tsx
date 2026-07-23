import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SheetPreview from '../SheetPreview';

describe('SheetPreview', () => {
  it('renders children and zoom controls', () => {
    render(
      <SheetPreview>
        <div>Sheet body</div>
      </SheetPreview>
    );
    expect(screen.getByText('Sheet body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^fit$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /100%/ })).toBeInTheDocument();
  });

  it('toggles to 100%', async () => {
    const u = userEvent.setup();
    render(
      <SheetPreview>
        <div>x</div>
      </SheetPreview>
    );
    await u.click(screen.getByRole('button', { name: /100%/ }));
    expect(screen.getByRole('button', { name: /100%/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
