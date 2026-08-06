import { STUDIO_INFO } from '@/lib/domain/studio';
import { render, screen } from '@testing-library/react';

const requireAuthorizedUser = jest.fn();
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
jest.mock('@/server/actions/documents', () => ({
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  finalizeDocument: jest.fn(),
  duplicateDocument: jest.fn(),
  deleteDraftAction: jest.fn(),
}));

import NewDocumentPage from '../page';

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:x') });
});

describe('/docs/new/[type]', () => {
  it('renders the document editor for a valid slug', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    render(await NewDocumentPage({ params: Promise.resolve({ type: 'invoice' }) }));
    expect(screen.getByRole('heading', { name: /new invoice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
  });

  it('notFound for an unknown slug', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'ops@qera.studio' });
    await expect(NewDocumentPage({ params: Promise.resolve({ type: 'nonsense' }) })).rejects.toThrow('NOT_FOUND');
  });

  it('redirects an unauthorized user', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHORIZED'));
    await expect(NewDocumentPage({ params: Promise.resolve({ type: 'invoice' }) })).rejects.toThrow('REDIRECT:/no-access');
  });
});
