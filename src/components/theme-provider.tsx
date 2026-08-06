'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/**
 * Wraps next-themes so the app can toggle light/dark (and follow the system).
 * `attribute="class"` toggles the `.dark` class on <html>, which drives the
 * light (:root) / dark (.dark) token sets in globals.css.
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
