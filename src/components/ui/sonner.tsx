'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { CircleAlert } from 'lucide-react';

/**
 * The app's one toast surface.
 *
 * Mounted once, in the `(app)` layout. Bottom-center: it now carries the
 * error styling too, so it reads as a system message rather than a corner
 * aside, and center is where a reader's eye already returns to after
 * confirming an action in the middle of the page.
 *
 * Four seconds, three at a time. Both are caps rather than preferences: a
 * message that outlives the action it describes gets read as the *next*
 * action's result, and a stack deeper than three stops being a notification and
 * becomes a panel nobody dismisses.
 *
 * `richColors` is off (it repaints every type in sonner's own palette, not the
 * house one). Danger red for `toast.error(...)`, the icon-top alignment and the
 * lighter title weight are all in `globals.css`, unlayered, targeting sonner's
 * own `[data-sonner-toast]` selectors.
 *
 * They cannot be `toastOptions.classNames` here. Sonner's stylesheet is
 * unlayered, and an unlayered rule beats every layered one in the cascade
 * whatever its specificity, so a Tailwind utility (`@layer utilities`) silently
 * loses to it. Specificity is not the lever; leaving the layer is.
 */
export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme as ToasterProps['theme']}
      position="bottom-center"
      duration={4000}
      visibleToasts={3}
      closeButton
      icons={{ error: <CircleAlert className="size-4" /> }}
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
