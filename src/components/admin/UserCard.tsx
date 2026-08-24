'use client';

import Link from 'next/link';
import { ChevronsUpDown, LogOut } from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { SETTINGS_LINK } from './nav';
import { ThemeMenuItems } from './ThemeToggle';

export interface UserCardUser {
  name: string;
  email: string;
  imageUrl?: string;
}

function initials(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/**
 * Bottom-of-sidebar account card: avatar + name + email + chevron. Clicking
 * opens a dropdown with Sign out. Collapses gracefully to just the avatar when
 * the sidebar is in icon mode.
 */
export default function UserCard({ user }: { user: UserCardUser }) {
  const { isMobile } = useSidebar();

  const avatar = (
    <Avatar className="h-8 w-8 rounded-md">
      {user.imageUrl ? <AvatarImage src={user.imageUrl} alt="" className="rounded-md" /> : null}
      <AvatarFallback className="rounded-md bg-accent font-medium text-foreground">
        {initials(user.name, user.email)}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-active data-[state=open]:text-sidebar-accent-foreground"
              >
                {avatar}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name || user.email}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            }
          />
          {/* `min-w`, and the offset comes from the primitive. The width here
              was `w-(--radix-dropdown-menu-trigger-width)`, a Radix variable in
              a Base UI app: it had never resolved to anything. */}
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
          >
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              {avatar}
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name || user.email}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </div>
            <DropdownMenuSeparator />
            {/* Theme sits with Settings rather than in the rail: both configure
                *you*, not a document surface, and the rail is for going places.
                Shared chrome, so it reads the same from either profile. */}
            <ThemeMenuItems />
            <DropdownMenuItem
              render={
                <Link href={SETTINGS_LINK.href}>
                  <SETTINGS_LINK.icon aria-hidden="true" />
                  {SETTINGS_LINK.label}
                </Link>
              }
            />
            <DropdownMenuSeparator />
            <SignOutButton>
              <DropdownMenuItem>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </SignOutButton>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
