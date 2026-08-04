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
  useRouter: () => ({ push, refresh }),
}));

import DocumentRowActions from '../DocumentRowActions';

const draft = { id: 'doc-1', status: 'draft' } as unknown as AdminDocument;
const finalized = { id: 'doc-2', status: 'finalized' } as unknown as AdminDocument;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DocumentRowActions', () => {
  it('never deletes without asking first', async () => {
    const user = userEvent.setup();
    render(<DocumentRowActions doc={draft} />);

    await user.click(screen.getByRole('button', { name: /delete draft/i }));

    // The click opens a confirmation; nothing has been deleted yet.
    expect(deleteDraftAction).not.toHaveBeenCalled();
    expect(await screen.findByText('Delete this draft?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(deleteDraftAction).toHaveBeenCalledWith('doc-1');
  });

  it('duplicates a finalized document and opens the new draft', async () => {
    duplicateDocument.mockResolvedValue({ success: true, id: 'copy-1' });
    const user = userEvent.setup();
    render(<DocumentRowActions doc={finalized} />);

    await user.click(screen.getByRole('button', { name: /duplicate as new draft/i }));

    expect(duplicateDocument).toHaveBeenCalledWith('doc-2');
    expect(push).toHaveBeenCalledWith('/docs/copy-1');
  });

  it('stays put when duplicating fails', async () => {
    duplicateDocument.mockResolvedValue({ success: false, error: 'nope' });
    const user = userEvent.setup();
    render(<DocumentRowActions doc={finalized} />);

    await user.click(screen.getByRole('button', { name: /duplicate as new draft/i }));

    expect(push).not.toHaveBeenCalled();
  });
});
