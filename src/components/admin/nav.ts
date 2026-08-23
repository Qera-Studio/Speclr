import type { LucideIcon } from 'lucide-react';
import {
  Calculator,
  LayoutDashboard,
  Users,
  IdCard,
  Image,
  Network,
  ListChecks,
  Handshake,
  Briefcase,
  Package,
  Scale,
  FileSignature,
  ReceiptIndianRupee,
  Receipt,
  FileText,
  Wallet,
  Banknote,
  FileBadge,
  FileOutput,
  FileStack,
  Wrench,
  Settings,
  SwatchBook,
} from 'lucide-react';
import { PROFILES, type Profile } from '@/lib/profile';

/** A single navigable destination. */
export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Letter that, held with Alt/Option, jumps straight into a *new* document of
   * this type — and the hint shown beside it in the ⌘D palette. Only the
   * document links carry one; `NewDocumentCommand` reads them from here so
   * the palette's grouping, labels and icons can never drift from the nav's.
   *
   * Letters are unique across *both* profiles even though each palette only
   * offers its own. ⌥ is a global keydown, and a letter that meant two things
   * depending on which side you were looking at is the kind of shortcut that
   * gets pressed by muscle memory and opens the wrong document.
   */
  shortcut?: string;
  /**
   * Letter that, pressed after `g`, jumps to this page.
   *
   * Only the *destinations* carry one: the home, the records, the library and
   * the two admin index pages. The document types already have `shortcut`,
   * which creates rather than navigates, and giving one link both would be two
   * bindings whose difference is a modifier nobody can see.
   *
   * Unique across both profiles, for the same reason `shortcut` is: `g` is a
   * global sequence, and a letter that meant two things depending on which side
   * you were looking at is the kind of binding that gets pressed by muscle
   * memory and lands somewhere else. The one deliberate exception is `h`, which
   * both homes carry: "home" means the side you are on, which is the answer a
   * person pressing it wants either way.
   */
  jump?: string;
}

/** A labelled block of links in the rail, below the document types. */
export interface NavGroup {
  label: string;
  links: NavLink[];
}

/**
 * One row of a **flattened** rail: a single link that stands in for a whole
 * group, with an index page behind it.
 *
 * `covers` is what the row speaks for. Without it, a row pointing at
 * `/admin/tools` would go dark the moment you opened `/admin/spec` — which is
 * one of the pages it just sent you to, but is not under its href.
 */
export interface RailEntry {
  link: NavLink;
  /** Pages this row stands in for, so it stays lit while you are on one. */
  covers: NavLink[];
}

/**
 * One profile's entire navigation.
 *
 * The two profiles are separate applications sharing a shell, so each owns its
 * own home, its own records and its own document types — there is no list here
 * that spans both. Anything that genuinely needs both sides goes through
 * `src/lib/profile.ts`, which is the one documented seam.
 *
 * `home`, `records` and `documents` are named fields rather than more `groups`
 * because things read them by name: the ⌘D palette and the ⌥ shortcut lookup
 * want `documents` specifically, not "whichever group happens to hold document
 * types". Everything after them is just a labelled list, so it is one.
 */
export interface ProfileNav {
  /** Shown on the profile switcher. */
  label: string;
  icon: LucideIcon;
  home: NavLink;
  records: NavLink[];
  documents: NavLink[];
  /** Trailing groups — Client's Library, Admin's Tools. Empty renders nothing. */
  groups: NavGroup[];
  /**
   * A flat rail, replacing the grouped one — **a trial, added 14 August 2026,
   * and only the admin profile has it.**
   *
   * Present means `ProfileNavBody` renders these rows and nothing else: no
   * section headings, no create button. Absent means it renders `records`,
   * `documents` and `groups` exactly as it always has, which is what the client
   * still does.
   *
   * Nothing else reads this. The fields above stay the source of truth for the
   * ⌘D palette, the ⌥ shortcuts, the breadcrumb and the index pages the rows
   * point at — so **undoing the trial is deleting this one field**.
   */
  rail?: RailEntry[];
}

/**
 * Admin's document types and tools, named once because the flat rail and the
 * grouped fields below both point at them. Two copies would be two lists to
 * keep in step, and the rail's whole job is to stand in for these.
 */
const ADMIN_DOCUMENTS: NavLink[] = [
  { href: '/admin/docs/offer-letter', label: 'Offer letter', icon: FileText, shortcut: 'O' },
  { href: '/admin/docs/stipend', label: 'Stipend', icon: Wallet, shortcut: 'S' },
  { href: '/admin/docs/pay-slip', label: 'Pay slip', icon: Banknote, shortcut: 'P' },
  {
    href: '/admin/docs/experience-letter',
    label: 'Experience letter',
    icon: FileBadge,
    shortcut: 'E',
  },
  { href: '/admin/docs/exit-letter', label: 'Exit letter', icon: FileOutput, shortcut: 'X' },
];

const ADMIN_TOOLS: NavLink[] = [
  { href: '/admin/tools/ctc', label: 'CTC calculator', icon: Calculator },
  { href: '/admin/tools/sitemap', label: 'Sitemap chart', icon: Network },
  { href: '/admin/spec', label: 'Icon spec', icon: Image },
  { href: '/admin/kit', label: 'UI Kit', icon: SwatchBook },
];

const ADMIN_RECORDS: NavLink[] = [{ href: '/admin/employees', label: 'Employees', icon: IdCard, jump: 'E' }];

export const NAV_BY_PROFILE: Record<Profile, ProfileNav> = {
  client: {
    label: 'Client',
    icon: Handshake,
    home: { href: '/client', label: 'Dashboard', icon: LayoutDashboard, jump: 'H' },
    // "Clients", not "Records". The section name and the page's own heading
    // were different words for one thing, so the rail, the breadcrumb and the
    // h1 disagreed on what you were looking at. The client side holds exactly
    // one kind of record, so the grouping name bought nothing.
    records: [{ href: '/client/clients', label: 'Clients', icon: Users, jump: 'C' }],
    documents: [
      { href: '/client/docs/contract', label: 'Contract', icon: FileSignature, shortcut: 'C' },
      { href: '/client/docs/invoice', label: 'Invoice', icon: ReceiptIndianRupee, shortcut: 'I' },
      { href: '/client/docs/receipt', label: 'Receipt', icon: Receipt, shortcut: 'R' },
    ],
    // Contract *source material*: the Services a contract pulls in as Parts,
    // and the clauses of the Master Agreement it is built from. They belong
    // beside the contracts they feed. The label is unused — the client rail
    // renders no section headings — but the group is what keeps them together
    // below the records row.
    groups: [
      {
        label: 'Library',
        links: [
          { href: '/client/services', label: 'Service catalogue', icon: Package, jump: 'S' },
          { href: '/client/clauses', label: 'Clause library', icon: Scale, jump: 'L' },
          // Not a tool of the studio's either: it is the list of what a client
          // has to hand over before a record can be filled in, so it sits with
          // the other source material a client engagement starts from.
          { href: '/client/checklist', label: 'Checklist', icon: ListChecks, jump: 'K' },
        ],
      },
    ],
  },
  admin: {
    label: 'Admin',
    icon: Briefcase,
    home: { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, jump: 'H' },
    records: ADMIN_RECORDS,
    documents: ADMIN_DOCUMENTS,
    groups: [{ label: 'Tools', links: ADMIN_TOOLS }],
    // The trial. Four rows, no headings, no buttons — see `rail` on
    // `ProfileNav` for what it replaces and how to undo it.
    rail: [
      { link: { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, jump: 'H' }, covers: [] },
      // Straight through to the one record page rather than an index of one
      // card, but named for the section it replaces.
      { link: { ...ADMIN_RECORDS[0], label: 'Records' }, covers: ADMIN_RECORDS },
      {
        link: { href: '/admin/docs', label: 'Documents', icon: FileStack, jump: 'D' },
        covers: ADMIN_DOCUMENTS,
      },
      { link: { href: '/admin/tools', label: 'Tools', icon: Wrench, jump: 'T' }, covers: ADMIN_TOOLS },
    ],
  },
};

/** Every link in one profile, flattened — for breadcrumbs and active matching. */
export function linksForProfile(profile: Profile): NavLink[] {
  const nav = NAV_BY_PROFILE[profile];
  return [
    // Rail entries lead so that where the two disagree the grouped name wins:
    // the rail says "Records", but `/admin/employees` keeps its "Employees"
    // breadcrumb, which is what that page's own heading says. What the rail
    // contributes here is the index hrefs, which exist nowhere else.
    ...(nav.rail?.map((entry) => entry.link) ?? []),
    nav.home,
    ...nav.records,
    ...nav.documents,
    ...nav.groups.flatMap((g) => g.links),
  ];
}

/**
 * The ⌥ letter for a document type, by slug. Lets a "New <type>" button show
 * the same hint the ⌘D palette does — both land on `…/docs/new/<slug>`, so the
 * shortcut and the button are genuinely the same action.
 *
 * Matched on the href's tail rather than the whole string: the caller knows the
 * slug but not necessarily which profile it belongs to, and the slug alone is
 * unique across the registry.
 */
export function shortcutForSlug(slug: string): string | undefined {
  return PROFILES.flatMap((p) => NAV_BY_PROFILE[p].documents).find((c) =>
    c.href.endsWith(`/docs/${slug}`),
  )?.shortcut;
}

/**
 * Settings lives in the account menu at the foot of the nav, not in the nav
 * itself — it configures *you and the studio*, not a document surface. Exported
 * so `UserCard` renders it and `breadcrumb.ts` can still label it.
 *
 * It sits under `/admin` because the studio's own identity is admin business;
 * the account menu shows it from either profile, which is the one deliberate
 * cross-profile link in the chrome.
 */
export const SETTINGS_LINK: NavLink = {
  href: '/admin/settings',
  label: 'Settings',
  icon: Settings,
};

/**
 * The `g`-then-letter destinations for one profile, in rail order.
 *
 * Derived from the nav rather than listed again, so a page that moves takes its
 * binding with it and a page that is removed cannot leave a shortcut pointing
 * at a 404. Deduped by letter because the admin rail restates its records row
 * under a different label; first wins, which is the rail's own wording.
 */
export function jumpsForProfile(profile: Profile): NavLink[] {
  const seen = new Set<string>();
  return linksForProfile(profile).filter((link) => {
    if (!link.jump || seen.has(link.jump)) return false;
    seen.add(link.jump);
    return true;
  });
}
