'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, PanelLeft } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
} from '@/components/ui/sidebar';
import {
  DASHBOARD_LINK,
  DOCUMENT_SECTIONS,
  RECORD_LINKS,
  TOOL_LINKS,
  type NavLink,
  type NavSection,
} from './nav';
import UserCard, { type UserCardUser } from './UserCard';
import ThemeToggle from './ThemeToggle';

function MenuLink({ item, active }: { item: NavLink; active: boolean }) {
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        className="text-sm"
        tooltip={item.label}
        render={
          <Link href={item.href} aria-current={active ? 'page' : undefined}>
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        }
      />
    </SidebarMenuItem>
  );
}

function CollapsibleSection({ section, pathname }: { section: NavSection; pathname: string }) {
  const Icon = section.icon;
  const hasActiveChild = section.children.some((c) => pathname === c.href);
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
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
              const active = pathname === child.href;
              return (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton
                    isActive={active}
                    className="text-sm"
                    render={
                      <Link href={child.href} aria-current={active ? 'page' : undefined}>
                        <span>{child.label}</span>
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
        <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">speclr</span>
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
      </SidebarHeader>

      <SidebarContent>
        {/* Dashboard — alone at the top */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <MenuLink item={DASHBOARD_LINK} active={pathname === DASHBOARD_LINK.href} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Document sections — collapsible, left-line sub-lists */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm">Documents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {DOCUMENT_SECTIONS.map((section) => (
                <CollapsibleSection key={section.label} section={section} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Records — plain links */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm">Records</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {RECORD_LINKS.map((item) => (
                <MenuLink key={item.href} item={item} active={pathname === item.href} />
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
                <MenuLink key={item.href} item={item} active={pathname === item.href} />
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
