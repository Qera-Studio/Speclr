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
export default function ScheduleTabList({ className }: { className?: string }) {
  return (
    <TabsList className={cn('w-full', className)}>
      <TabsIndicator />
      {SCHEDULE_TABS.map((schedule) => (
        <TabsTrigger
          key={schedule.key}
          value={schedule.key}
          className="text-sm data-active:bg-transparent dark:data-active:border-transparent dark:data-active:bg-transparent"
        >
          {schedule.name}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
