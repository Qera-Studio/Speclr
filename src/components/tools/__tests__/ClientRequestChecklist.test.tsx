import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClientRequestChecklist from '../ClientRequestChecklist';

/**
 * There is no logic here beyond ticking, so what is worth pinning is the two
 * things that would quietly break: a checkbox that is not reachable by its own
 * line's text (the ids are generated from that text), and a tick that does not
 * survive a remount — the whole reason the scratchpad exists.
 */
describe('ClientRequestChecklist', () => {
  beforeEach(() => sessionStorage.clear());

  it('ticks a line, and each line names its own checkbox', async () => {
    const user = userEvent.setup();
    render(<ClientRequestChecklist />);

    const gstin = screen.getByRole('checkbox', { name: 'GSTIN' });
    expect(gstin).not.toBeChecked();
    await user.click(gstin);
    expect(gstin).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'PAN' })).not.toBeChecked();
  });

  it('asks a foreign client for its own registrations, not for a GSTIN', async () => {
    const user = userEvent.setup();
    render(<ClientRequestChecklist />);

    expect(screen.getByRole('checkbox', { name: 'GSTIN' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /W-8BEN-E/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /outside india/i }));

    expect(screen.queryByRole('checkbox', { name: 'GSTIN' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'PAN' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /W-8BEN-E/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /VAT number, ABN, EIN/ })).toBeInTheDocument();
    // The lines both lists share stay put.
    expect(screen.getByRole('checkbox', { name: 'Payment terms, in days' })).toBeInTheDocument();
  });

  it('keeps a tick on a shared line when the list switches', async () => {
    const user = userEvent.setup();
    render(<ClientRequestChecklist />);

    await user.click(screen.getByRole('checkbox', { name: 'Signed contract or MSA' }));
    await user.click(screen.getByRole('tab', { name: /outside india/i }));

    expect(screen.getByRole('checkbox', { name: 'Signed contract or MSA' })).toBeChecked();
  });

  it('keeps ticks across a remount, in sessionStorage only', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ClientRequestChecklist />);
    await user.click(screen.getByRole('checkbox', { name: 'PAN card' }));

    // The draft is debounced, so wait for it to land rather than for a fixed
    // delay that a slower machine would beat.
    await waitFor(() =>
      expect(sessionStorage.getItem('speclr:draft:new:request-checklist')).toContain('PAN card'),
    );
    unmount();

    render(<ClientRequestChecklist />);
    expect(await screen.findByRole('checkbox', { name: 'PAN card' })).toBeChecked();
    expect(localStorage.length).toBe(0);
  });
});
