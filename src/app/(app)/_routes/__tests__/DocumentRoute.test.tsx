import { STUDIO_INFO } from '@/lib/domain/studio';
import { render, screen } from '@testing-library/react';
import type { AdminDocument } from '@/lib/domain/types';

const requireAuthorizedUser = jest.fn();
const getDocument = jest.fn();
const listClients = jest.fn(() => Promise.resolve([]));
const listEmployees = jest.fn(() => Promise.resolve([]));
const listServices = jest.fn(() => Promise.resolve([]));
const listDocumentsByType = jest.fn(() => Promise.resolve([]));
const getLatestFinalizedInvoice = jest.fn(() => Promise.resolve(null));
const redirect = jest.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const notFound = jest.fn(() => {
  throw new Error('NOT_FOUND');
});

jest.mock('@/lib/auth/session', () => ({
  requireAuthorizedUser: (...a: unknown[]) => requireAuthorizedUser(...a),
}));
// `listClauses` is deliberately absent: this route must never fetch the clause
// library, because an existing contract already carries its own copy. If a
// future edit adds the call, these tests fail loudly rather than quietly
// rewriting words in documents that may already be relied upon.
jest.mock('@/db/store', () => ({
  getDocument: (...a: unknown[]) => getDocument(...a),
  // The routes read the studio's live details for a draft's preview; the real
  // constant is the fallback these documents printed before settings existed.
  getStudioSettings: () => STUDIO_INFO,

  listClients: () => listClients(),
  listEmployees: () => listEmployees(),
  listServices: () => listServices(),
  listExclusions: () => Promise.resolve([]),
  listClientInputs: () => Promise.resolve([]),
  listDocumentsByType: (...a: unknown[]) => listDocumentsByType(...(a as [])),
  getLatestFinalizedInvoice: () => getLatestFinalizedInvoice(),
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/client',
  redirect: (u: string) => redirect(u),
  notFound: () => notFound(),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));
// The client editors import server actions (which pull next/cache) — stub the
// module so importing the page under test doesn't drag server-only APIs in.
jest.mock('@/server/actions/documents', () => ({
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  finalizeDocument: jest.fn(),
  duplicateDocument: jest.fn(),
  deleteDraftAction: jest.fn(),
  createReceiptForInvoice: jest.fn(),
}));
import DocumentPage from '../DocumentRoute';

const draftInvoice = {
  id: 'doc-1', type: 'INV', status: 'draft', issueDate: '2026-06-10', gstRatePercent: 18,
  placeOfSupplyStateCode: '09', clientId: '', clientSnapshot: { name: '', address: '', email: '', phone: '' },
  lineItems: [{ description: '', detail: '', ratePaise: 0, qty: 1 }], gstLabel: null, notes: '',
  createdAt: 0, updatedAt: 0,
} as unknown as AdminDocument;

const finalInvoice = { ...draftInvoice, status: 'finalized', number: 'QS-INV-2627-001',
  clientSnapshot: { name: 'Acme Co.', address: 'R', email: 'a@b.com', phone: '9' } } as unknown as AdminDocument;

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:x') });
});

async function renderPage() {
  render(await DocumentPage({ params: Promise.resolve({ id: 'doc-1' }), profile: 'client' }));
}

describe('/docs/[id]', () => {
  it('renders the editor for a draft invoice', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    getDocument.mockResolvedValue(draftInvoice);
    await renderPage();
    expect(screen.getByRole('heading', { name: /edit invoice draft/i })).toBeInTheDocument();
    // Finalize marks the editor now. There is no save button — the draft writes
    // itself — and Finalize appears exactly when there is a row to finalize.
    expect(screen.getByRole('button', { name: /finalize/i })).toBeInTheDocument();
  });

  it('renders the finalized sheet + actions (no edit) for a finalized invoice', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    getDocument.mockResolvedValue(finalInvoice);
    await renderPage();
    expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument();
    // No editor at all: a finalized document is immutable, so the route never
    // mounts one — and with it no Finalize button and no autosave.
    expect(screen.queryByRole('button', { name: /finalize/i })).not.toBeInTheDocument();
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
  });

  it('renders the type list — not a document — for a doc-type slug', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    render(await DocumentPage({ params: Promise.resolve({ id: 'invoice' }), profile: 'client' }));

    expect(screen.getByRole('heading', { name: 'Invoices' })).toBeInTheDocument();
    // Two of them while the list is empty: the header CTA and the empty state.
    for (const link of screen.getAllByRole('link', { name: /new invoice/i })) {
      expect(link).toHaveAttribute('href', '/client/docs/new/invoice');
    }
    expect(listDocumentsByType).toHaveBeenCalledWith('INV');
    // A slug must never be looked up as a document id.
    expect(getDocument).not.toHaveBeenCalled();
  });

  it('offers a receipt against the latest invoice, on the receipt list only', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    getLatestFinalizedInvoice.mockResolvedValue({
      id: 'inv-1',
      number: 'QS-INV-2627-001',
    } as never);

    render(await DocumentPage({ params: Promise.resolve({ id: 'receipt' }), profile: 'client' }));

    expect(screen.getByRole('button', { name: /receipt for QS-INV-2627-001/i })).toBeInTheDocument();
  });

  it('hides the receipt shortcut when nothing has been invoiced yet', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    getLatestFinalizedInvoice.mockResolvedValue(null);

    render(await DocumentPage({ params: Promise.resolve({ id: 'receipt' }), profile: 'client' }));

    expect(screen.queryByRole('button', { name: /receipt for/i })).not.toBeInTheDocument();
  });

  it('redirects an unauthorized user', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHORIZED'));
    await expect(DocumentPage({ params: Promise.resolve({ id: 'doc-1' }), profile: 'client' })).rejects.toThrow('REDIRECT:/no-access');
  });

  it('notFound when the document is missing', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    getDocument.mockResolvedValue(null);
    await expect(DocumentPage({ params: Promise.resolve({ id: 'doc-1' }), profile: 'client' })).rejects.toThrow('NOT_FOUND');
  });

  /**
   * The profile guards. A slug and a document id are treated differently on
   * purpose: a slug under the wrong prefix names nothing and never did, while a
   * document id names something real that merely moved — and these links get
   * emailed and bookmarked.
   */
  describe('wrong profile', () => {
    beforeEach(() => requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' }));

    it('404s a document type belonging to the other profile', async () => {
      await expect(
        DocumentPage({ params: Promise.resolve({ id: 'pay-slip' }), profile: 'client' }),
      ).rejects.toThrow('NOT_FOUND');
      expect(listDocumentsByType).not.toHaveBeenCalled();
    });

    it('still serves a type belonging to this profile', async () => {
      render(await DocumentPage({ params: Promise.resolve({ id: 'invoice' }), profile: 'client' }));
      expect(listDocumentsByType).toHaveBeenCalledWith('INV');
    });

    it('forwards a real document asked for under the wrong prefix', async () => {
      getDocument.mockResolvedValue({ ...draftInvoice, id: 'doc-9' });
      await expect(
        DocumentPage({ params: Promise.resolve({ id: 'doc-9' }), profile: 'admin' }),
      ).rejects.toThrow('REDIRECT:/client/docs/doc-9');
    });

    it('forwards an HR document out of the client profile', async () => {
      getDocument.mockResolvedValue({ ...draftInvoice, id: 'slip-3', type: 'PAY' });
      await expect(
        DocumentPage({ params: Promise.resolve({ id: 'slip-3' }), profile: 'client' }),
      ).rejects.toThrow('REDIRECT:/admin/docs/slip-3');
    });
  });
});

/**
 * A contract already in the database carries its own clauses. Editing the
 * library at `/client/clauses` must not reach it — the same rule
 * `studioSnapshot` enforces for the studio's details (CONTEXT.md §5).
 *
 * The `@/db/store` mock above has no `listClauses`, so calling it would throw.
 * That is the assertion: opening an existing contract does not read the live
 * library at all.
 */
describe('DocumentRoute and the clause library', () => {
  it('opens an existing contract without reading the live library', async () => {
    requireAuthorizedUser.mockResolvedValue({});
    getDocument.mockResolvedValue({
      id: 'con-1',
      type: 'CON',
      status: 'draft',
      issueDate: '2026-06-10',
      clientId: 'c1',
      clientSnapshot: { name: 'Acme', address: 'x', email: 'a@b.com', phone: '9' },
      contract: { parts: [], blanks: {}, library: {} },
      content: { clauses: [{ number: 1, heading: 'As signed', body: ['Original wording.'] }] },
      createdAt: 0,
      updatedAt: 0,
    } as unknown as AdminDocument);

    // Rendering at all is the assertion: `listClauses` is not in the mock, so
    // a route that reached for the live library would throw here.
    render(
      await DocumentPage({ params: Promise.resolve({ id: 'con-1' }), profile: 'client' }),
    );

    expect(screen.getByLabelText(/^client$/i)).toBeInTheDocument();
  });
});
