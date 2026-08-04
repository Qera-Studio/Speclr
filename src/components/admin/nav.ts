import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  IdCard,
  Package,
  Image,
  Handshake,
  Briefcase,
  FileSignature,
  ReceiptIndianRupee,
  Receipt,
  FileText,
  Wallet,
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
      { href: '/docs/contract', label: 'Contract', icon: FileSignature },
      { href: '/docs/invoice', label: 'Invoice', icon: ReceiptIndianRupee },
      { href: '/docs/receipt', label: 'Receipt', icon: Receipt },
    ],
  },
  {
    label: 'Admin',
    icon: Briefcase,
    children: [
      { href: '/docs/offer-letter', label: 'Offer letter', icon: FileText },
      { href: '/docs/stipend', label: 'Stipend', icon: Wallet },
      { href: '/docs/experience-letter', label: 'Experience letter', icon: FileBadge },
      { href: '/docs/exit-letter', label: 'Exit letter', icon: FileOutput },
    ],
  },
];

/** Records management — plain links below the document sections. */
export const RECORD_LINKS: NavLink[] = [
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/employees', label: 'Employees', icon: IdCard },
  { href: '/services', label: 'Services', icon: Package },
];

/** Tools — plain links at the bottom of the nav. */
export const TOOL_LINKS: NavLink[] = [
  { href: '/spec', label: 'Icon spec', icon: Image },
  { href: '/kit', label: 'Kit', icon: SwatchBook },
];

/**
 * Settings lives in the account menu at the foot of the nav, not in the nav
 * itself — it configures *you and the studio*, not a document surface. Exported
 * so `UserCard` renders it and `breadcrumb.ts` can still label `/settings`.
 */
export const SETTINGS_LINK: NavLink = { href: '/settings', label: 'Settings', icon: Settings };
