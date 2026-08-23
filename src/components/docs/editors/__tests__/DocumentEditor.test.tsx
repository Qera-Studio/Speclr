import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentEditor from '../DocumentEditor';
import { selectComboboxOption } from '@/test-utils/combobox';
import type { ClientRecord, InvoiceOption } from '@/lib/domain/types';

const push = jest.fn();
const createDraft = jest.fn();
const updateDraft = jest.fn();
const listInvoicesForClient = jest.fn();
const finalizeDocument = jest.fn();
const deleteDraftAction = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/client', useRouter: () => ({ push: (u: string) => push(u), refresh: jest.fn() }) }));
jest.mock('@/server/actions/documents', () => ({
  createDraft: (...a: unknown[]) => createDraft(...a),
  updateDraft: (...a: unknown[]) => updateDraft(...a),
  listInvoicesForClient: (...a: unknown[]) => listInvoicesForClient(...a),
  finalizeDocument: (...a: unknown[]) => finalizeDocument(...a),
  deleteDraftAction: (...a: unknown[]) => deleteDraftAction(...a),
}));

const clients = [
  {
    id: 'c1',
    name: 'Acme Co.',
    address: 'Road',
    email: 'a@b.com',
    phone: '9',
    gstin: '',
    // Unregistered: the place of supply falls back to the address state.
    addressParts: { line1: 'Road', city: 'Ghaziabad', state: 'Uttar Pradesh', pincode: '201017', country: 'IN' },
    createdAt: 0,
    updatedAt: 0,
  },
  { id: 'c2', name: 'Beta Ltd.', address: 'Lane', email: 'b@b.com', phone: '9', gstin: '', createdAt: 0, updatedAt: 0 },
  {
    id: 'c3',
    name: 'Tamil Client',
    address: 'Chennai',
    email: 'c@b.com',
    phone: '9',
    // Registered: the GSTIN's first two digits win over anything else.
    gstin: '33AABCQ2864Q1ZZ',
    addressParts: { line1: 'Anna Salai', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002', country: 'IN' },
    createdAt: 0,
    updatedAt: 0,
  },
] as ClientRecord[];

const invoice: InvoiceOption = {
  id: 'inv-1',
  number: 'QS-INV-2627-001',
  issueDate: '2026-06-10',
  totalPaise: 177000,
  lineItems: [{ description: 'Brand system', ratePaise: 150000, qty: 1 }],
  gstRatePercent: 18,
  placeOfSupplyStateCode: '09',
};

beforeEach(() => {
  jest.clearAllMocks();
  listInvoicesForClient.mockResolvedValue([]);
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:x') });
});

/**
 * Line items render collapsed to a summary; the fields only exist once a row is
 * expanded. `Untitled item` is what an empty row summarises to.
 */
async function expandLineItem(
  u: ReturnType<typeof userEvent.setup>,
  name: RegExp = /Untitled item/,
) {
  await u.click(screen.getByRole('button', { name }));
}

/**
 * There is no Save button — the draft writes itself a second after the typing
 * stops (`AUTOSAVE_MS`). Real timers rather than fake ones: these tests drive
 * Base UI comboboxes, which schedule their own work, and faking the clock under
 * them is a bigger liability than the second this costs.
 */
async function autosaved(action: jest.Mock) {
  await waitFor(() => expect(action).toHaveBeenCalled(), { timeout: 3000 });
}

describe('DocumentEditor (new invoice)', () => {
  it('renders the client picker, a line item, and GST fields', () => {
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    expect(screen.getByLabelText(/^client$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Untitled item/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/gst rate/i)).toBeInTheDocument();
  });

  /**
   * The explanation moved behind an info icon, but it must still be a real
   * focusable control rather than a hover-only affordance — and the label must
   * stay exactly "Place of supply", since anything rendered inside a `<label>`
   * joins the input's accessible name.
   */
  it('explains where place of supply comes from, without crowding the label', () => {
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    expect(screen.getByLabelText('Place of supply')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /where does place of supply come from/i }),
    ).toBeInTheDocument();
  });

  /**
   * Place of supply is derived from the recipient, not typed — `PRINCIPLES.md`
   * rule 3, and the violation that produced a wrong invoice. The field is
   * read-only until someone deliberately overrides it.
   */
  it('derives place of supply from the picked client and shows it read-only', async () => {
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    await selectComboboxOption(u, 'Client', 'Tamil Client');

    const field = screen.getByLabelText('Place of supply');
    expect(field).toHaveValue('33 · Tamil Nadu');
    expect(field).toHaveAttribute('readonly');
  });

  /**
   * A value the reader did not type arrives on screen the same way a bug does.
   * The mechanism is in the info tip because it is the same on every document;
   * *this* document's answer is under the field, because that is the thing
   * being checked. See `ui/derived-note.tsx`.
   */
  it('says where the derived place of supply came from, under the field', async () => {
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    await selectComboboxOption(u, 'Client', 'Tamil Client');
    expect(
      screen.getByText(/first two digits of the client’s GSTIN/i),
    ).toBeInTheDocument();

    // An unregistered client's answer comes from somewhere else, and says so.
    await selectComboboxOption(u, 'Client', 'Acme Co.');
    expect(
      screen.getByText(/comes from the state on their address/i),
    ).toBeInTheDocument();
  });

  it('takes the state from an unregistered client’s address instead', async () => {
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    await selectComboboxOption(u, 'Client', 'Acme Co.');
    expect(screen.getByLabelText('Place of supply')).toHaveValue('09 · Uttar Pradesh');
  });

  it('opens the picker only once the override is switched on, and asks why', async () => {
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    await selectComboboxOption(u, 'Client', 'Acme Co.');
    expect(screen.queryByLabelText('Why')).not.toBeInTheDocument();

    await u.click(screen.getByRole('switch', { name: /override place of supply/i }));

    expect(screen.getByLabelText('Why')).toBeInTheDocument();
    await selectComboboxOption(u, 'Place of supply', '29 · Karnataka');
  });

  /**
   * GST either applies or it does not. Switching it off must actually zero the
   * rate and clear the place of supply — a rate that is merely hidden would go
   * on feeding `computeTotals` and put tax on an invoice whose editor says
   * there is none.
   */
  it('zeroes the rate and place of supply when GST is switched off', async () => {
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    await u.clear(screen.getByLabelText(/gst rate/i));
    await u.type(screen.getByLabelText(/gst rate/i), '18');
    await selectComboboxOption(u, 'Client', 'Acme Co.');
    expect(screen.getByLabelText('Place of supply')).toHaveValue('09 · Uttar Pradesh');

    await u.click(screen.getByRole('switch', { name: /gst applies/i }));

    // The rate branch is gone, the note branch is here instead.
    expect(screen.queryByLabelText(/gst rate/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Place of supply')).not.toBeInTheDocument();
    expect(screen.getByLabelText('GST note')).toBeInTheDocument();

    // And the preview is charging nothing — the values were cleared, not hidden.
    await u.click(screen.getByRole('switch', { name: /gst applies/i }));
    expect(screen.getByLabelText(/gst rate/i)).toHaveValue('0');
    // Re-derived from the client that is still picked, rather than left blank:
    // the code is a fact about the recipient, not something the switch owns.
    expect(screen.getByLabelText('Place of supply')).toHaveValue('09 · Uttar Pradesh');
  });

  it('no longer offers a notes field', () => {
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);
    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument();
  });

  it('creates a draft with rupees converted to paise, with no save button pressed', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-doc' });
    const replaceState = jest.spyOn(window.history, 'replaceState');
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await expandLineItem(u);
    await u.type(screen.getByLabelText(/^description$/i), 'Design');
    await u.type(screen.getByLabelText(/rate \(₹\)/i), '1500');
    await autosaved(createDraft);

    expect(createDraft).toHaveBeenCalledWith(
      'INV',
      'c1',
      expect.objectContaining({
        lineItems: expect.arrayContaining([expect.objectContaining({ ratePaise: 150000 })]),
      }),
    );
    // The URL becomes the draft's own without a navigation — a `router.push`
    // here would remount the editor and take the half-typed document with it.
    expect(replaceState).toHaveBeenCalledWith(null, '', '/client/docs/new-doc');
    expect(push).not.toHaveBeenCalled();
  });

  /** No button to forget, so the affordance is the status line. */
  it('has no save button, and says so once there is something to save', async () => {
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();

    await expandLineItem(u);
    await u.type(screen.getByLabelText(/^description$/i), 'Design');
    expect(screen.getByRole('status')).toHaveTextContent('Pick a client to start saving.');
  });

  it('filters a long client list by typing', async () => {
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    await u.click(screen.getByLabelText(/^client$/i));
    await u.type(screen.getByLabelText(/^client$/i), 'Beta');

    expect(await screen.findByRole('option', { name: 'Beta Ltd.' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Acme Co.' })).not.toBeInTheDocument();
  });

  it('has no invoice picker — that belongs to receipts', () => {
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);
    expect(screen.queryByLabelText(/against invoice/i)).not.toBeInTheDocument();
  });

  it('shows typed line-item text on the document before anything is saved', async () => {
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    await expandLineItem(u);
    await u.type(screen.getByLabelText(/^description$/i), 'Hosting for August');

    // The whole point of the preview: what you type is on the paper at once,
    // not after saving a draft and finding the mistake there.
    const sheet = document.querySelector('.print-sheet');
    expect(sheet).toHaveTextContent('Hosting for August');
  });

  it('names the client in the heading as soon as one is picked', async () => {
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('New invoice');
    await selectComboboxOption(u, /^client$/i, 'Acme Co.');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Acme Co.’s invoice');
  });

  it('reads live form values through a hook, not form.watch()', () => {
    // Guard rail, not style policing. This app builds with `reactCompiler:
    // true`, which memoises an argument-less `watch()` call to its first result
    // for the life of the component — the preview then freezes on the empty
    // form for ever. jsdom runs uncompiled, so no behavioural test above can
    // catch a reintroduction; this can.
    const source = readFileSync(join(__dirname, '..', 'DocumentEditor.tsx'), 'utf8');
    // Both ways it could come back: pulled off the form, or called on it.
    expect(source).not.toMatch(/^\s*watch,\s*$/m);
    expect(source).not.toMatch(/form\.watch\(/);
    expect(source).toMatch(/useWatch\(\{\s*control\s*\}\)/);
  });
});

describe('DocumentEditor (new receipt)', () => {
  it('waits for a client before offering invoices', () => {
    render(<DocumentEditor typeCode="REC" clients={clients} title="New receipt" />);

    expect(screen.getByLabelText('Against invoice')).toBeDisabled();
    expect(listInvoicesForClient).not.toHaveBeenCalled();
  });

  it('lists that client’s finalized invoices once one is chosen', async () => {
    listInvoicesForClient.mockResolvedValue([invoice]);
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="REC" clients={clients} title="New receipt" />);

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');

    expect(listInvoicesForClient).toHaveBeenCalledWith('c1');
    await u.click(await screen.findByLabelText('Against invoice'));
    expect(await screen.findByRole('option', { name: /QS-INV-2627-001/ })).toBeInTheDocument();
  });

  it('fills the receipt from the invoice it settles', async () => {
    listInvoicesForClient.mockResolvedValue([invoice]);
    createDraft.mockResolvedValue({ success: true, id: 'rec-1' });
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="REC" clients={clients} title="New receipt" />);

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await selectComboboxOption(u, 'Against invoice', /QS-INV-2627-001/);

    // Line items, GST and place of supply come across, and stay editable.
    await expandLineItem(u, /Brand system/);
    expect(screen.getByLabelText(/^description$/i)).toHaveValue('Brand system');
    expect(screen.getByLabelText(/rate \(₹\)/i)).toHaveValue('1500.00');
    expect(screen.getByLabelText(/gst rate/i)).toHaveValue('18');
    expect(screen.getByLabelText('Invoice number')).toHaveValue('QS-INV-2627-001');
  });

  it('stores both the invoice id and the number it prints', async () => {
    listInvoicesForClient.mockResolvedValue([invoice]);
    createDraft.mockResolvedValue({ success: true, id: 'rec-1' });
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="REC" clients={clients} title="New receipt" />);

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await selectComboboxOption(u, 'Against invoice', /QS-INV-2627-001/);
    await autosaved(createDraft);

    expect(createDraft).toHaveBeenCalledWith(
      'REC',
      'c1',
      expect.objectContaining({
        payment: expect.objectContaining({
          againstInvoiceId: 'inv-1',
          againstInvoiceNumber: 'QS-INV-2627-001',
        }),
      }),
    );
  });

  it('drops the stored id when the number is edited by hand', async () => {
    listInvoicesForClient.mockResolvedValue([invoice]);
    createDraft.mockResolvedValue({ success: true, id: 'rec-1' });
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="REC" clients={clients} title="New receipt" />);

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await selectComboboxOption(u, 'Against invoice', /QS-INV-2627-001/);
    await u.type(screen.getByLabelText('Invoice number'), '-AMENDED');

    // A stored id that disagrees with the printed number is worse than no id:
    // once the number is retyped, the link can no longer be vouched for.
    //
    // Asserted on the *last* write rather than the first: autosave may already
    // have banked the un-amended version, which is correct — it was true when
    // it was written.
    await waitFor(
      () => {
        const payload = createDraft.mock.calls.at(-1)?.[2] as
          | { payment: Record<string, unknown> }
          | undefined;
        expect(payload?.payment.againstInvoiceNumber).toBe('QS-INV-2627-001-AMENDED');
        expect(payload?.payment.againstInvoiceId).toBeUndefined();
      },
      { timeout: 3000 },
    );
  });
});

describe('DocumentEditor (existing draft)', () => {
  const draft = {
    id: 'd1', type: 'INV', status: 'draft', clientId: 'c1',
    clientSnapshot: { name: 'Acme Co.', address: 'Road', email: 'a@b.com', phone: '9' },
    issueDate: '2026-06-10',
    lineItems: [{ description: 'Design', ratePaise: 150000, qty: 1 }],
    gstRatePercent: 18, placeOfSupplyStateCode: '09',
    createdAt: 0, updatedAt: 0,
  } as unknown as Parameters<typeof DocumentEditor>[0]['doc'];

  it('will not finalize on a single click', async () => {
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} doc={draft} title="Edit invoice draft" />);

    await u.click(screen.getByRole('button', { name: /finalize/i }));

    // Finalizing claims a permanent GST number and makes the document
    // immutable. It must never happen from one stray click.
    expect(finalizeDocument).not.toHaveBeenCalled();
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });

  it('will not delete a draft on a single click', async () => {
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} doc={draft} title="Edit invoice draft" />);

    await u.click(screen.getByRole('button', { name: /delete draft/i }));

    expect(deleteDraftAction).not.toHaveBeenCalled();
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });

  it('deletes once confirmed', async () => {
    deleteDraftAction.mockResolvedValue({ success: true });
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} doc={draft} title="Edit invoice draft" />);

    await u.click(screen.getByRole('button', { name: /delete draft/i }));
    const dialog = await screen.findByRole('alertdialog');
    await u.click(within(dialog).getByRole('button', { name: /^delete$/i }));

    expect(deleteDraftAction).toHaveBeenCalledWith('d1');
  });
});
