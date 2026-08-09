/**
 * Blanks — the `[bracketed]` values in contract text.
 *
 * Every number, count, period and fee in the Agreement, the Schedules and the
 * Parts is written as `[3]`, `[50%]`, `[7 days]` or, where there is no sensible
 * default, `[ ]`. Each occurrence is a separate editable field, pre-filled with
 * whatever the drafter wrote between the brackets.
 *
 * ## Keys
 *
 * A blank is addressed by its scope plus its ordinal within that scope:
 * `msa.8#2`, `sch.build.9#1`, `part.01.limits#3`. The scope is a clause number
 * or a Part section, both of which are stable; a global index would not be.
 * That matters because a draft stores values, not filled text — a key that
 * shifted would silently move a Client's fee onto a different line.
 *
 * ## Filled, unfilled, and cleared
 *
 * A blank prints its stored value, or the drafted default where none is stored.
 * A blank resolving to empty is **unfilled**: the preview shows it as a chip and
 * finalize refuses the contract. That is the whole point — content §1 records a
 * contract that went out reading "ZaibQ Stuioh" with inverted signature blocks,
 * and silent blanks are how that ships.
 *
 * Clearing a filled blank to empty is an override, not a reset, and makes the
 * contract unfinalizable until something is put back. Same reading of an empty
 * input as the rest of the content layer (CONTEXT.md §5b).
 *
 * Pure, client-safe, no framework imports.
 */

import { groupRupeeInput, normalizeRupeeInput } from '../money';

/** One `[…]` occurrence. `fallback` is what the drafter wrote inside it. */
export interface Blank {
  key: string;
  fallback: string;
}

/**
 * A paragraph split around its blanks. `segments` always has exactly one more
 * entry than `blanks`, so a renderer can interleave them without bounds checks:
 * segments[0], blanks[0], segments[1], blanks[1], … segments[n].
 */
export interface ParsedText {
  segments: string[];
  blanks: Blank[];
}

/** Stored blank values, keyed. Sparse — an absent key means "use the default". */
export type BlankValues = Record<string, string>;

/**
 * Non-greedy so `[3] and [5]` yields two blanks rather than one spanning both.
 * Newlines are excluded: a bracket left unclosed on one line must not swallow
 * the rest of a clause.
 */
const BLANK = /\[([^\]\n]*)\]/g;

/**
 * Splits one paragraph into its literal segments and its blanks, numbering each
 * from `startOrdinal` within `scope`.
 */
export function parseText(scope: string, text: string, startOrdinal = 0): ParsedText {
  const segments: string[] = [];
  const blanks: Blank[] = [];
  let last = 0;
  let ordinal = startOrdinal;

  for (const match of text.matchAll(BLANK)) {
    segments.push(text.slice(last, match.index));
    blanks.push({ key: `${scope}#${ordinal}`, fallback: match[1] });
    ordinal += 1;
    last = match.index + match[0].length;
  }
  segments.push(text.slice(last));

  return { segments, blanks };
}

/**
 * Parses a scope's paragraphs together, so ordinals run continuously across
 * them. A clause is one scope however many paragraphs it has.
 */
export function parseScope(scope: string, paragraphs: string[]): ParsedText[] {
  let ordinal = 0;
  return paragraphs.map((text) => {
    const parsed = parseText(scope, text, ordinal);
    ordinal += parsed.blanks.length;
    return parsed;
  });
}

/**
 * A paragraph with its blanks shown as rules — `'Registration of ___ domain in
 * the Client's name'`.
 *
 * The label for a prose blank. A Part's Limits and Fee tables give each figure a
 * label of its own, but a blank inside a sentence has none, and falling back to
 * the section heading gave a Part three inputs all reading "What is included".
 * The sentence the figure sits in is the only honest description of it.
 */
export function blankLabel(text: string): string {
  return text.replace(BLANK, '___');
}

/**
 * What kind of value a blank wants. Inferred, because nothing records it.
 *
 * A blank carries only what the drafter typed between the brackets, so the type
 * has to be read off that plus — for a table row — its label. Deliberately
 * conservative: anything that isn't obviously a figure stays free text, because
 * plenty of blanks legitimately are (`[1], selected before start`).
 */
export type BlankKind = 'money' | 'percent' | 'count' | 'text';

/** Labels whose row holds an amount. Bounded so "Feedback rounds" isn't money. */
const MONEY_LABEL = /\b(fees?|amounts?|prices?|charges?|costs?)\b/i;

/**
 * `rowLabel` is the Limits/Fee row this blank sits in, where there is one.
 *
 * The label carries the money rule on its own because the fee blank is drafted
 * `[ ]` — empty, by design, so nothing ships with a placeholder price. That is
 * precisely the field that must not be free text, and its own fallback says
 * nothing about it.
 */
export function blankKind(blank: Blank, rowLabel?: string): BlankKind {
  const fallback = blank.fallback.trim();
  if (fallback.includes('₹') || (rowLabel !== undefined && MONEY_LABEL.test(rowLabel))) {
    return 'money';
  }
  if (/^\d+(\.\d+)?%$/.test(fallback)) return 'percent';
  if (/^\d+$/.test(fallback)) return 'count';
  return 'text';
}

/**
 * What a typed character is allowed to leave in the field.
 *
 * Applied on every keystroke rather than on blur — the value here is what the
 * contract *prints*, so the input must never hold something the document would
 * be embarrassed by. Same rule `normalizeRupeeInput` follows for money forms.
 * An emptied field stays empty: clearing a blank is an override the rest of the
 * content layer already honours, and `isUnfilled` is what stops it finalizing.
 */
export function sanitiseBlank(kind: BlankKind, raw: string): string {
  switch (kind) {
    case 'money': {
      const digits = normalizeRupeeInput(raw);
      return digits === '' ? '' : `₹${groupRupeeInput(digits)}`;
    }
    case 'percent': {
      const digits = normalizeRupeeInput(raw);
      return digits === '' ? '' : `${digits}%`;
    }
    case 'count':
      return raw.replace(/\D/g, '');
    case 'text':
      return raw;
  }
}

/** What a blank prints: the stored value, else what the drafter wrote. */
export function blankValue(values: BlankValues, blank: Blank): string {
  return values[blank.key] ?? blank.fallback;
}

/** True where a blank resolves to nothing. These block finalize. */
export function isUnfilled(values: BlankValues, blank: Blank): boolean {
  return blankValue(values, blank).trim() === '';
}

/** A parsed paragraph as plain filled text. */
export function fillText(parsed: ParsedText, values: BlankValues): string {
  return parsed.segments.reduce(
    (out, segment, i) =>
      i === 0 ? segment : `${out}${blankValue(values, parsed.blanks[i - 1])}${segment}`,
    '',
  );
}

/** Convenience: parse and fill in one step, for text that is never edited. */
export function fillBlanks(scope: string, paragraphs: string[], values: BlankValues): string[] {
  return parseScope(scope, paragraphs).map((p) => fillText(p, values));
}

/** Every blank in a set of parsed paragraphs, in reading order. */
export function blanksOf(parsed: ParsedText[]): Blank[] {
  return parsed.flatMap((p) => p.blanks);
}

/**
 * A labelled figure — one row of a Part's Limits or Fee table, resolved.
 * Used only by `disagreeingRows` below.
 */
export interface LabelledValue {
  label: string;
  value: string;
  /** Where it came from, for the warning text. */
  source: string;
}

/**
 * Labels whose value differs between two places in the same contract.
 *
 * Blanks are filled per occurrence, which is what was asked for — but it means
 * "Revision rounds" can read 3 in one Part and 2 in another with nothing
 * objecting. Content §1 records exactly that failure: a Schedule saying "under
 * four weeks" above a milestone table running three. This catches the case it
 * can actually see — the same label carrying different values across the Parts
 * of one contract.
 *
 * It cannot see disagreement between a table row and a sentence, because a
 * blank inside prose carries no label to compare. A warning, never a block:
 * two Parts legitimately differing on revision rounds is a real engagement.
 */
export function disagreeingRows(rows: LabelledValue[]): {
  label: string;
  values: LabelledValue[];
}[] {
  const byLabel = new Map<string, LabelledValue[]>();
  for (const row of rows) {
    const key = row.label.trim().toLowerCase();
    byLabel.set(key, [...(byLabel.get(key) ?? []), row]);
  }

  return [...byLabel.values()]
    .filter((group) => new Set(group.map((r) => r.value.trim())).size > 1)
    .map((group) => ({ label: group[0].label, values: group }));
}
