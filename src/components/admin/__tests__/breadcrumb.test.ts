import { breadcrumbForPath } from '../breadcrumb';

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

  it('maps a new-document route through its section', () => {
    expect(breadcrumbForPath('/docs/new/invoice')).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Client', href: undefined },
      { label: 'Invoice', href: '/docs/new/invoice' },
    ]);
  });

  it('maps an HR new-document route through the Admin section', () => {
    expect(breadcrumbForPath('/docs/new/stipend')).toEqual([
      { label: 'Dashboard', href: '/' },
      { label: 'Admin', href: undefined },
      { label: 'Stipend', href: '/docs/new/stipend' },
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
