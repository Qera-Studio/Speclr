import { breadcrumbForPath, parentHref } from '../breadcrumb';

describe('parentHref', () => {
  it('sends a create form back to its type list', () => {
    expect(parentHref('/docs/new/exit-letter')).toBe('/docs/exit-letter');
    expect(parentHref('/docs/new/invoice')).toBe('/docs/invoice');
  });

  /** A section crumb is a grouping with no page of its own — skip it. */
  it('skips the non-navigable section crumb', () => {
    expect(parentHref('/docs/invoice')).toBe('/');
  });

  it('sends a single document up to the dashboard', () => {
    expect(parentHref('/docs/2f9c1d84-0f2e-4a1b-9c3d-5e6f7a8b9c0d')).toBe('/');
  });

  it('falls back to the dashboard from the dashboard itself', () => {
    expect(parentHref('/')).toBe('/');
  });

  it('sends a record page up to the dashboard', () => {
    expect(parentHref('/employees')).toBe('/');
  });
});

describe('breadcrumbForPath', () => {
  it('maps the dashboard root to a single Dashboard crumb', () => {
    expect(breadcrumbForPath('/')).toEqual([{ label: 'Dashboard', href: '/' }]);
  });

  it('maps a record link to Dashboard > label', () => {
    expect(breadcrumbForPath('/clients')).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Clients', href: '/clients' },
    ]);
  });

  it('maps the icon spec tool', () => {
    expect(breadcrumbForPath('/spec')).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Icon spec', href: '/spec' },
    ]);
  });

  it('maps a document list through its section', () => {
    expect(breadcrumbForPath('/docs/invoice')).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Client', href: undefined },
      { label: 'Invoice', href: '/docs/invoice' },
    ]);
  });

  it('trails a new-document route through its list, so the type stays navigable', () => {
    expect(breadcrumbForPath('/docs/new/invoice')).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Client', href: undefined },
      { label: 'Invoice', href: '/docs/invoice' },
      { label: 'New', href: '/docs/new/invoice' },
    ]);
  });

  it('maps an HR new-document route through the Admin section', () => {
    expect(breadcrumbForPath('/docs/new/stipend')).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Admin', href: undefined },
      { label: 'Stipend', href: '/docs/stipend' },
      { label: 'New', href: '/docs/new/stipend' },
    ]);
  });

  it('humanizes an unknown leaf segment as a fallback (e.g. an existing document id)', () => {
    expect(breadcrumbForPath('/docs/abc123')).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Documents', href: undefined },
      { label: 'abc123', href: '/docs/abc123' },
    ]);
  });

  it('strips query strings and trailing slashes', () => {
    expect(breadcrumbForPath('/clients/')).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Clients', href: '/clients' },
    ]);
  });
});
