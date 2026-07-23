export interface NavItem {
  href: string;
  label: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { href: '/', label: 'Dashboard' },
      { href: '/clients', label: 'Clients' },
      { href: '/employees', label: 'Employees' },
      { href: '/services', label: 'Services' },
    ],
  },
  {
    label: 'New document',
    items: [
      { href: '/docs/new/contract', label: 'Contract' },
      { href: '/docs/new/invoice', label: 'Invoice' },
      { href: '/docs/new/receipt', label: 'Receipt' },
      { href: '/docs/new/offer-letter', label: 'Offer letter' },
      { href: '/docs/new/stipend', label: 'Stipend' },
      { href: '/docs/new/experience-letter', label: 'Experience letter' },
      { href: '/docs/new/exit-letter', label: 'Exit letter' },
    ],
  },
  {
    label: 'Tools',
    items: [{ href: '/spec', label: 'Icon spec' }],
  },
];
