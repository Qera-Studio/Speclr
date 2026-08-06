'use client';

import { useEffect, useId, useState } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const;

/**
 * Theme switcher pinned at the bottom of the sidebar.
 * - Expanded: a segmented, icon-only control with all three options and a
 *   sliding pill behind the active one (same pattern as the card detail tabs).
 * - Collapsed (icon rail): a single button showing the active theme's icon that
 *   cycles to the next option on click.
 * Renders a stable placeholder until mounted to avoid a hydration mismatch (the
 * theme is only known client-side).
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const layoutId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = mounted ? theme : undefined;
  const currentIndex = Math.max(0, OPTIONS.findIndex((o) => o.value === current));
  const ActiveIcon = OPTIONS[currentIndex].Icon;
  const activeLabel = OPTIONS[currentIndex].label;
  const next = OPTIONS[(currentIndex + 1) % OPTIONS.length];

  return (
    <>
      {/* Expanded: full segmented control. */}
      <div
        role="radiogroup"
        aria-label="Theme"
        className="flex items-center gap-1 rounded-md bg-muted p-1 group-data-[collapsible=icon]:hidden"
      >
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = current === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              onClick={() => setTheme(value)}
              className={cn(
                'relative flex flex-1 items-center justify-center rounded-sm py-1.5 transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {active && (
                <motion.span
                  layoutId={`${layoutId}-theme-pill`}
                  className="absolute inset-0 rounded-sm bg-background shadow-sm dark:bg-input/40"
                  transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                />
              )}
              <Icon className="relative z-10 size-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      {/* Collapsed rail: a single icon showing the active theme; click cycles. */}
      <button
        type="button"
        onClick={() => setTheme(next.value)}
        aria-label={`Theme: ${activeLabel}. Switch to ${next.label}`}
        className="hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground group-data-[collapsible=icon]:flex"
      >
        <ActiveIcon className="size-4" aria-hidden="true" />
      </button>
    </>
  );
}
