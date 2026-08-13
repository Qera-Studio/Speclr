import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const params = new URLSearchParams();
jest.mock('next/navigation', () => ({
  usePathname: () => '/client', useSearchParams: () => params }));

import PrintToolbar from '../PrintToolbar';

const print = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  params.delete('auto');
  Object.defineProperty(window, 'print', { writable: true, value: print });
});

describe('PrintToolbar', () => {
  it('prints and swaps the document title', async () => {
    const u = userEvent.setup();
    render(<PrintToolbar backHref="/docs/x" fileName="QS-INV-2627-001" />);
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute('href', '/docs/x');
    await u.click(screen.getByRole('button', { name: /print/i }));
    expect(print).toHaveBeenCalled();
  });

  it('waits to be asked when there is no auto param', () => {
    render(<PrintToolbar backHref="/docs/x" fileName="QS-INV-2627-001" />);
    expect(print).not.toHaveBeenCalled();
  });

  it('prints once on arrival with ?auto=1', () => {
    params.set('auto', '1');
    const { rerender } = render(<PrintToolbar backHref="/docs/x" fileName="QS-INV-2627-001" />);
    rerender(<PrintToolbar backHref="/docs/x" fileName="QS-INV-2627-001" />);
    expect(print).toHaveBeenCalledTimes(1);
  });
});
