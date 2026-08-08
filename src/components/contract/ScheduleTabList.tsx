'use client';

import { TabsIndicator, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SCHEDULE_TABS } from '@/lib/domain/contract/schedules';
import { cn } from '@/lib/utils';

/**
 * The four Schedules as a tab row, shared by the services library and the
 * contract builder so the two cannot come to name or order them differently.
 *
 * Names only. A count on a tab is a number nobody acts on — how many services
 * a Schedule happens to hold is not a reason to open it — and it makes the one
 * thing the tab is for harder to read.
 *
 * The triggers give up their own active background to the sliding indicator;
 * see the note on `TabsIndicator`.
 */
export default function ScheduleTabList({
  size = 'default',
  className,
}: {
  size?: 'default' | 'lg';
  className?: string;
}) {
  const lg = size === 'lg';

  return (
    <TabsList
      className={cn('w-full', lg && 'group-data-horizontal/tabs:h-11 rounded-xl', className)}
    >
      <TabsIndicator className={cn(lg && 'rounded-lg')} />
      {SCHEDULE_TABS.map((schedule) => (
        <TabsTrigger
          key={schedule.key}
          value={schedule.key}
          className={cn(
            'data-active:bg-transparent dark:data-active:border-transparent dark:data-active:bg-transparent',
            lg && 'text-sm',
          )}
        >
          {schedule.name}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
