import { DASHBOARD_LINK, DOCUMENT_SECTIONS, RECORD_LINKS, SETTINGS_LINK, TOOL_LINKS } from '../nav';

describe('nav model', () => {
  it('points Dashboard at the root', () => {
    expect(DASHBOARD_LINK).toMatchObject({ href: '/', label: 'Dashboard' });
    expect(DASHBOARD_LINK.icon).toBeDefined();
  });

  it('splits documents into Client and Admin sections', () => {
    expect(DOCUMENT_SECTIONS.map((s) => s.label)).toEqual(['Client', 'Admin']);
  });

  // The document links go to each type's *list*, not straight to a blank
  // editor — "new" is a button on the list page.
  it('puts contract/invoice/receipt under Client', () => {
    const client = DOCUMENT_SECTIONS.find((s) => s.label === 'Client')!;
    expect(client.children.map((c) => c.href)).toEqual([
      '/docs/contract',
      '/docs/invoice',
      '/docs/receipt',
    ]);
  });

  it('puts the HR letters and both slips under Admin', () => {
    const admin = DOCUMENT_SECTIONS.find((s) => s.label === 'Admin')!;
    expect(admin.children).toHaveLength(5);
    expect(admin.children.every((c) => c.href.startsWith('/docs/'))).toBe(true);
    expect(admin.children.every((c) => !c.href.startsWith('/docs/new/'))).toBe(true);
  });

  /**
   * Services are not here: a service template exists to be pulled into a
   * contract, so it lives as a section of the contract list. `/services`
   * redirects there rather than 404ing on old bookmarks.
   */
  it('lists the record links, without Services', () => {
    expect(RECORD_LINKS.map((r) => r.href)).toEqual(['/clients', '/employees']);
  });

  it('lists the tools, working ones first', () => {
    expect(TOOL_LINKS.map((t) => t.href)).toEqual([
      '/tools/ctc',
      '/tools/sitemap',
      '/spec',
      '/kit',
    ]);
  });

  it('keeps Settings out of the nav — it belongs to the account menu', () => {
    expect(SETTINGS_LINK).toMatchObject({ href: '/settings', label: 'Settings' });
    expect(TOOL_LINKS.some((t) => t.href === '/settings')).toBe(false);
    expect(DOCUMENT_SECTIONS.some((s) => s.children.some((c) => c.href === '/settings'))).toBe(false);
  });

  /**
   * A duplicate letter would silently shadow one document type: the ⌥ handler
   * takes the first match, so the loser would simply never open.
   */
  it('gives every document type a unique ⌥ shortcut letter', () => {
    const shortcuts = DOCUMENT_SECTIONS.flatMap((s) => s.children).map((c) => c.shortcut);
    expect(shortcuts).toHaveLength(8);
    expect(shortcuts.every((s) => typeof s === 'string' && /^[A-Z]$/.test(s))).toBe(true);
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });

  it('gives every nav entry an icon', () => {
    const all = [DASHBOARD_LINK, SETTINGS_LINK, ...RECORD_LINKS, ...TOOL_LINKS, ...DOCUMENT_SECTIONS];
    for (const entry of all) expect(entry.icon).toBeDefined();
    for (const section of DOCUMENT_SECTIONS) {
      for (const child of section.children) expect(child.icon).toBeDefined();
    }
  });
});
