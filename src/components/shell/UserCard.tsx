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
import { RAIL_POPUP_ALIGN_OFFSET, RAIL_POPUP_GAP } from '@/components/ui/popup';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { SETTINGS_LINK } from '@/components/shell/nav';
import { ThemeMenuItems } from '@/components/shell/ThemeToggle';

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
 * Bottom-of-sidebar account card: one row of avatar + name + chevron, the
 * email kept for the menu's header. Hovering or clicking opens a dropdown with
 * the theme, Settings and Sign out. Collapses gracefully to just the avatar
 * when the sidebar is in icon mode.
 */
export default function UserCard({ user }: { user: UserCardUser }) {
  const { isMobile } = useSidebar();

  const avatar = (size: 'sm' | 'md') => (
    <Avatar className={cn('rounded-md', size === 'sm' ? 'size-6 text-[10px]' : 'size-8')}>
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
            /*
              Hover opens it too, not click alone.

              The primitive's own prop rather than handlers of our own: it
              already knows that a menu opened on hover must not close while the
              pointer is travelling to it, which is the part a pair of
              `onPointerEnter`/`onPointerLeave` gets wrong and the reason
              hover menus written by hand feel broken diagonally.

              Click still works and still toggles, and the trigger is still a
              button, so nothing changes for a keyboard or a touch: neither
              has a hover to give, and `openOnHover` adds no path that only a
              pointer can walk.
            */
            openOnHover
            // No hover delay. The primitive's default is 100ms, which is there
            // to stop a menu flashing open as a pointer crosses a *menubar* of
            // triggers on its way somewhere else. This is one card in the
            // corner of the rail: nothing is on the way past it, so the delay
            // buys nothing and only reads as the card being slow to answer.
            delay={0}
            // One row, the height of every other rail button. The email used
            // to sit under the name on a taller card; it is in the menu's
            // header now, where it is read once rather than looked at all
            // day. `py-1` so the 24px avatar fits the 32px row, and `p-1` in
            // the icon rail for the same reason.
            render={
              <SidebarMenuButton className="py-1 group-data-[collapsible=icon]:p-1! data-[state=open]:bg-sidebar-active data-[state=open]:text-sidebar-accent-foreground">
                {avatar('sm')}
                <span className="truncate font-medium">{user.name || user.email}</span>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            }
          />
          {/* `min-w`, and the width here was
              `w-(--radix-dropdown-menu-trigger-width)`, a Radix variable in a
              Base UI app: it had never resolved to anything.

              `RAIL_POPUP_GAP` only on the side that has to clear the rail's
              edge. Opening downwards on mobile, the anchor's own bottom edge is
              the edge a reader sees, so the primitive's plain gap is right.

              `RAIL_POPUP_ALIGN_OFFSET` is the same two insets read downwards,
              so the popover's bottom corner nests with the inset card's rather
              than ending 16px above it. Desktop only, for the same reason: on
              mobile the menu opens below the card and `align="end"` is against
              a different edge entirely. */}
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            {...(isMobile
              ? {}
              : { sideOffset: RAIL_POPUP_GAP, alignOffset: RAIL_POPUP_ALIGN_OFFSET })}
          >
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              {avatar('md')}
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
