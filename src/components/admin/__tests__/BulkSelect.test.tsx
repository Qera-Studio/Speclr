import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AdminDocument } from '@/lib/domain/types';

const deleteDraftAction = jest.fn();
const refresh = jest.fn();
const toastError = jest.fn();

jest.mock('@/server/actions/documents', () => ({
  deleteDraftAction: (...args: unknown[]) => deleteDraftAction(...args),
  duplicateDocument: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/client',
  useRouter: () => ({ push: jest.fn(), refresh }),
}));
jest.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

/**
 * `DEV_UNLIMITED` is `NODE_ENV !== 'production'`, so under Jest it is *on* and
 * a finalized document really is deletable — that is the pre-launch escape
 * hatch working as designed. Mocked to `false` here so these tests describe the
 * shipped behaviour: the immutability rule (`CONTEXT.md` §4) is the guarantee
 * worth pinning, and a suite that only ever sees the dev regime would let a
 * change that offers bulk delete on finalized documents pass in silence. The
 * dev regime gets its own test at the bottom.
 */
let devUnlimited = false;
jest.mock('@/lib/devMode', () => ({
  get DEV_UNLIMITED() {
    return devUnlimited;
  },
}));

import DocumentsBrowser from '../DocumentsBrowser';

const line = (paise: number) => [{ description: 'Work', qty: 1, ratePaise: paise }];

/**
 * One finalized document and two drafts. The mix is the point: a finalized
 * document is immutable (`CONTEXT.md` §4) and must not be offered a checkbox at
 * all, so a fixture of drafts alone would pass a table that ticks everything.
 */
const documents = [
  {
    id: 'd1',
    type: 'INV',
    status: 'finalized',
    number: 'QS-INV-2627-001',
    issueDate: '2026-06-10',
    clientSnapshot: { name: 'Acme Co.' },
    lineItems: line(100000),
    gstRatePercent: 0,
  },
  {
    id: 'd2',
    type: 'REC',
    status: 'draft',
    number: null,
    issueDate: '2026-07-20',
    clientSnapshot: { name: 'Beta Ltd.' },
    lineItems: line(500000),
    gstRatePercent: 0,
  },
  {
    id: 'd3',
    type: 'INV',
    status: 'draft',
    number: null,
    issueDate: '2026-07-21',
    clientSnapshot: { name: 'Gamma Ltd.' },
    lineItems: line(700000),
    gstRatePercent: 0,
  },
] as unknown as AdminDocument[];

/**
 * Every row checkbox, in row order. Keyed on the row labels rather than by
 * excluding the header's, because the header's own label flips to "Clear
 * selection" once everything is ticked and an exclusion list would then let it
 * through.
 */
const rowBoxes = () =>
  screen
    .getAllByRole('checkbox')
    .filter((box) => /^(Select|Deselect) row$/.test(box.getAttribute('aria-label') ?? ''));

/** The bulk bar's own delete, not a row's. */
const bulkDelete = () =>
  screen.getByRole('button', { name: /^delete$/i });

beforeEach(() => {
  devUnlimited = false;
  deleteDraftAction.mockReset().mockResolvedValue({ success: true });
  refresh.mockReset();
  toastError.mockReset();
});

describe('bulk selection on the documents list', () => {
  it('offers a checkbox on drafts only, never on a finalized document', () => {
    render(<DocumentsBrowser documents={documents} />);
    // Two drafts, so two row boxes, plus the header's select-all.
    expect(rowBoxes()).toHaveLength(2);
  });

  /**
   * The select-all is furniture until it is wanted. jsdom cannot measure
   * opacity, but it can read the class that produces it, and the class is the
   * whole mechanism — there is no second path to the hidden state.
   */
  it('hides the select-all until its cell is hovered', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    const all = screen.getByRole('checkbox', { name: 'Select all rows' });
    expect(all.className).toMatch(/opacity-0/);

    // Once a selection is under way it stays lit: at that point the column is
    // the thing being read and select-all is the next likely move.
    await user.click(rowBoxes()[0]);
    expect(
      screen.getByRole('checkbox', { name: 'Select all rows' }).className,
    ).not.toMatch(/opacity-0/);
  });

  it('shows nothing at the bottom until something is ticked', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();

    await user.click(rowBoxes()[0]);
    expect(screen.getByText('1 document selected')).toBeInTheDocument();
  });

  it('pluralises the count', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await user.click(rowBoxes()[0]);
    await user.click(rowBoxes()[1]);
    expect(screen.getByText('2 documents selected')).toBeInTheDocument();
  });

  /**
   * Select-all means the deletable rows, not every row. If it ticked the
   * finalized document too, the count would say 3 and the delete would be
   * refused for one of them by a server the operator never asked.
   */
  it('select-all ticks only what can be deleted', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    expect(screen.getByText('2 documents selected')).toBeInTheDocument();
  });

  /**
   * The guarantee that actually matters, and the one worth a test of its own:
   * whatever ends up in the selection, the *delete* reaches deletable rows only.
   *
   * The count alone does not prove it. `chosen` filters ineligible rows out on
   * the way to the bar, so a select-all that swept up every id would still
   * report 2 — and a stray id has no checkbox to reveal it either, since a
   * non-deletable row renders an empty cell. The server call is the one place
   * the corruption would become visible, which is why it is asserted here and
   * not in the DOM.
   */
  it('never calls delete for a finalized document, whatever is selected', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);

    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }));
    await user.click(bulkDelete());
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(deleteDraftAction).toHaveBeenCalledTimes(2));
    expect(deleteDraftAction).not.toHaveBeenCalledWith('d1');
  });

  it('clears the selection', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await user.click(rowBoxes()[0]);
    await user.click(screen.getByRole('button', { name: /clear/i }));
    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument();
  });

  it('deletes each ticked document, once, after confirming', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await user.click(rowBoxes()[0]);
    await user.click(rowBoxes()[1]);

    await user.click(bulkDelete());
    // The confirm dialog, not the bar's own trigger.
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(deleteDraftAction).toHaveBeenCalledTimes(2));
    expect(deleteDraftAction).toHaveBeenCalledWith('d2');
    expect(deleteDraftAction).toHaveBeenCalledWith('d3');
    expect(refresh).toHaveBeenCalled();
  });

  /**
   * The confirm is solid red, not the default. `AlertDialogAction` takes the
   * button variant as a prop and defaults to the primary one, so omitting it
   * is a silent way to end up with a blue Delete on a destructive dialog.
   */
  it('confirms in red', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await user.click(rowBoxes()[0]);
    await user.click(bulkDelete());

    const dialog = await screen.findByRole('alertdialog');
    const confirm = within(dialog).getByRole('button', { name: /^delete$/i });
    // `bg-destructive` is what `AlertDialogAction` adds *only* for the
    // destructive variant, so it is the one class that proves the prop was
    // passed. A looser match hits the variant selectors in Button's own base
    // classes and passes with the prop removed, which is how this was caught.
    expect(confirm.className).toMatch(/\bbg-destructive\b/);
  });

  it('asks before deleting anything', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await user.click(rowBoxes()[0]);
    await user.click(bulkDelete());

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(deleteDraftAction).not.toHaveBeenCalled();
  });

  /**
   * A server that refuses three of five must not look like a success. This is
   * the half most likely to be quietly dropped in a later refactor: the loop
   * resolves either way, so nothing breaks if the count is never read.
   */
  it('reports what the server refused rather than swallowing it', async () => {
    deleteDraftAction
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'Nope.' });

    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows' }));

    await user.click(bulkDelete());
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastError.mock.calls[0][0]).toMatch(/1 of 2 could not be deleted/);
  });

  it('says nothing when every delete succeeded', async () => {
    const user = userEvent.setup();
    render(<DocumentsBrowser documents={documents} />);
    await user.click(rowBoxes()[0]);

    await user.click(bulkDelete());
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(toastError).not.toHaveBeenCalled();
  });

  /**
   * The other half of the immutability rule. Pre-launch, a finalized document
   * *is* disposable and the escape hatch has to reach the bulk path too, or the
   * single-row delete and this one disagree about what can be thrown away.
   */
  it('offers the finalized document too while the dev escape hatch is on', () => {
    devUnlimited = true;
    render(<DocumentsBrowser documents={documents} />);
    expect(rowBoxes()).toHaveLength(3);
  });
});
