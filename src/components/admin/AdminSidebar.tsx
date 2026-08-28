"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, PanelLeft, Plus } from "lucide-react";
import { Shortcut } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { PROFILES, type Profile } from "@/lib/profile";
import {
  NAV_BY_PROFILE,
  type NavLink,
  type ProfileNav,
  type RailEntry,
} from "./nav";
import { useStepProfile } from "./ProfileSwitcher";
import { useProfileDrag } from "./useProfileDrag";
import UserCard, { type UserCardUser } from "./UserCard";
import { useNewDocument } from "./NewDocumentCommand";

/**
 * Is this link the page we are on?
 *
 * Prefix-matching, not equality: the document lists live at
 * `/client/docs/invoice` while the pages a user actually spends time on are
 * `/client/docs/invoice/…` and `/client/docs/new/invoice`. Exact matching left
 * the nav with nothing highlighted on exactly the screens where "where am I?"
 * matters most.
 */
function isActiveHref(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  return (
    pathname.startsWith(`${href}/`) ||
    pathname === href.replace("/docs/", "/docs/new/")
  );
}

/** The chevron that fades in on hover, hinting the row leads somewhere. */
function HoverArrow() {
  return (
    <ChevronRight
      aria-hidden="true"
      className="ml-auto size-3.5! text-muted-foreground opacity-0 transition-opacity group-hover/menu-button:opacity-100 group-data-[collapsible=icon]:hidden"
    />
  );
}

function MenuLink({ item, active }: { item: NavLink; active: boolean }) {
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        className="text-sm"
        tooltip={item.label}
        render={
          <Link href={item.href} aria-current={active ? "page" : undefined}>
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
            <HoverArrow />
          </Link>
        }
      />
    </SidebarMenuItem>
  );
}

/**
 * The create affordance, as a row in the same column as every page link.
 *
 * It was a ghost button above the menu, in `--sidebar-primary`, with its ⌘D
 * keycap always showing. That made the app's one job look like a different
 * kind of thing from the places you can go, on a rail whose whole job is a
 * single column of rows. So it takes the menu button's own height, radius,
 * icon size and taupe foreground, and differs from its neighbours only in
 * opening the palette rather than navigating.
 *
 * The keycap fades in on hover, on the same `group/menu-button` the chevron
 * above already uses. It does not also take a `HoverArrow`: two things
 * appearing on one hover is noise, and the chevron means "this leads
 * somewhere", which a palette does not.
 */
function NewDocumentRow() {
  const { open } = useNewDocument();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="text-sm"
        tooltip="New document"
        render={
          <button type="button" onClick={open} aria-haspopup="dialog">
            <Plus aria-hidden="true" />
            <span>New document</span>
            <Shortcut
              className="ml-auto shrink-0 opacity-0 transition-opacity group-hover/menu-button:opacity-100 group-data-[collapsible=icon]:hidden"
              keys={["mod", "D"]}
            />
          </button>
        }
      />
    </SidebarMenuItem>
  );
}

/**
 * Is a flattened rail row the page we are on?
 *
 * Home matches exactly — every admin URL starts with `/admin`, so the prefix
 * rule would leave Dashboard permanently lit. Everything else matches by prefix
 * *plus* the pages it stands in for, which is what keeps Tools lit on
 * `/admin/spec` and `/admin/kit`: its index page sends you there, but neither
 * URL sits under `/admin/tools`.
 */
function isRailActive(
  pathname: string,
  entry: RailEntry,
  homeHref: string,
): boolean {
  if (entry.link.href === homeHref) return pathname === homeHref;
  return (
    isActiveHref(pathname, entry.link.href) ||
    entry.covers.some((covered) => isActiveHref(pathname, covered.href))
  );
}

/**
 * One profile's nav body — everything between the header and the footer.
 *
 * Split out because the rail renders *both* profiles' bodies side by side in a
 * track that the drag gesture slides. Only one is ever reachable: the other is
 * `inert` and `aria-hidden`, or the nav landmark would hold two Dashboards and
 * two of every document link.
 *
 * **Two shapes.** A profile carrying a `rail` renders that flat — no headings,
 * no create button — and a profile without one renders the grouped body below,
 * unchanged. Today that is admin and client respectively; see `rail` in
 * `nav.ts` for why, and for the fact that deleting that one field undoes it.
 */
function ProfileNavBody({
  nav,
  pathname,
  live,
}: {
  nav: ProfileNav;
  pathname: string;
  /** False for the off-screen copy. */
  live: boolean;
}) {
  return (
    // A landmark, because this is the app's primary navigation and previously
    // had none. Only the live one is exposed — the other is `aria-hidden`, so a
    // screen reader is never offered two.
    <nav
      aria-label={`${nav.label} navigation`}
      // `inert` removes it from the tab order, the a11y tree and hit-testing in
      // one attribute — cheaper and more complete than juggling tabIndex.
      inert={!live}
      aria-hidden={!live || undefined}
      // Half of the `w-[200%]` track, which is one rail. `w-full` here meant
      // 100% *of the track* — two rails each — so the second body began two
      // rails along while the track only ever slides one, and the admin nav
      // rendered entirely off-screen.
      className="flex w-1/2 shrink-0 flex-col pt-4"
    >
      {nav.rail ? (
        <FlatNavBody nav={nav} pathname={pathname} />
      ) : (
        <GroupedNavBody nav={nav} pathname={pathname} />
      )}
    </nav>
  );
}

/**
 * The flattened rail — one row per section, each leading to an index page that
 * holds what the section used to list inline.
 */
function FlatNavBody({ nav, pathname }: { nav: ProfileNav; pathname: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {nav.rail?.map((entry) => (
            <MenuLink
              key={entry.link.href}
              item={entry.link}
              active={isRailActive(pathname, entry, nav.home.href)}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * The client rail: home, the create button, then every remaining link in one
 * unbroken list. One `SidebarGroup`, not four — each carries `py-4`, so
 * separate groups put 32px of nothing between rows that read as one column now
 * that the section headings are gone.
 */
function GroupedNavBody({
  nav,
  pathname,
}: {
  nav: ProfileNav;
  pathname: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        {/*
          Dashboard, the create row, records, then the library — one menu, no
          headings and no gap.

          The document types are not listed here any more: ⌘D and the create
          row are the way in, and `nav.documents` still feeds both.
        */}
        <SidebarMenu>
          <MenuLink
            item={nav.home}
            // Home matches exactly — every URL on this side starts with it, so
            // the prefix rule would leave Dashboard always lit.
            active={pathname === nav.home.href}
          />
          <NewDocumentRow />
          {[...nav.records, ...nav.groups.flatMap((g) => g.links)].map(
            (item) => (
              <MenuLink
                key={item.href}
                item={item}
                active={isActiveHref(pathname, item.href)}
              />
            ),
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * The nav for one profile.
 *
 * The document types used to be a two-level tree — a "Client" and an "Admin"
 * section, each collapsible, with a hover flyout standing in for the sub-list
 * when the rail was collapsed. Both of those disappeared with the split: those
 * two sections *are* the two profiles now, so each rail shows one flat list of
 * three or five links, which the icon rail can render directly.
 */
export default function AdminSidebar({
  user,
  profile,
}: {
  user: UserCardUser;
  profile: Profile;
}) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const index = PROFILES.indexOf(profile);

  // The Arc-style gesture: a horizontal drag anywhere over the rail slides
  // between profiles. `ProfileSwitcher` is the control this accelerates.
  const step = useStepProfile(profile);
  const { offset, dragging, committed } = useProfileDrag(
    step,
    // Clamped, not wrapped: there is nothing to the left of the leftmost
    // profile, so pulling that way should feel like a wall rather than
    // rubber-banding towards a page that will never open.
    (direction) => PROFILES[index + direction] !== undefined,
    // What the commit ultimately changes. The hook holds the committed offset
    // until this differs, so the track stays on the profile you swiped to while
    // the route loads instead of springing back and sliding across again.
    profile,
  );

  /**
   * The profile actually *on screen*, which is not `profile` while a committed
   * gesture waits for its navigation: the track has already slid to the next
   * one, and `profile` still names the one that scrolled away.
   *
   * Getting this wrong is worse than it sounds. `live` decides `inert`, so for
   * the whole second or so the route takes, the nav you are looking at was
   * unclickable and hidden from screen readers: visibly there, functionally
   * dead. Reading it from the latch instead makes the new nav usable the moment
   * it arrives, before the page behind it has loaded.
   */
  const shown = PROFILES[index + committed] ?? profile;

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/*
        The rail's own collapse toggle. It was in `TopPanel` while that bar was
        divided into rail-width columns; the bar is one band now, and a control
        that opens this column belongs on it.

        Outside `SidebarContent`, so it does not ride the profile track, and
        with no `group-data-[collapsible=icon]:hidden`, so it survives the
        collapse it performs — the icon strip is 3rem wide and this is the one
        thing in it that has to stay hit-able.

        `px-2` at both widths rather than `px-3` expanded and centred collapsed.
        The rows below sit in a `SidebarGroup`'s own `px-2`, so this lines the
        toggle's box up with theirs at the expanded width, and at the collapsed
        one 8 + 32 + 8 fills the 3rem strip with equal air either side, which is
        the same arithmetic that set `--sidebar-width-icon`.
      */}
      <SidebarHeader className="h-12 shrink-0 justify-center px-2 py-0">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                aria-label="Toggle sidebar"
                // `size-8`, the same box a collapsed menu button takes, so the
                // toggle and every icon below it share one column and one
                // 8px margin on each side of the strip.
                className="size-8 shrink-0 text-muted-foreground"
              >
                <PanelLeft className="size-4" />
              </Button>
            }
          />
          <TooltipContent side="right">
            Toggle sidebar
            <Shortcut keys={["mod", "B"]} />
          </TooltipContent>
        </Tooltip>
      </SidebarHeader>
      {/*
        Both profiles' navs, side by side in a track the drag slides.

        The track is the reason the gesture reads as a swipe rather than a page
        load: the content follows the fingers and only commits on release. Both
        navs are already known client-side from `NAV_BY_PROFILE`, so rendering
        the second costs no fetch — and the off-screen one is `inert`.

        `overflow-hidden` on the viewport, not the track: the visible column is
        one rail wide and the other must be clipped, not scrollable.
      */}
      {/* `overscroll-x-none` so a horizontal wheel that reaches the end of this
          scroller stops here instead of chaining out to the document, where the
          browser turns it into history back/forward. The hook cancels the event
          too; this is the backstop for the opening frame, before any listener
          has seen enough of the gesture to judge it. */}
      <SidebarContent className="overflow-x-hidden overscroll-x-none">
        <div
          className="flex w-[200%] flex-1"
          style={{
            transform: `translateX(${(-index - offset) * 50}%)`,
            // Gated on `dragging`, not `offset === 0`: a committed gesture holds
            // a non-zero offset while its navigation loads, and that is exactly
            // the moment the movement has to animate. During a drag the offset
            // is already updated per frame, and a transition on top of that lags
            // the fingers.
            transition: dragging ? undefined : "transform 300ms ease-out",
          }}
        >
          {PROFILES.map((value) => (
            <ProfileNavBody
              key={value}
              nav={NAV_BY_PROFILE[value]}
              pathname={pathname}
              live={value === shown}
            />
          ))}
        </div>
      </SidebarContent>
      {/* Theme moved into the account card's menu — it configures you, not a
          document surface, and the rail is for going places. `ThemeToggle`'s
          segmented control is still exported if it ever comes back here. */}
      <SidebarFooter className="gap-3">
        <UserCard user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
