import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SitemapChart from '../SitemapChart';
import { buildTree } from '@/lib/domain/sitemap';

const originalFetch = global.fetch;

function ok(urls: string[], extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    json: async () => ({
      ok: true,
      origin: 'https://a.test',
      host: 'a.test',
      total: urls.length,
      truncated: false,
      tree: buildTree(urls, 'a.test'),
      ...extra,
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('SitemapChart', () => {
  it('starts empty and cannot be submitted without an address', () => {
    render(<SitemapChart />);

    expect(screen.getByText('No site read yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /read sitemap/i })).toBeDisabled();
  });

  it('draws the tree a site returns, and links the pages it lists', async () => {
    const user = userEvent.setup();
    global.fetch = jest
      .fn()
      .mockResolvedValue(ok(['https://a.test/', 'https://a.test/work/one'])) as never;

    render(<SitemapChart />);
    await user.type(screen.getByRole('textbox', { name: /site address/i }), 'a.test');
    await user.click(screen.getByRole('button', { name: /read sitemap/i }));

    await waitFor(() => expect(screen.getByRole('img', { name: /sitemap tree/i })).toBeInTheDocument());

    expect(screen.getByText(/2 URLs in/)).toBeInTheDocument();
    // The listed page is a link to the live URL; the implied /work segment is not.
    expect(screen.getByRole('link', { name: 'one' })).toHaveAttribute(
      'href',
      'https://a.test/work/one',
    );
    expect(screen.queryByRole('link', { name: 'work' })).not.toBeInTheDocument();
    expect(screen.getByText('work')).toBeInTheDocument();
  });

  it('sends the typed address to the API encoded', async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn().mockResolvedValue(ok(['https://a.test/']));
    global.fetch = fetchMock as never;

    render(<SitemapChart />);
    await user.type(screen.getByRole('textbox', { name: /site address/i }), 'a.test/x?y=1');
    await user.click(screen.getByRole('button', { name: /read sitemap/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith('/api/sitemap?url=a.test%2Fx%3Fy%3D1');
  });

  it("shows the server's reason when a site cannot be read", async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, error: 'No sitemap found — nothing at /sitemap.xml.' }),
    }) as never;

    render(<SitemapChart />);
    await user.type(screen.getByRole('textbox', { name: /site address/i }), 'a.test');
    await user.click(screen.getByRole('button', { name: /read sitemap/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/No sitemap found/);
    expect(screen.queryByRole('img', { name: /sitemap tree/i })).not.toBeInTheDocument();
  });

  it('survives the request itself failing', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as never;

    render(<SitemapChart />);
    await user.type(screen.getByRole('textbox', { name: /site address/i }), 'a.test');
    await user.click(screen.getByRole('button', { name: /read sitemap/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not reach the server/);
  });

  it('says so when a sitemap was too large to draw in full', async () => {
    const user = userEvent.setup();
    global.fetch = jest
      .fn()
      .mockResolvedValue(ok(['https://a.test/'], { total: 4_000, truncated: true })) as never;

    render(<SitemapChart />);
    await user.type(screen.getByRole('textbox', { name: /site address/i }), 'a.test');
    await user.click(screen.getByRole('button', { name: /read sitemap/i }));

    expect(await screen.findByText(/only the first 2,000 are drawn/)).toBeInTheDocument();
  });
});
