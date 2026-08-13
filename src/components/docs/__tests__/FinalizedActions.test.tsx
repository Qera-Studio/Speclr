import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinalizedActions from '../FinalizedActions';

const push = jest.fn();
const duplicateDocument = jest.fn();
const copySlipForNextMonth = jest.fn();
const deleteDraftAction = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/client', useRouter: () => ({ push: (u: string) => push(u) }) }));
jest.mock('@/server/actions/documents', () => ({
  duplicateDocument: (...a: unknown[]) => duplicateDocument(...a),
  copySlipForNextMonth: (...a: unknown[]) => copySlipForNextMonth(...a),
  deleteDraftAction: (...a: unknown[]) => deleteDraftAction(...a),
}));

describe('FinalizedActions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a print link and duplicate button', () => {
    render(<FinalizedActions docId="doc-1" />);
    expect(screen.getByRole('link', { name: /print/i })).toHaveAttribute('href', '/client/docs/doc-1/print');
    expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument();
  });

  it('duplicates and navigates to the new draft', async () => {
    duplicateDocument.mockResolvedValue({ success: true, id: 'new-draft' });
    const u = userEvent.setup();
    render(<FinalizedActions docId="doc-1" />);
    await u.click(screen.getByRole('button', { name: /duplicate/i }));
    expect(duplicateDocument).toHaveBeenCalledWith('doc-1');
    expect(push).toHaveBeenCalledWith('/client/docs/new-draft');
  });

  it('shows an error when duplicate fails', async () => {
    duplicateDocument.mockResolvedValue({ success: false, error: 'Nope.' });
    const u = userEvent.setup();
    render(<FinalizedActions docId="doc-1" />);
    await u.click(screen.getByRole('button', { name: /duplicate/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nope.');
  });

  // Pre-launch escape hatch. NODE_ENV is 'test' here, so DEV_UNLIMITED is on;
  // a production build inlines it false and drops the button entirely.
  it('deletes a finalized document via the dev-only button', async () => {
    deleteDraftAction.mockResolvedValue({ success: true });
    const u = userEvent.setup();
    render(<FinalizedActions docId="doc-1" />);
    await u.click(screen.getByRole('button', { name: /delete \(dev only\)/i }));
    await u.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(deleteDraftAction).toHaveBeenCalledWith('doc-1');
    expect(push).toHaveBeenCalledWith('/client');
  });

  /**
   * Only a slip covers a month, and the two copy actions are deliberately not
   * one button: Duplicate keeps the wage month, which is how an issued slip
   * gets corrected; Next month moves it on. A correction landing silently in
   * the following month would be very hard to spot afterwards.
   */
  describe('a slip', () => {
    it('offers both copies, and neither on anything else', () => {
      const { unmount } = render(<FinalizedActions docId="slip-1" isSlip />);
      expect(screen.getByRole('button', { name: /copy for next month/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument();
      unmount();

      render(<FinalizedActions docId="inv-1" />);
      expect(screen.queryByRole('button', { name: /next month/i })).not.toBeInTheDocument();
    });

    it('copies forward and opens the new draft', async () => {
      copySlipForNextMonth.mockResolvedValue({ success: true, id: 'july-slip' });
      const u = userEvent.setup();
      render(<FinalizedActions docId="slip-1" isSlip />);

      await u.click(screen.getByRole('button', { name: /copy for next month/i }));

      expect(copySlipForNextMonth).toHaveBeenCalledWith('slip-1');
      expect(duplicateDocument).not.toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith('/client/docs/july-slip');
    });

    it('reports a refusal instead of navigating', async () => {
      copySlipForNextMonth.mockResolvedValue({ success: false, error: 'No wage month.' });
      const u = userEvent.setup();
      render(<FinalizedActions docId="slip-1" isSlip />);

      await u.click(screen.getByRole('button', { name: /copy for next month/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent('No wage month.');
      expect(push).not.toHaveBeenCalled();
    });
  });
});
