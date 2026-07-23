import { DASHBOARD_LINK, DOCUMENT_SECTIONS, RECORD_LINKS, TOOL_LINKS } from '../nav';

describe('nav model', () => {
  it('points Dashboard at the root', () => {
    expect(DASHBOARD_LINK).toMatchObject({ href: '/', label: 'Dashboard' });
    expect(DASHBOARD_LINK.icon).toBeDefined();
  });

  it('splits documents into Client and Admin sections', () => {
    expect(DOCUMENT_SECTIONS.map((s) => s.label)).toEqual(['Client', 'Admin']);
  });

  it('puts contract/invoice/receipt under Client', () => {
    const client = DOCUMENT_SECTIONS.find((s) => s.label === 'Client')!;
    expect(client.children.map((c) => c.href)).toEqual([
      '/docs/new/contract',
      '/docs/new/invoice',
      '/docs/new/receipt',
    ]);
  });

  it('puts the four HR letters under Admin', () => {
    const admin = DOCUMENT_SECTIONS.find((s) => s.label === 'Admin')!;
    expect(admin.children).toHaveLength(4);
    expect(admin.children.every((c) => c.href.startsWith('/docs/new/'))).toBe(true);
  });

  it('lists the three record links', () => {
    expect(RECORD_LINKS.map((r) => r.href)).toEqual(['/clients', '/employees', '/services']);
  });

  it('links Icon spec under tools', () => {
    expect(TOOL_LINKS).toHaveLength(1);
    expect(TOOL_LINKS[0]).toMatchObject({ href: '/spec', label: 'Icon spec' });
  });

  it('gives every nav entry an icon', () => {
    const all = [DASHBOARD_LINK, ...RECORD_LINKS, ...TOOL_LINKS, ...DOCUMENT_SECTIONS];
    for (const entry of all) expect(entry.icon).toBeDefined();
    for (const section of DOCUMENT_SECTIONS) {
      for (const child of section.children) expect(child.icon).toBeDefined();
    }
  });
});
