import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AdminDocument } from '@/lib/domain/types';

const deleteDraftAction = jest.fn();
const duplicateDocument = jest.fn();
const refresh = jest.fn();
const push = jest.fn();

jest.mock('@/server/actions/documents', () => ({
  deleteDraftAction: (...a: unknown[]) => deleteDraftAction(...a),
  duplicateDocument: (...a: unknown[]) => duplicateDocument(...a),
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/client',
  useRouter: () => ({ push, refresh }),
}));

import DocumentRowActions from '../DocumentRowActions';

// `type` is not optional padding: the row's links are built from it, because a
// document belongs to a profile whatever page it is being listed on.
const draft = { id: 'doc-1', status: 'draft', type: 'INV' } as unknown as AdminDocument;
const finalized = {
  id: 'doc-2',
  status: 'finalized',
  type: 'INV',
  number: 'QS-INV-2627-002',
} as unknown as AdminDocument;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DocumentRowActions', () => {
  it('never deletes without asking first', async () => {
    const user = userEvent.setup();
    render(<DocumentRowActions doc={draft} />);

    // The menu names the row: an unnumbered draft by what kind it is.
    await user.click(screen.getByRole('button', { name: /more actions for draft invoice/i }));
    await user.click(await screen.findByRole('menuitem', { name: /delete draft/i }));

    // The click opens a confirmation; nothing has been deleted yet.
    expect(deleteDraftAction).not.toHaveBeenCalled();
    expect(await screen.findByRole('alertdialog', { name: 'Delete draft' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^delete draft$/i }));
    expect(deleteDraftAction).toHaveBeenCalledWith('doc-1');
  });

  it('duplicates a finalized document and opens the new draft', async () => {
    duplicateDocument.mockResolvedValue({ success: true, id: 'copy-1' });
    const user = userEvent.setup();
    render(<DocumentRowActions doc={finalized} />);

    await user.click(screen.getByRole('button', { name: /more actions for qs-inv-2627-002/i }));
    await user.click(await screen.findByRole('menuitem', { name: /duplicate as new draft/i }));

    expect(duplicateDocument).toHaveBeenCalledWith('doc-2');
    expect(push).toHaveBeenCalledWith('/client/docs/copy-1');
  });

  it('stays put when duplicating fails', async () => {
    duplicateDocument.mockResolvedValue({ success: false, error: 'nope' });
    const user = userEvent.setup();
    render(<DocumentRowActions doc={finalized} />);

    await user.click(screen.getByRole('button', { name: /more actions for qs-inv-2627-002/i }));
    await user.click(await screen.findByRole('menuitem', { name: /duplicate as new draft/i }));

    expect(push).not.toHaveBeenCalled();
  });
});
