import { ClipboardCheck, Hammer, RefreshCw, Settings2, type LucideIcon } from 'lucide-react';
import type { ScheduleKey } from '@/lib/domain/contract/schedules';

/**
 * One icon per Schedule, wherever a Schedule is drawn: the contract flow's
 * services step and the service catalogue. Its own file because it has two
 * callers in two folders (`PRINCIPLES.md` rule 1, applied to presentation).
 */
export const SCHEDULE_ICONS: Record<ScheduleKey, LucideIcon> = {
  setup: Settings2,
  build: Hammer,
  retainer: RefreshCw,
  audit: ClipboardCheck,
};
