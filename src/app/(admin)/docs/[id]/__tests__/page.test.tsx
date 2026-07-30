import { STUDIO_INFO } from '@/lib/domain/studio';
import { render, screen } from '@testing-library/react';
import type { AdminDocument } from '@/lib/domain/types';

const requireAuthorizedUser = jest.fn();
const getDocument = jest.fn();
const listClients = jest.fn(() => Promise.resolve([]));
const listEmployees = jest.fn(() => Promise.resolve([]));
const listServices = jest.fn(() => Promise.resolve([]));
const redirect = jest.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
const notFound = jest.fn(() => {
  throw new Error('NOT_FOUND');
});

jest.mock('@/lib/auth/session', () => ({
  requireAuthorizedUser: (...a: unknown[]) => requireAuthorizedUser(...a),
}));
jest.mock('@/db/store', () => ({
  getDocument: (...a: unknown[]) => getDocument(...a),
  // The routes read the studio's live details for a draft's preview; the real
  // constant is the fallback these documents printed before settings existed.
  getStudioSettings: () => STUDIO_INFO,

  listClients: () => listClients(),
  listEmployees: () => listEmployees(),
  listServices: () => listServices(),
}));
jest.mock('next/navigation', () => ({
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
}));

import DocumentPage from '../page';

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
  render(await DocumentPage({ params: Promise.resolve({ id: 'doc-1' }) }));
}

describe('/docs/[id]', () => {
  it('renders the editor for a draft invoice', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    getDocument.mockResolvedValue(draftInvoice);
    await renderPage();
    expect(screen.getByRole('heading', { name: /edit invoice draft/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
  });

  it('renders the finalized sheet + actions (no edit) for a finalized invoice', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    getDocument.mockResolvedValue(finalInvoice);
    await renderPage();
    expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save draft/i })).not.toBeInTheDocument();
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
  });

  it('redirects an unauthorized user', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHORIZED'));
    await expect(DocumentPage({ params: Promise.resolve({ id: 'doc-1' }) })).rejects.toThrow('REDIRECT:/no-access');
  });

  it('notFound when the document is missing', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    getDocument.mockResolvedValue(null);
    await expect(DocumentPage({ params: Promise.resolve({ id: 'doc-1' }) })).rejects.toThrow('NOT_FOUND');
  });
});
