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

function CollapsibleSection({
  section,
  pathname,
}: {
  section: NavSection;
  pathname: string;
}) {
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
                <CollapsibleSection
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
