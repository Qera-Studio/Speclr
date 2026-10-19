import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge has to be told about the house tokens, or it guesses.
 *
 * It reads `text-meta` as a text *colour*, because every `text-<word>` it does
 * not recognise is one, and then drops it the moment a real colour follows in
 * the same `cn()` call. That is how the design page's rail came out at 16px
 * with `text-meta` nowhere in its class list: the size had been merged away
 * as a losing colour. The same applies to the three shadow tokens.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["caption", "meta", "control", "body", "lead", "section", "title", "display"] },
      ],
      shadow: [{ shadow: ["raised", "overlay", "modal"] }],
    },
  },
})

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
