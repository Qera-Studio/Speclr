'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * The app's one toast surface.
 *
 * Mounted once, in the `(app)` layout. Bottom-right because that corner holds
 * nothing: the header carries the breadcrumb and the page actions, the rail is
 * on the left, and a toast over the top-right would cover the very button that
 * was just pressed.
 *
 * Four seconds, three at a time. Both are caps rather than preferences: a
 * message that outlives the action it describes gets read as the *next*
 * action's result, and a stack deeper than three stops being a notification and
 * becomes a panel nobody dismisses.
 *
 * `richColors` is off. The house palette already says success and destructive,
 * and sonner's own greens and reds are not the ones in `globals.css`. Colour is
 * never the message anyway: every toast carries a word.
 */
export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps['theme']}
      position="bottom-right"
      duration={4000}
      visibleToasts={3}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius-md)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
