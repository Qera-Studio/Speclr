import { NAV_GROUPS } from '../nav';

describe('NAV_GROUPS', () => {
  it('has the three expected groups', () => {
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(['Main', 'New document', 'Tools']);
  });

  it('points main links at the right routes', () => {
    const main = NAV_GROUPS.find((g) => g.label === 'Main')!;
    expect(main.items.map((i) => i.href)).toEqual(['/', '/clients', '/employees', '/services']);
  });

  it('has seven document-type links under New document', () => {
    const docs = NAV_GROUPS.find((g) => g.label === 'New document')!;
    expect(docs.items).toHaveLength(7);
    expect(docs.items.every((i) => i.href.startsWith('/docs/new/'))).toBe(true);
  });

  it('links Icon spec under Tools', () => {
    const tools = NAV_GROUPS.find((g) => g.label === 'Tools')!;
    expect(tools.items).toEqual([{ href: '/spec', label: 'Icon spec' }]);
  });
});
