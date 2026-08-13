import { render, screen } from '@testing-library/react';

const requireAuthorizedUser = jest.fn();
const redirect = jest.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});

jest.mock('@/lib/auth/session', () => ({
  requireAuthorizedUser: (...args: unknown[]) => requireAuthorizedUser(...args),
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/client',
  redirect: (url: string) => redirect(url),
}));

import SpecPage from '../page';

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:mock') });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
});

describe('/spec page', () => {
  it('renders the icon tool for an authorized user', async () => {
    requireAuthorizedUser.mockResolvedValue({ email: 'shivanshu@qera.studio' });
    render(await SpecPage());
    expect(screen.getByRole('heading', { level: 1, name: /icon & logo spec checklist/i })).toBeInTheDocument();
  });

  it('redirects a signed-in but unauthorized user to /no-access', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHORIZED'));
    await expect(SpecPage()).rejects.toThrow('REDIRECT:/no-access');
  });

  it('redirects an unauthenticated user to /sign-in', async () => {
    requireAuthorizedUser.mockRejectedValue(new Error('UNAUTHENTICATED'));
    await expect(SpecPage()).rejects.toThrow('REDIRECT:/sign-in');
  });
});
