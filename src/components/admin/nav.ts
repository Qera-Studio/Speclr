import type { LucideIcon } from 'lucide-react';
import {
  Calculator,
  LayoutDashboard,
  Users,
  IdCard,
  Image,
  Network,
  Handshake,
  Briefcase,
  FileSignature,
  ReceiptIndianRupee,
  Receipt,
  FileText,
  Wallet,
  Banknote,
  FileBadge,
  FileOutput,
  Settings,
  SwatchBook,
} from 'lucide-react';

/** A single navigable destination. */
export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Letter that, held with Alt/Option, jumps straight into a *new* document of
   * this type — and the hint shown beside it in the ⌘D palette. Only the
   * document sections carry one; `NewDocumentCommand` reads them from here so
   * the palette's grouping, labels and icons can never drift from the nav's.
   */
  shortcut?: string;
}

/** A collapsible parent that expands into a sub-list of links (left-line). */
export interface NavSection {
  label: string;
  icon: LucideIcon;
  children: NavLink[];
}

/** The dashboard link that sits alone at the very top. */
export const DASHBOARD_LINK: NavLink = {
  href: '/',
  label: 'Dashboard',
  icon: LayoutDashboard,
};

/** Collapsible document sections (each renders a left-line sub-list). */
export const DOCUMENT_SECTIONS: NavSection[] = [
  {
    label: 'Client',
    icon: Handshake,
    children: [
      { href: '/docs/contract', label: 'Contract', icon: FileSignature, shortcut: 'C' },
      { href: '/docs/invoice', label: 'Invoice', icon: ReceiptIndianRupee, shortcut: 'I' },
      { href: '/docs/receipt', label: 'Receipt', icon: Receipt, shortcut: 'R' },
    ],
  },
  {
    label: 'Admin',
    icon: Briefcase,
    children: [
      { href: '/docs/offer-letter', label: 'Offer letter', icon: FileText, shortcut: 'O' },
      { href: '/docs/stipend', label: 'Stipend', icon: Wallet, shortcut: 'S' },
      { href: '/docs/pay-slip', label: 'Pay slip', icon: Banknote, shortcut: 'P' },
      { href: '/docs/experience-letter', label: 'Experience letter', icon: FileBadge, shortcut: 'E' },
      { href: '/docs/exit-letter', label: 'Exit letter', icon: FileOutput, shortcut: 'X' },
    ],
  },
];

/**
 * The ⌥ letter for a document type, by slug. Lets a "New <type>" button show
 * the same hint the ⌘D palette does — both land on `/docs/new/<slug>`, so the
 * shortcut and the button are genuinely the same action.
 */
export function shortcutForSlug(slug: string): string | undefined {
  return DOCUMENT_SECTIONS.flatMap((s) => s.children).find((c) => c.href === `/docs/${slug}`)
    ?.shortcut;
}

/**
 * Records management — plain links below the document sections.
 *
 * Services are deliberately absent: a service template exists to be pulled into
 * a contract, so it lives as a section of the contract list rather than as a
 * nav entry of its own. `/services` redirects there.
 */
export const RECORD_LINKS: NavLink[] = [
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/employees', label: 'Employees', icon: IdCard },
];

/** Tools — plain links at the bottom of the nav. */
export const TOOL_LINKS: NavLink[] = [
  { href: '/tools/ctc', label: 'CTC calculator', icon: Calculator },
  { href: '/tools/sitemap', label: 'Sitemap chart', icon: Network },
  { href: '/spec', label: 'Icon spec', icon: Image },
  { href: '/kit', label: 'UI Kit', icon: SwatchBook },
];

/**
 * Settings lives in the account menu at the foot of the nav, not in the nav
 * itself — it configures *you and the studio*, not a document surface. Exported
 * so `UserCard` renders it and `breadcrumb.ts` can still label `/settings`.
 */
export const SETTINGS_LINK: NavLink = { href: '/settings', label: 'Settings', icon: Settings };
