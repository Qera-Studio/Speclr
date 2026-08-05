import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, within } from '@testing-library/react';
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
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: (u: string) => push(u), refresh: jest.fn() }) }));
jest.mock('@/server/actions/documents', () => ({
  createDraft: (...a: unknown[]) => createDraft(...a),
  updateDraft: (...a: unknown[]) => updateDraft(...a),
  listInvoicesForClient: (...a: unknown[]) => listInvoicesForClient(...a),
  finalizeDocument: (...a: unknown[]) => finalizeDocument(...a),
  deleteDraftAction: (...a: unknown[]) => deleteDraftAction(...a),
}));

const clients = [
  { id: 'c1', name: 'Acme Co.', address: 'Road', email: 'a@b.com', phone: '9', gstin: '', createdAt: 0, updatedAt: 0 },
  { id: 'c2', name: 'Beta Ltd.', address: 'Lane', email: 'b@b.com', phone: '9', gstin: '', createdAt: 0, updatedAt: 0 },
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
  it('states the place-of-supply requirement without crowding the label', () => {
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    expect(screen.getByLabelText('Place of supply')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /why is place of supply required/i }),
    ).toBeInTheDocument();
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
    await selectComboboxOption(u, 'Place of supply', '09 — Uttar Pradesh');

    await u.click(screen.getByRole('switch', { name: /gst applies/i }));

    // The rate branch is gone, the note branch is here instead.
    expect(screen.queryByLabelText(/gst rate/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Place of supply')).not.toBeInTheDocument();
    expect(screen.getByLabelText('GST note')).toBeInTheDocument();

    // And the preview is charging nothing — the values were cleared, not hidden.
    await u.click(screen.getByRole('switch', { name: /gst applies/i }));
    expect(screen.getByLabelText(/gst rate/i)).toHaveValue('0');
    expect(screen.getByLabelText('Place of supply')).toHaveValue('');
  });

  it('no longer offers a notes field', () => {
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);
    expect(screen.queryByLabelText(/notes/i)).not.toBeInTheDocument();
  });

  it('creates a draft with rupees converted to paise on save', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-doc' });
    const u = userEvent.setup();
    render(<DocumentEditor typeCode="INV" clients={clients} title="New invoice" />);

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await expandLineItem(u);
    await u.type(screen.getByLabelText(/^description$/i), 'Design');
    await u.type(screen.getByLabelText(/rate \(₹\)/i), '1500');
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'INV',
      'c1',
      expect.objectContaining({
        lineItems: expect.arrayContaining([expect.objectContaining({ ratePaise: 150000 })]),
      }),
    );
    expect(push).toHaveBeenCalledWith('/docs/new-doc');
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
    await u.click(screen.getByRole('button', { name: /save draft/i }));

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
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    // A stored id that disagrees with the printed number is worse than no id:
    // once the number is retyped, the link can no longer be vouched for.
    const payload = createDraft.mock.calls[0][2] as { payment: Record<string, unknown> };
    expect(payload.payment.againstInvoiceNumber).toBe('QS-INV-2627-001-AMENDED');
    expect(payload.payment.againstInvoiceId).toBeUndefined();
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
