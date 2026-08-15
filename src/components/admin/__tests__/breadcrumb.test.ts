import { breadcrumbForPath, parentHref } from '../breadcrumb';

/**
 * Every trail is rooted at its *profile's* home rather than a global one: the
 * app is two applications sharing a shell, and a crumb offering to navigate up
 * past the profile would be offering somewhere the profile cannot reach.
 *
 * The profile itself is never a crumb — the switcher above the breadcrumb
 * already says which side you are on.
 */

describe('parentHref', () => {
  it('sends a create form back to its type list', () => {
    expect(parentHref('/admin/docs/new/exit-letter')).toBe('/admin/docs/exit-letter');
    expect(parentHref('/client/docs/new/invoice')).toBe('/client/docs/invoice');
  });

  it('sends a document list up to its own profile home', () => {
    expect(parentHref('/client/docs/invoice')).toBe('/client');
    expect(parentHref('/admin/docs/pay-slip')).toBe('/admin');
  });

  it('sends a single document up to its own profile home', () => {
    expect(parentHref('/client/docs/2f9c1d84-0f2e-4a1b-9c3d-5e6f7a8b9c0d')).toBe('/client');
  });

  it('falls back to a home from a home itself', () => {
    expect(parentHref('/client')).toBe('/client');
    expect(parentHref('/admin')).toBe('/admin');
  });

  it('sends a record page up to its own profile home', () => {
    expect(parentHref('/admin/employees')).toBe('/admin');
    expect(parentHref('/client/clients')).toBe('/client');
  });
});

describe('breadcrumbForPath', () => {
  it('maps a profile home to a single Dashboard crumb', () => {
    expect(breadcrumbForPath('/client')).toEqual([{ label: 'Dashboard', href: '/client' }]);
    expect(breadcrumbForPath('/admin')).toEqual([{ label: 'Dashboard', href: '/admin' }]);
  });

  it('maps a record link to Dashboard > label', () => {
    expect(breadcrumbForPath('/client/clients')).toEqual([
      { label: 'Dashboard', href: '/client' },
      { label: 'Clients', href: '/client/clients' },
    ]);
  });

  /**
   * A client id is not a reference anyone quotes — unlike a document number —
   * so humanizing the last segment printed thirty-six characters of hex across
   * the top of the onboarding page. The trail cannot name the client (it has
   * only the path; the record is in the database), so it says what kind of
   * thing this is and keeps the list navigable.
   */
  it('names the kind rather than printing a client’s uuid', () => {
    expect(breadcrumbForPath('/client/clients/95d22130-5aae-4944-893c-3e4029017cc3')).toEqual([
      { label: 'Dashboard', href: '/client' },
      { label: 'Clients', href: '/client/clients' },
      {
        label: 'Client',
        href: '/client/clients/95d22130-5aae-4944-893c-3e4029017cc3',
      },
    ]);
  });

  it('labels the create route as a new client', () => {
    expect(breadcrumbForPath('/client/clients/new')).toEqual([
      { label: 'Dashboard', href: '/client' },
      { label: 'Clients', href: '/client/clients' },
      { label: 'New client', href: '/client/clients/new' },
    ]);
  });

  it('maps the icon spec tool, which lives on the admin side', () => {
    expect(breadcrumbForPath('/admin/spec')).toEqual([
      { label: 'Dashboard', href: '/admin' },
      { label: 'Icon spec', href: '/admin/spec' },
    ]);
  });

  /**
   * The "Client" / "Admin" section crumb is gone: those two sections *are* the
   * profiles now, and repeating the switcher's own word on every page was one
   * crumb of pure noise.
   */
  it('maps a document list straight under its home, with no section crumb', () => {
    expect(breadcrumbForPath('/client/docs/invoice')).toEqual([
      { label: 'Dashboard', href: '/client' },
      { label: 'Invoice', href: '/client/docs/invoice' },
    ]);
  });

  it('trails a new-document route through its list, so the type stays navigable', () => {
    expect(breadcrumbForPath('/client/docs/new/invoice')).toEqual([
      { label: 'Dashboard', href: '/client' },
      { label: 'Invoice', href: '/client/docs/invoice' },
      { label: 'New', href: '/client/docs/new/invoice' },
    ]);
  });

  it('trails an HR new-document route through the admin home', () => {
    expect(breadcrumbForPath('/admin/docs/new/stipend')).toEqual([
      { label: 'Dashboard', href: '/admin' },
      { label: 'Stipend', href: '/admin/docs/stipend' },
      { label: 'New', href: '/admin/docs/new/stipend' },
    ]);
  });

  it('shows an unknown document leaf verbatim (an existing document id)', () => {
    expect(breadcrumbForPath('/admin/docs/abc123')).toEqual([
      { label: 'Dashboard', href: '/admin' },
      { label: 'Documents', href: undefined },
      { label: 'abc123', href: '/admin/docs/abc123' },
    ]);
  });

  it('strips query strings and trailing slashes', () => {
    expect(breadcrumbForPath('/client/clients/')).toEqual([
      { label: 'Dashboard', href: '/client' },
      { label: 'Clients', href: '/client/clients' },
    ]);
    expect(breadcrumbForPath('/admin/spec?zoom=2')).toEqual([
      { label: 'Dashboard', href: '/admin' },
      { label: 'Icon spec', href: '/admin/spec' },
    ]);
  });

  /**
   * `/` and the legacy redirect routes sit outside both profiles. They render
   * nothing but a redirect, so this only has to not throw.
   */
  it('falls back to the client home for a path outside both profiles', () => {
    expect(breadcrumbForPath('/')).toEqual([{ label: 'Dashboard', href: '/client' }]);
  });
});
