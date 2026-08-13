import { STUDIO_INFO } from '@/lib/domain/studio';
import { render, screen } from '@testing-library/react';
import type { AdminDocument } from '@/lib/domain/types';

const requireAuthorizedUser = jest.fn();
const getDocument = jest.fn();
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
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/client',
  redirect: (u: string) => redirect(u),
  notFound: () => notFound(),
  useSearchParams: () => new URLSearchParams(),
}));

import PrintPage from '../PrintRoute';

const invoice = {
  type: 'INV', status: 'finalized', number: 'QS-INV-2627-001', issueDate: '2026-06-10',
  gstRatePercent: 18, placeOfSupplyStateCode: '09',
  clientSnapshot: { name: 'Acme Co.', address: 'Road', phone: '9', email: 'a@b.com', gstin: '' },
  lineItems: [{ description: 'Design', detail: '', ratePaise: 100000, qty: 1 }],
  gstLabel: null, notes: '', id: 'doc-1',
} as unknown as AdminDocument;

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:x') });
});

async function renderPage() {
  render(await PrintPage({ params: Promise.resolve({ id: 'doc-1' }), profile: 'client' }));
}

describe('/docs/[id]/print', () => {
  it('renders the sheet and print toolbar for an authorized invoice', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    getDocument.mockResolvedValue(invoice);
    await renderPage();
    expect(screen.getByText('Acme Co.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute('href', '/client/docs/doc-1');
  });

  it('redirects an unauthorized user', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHORIZED'));
    await expect(PrintPage({ params: Promise.resolve({ id: 'doc-1' }), profile: 'client' })).rejects.toThrow('REDIRECT:/no-access');
  });

  it('notFound when the document is missing', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    getDocument.mockResolvedValue(null);
    await expect(PrintPage({ params: Promise.resolve({ id: 'doc-1' }), profile: 'client' })).rejects.toThrow('NOT_FOUND');
  });
});
