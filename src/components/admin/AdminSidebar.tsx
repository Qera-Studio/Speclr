"use client";

import { useEffect, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
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
 * icon size and muted foreground, and differs from its neighbours only in
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
  ref,
}: {
  nav: ProfileNav;
  pathname: string;
  /** False for the off-screen copy. */
  live: boolean;
  /** Set on the live copy only, so the pill can measure it. */
  ref?: React.Ref<HTMLElement>;
}) {
  return (
    // A landmark, because this is the app's primary navigation and previously
    // had none. Only the live one is exposed — the other is `aria-hidden`, so a
    // screen reader is never offered two.
    <nav
      ref={ref}
      aria-label={`${nav.label} navigation`}
      // `inert` removes it from the tab order, the a11y tree and hit-testing in
      // one attribute — cheaper and more complete than juggling tabIndex.
      inert={!live}
      aria-hidden={!live || undefined}
      // Half of the `w-[200%]` track, which is one rail. `w-full` here meant
      // 100% *of the track* — two rails each — so the second body began two
      // rails along while the track only ever slides one, and the admin nav
      // rendered entirely off-screen.
      // `h-0 overflow-hidden` on the dead copy, so the pill's shrink-to-content
      // height is the *shown* profile's rows and not whichever profile has more
      // of them. Flex siblings stretch to the tallest, so without this the admin
      // rail (4 rows) is padded out to the client rail's 6.
      //
      // Zero-height rather than `position: absolute`, which was tried and
      // emptied the pill: taking one child out of flow stops the other being the
      // second column, while the track's `translateX(-50%)` still assumes it is.
      // A zero-height item is still in flow, so `w-1/2` and that arithmetic both
      // hold.
      className={cn(
        "flex w-1/2 shrink-0 flex-col pt-4",
        // `p-0` with it: padding sits outside `height`, so `h-0` alone still
        // left the dead copy 16px tall and the pill 16px too long.
        !live && "h-0 overflow-hidden p-0",
      )}
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
          Dashboard, records, the create row, then the library — one menu, no
          headings and no gap.

          Records sit directly under home, above the create row, because the
          client record is what every document derives from (`CONTEXT.md` §5d):
          place of supply, the due date, the signatory and an invoice's line
          items all come off it, so onboarding a client precedes issuing
          anything. Under the create row it read as an afterthought to it, and
          a *destination* below an *action* is the wrong way round in a list
          that is otherwise all destinations.

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
          {nav.records.map((item) => (
            <MenuLink
              key={item.href}
              item={item}
              active={isActiveHref(pathname, item.href)}
            />
          ))}
          <NewDocumentRow />
          {nav.groups
            .flatMap((g) => g.links)
            .map((item) => (
              <MenuLink
                key={item.href}
                item={item}
                active={isActiveHref(pathname, item.href)}
              />
            ))}
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
  const { toggleSidebar, state, peeking, setPeeking } = useSidebar();
  const index = PROFILES.indexOf(profile);

  /**
   * The floating pill's hover preview: it grows back to full width without
   * leaving the floating position, over the content rather than pushing it.
   *
   * Pointer *and* focus, because hover alone would put the app's primary
   * navigation behind a mouse (WCAG 2.1.1). `onFocusCapture` rather than
   * `onFocus`: focus does not bubble, and what needs to open the pill is a
   * focus landing on any row inside it.
   *
   * Cleared whenever the rail docks, or a pill peeked open and then toggled
   * would dock at full width with a stale `peek` waiting to mis-fire the next
   * time it collapsed.
   */
  useEffect(() => {
    if (state === "expanded") setPeeking(false);
  }, [state, setPeeking]);

  /**
   * The toggle lives *inside* the rail, so collapsing it with the mouse leaves
   * the pointer sitting on the pill that was just created — which peeks it
   * straight back open, and the collapse never visibly happens.
   *
   * So a toggle arms a suppression that only the pointer leaving can disarm.
   * Not a timer: a timer picks a number out of the air and still re-opens
   * under a stationary mouse. This is the actual condition, stated once.
   */
  const [suppressed, setSuppressed] = useState(false);
  const startPeek = () => {
    if (!suppressed) setPeeking(true);
  };

  // Touch has no hover, so a tap on the pill opens it and a tap anywhere else
  // closes it. Only while it is actually peeking: a listener that runs on
  // every document click for the other 99% of the session is a listener that
  // exists for nothing.
  useEffect(() => {
    if (!peeking) return;
    const close = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-slot="sidebar"]')) setPeeking(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [peeking, setPeeking]);

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

  /**
   * The live nav's measured height, published so the pill can state its own
   * height as a **length**.
   *
   * The pill was `h-fit`, which cost two separate pieces of motion, and the one
   * cause is worth stating once rather than rediscovering from either symptom.
   * **`height: fit-content` does not animate.** Its computed value never
   * changes when its content changes, only its used value, and transitions fire
   * on computed values. So:
   *
   * - Changing profile resized the pill in a single frame while the track was
   *   still sliding sideways, because the two navs have different row counts.
   * - Expanding it back to a docked rail left every child pinned at the
   *   collapsed height for the whole 200ms and then dropped them ~310px in the
   *   closing frame. That one presented as the account card arriving late, and
   *   the card had nothing to do with it: the traces before and after are
   *   identical for every row above it.
   *
   * `interpolate-size` does not help (it governs keyword-to-length, which this
   * is not), nor does `transition-behavior: allow-discrete`, nor a grid track.
   * Animating the two nav copies instead is worse: they are flex siblings, so
   * the box is `max(a, b)`, and mid-flight both are partial, which dips the
   * pill under *both* endpoints (360 → 209 → 264) whatever the easing.
   *
   * So the height is measured and handed to CSS as `--rail-height`, which the
   * float's `height` reads (falling back to `fit-content`, so the pill is still
   * correct on the first frame and with JS yet to run). It is only read while
   * floating; docked, the rail is a full-height column and this is unused.
   *
   * What is measured is the **live nav plus the chrome around it** — the
   * header, the content's own padding and the account card. Restating that
   * arithmetic here would go stale the next time any of those paddings moved,
   * so the chrome is read off the boxes themselves.
   *
   * The nav's own contribution is `scrollHeight`, and the content row's is its
   * padding rather than its height: this variable *sets* the pill's height, so
   * measuring anything that the height in turn constrains would have the value
   * feed itself. `scrollHeight` and a computed padding are both independent of
   * it.
   */
  const [railHeight, setRailHeight] = useState<number>();
  const liveNavRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = liveNavRef.current;
    const column = nav?.closest('[data-slot="sidebar-inner"]');
    if (!nav || !column) return;
    const measure = () =>
      setRailHeight(
        [...column.children].reduce((total, child) => {
          if (!child.contains(nav)) return total + (child as HTMLElement).offsetHeight;
          const style = getComputedStyle(child);
          return (
            total +
            nav.scrollHeight +
            parseFloat(style.paddingTop) +
            parseFloat(style.paddingBottom)
          );
        }, 0),
      );
    measure();
    // Rows can change height after mount (a font landing, a label wrapping at
    // the peeked width), so this is not a one-shot read.
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    for (const child of column.children) observer.observe(child);
    return () => observer.disconnect();
    // `shown` is the dependency that matters: the ref points at a different
    // element after a profile change, so the observer has to be re-pointed.
  }, [shown]);

  return (
    <Sidebar
      style={
        railHeight === undefined
          ? undefined
          : ({ "--rail-height": `${railHeight}px` } as React.CSSProperties)
      }
      collapsible="float"
      variant="sidebar"
      // Pointer, not mouse: this fires for a tap too, which is the touch way
      // in. `onPointerLeave` never fires for a touch, so the outside-tap
      // listener above is what closes it there.
      onPointerEnter={startPeek}
      onPointerLeave={() => {
        setPeeking(false);
        setSuppressed(false);
      }}
      // Keyboard focus only, and the `:focus-visible` test is what makes that
      // precise. Opening on *any* focus is what left the pill hanging open
      // with the pointer nowhere near it: clicking a row navigates and leaves
      // focus on it, so the peek was set by the click and could then only be
      // cleared by a `pointerleave` that never came, because the pointer had
      // never entered. A mouse click does not match `:focus-visible`; a Tab
      // does, which is the case this handler exists for.
      //
      // Not `startPeek`: the suppression exists only because the toggle sits
      // under the *mouse* that collapsed the rail. A keyboard user tabbing in
      // is asking for the labels, and has no pointer to move away to lift it.
      onFocusCapture={(event) => {
        if (event.target instanceof Element && event.target.matches(":focus-visible")) {
          setPeeking(true);
        }
      }}
      // `relatedTarget` is where focus went. Without the containment check
      // every Tab *between* two rows inside the rail would read as leaving it,
      // and the pill would shut under the keyboard user moving through it.
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPeeking(false);
        }
      }}
    >
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

        The wordmark shares the row, name left and toggle hard right. It is the
        app's name, so it belongs at the top of the column the app's navigation
        is in, and the toggle keeps its 8px margin against the rail's edge
        because that arithmetic is what lines it up with the icons below.

        It hides at the collapsed width. Nothing else does — the point of the
        icon strip is that every row survives it — but a six-letter word has no
        icon form, and `truncate` in a 3rem strip renders one letter and an
        ellipsis. The toggle is then the only thing left, which is what centres
        it in the strip.

        Floating it hides at *both* widths, peek included. A pill is a strip of
        destinations that grew wide enough to label itself; it did not become
        the app's masthead, and a title over four rows in a box that is about
        to shrink again reads as a menu that opened, not a nav that is there.

        Hiding it is also what puts the toggle in the icons' column, at every
        floating width: `justify-between` with one child left places that child
        at the start, and the row's `px-2` is the same 8px the strip's
        arithmetic gives each icon. No float-specific `justify` rule is needed,
        and one was tried and removed for measuring the same pixel.
      */}
      <SidebarHeader className="h-12 shrink-0 flex-row items-center justify-between gap-2 px-2 py-0 group-data-[collapsible=icon]:justify-center">
        <span className="truncate pl-1 text-base font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden group-data-float:hidden">
          speclr
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  // Arm the suppression *before* the state flips: this button
                  // is inside the rail, so the pointer is already over the
                  // pill the collapse is about to create.
                  setSuppressed(true);
                  setPeeking(false);
                  toggleSidebar();
                }}
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
          // `items-start` so the dead copy's `h-0` is honoured; the default
          // `stretch` would grow it back to the live one's height and the pill
          // would size to the taller profile again.
          className="flex w-[200%] flex-1 items-start"
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
              ref={value === shown ? liveNavRef : undefined}
            />
          ))}
        </div>
      </SidebarContent>
      {/* Theme moved into the account card's menu — it configures you, not a
          document surface, and the rail is for going places. `ThemeToggle`'s
          segmented control is still exported if it ever comes back here. */}
      {/* It stays in the floating pill. Hiding it was the wrong reading of a
          real problem: the account row *is* a second kind of thing among the
          destinations, but the answer to that is air, not absence — and with
          it gone the pill had no route to settings, the theme or sign-out
          without docking first.

          `group-data-float:pt-4` on top of `SidebarContent`'s own `pb-2` puts
          24px between the last nav icon and the avatar, which is exactly what
          the header leaves above the first one (8px of the header's own box,
          then the nav's `pt-4`). So the account row is held off the rows by
          the same air that holds them off the toggle, and the footer's `p-2`
          keeps the pill's bottom margin equal to the 8px either side of the
          icon column. */}
      <SidebarFooter className="gap-3 group-data-float:pt-4">
        <UserCard user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
