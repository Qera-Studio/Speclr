import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SearchHit } from '@/server/actions/search';

const searchAll = jest.fn<Promise<SearchHit[]>, [string]>();
const push = jest.fn();

jest.mock('@/server/actions/search', () => ({ searchAll: (q: string) => searchAll(q) }));
jest.mock('next/navigation', () => ({
  usePathname: () => '/client', useRouter: () => ({ push }) }));

import SearchCommand from '../SearchCommand';

const hits: SearchHit[] = [
  {
    id: 'doc-1',
    group: 'Documents',
    label: 'QS-INV-2627-001',
    hint: 'Invoice · Acme Co.',
    href: '/docs/doc-1',
  },
  { id: 'c-1', group: 'Clients', label: 'Acme Co.', hint: 'Acme Private Limited', href: '/clients' },
];

/** Waits past the input debounce and lets the resulting state settle. */
async function settleDebounce() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  searchAll.mockResolvedValue(hits);
});

describe('SearchCommand', () => {
  it('shows grouped results for a query', async () => {
    const user = userEvent.setup();
    render(<SearchCommand />);

    await user.type(screen.getByRole('combobox', { name: /search/i }), 'acme');
    await settleDebounce();

    expect(searchAll).toHaveBeenCalledWith('acme');
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Clients')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /QS-INV-2627-001/ })).toBeInTheDocument();
  });

  it('does not query on a single character', async () => {
    const user = userEvent.setup();
    render(<SearchCommand />);

    await user.type(screen.getByRole('combobox', { name: /search/i }), 'a');
    await settleDebounce();

    expect(searchAll).not.toHaveBeenCalled();
  });

  it('opens the first result on Enter', async () => {
    const user = userEvent.setup();
    render(<SearchCommand />);

    await user.type(screen.getByRole('combobox', { name: /search/i }), 'acme');
    await settleDebounce();
    await user.keyboard('{Enter}');

    expect(push).toHaveBeenCalledWith('/docs/doc-1');
  });

  it('moves the active option with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<SearchCommand />);

    await user.type(screen.getByRole('combobox', { name: /search/i }), 'acme');
    await settleDebounce();
    await user.keyboard('{ArrowDown}{Enter}');

    expect(push).toHaveBeenCalledWith('/clients');
  });

  it('says so when nothing matches', async () => {
    searchAll.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<SearchCommand />);

    await user.type(screen.getByRole('combobox', { name: /search/i }), 'zzz');
    await settleDebounce();

    expect(screen.getByText(/no matches/i)).toBeInTheDocument();
  });

  /**
   * The ⌘K binding listens on `document`, so it sees every keydown on the page
   * — including synthetic ones dispatched by component libraries and autofill,
   * which need not carry a `key`. Reading `.toLowerCase()` off one of those
   * crashed the whole page while typing in an unrelated field.
   */
  it('survives a keydown event that carries no key', () => {
    render(<SearchCommand />);

    // Asserted through the window `error` event, not `toThrow` — a listener
    // that throws does not propagate out of `dispatchEvent`; the DOM reports
    // it here instead, which is exactly how it reached the Next.js overlay.
    const onError = jest.fn();
    window.addEventListener('error', onError);
    document.dispatchEvent(new Event('keydown', { bubbles: true }));
    window.removeEventListener('error', onError);

    expect(onError).not.toHaveBeenCalled();
  });

  it('stays quiet when the lookup fails', async () => {
    searchAll.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    render(<SearchCommand />);

    await user.type(screen.getByRole('combobox', { name: /search/i }), 'acme');
    await settleDebounce();

    expect(screen.getByText(/no matches/i)).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
});
