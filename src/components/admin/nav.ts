import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  IdCard,
  Package,
  FileSignature,
  ReceiptIndianRupee,
  Receipt,
  FileText,
  Wallet,
  FileBadge,
  FileOutput,
  Image,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/clients', label: 'Clients', icon: Users },
      { href: '/employees', label: 'Employees', icon: IdCard },
      { href: '/services', label: 'Services', icon: Package },
    ],
  },
  {
    label: 'New document',
    items: [
      { href: '/docs/new/contract', label: 'Contract', icon: FileSignature },
      { href: '/docs/new/invoice', label: 'Invoice', icon: ReceiptIndianRupee },
      { href: '/docs/new/receipt', label: 'Receipt', icon: Receipt },
      { href: '/docs/new/offer-letter', label: 'Offer letter', icon: FileText },
      { href: '/docs/new/stipend', label: 'Stipend', icon: Wallet },
      { href: '/docs/new/experience-letter', label: 'Experience letter', icon: FileBadge },
      { href: '/docs/new/exit-letter', label: 'Exit letter', icon: FileOutput },
    ],
  },
  {
    label: 'Tools',
    items: [{ href: '/spec', label: 'Icon spec', icon: Image }],
  },
];
