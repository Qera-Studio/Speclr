'use client';

import { useEffect, useRef, useState } from 'react';
import { Columns3, GripVertical, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface ColumnChoice {
  key: string;
  label: string;
  icon?: LucideIcon;
  /** Always shown and never moved: the column that says which row you are on. */
  locked?: boolean;
}

/**
 * A list of column keys, remembered per browser: which are hidden, and the
 * order they are drawn in, each under its own key.
 *
 * `localStorage` rather than the URL or the database: it is a reading
 * preference, not a place anybody links to and not a fact about the records,
 * and it holds nothing but column keys. Read on mount rather than in a lazy
 * initializer, for the reason `useShowSort` gives: these lists server-render,
 * and reading storage in the first render would mismatch hydration.
 *
 * What was stored is checked rather than trusted: anything that is not an
 * array of strings reads as nothing stored.
 */
export function useStoredKeys(
  storageKey: string,
): [string[] | null, (next: string[]) => void] {
  // `null` until something is stored: "never chosen", which a caller may
  // read differently from an empty choice.
  const [keys, setKeys] = useState<string[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return;
      const stored: unknown = JSON.parse(raw);
      if (Array.isArray(stored) && stored.every((key) => typeof key === 'string')) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setKeys(stored);
      }
    } catch {
      // Storage disabled or a value that is not JSON: the default holds.
    }
  }, [storageKey]);

  const update = (next: string[]) => {
    setKeys(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // The choice still applies, it just won't survive a reload.
    }
  };

  return [keys, update];
}

/**
 * The columns in a stored order, reconciled rather than trusted, the same rule
 * `RecordTable`'s own column order follows: keys that no longer exist are
 * dropped, columns the order has never seen are appended where the spec puts
 * them last, and a locked column leads whatever was stored.
 */
export function arrangeColumns<C extends { key: string; locked?: boolean }>(
  columns: readonly C[],
  order: readonly string[],
): C[] {
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const seen = new Set<string>();
  const out: C[] = [];
  for (const key of order) {
    const column = byKey.get(key);
    if (!column || seen.has(key)) continue;
    seen.add(key);
    out.push(column);
  }
  for (const column of columns) if (!seen.has(column.key)) out.push(column);
  return [...out.filter((c) => c.locked), ...out.filter((c) => !c.locked)];
}

/**
 * The Properties panel: every column as a row with a drag handle, a checkbox,
 * its icon and its name, after Notion's "Property visibility".
 *
 * **A popover, not a menu.** A menu item is one action; these rows each hold
 * two controls (the handle and the checkbox), and a control inside a menu item
 * is a control a screen reader is told is not there.
 *
 * **Dragging reorders as the pointer passes a row**, as the clause body editor
 * does (`ClauseBodyEditor`'s `useRowDrag`): the list is the preview, so there
 * is no drop line to draw. The handle also takes ArrowUp and ArrowDown, so the
 * order is reachable without a pointer. A locked column has no handle and its
 * checkbox is ticked and disabled.
 */
export default function ColumnsMenu({
  columns,
  hidden,
  order,
  onHiddenChange,
  onOrderChange,
}: {
  columns: readonly ColumnChoice[];
  hidden: readonly string[];
  order: readonly string[];
  onHiddenChange: (next: string[]) => void;
  onOrderChange: (next: string[]) => void;
}) {
  const arranged = arrangeColumns(columns, order);
  const list = useRef<HTMLUListElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  // The live order for the drag's one closure, which would otherwise compare
  // against the order the drag started from and move a row twice.
  const live = useRef(arranged.map((c) => c.key));
  live.current = arranged.map((c) => c.key);

  const move = (key: string, to: number) => {
    const keys = [...live.current];
    const from = keys.indexOf(key);
    const floor = arranged.filter((c) => c.locked).length;
    if (from < 0 || to < floor || to >= keys.length || to === from) return;
    keys.splice(from, 1);
    keys.splice(to, 0, key);
    live.current = keys;
    onOrderChange(keys);
  };

  const startDrag = (event: React.PointerEvent, key: string) => {
    if (event.button !== 0) return;
    event.preventDefault();
    setDragging(key);

    const onMove = (e: PointerEvent) => {
      const rows = list.current?.querySelectorAll<HTMLElement>('[data-row]');
      if (!rows) return;
      const over = [...rows].findIndex((row) => {
        const box = row.getBoundingClientRect();
        return e.clientY >= box.top && e.clientY <= box.bottom;
      });
      if (over !== -1) move(key, over);
    };
    const stop = () => {
      setDragging(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    // A touch drag the browser takes over fires only this.
    window.addEventListener('pointercancel', stop);
  };

  const toggle = (key: string, shown: boolean) =>
    onHiddenChange(shown ? hidden.filter((k) => k !== key) : [...hidden, key]);

  return (
    <Popover>
      <PopoverTrigger render={<Button type="button" variant="outline" />}>
        <Columns3 aria-hidden />
        Properties
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[min(32rem,var(--available-height))] w-60 overflow-y-auto p-1.5">
        <p className="px-2 pt-1 pb-1.5 text-xs text-muted-foreground">Shown in table</p>
        <ul ref={list} aria-label="Columns" className="flex flex-col">
          {arranged.map(({ key, label, icon: Icon, locked }, index) => (
            <li
              key={key}
              data-row
              className={cn(
                'flex h-8 items-center gap-1 rounded-md pr-2 hover:bg-muted/60',
                dragging === key && 'bg-muted opacity-70',
              )}
            >
              {locked ? (
                // The handle's width, so every checkbox shares one edge.
                <span className="size-6 shrink-0" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  aria-label={`Move ${label}`}
                  onPointerDown={(event) => startDrag(event, key)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowUp') move(key, index - 1);
                    else if (event.key === 'ArrowDown') move(key, index + 1);
                    else return;
                    event.preventDefault();
                  }}
                  className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-[var(--gray-400)] outline-none hover:text-foreground focus-visible:text-foreground dark:text-[var(--gray-600)] dark:hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                >
                  <GripVertical className="size-3.5" aria-hidden />
                </button>
              )}
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-xs has-disabled:cursor-default">
                {Icon ? <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" /> : null}
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {/* 14px, down from the primitive's 16: a list of twenty is
                    read by its names, and the box only has to say on or off.
                    Its hit area is the whole label, so it loses no target. */}
                <Checkbox
                  checked={locked || !hidden.includes(key)}
                  disabled={locked}
                  onCheckedChange={(on) => toggle(key, on)}
                  className="size-3.5 rounded-[3px] [&_svg]:size-3!"
                />
              </label>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
