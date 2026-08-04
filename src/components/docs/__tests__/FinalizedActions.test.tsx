import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinalizedActions from '../FinalizedActions';

const push = jest.fn();
const duplicateDocument = jest.fn();
const deleteDraftAction = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: (u: string) => push(u) }) }));
jest.mock('@/server/actions/documents', () => ({
  duplicateDocument: (...a: unknown[]) => duplicateDocument(...a),
  deleteDraftAction: (...a: unknown[]) => deleteDraftAction(...a),
}));

describe('FinalizedActions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders a print link and duplicate button', () => {
    render(<FinalizedActions docId="doc-1" />);
    expect(screen.getByRole('link', { name: /print/i })).toHaveAttribute('href', '/docs/doc-1/print');
    expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument();
  });

  it('duplicates and navigates to the new draft', async () => {
    duplicateDocument.mockResolvedValue({ success: true, id: 'new-draft' });
    const u = userEvent.setup();
    render(<FinalizedActions docId="doc-1" />);
    await u.click(screen.getByRole('button', { name: /duplicate/i }));
    expect(duplicateDocument).toHaveBeenCalledWith('doc-1');
    expect(push).toHaveBeenCalledWith('/docs/new-draft');
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
    expect(push).toHaveBeenCalledWith('/');
  });
});
