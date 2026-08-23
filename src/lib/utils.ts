import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * What the app prints where a value is absent.
 *
 * One glyph, everywhere, for the same reason `DateCell` exists: the documents
 * list printed a long dash for a letter with no total while the clients list
 * printed nothing at all, and a blank cell reads as "we lost it" where a mark
 * reads as "there is none". A hyphen rather than a dash, because the house
 * rule bans the em dash and the en dash belongs to numeric ranges.
 *
 * The document sheets keep their own em dash. They are pixel-faithful printed
 * artifacts with their own typographic conventions, exempt here as everywhere.
 */
export const NIL = "-";
