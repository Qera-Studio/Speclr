"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, PanelLeft } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Shortcut } from "@/components/ui/kbd";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DASHBOARD_LINK,
  DOCUMENT_SECTIONS,
  RECORD_LINKS,
  TOOL_LINKS,
  type NavLink,
  type NavSection,
} from "./nav";
import UserCard, { type UserCardUser } from "./UserCard";
import ThemeToggle from "./ThemeToggle";
import NewDocumentButton from "./NewDocumentButton";

/**
 * Is this link the page we are on?
 *
 * Prefix-matching, not equality: the document lists live at `/docs/invoice`
 * while the pages a user actually spends time on are `/docs/invoice/…` and
 * `/docs/new/invoice`. Exact matching left the nav with nothing highlighted on
 * exactly the screens where "where am I?" matters most.
 */
function isActiveHref(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/") return false; // would prefix-match every route
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

/**
 * The same hint inside a flyout item.
 *
 * A menu item highlights on pointer hover *and* on arrow-key navigation, and
 * Base UI expresses both as real DOM focus — so one `group-focus` rule covers
 * the mouse and the keyboard, where `group-hover` would leave the keyboard with
 * no arrow at all.
 */
function ItemArrow() {
  return (
    <ChevronRight
      aria-hidden="true"
      className="ml-auto size-3.5 text-muted-foreground opacity-0 transition-opacity group-focus/dropdown-menu-item:opacity-100"
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

interface SectionProps {
  section: NavSection;
  pathname: string;
}

/**
 * A document section, in whichever form the rail can actually show.
 *
 * Expanded, it is a collapsible sub-tree. Collapsed, it cannot be: the sub-list
 * carries `group-data-[collapsible=icon]:hidden`, so the trigger toggled state
 * nobody could see and the seven document types were simply unreachable without
 * expanding the rail first. A flyout gives the icon rail the same seven links.
 *
 * Split into two components rather than branched inside one, because the
 * collapsible form owns hooks the flyout has no use for — and `state` flips at
 * runtime every time the rail is toggled.
 */
function DocumentSection(props: SectionProps) {
  const { state, isMobile } = useSidebar();
  // Mobile uses the off-canvas sheet, which is never in icon mode.
  return state === "collapsed" && !isMobile ? (
    <FlyoutSection {...props} />
  ) : (
    <CollapsibleSection {...props} />
  );
}

function FlyoutSection({ section, pathname }: SectionProps) {
  const Icon = section.icon;
  const hasActiveChild = section.children.some((c) =>
    isActiveHref(pathname, c.href),
  );

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        {/*
          No `tooltip` on the button here. `SidebarMenuButton` shows its tooltip
          only when the rail is collapsed — which is exactly when this branch
          renders, so the two would fire on the same hover and stack on top of
          each other. The flyout's own label carries the section name instead.
        */}
        <DropdownMenuTrigger
          openOnHover
          // Long enough that sweeping the pointer down the rail to reach the
          // footer doesn't flash two menus on the way past.
          delay={150}
          closeDelay={120}
          render={
            <SidebarMenuButton isActive={hasActiveChild} className="text-sm">
              <Icon aria-hidden="true" />
              <span>{section.label}</span>
              <ChevronRight className="ml-auto" />
            </SidebarMenuButton>
          }
        />
        {/*
          `w-48` overrides the default `w-(--anchor-width)`: anchored to a 32px
          icon button, that would size the popup to 32px.
        */}
        <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-48">
          {/*
            The group is not decoration: `DropdownMenuLabel` is Base UI's
            `Menu.GroupLabel`, which throws outside a `Menu.Group`. It also
            wires the label to the items as the group's accessible name.
          */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>{section.label}</DropdownMenuLabel>
            {section.children.map((child) => {
              const active = isActiveHref(pathname, child.href);
              return (
                <DropdownMenuItem
                  key={child.href}
                  className={active ? "font-medium text-accent-foreground" : undefined}
                  render={
                    <Link
                      href={child.href}
                      aria-current={active ? "page" : undefined}
                    >
                      <span>{child.label}</span>
                      <ItemArrow />
                    </Link>
                  }
                />
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

function CollapsibleSection({ section, pathname }: SectionProps) {
  const Icon = section.icon;
  // Open state is derived from the path, with the user's own toggle layered on
  // top and dropped at the next navigation. Seeding `useState` once (as this
  // did) meant a section only ever opened if the app *first loaded* on one of
  // its children — navigating to a document from anywhere else left its own
  // section shut.
  const [manual, setManual] = useState<boolean | null>(null);
  useEffect(() => setManual(null), [pathname]);
  const hasActiveChild = section.children.some((c) =>
    isActiveHref(pathname, c.href),
  );
  const open = manual ?? hasActiveChild;

  return (
    <Collapsible
      open={open}
      onOpenChange={setManual}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton className="text-sm" tooltip={section.label}>
              <Icon aria-hidden="true" />
              <span>{section.label}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          }
        />
        <CollapsibleContent>
          <SidebarMenuSub>
            {section.children.map((child) => {
              const active = isActiveHref(pathname, child.href);
              return (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton
                    isActive={active}
                    className="text-sm"
                    render={
                      <Link
                        href={child.href}
                        aria-current={active ? "page" : undefined}
                      >
                        <span>{child.label}</span>
                        <HoverArrow />
                      </Link>
                    }
                  />
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export default function AdminSidebar({ user }: { user: UserCardUser }) {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="flex-row items-center justify-between px-3 py-2">
        <span className="text-sm font-semibold text-foreground group-data-[collapsible=icon]:hidden">
          speclr
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                aria-label="Toggle sidebar"
                className="text-muted-foreground"
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

      {/* Groups sit further apart than shadcn's default: Records above the
          seven-row Documents block only reads as a separate list if there is
          real air between them. */}
      <SidebarContent className="gap-3">
        {/* Dashboard, then the app's one job — alone at the top */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <MenuLink
                item={DASHBOARD_LINK}
                active={pathname === DASHBOARD_LINK.href}
              />
            </SidebarMenu>
            {/* Same rounding collapsed as expanded, and the same
                  `--radius-sm`-based squircle the icon rows use. A radius that
                  changes with the rail animates on its own clock — the button
                  went pill-shaped a beat before the sidebar had moved. */}
            <NewDocumentButton
              variant="ghost"
              className="mt-1 h-8 w-full justify-start gap-2 rounded-[calc(var(--radius-sm)+2px)] text-primary hover:text-primary group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <span className="group-data-[collapsible=icon]:hidden">
                New document
              </span>
              {/* Grey keycaps beside blue text read as disabled. Tinted with
                    the button's own accent so they belong to it. */}
              <Shortcut
                className="ml-auto shrink-0 group-data-[collapsible=icon]:hidden [&_[data-slot=kbd]]:bg-primary/10 [&_[data-slot=kbd]]:text-primary/70"
                keys={["mod", "D"]}
              />
            </NewDocumentButton>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Records — plain links. Above Documents: a short list of *who* the
              documents are about, read before the long list of document kinds. */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm">Records</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {RECORD_LINKS.map((item) => (
                <MenuLink
                  key={item.href}
                  item={item}
                  active={isActiveHref(pathname, item.href)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Document sections — collapsible, file-tree sub-lists */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm">Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {DOCUMENT_SECTIONS.map((section) => (
                <DocumentSection
                  key={section.label}
                  section={section}
                  pathname={pathname}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm">Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TOOL_LINKS.map((item) => (
                <MenuLink
                  key={item.href}
                  item={item}
                  active={isActiveHref(pathname, item.href)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3">
        <ThemeToggle />
        <Separator />
        <UserCard user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
