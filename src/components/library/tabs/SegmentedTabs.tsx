'use client';

import type { ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsTrigger,
  segmentLabel,
  segmentTrough,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface SegmentedTab {
  value: string;
  label: string;
  icon?: LucideIcon;
}

/**
 * Segmented tabs: a soft grey trough, a white pill under the chosen tab, every
 * tab the same width. The design is a reference screenshot's, with the app's
 * own corners (`--radius` on the trough, `rounded-sm` on the pill, so the two
 * curves stay concentric across the 4px gap) instead of its round ones.
 *
 * **This is now the house look**, adopted for every strip in the app on
 * 10 October 2026, so the surface comes from `ui/tabs.tsx` (`segmentTrough`,
 * `tabPillSurface`, `segmentLabel`) rather than being spelled here. What this
 * component adds is equal widths, `px-5`, and the overflow menu.
 *
 * **Inactive labels are `--tab-label`, as light as AA allows, not the reference's paler
 * grey.** That grey on the trough measures well under 4.5:1, and an inactive
 * tab is still text somebody has to read to choose it.
 *
 * `more` is the reference's "All ▾": a menu of further choices at the end of
 * the trough. It sits **outside** the tablist, because a menu button inside
 * `role="tablist"` is a child that list may not have, and a screen reader
 * would count it as a tab.
 */
export default function SegmentedTabs({
  tabs,
  value,
  defaultValue,
  onValueChange,
  more,
  label,
}: {
  tabs: SegmentedTab[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** The overflow menu: its trigger label and the items it opens. */
  more?: { label: string; items: ReactNode };
  /** The tablist's accessible name. */
  label: string;
}) {
  return (
    <Tabs
      value={value}
      defaultValue={defaultValue ?? tabs[0]?.value}
      onValueChange={(next) => onValueChange?.(String(next))}
      className="w-fit"
    >
      <div className={cn('flex items-center p-1', segmentTrough)}>
        <TabsList
          aria-label={label}
          className="grid h-8! auto-cols-fr grid-flow-col gap-0 rounded-none border-0 bg-transparent p-0"
        >
          <TabsIndicator />
          {tabs.map(({ value: tab, label: text, icon: Icon }) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className={cn(
                'z-10 px-5',
                // The indicator is the pill, so the trigger paints none of its
                // own: an instant fill would land before the slide finishes.
                'data-active:border-transparent data-active:bg-transparent data-active:text-foreground data-active:shadow-none',
                'dark:data-active:bg-transparent dark:data-active:shadow-none',
              )}
            >
              {Icon ? <Icon aria-hidden /> : null}
              {text}
            </TabsTrigger>
          ))}
        </TabsList>
        {more ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-sm px-5 text-body outline-none focus-visible:ring-2 focus-visible:ring-ring',
                segmentLabel,
              )}
            >
              {more.label}
              <ChevronDown className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              {more.items}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </Tabs>
  );
}
