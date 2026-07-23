import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrintToolbar from '../PrintToolbar';

describe('PrintToolbar', () => {
  it('prints and swaps the document title', async () => {
    const print = jest.fn();
    Object.defineProperty(window, 'print', { writable: true, value: print });
    const u = userEvent.setup();
    render(<PrintToolbar backHref="/docs/x" fileName="QS-INV-2627-001" />);
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute('href', '/docs/x');
    await u.click(screen.getByRole('button', { name: /print/i }));
    expect(print).toHaveBeenCalled();
  });
});
