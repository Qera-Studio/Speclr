import { DOC_TYPE_LIST } from '@/lib/domain/registry';
import { PROFILES, profileOfDocType } from '@/lib/profile';
import { NAV_BY_PROFILE, SETTINGS_LINK, linksForProfile, shortcutForSlug } from '../nav';

describe('nav model', () => {
  it('gives each profile a home at its own root', () => {
    expect(NAV_BY_PROFILE.client.home).toMatchObject({ href: '/client', label: 'Dashboard' });
    expect(NAV_BY_PROFILE.admin.home).toMatchObject({ href: '/admin', label: 'Dashboard' });
  });

  // The document links go to each type's *list*, not straight to a blank
  // editor — "new" is a button on the list page.
  it('puts contract/invoice/receipt/quotation/credit note in the client profile', () => {
    expect(NAV_BY_PROFILE.client.documents.map((c) => c.href)).toEqual([
      '/client/docs/contract',
      '/client/docs/invoice',
      '/client/docs/receipt',
      '/client/docs/quotation',
      '/client/docs/credit-note',
    ]);
  });

  it('puts the HR letters and both slips in the admin profile', () => {
    const { documents } = NAV_BY_PROFILE.admin;
    expect(documents).toHaveLength(5);
    expect(documents.every((c) => c.href.startsWith('/admin/docs/'))).toBe(true);
    expect(documents.every((c) => !c.href.includes('/docs/new/'))).toBe(true);
  });

  /**
   * The nav is what the ⌘D palette and the breadcrumbs read, so a document type
   * missing from it is a type with no way in and no label. This is the check
   * that a ninth type cannot be added and quietly left out of both profiles.
   */
  it('lists every registered document type exactly once, on its own side', () => {
    for (const profile of PROFILES) {
      const hrefs = NAV_BY_PROFILE[profile].documents.map((d) => d.href);
      const expected = DOC_TYPE_LIST.filter((s) => profileOfDocType(s.code) === profile).map(
        (s) => `/${profile}/docs/${s.slug}`,
      );
      expect([...hrefs].sort()).toEqual([...expected].sort());
    }
  });

  /**
   * Records are *who* the documents are about — clients and employees. Services
   * and clauses are contract source material, not parties, so they are a
   * Library group rather than records.
   */
  it('gives each profile the records it is about', () => {
    expect(NAV_BY_PROFILE.client.records.map((r) => r.href)).toEqual(['/client/clients']);
    expect(NAV_BY_PROFILE.admin.records.map((r) => r.href)).toEqual(['/admin/employees']);
  });

  /**
   * The trailing group is labelled per profile: Client's two libraries are
   * contract source material, not instruments of the studio, and calling them
   * "Tools" beside the CTC calculator would say they were the same kind of
   * thing.
   */
  it('gives the client a Library and the admin its Tools', () => {
    expect(NAV_BY_PROFILE.client.groups).toHaveLength(1);
    expect(NAV_BY_PROFILE.client.groups[0].label).toBe('Library');
    expect(NAV_BY_PROFILE.client.groups[0].links.map((l) => l.href)).toEqual([
      '/client/services',
      '/client/clauses',
      '/client/checklist',
    ]);

    expect(NAV_BY_PROFILE.admin.groups).toHaveLength(1);
    expect(NAV_BY_PROFILE.admin.groups[0].label).toBe('Tools');
    expect(NAV_BY_PROFILE.admin.groups[0].links.map((t) => t.href)).toEqual([
      '/admin/tools/ctc',
      '/admin/tools/sitemap',
      '/admin/spec',
      '/admin/kit',
    ]);
  });

  /**
   * The flat-rail trial (August 2026), and the reason the assertions above are
   * unchanged: `rail` is additive. The grouped fields stay the source of truth
   * for the ⌘D palette, the ⌥ shortcuts, the breadcrumb and the index pages the
   * rows point at — so deleting this one field is the whole undo.
   */
  describe('the flattened admin rail', () => {
    it('gives admin four rows and the client none', () => {
      expect(NAV_BY_PROFILE.client.rail).toBeUndefined();
      expect(NAV_BY_PROFILE.admin.rail?.map((e) => e.link.label)).toEqual([
        'Dashboard',
        'Records',
        'Documents',
        'Tools',
      ]);
    });

    it('sends Records to the record page rather than an index of one card', () => {
      const records = NAV_BY_PROFILE.admin.rail?.[1];
      expect(records?.link.href).toBe('/admin/employees');
      expect(records?.covers).toEqual(NAV_BY_PROFILE.admin.records);
    });

    /**
     * `covers` is what keeps a row lit on the pages its index page leads to.
     * Tools is the case that needs it: two of its four links sit outside
     * `/admin/tools` entirely.
     */
    it('has each row cover exactly the group it stands in for', () => {
      const [, , documents, tools] = NAV_BY_PROFILE.admin.rail ?? [];
      expect(documents.link.href).toBe('/admin/docs');
      expect(documents.covers).toEqual(NAV_BY_PROFILE.admin.documents);

      expect(tools.link.href).toBe('/admin/tools');
      expect(tools.covers).toEqual(NAV_BY_PROFILE.admin.groups[0].links);
      expect(tools.covers.map((l) => l.href)).toContain('/admin/spec');
    });

    it('lets the breadcrumb label the index pages the rail introduced', () => {
      const hrefs = linksForProfile('admin').map((l) => l.href);
      expect(hrefs).toContain('/admin/docs');
      expect(hrefs).toContain('/admin/tools');
    });

    /**
     * The rail renames Employees to Records; the page it opens still calls
     * itself Employees, and so should the trail above it. Rail entries lead the
     * list precisely so the grouped label wins this collision.
     */
    it('does not rename the record page under the breadcrumb', () => {
      const labels = linksForProfile('admin').filter((l) => l.href === '/admin/employees');
      expect(labels[labels.length - 1].label).toBe('Employees');
    });
  });

  it('keeps Settings out of the nav — it belongs to the account menu', () => {
    expect(SETTINGS_LINK).toMatchObject({ href: '/admin/settings', label: 'Settings' });
    for (const profile of PROFILES) {
      expect(linksForProfile(profile).some((l) => l.href === SETTINGS_LINK.href)).toBe(false);
    }
  });

  /**
   * A duplicate letter would silently shadow one document type. The ⌥ handler
   * is a global keydown and each palette only offers its own profile's links,
   * so a letter reused across profiles would open different documents depending
   * on which side you happened to be looking at — worse than a clash, because
   * it only misfires half the time.
   */
  it('gives every document type a unique ⌥ shortcut letter across both profiles', () => {
    const shortcuts = PROFILES.flatMap((p) => NAV_BY_PROFILE[p].documents).map((c) => c.shortcut);
    expect(shortcuts).toHaveLength(10);
    expect(shortcuts.every((s) => typeof s === 'string' && /^[A-Z]$/.test(s))).toBe(true);
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });

  it('finds a type’s shortcut from its slug alone, whichever profile it is on', () => {
    expect(shortcutForSlug('invoice')).toBe('I');
    expect(shortcutForSlug('pay-slip')).toBe('P');
    expect(shortcutForSlug('nonsense')).toBeUndefined();
  });

  it('gives every nav entry an icon', () => {
    for (const profile of PROFILES) {
      expect(NAV_BY_PROFILE[profile].icon).toBeDefined();
      for (const link of linksForProfile(profile)) expect(link.icon).toBeDefined();
    }
    expect(SETTINGS_LINK.icon).toBeDefined();
  });
});
