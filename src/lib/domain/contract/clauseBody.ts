/**
 * A clause body as something with structure, rather than as one blob of text.
 *
 * The stored shape does not change: `MsaClause.body` is still `string[]`, each
 * paragraph still carrying its own marker ('8.4 Where any sum…', '(a) perform
 * the Services…'). `ContractSheet` still parses that marker with its own
 * regex and lays the number in a column of its own. **Nothing about what is
 * written to the database or printed on a contract is different**, which is
 * the condition for touching text that is under legal review.
 *
 * What this adds is a way to read that array as what it already is, edit it as
 * rows, and write it back. The library's editor was a single `<textarea>` of
 * the whole clause with "one blank line starts a new paragraph" as its only
 * affordance, which meant the numbers were hand-typed prose: renumbering after
 * an insert was a manual pass over every following paragraph, and nothing
 * noticed when it was not done.
 *
 * ## The three kinds, and why there are exactly three
 *
 * Measured across all 28 clauses, not assumed: 111 numbered paragraphs, 20
 * lettered sub-items, 11 unnumbered. Nothing else occurs.
 *
 * - **`point`** — '3.1', '3.2'. Numbered `<clause>.<n>` by position.
 * - **`item`** — '(a)', '(b)'. Lettered by position within its run, and it
 *   belongs to the point above it.
 * - **`text`** — no marker. The definitions under clause 1.1 ('"Deliverables"
 *   means…'). The sheet indents these with the sub-items.
 *
 * ## Numbers are derived, and that is the point
 *
 * `serialise` writes the marker from the row's position, so inserting a point
 * renumbers everything below it for free and a gap in the sequence cannot
 * occur. The trade is stated plainly because it is real: a number typed into
 * the *prose* is not touched, and the clauses cross-reference each other
 * nineteen times ('has the meaning given at clause 11.2'). So reordering
 * points within a clause can still leave a citation pointing at the wrong
 * paragraph. `citations` is what finds those, and the editor shows them.
 *
 * Reordering *clauses* is not possible at all, by design: the clause number is
 * the primary key and `msa.ts` explains why. This is strictly about the
 * paragraphs inside one clause.
 *
 * Client-safe: no server imports.
 */

/** A paragraph's kind. See the header for why there are three. */
export type ClausePartKind = 'point' | 'item' | 'text';

export interface ClausePart {
  kind: ClausePartKind;
  /** The paragraph's prose, with its marker stripped. */
  text: string;
}

/**
 * The marker a stored paragraph opens with.
 *
 * Deliberately the same grammar `ContractSheet`'s own `MARKER` accepts, minus
 * the Schedule form ('A2.4'), which belongs to Parts rather than to clauses
 * and never reaches this editor. If one of the two ever changes, the other has
 * to, and `__tests__/clauseBody.test.ts` pins that they agree on real text.
 */
const MARKER = /^(\d+(?:\.\d+)+|\([a-z]\)|-)\s+/;

/** Reads one stored paragraph into a row. */
function parsePart(paragraph: string): ClausePart {
  const marker = paragraph.match(MARKER);
  if (!marker) return { kind: 'text', text: paragraph };
  return {
    kind: marker[1].startsWith('(') ? 'item' : 'point',
    text: paragraph.slice(marker[0].length),
  };
}

/** Reads a stored body into rows. */
export function parseBody(body: string[]): ClausePart[] {
  return body.map(parsePart);
}

/**
 * The letter for the nth sub-item: (a), (b) … (z), then (aa).
 *
 * Past 26 is a clause nobody should be writing, so the wrap is chosen to stay
 * obviously wrong rather than to be correct: 'aa' reads as a mistake, where
 * restarting at 'a' would silently produce two (a)s.
 */
function letter(index: number): string {
  if (index < 26) return String.fromCharCode(97 + index);
  return 'a'.repeat(Math.floor(index / 26) + 1);
}

/**
 * Writes rows back to the stored shape, numbering as it goes.
 *
 * Points count from 1 within the clause; items count from 'a' within their
 * own run, so a second run of sub-items further down the clause starts at (a)
 * again, which is how the existing text is written.
 *
 * An empty row is dropped rather than written: `msaClauseSchema` refuses an
 * empty paragraph, and a blank row in the editor is somebody part-way through
 * adding one, not a paragraph they want saved.
 */
export function serialiseBody(parts: ClausePart[], clauseNumber: number): string[] {
  let point = 0;
  let item = 0;
  const out: string[] = [];

  for (const part of parts) {
    const text = part.text.trim();
    if (!text) continue;

    if (part.kind === 'point') {
      point += 1;
      item = 0;
      out.push(`${clauseNumber}.${point} ${text}`);
    } else if (part.kind === 'item') {
      out.push(`(${letter(item)}) ${text}`);
      item += 1;
    } else {
      out.push(text);
    }
  }

  return out;
}

/** The marker `serialiseBody` would give the row at `index`, for display. */
export function markerAt(parts: ClausePart[], index: number, clauseNumber: number): string {
  let point = 0;
  let item = 0;

  for (let i = 0; i <= index && i < parts.length; i += 1) {
    const part = parts[i];
    if (part.kind === 'point') {
      point += 1;
      item = 0;
      if (i === index) return `${clauseNumber}.${point}`;
    } else if (part.kind === 'item') {
      if (i === index) return `(${letter(item)})`;
      item += 1;
    } else if (i === index) {
      return '';
    }
  }

  return '';
}

/**
 * The run of rows that moves as one with the row at `index`.
 *
 * A numbered point owns the sub-items and definitions beneath it: '(a) perform
 * the Services' is part of '3.2 Qera shall:', and the printed clause indents
 * it under exactly that. So moving a point takes its items with it, and moving
 * a sub-item moves only itself, which is how a run is reordered within its own
 * point.
 *
 * It exists because the obvious implementation is wrong in a way that is easy
 * to miss: swapping single rows moves 3.2 above 3.1 and leaves '(a)' stranded
 * below, silently reattached to a different point. On the words of an
 * agreement that is not a cosmetic bug, and it is what the test caught.
 */
export function blockAt(parts: ClausePart[], index: number): number {
  if (parts[index]?.kind !== 'point') return 1;
  let size = 1;
  while (index + size < parts.length && parts[index + size].kind !== 'point') size += 1;
  return size;
}

/**
 * Moves the block at `index` one place up (`by` negative) or down.
 *
 * "One place" means over the whole of the neighbouring block, never one row
 * into it: a point moving up has to clear the point above *and its items*, or
 * it would land in the middle of them.
 *
 * Returns the list unchanged where there is nowhere to go, so a caller can
 * hand the result straight back to state without checking.
 */
export function moveBlock(parts: ClausePart[], index: number, by: -1 | 1): ClausePart[] {
  const size = blockAt(parts, index);
  if (by < 0 && index === 0) return parts;
  if (by > 0 && index + size >= parts.length) return parts;

  const block = parts.slice(index, index + size);
  const rest = [...parts.slice(0, index), ...parts.slice(index + size)];

  if (by < 0) {
    /*
      A point clears the whole block above it; a sub-item moves one row.

      The difference is the whole of this branch. A point landing one row up
      would land *inside* the point above, between its items. A sub-item
      walking to the start of the block above would jump out of its own point
      and into the previous one, which reorders somebody's obligations rather
      than the list they are written in.
    */
    if (parts[index].kind !== 'point') {
      rest.splice(index - 1, 0, ...block);
      return rest;
    }
    let start = index - 1;
    while (start > 0 && parts[start].kind !== 'point') start -= 1;
    rest.splice(start, 0, ...block);
    return rest;
  }

  // Down: past the block that now begins where this one was taken from.
  rest.splice(index + blockAt(rest, index), 0, ...block);
  return rest;
}

/**
 * Adds an empty paragraph below the row at `after`, or at the end when nothing
 * is focused.
 *
 * Appending at the end was the original behaviour and it is wrong for the same
 * reason typing into a document is not done at the bottom of the page: a clause
 * is written by working down it, and a new point belongs where the reader is,
 * not eleven paragraphs below.
 *
 * Where "below" lands is the whole of this function, and every case comes from
 * the nesting `blockAt` already describes:
 *
 * - **A point clears the focused point's sub-items.** Landing one row below
 *   3.1 would put the new 3.2 between 3.1 and its own (a), which silently
 *   reassigns those items to it. Focus on a sub-item resolves to its point
 *   first, so "add a point" from inside 3.1 still means "after the whole of
 *   3.1".
 * - **A sub-item from a point joins the end of that point's run**, which is
 *   the next letter in line. From a sub-item it lands directly below, because
 *   that is the position the reader is pointing at and it is still inside the
 *   same run.
 * - **An unnumbered paragraph belongs to nothing**, so it lands directly
 *   below whatever is focused.
 *
 * The new row is empty, and `serialiseBody` drops empty rows, so an add that
 * is never typed into writes nothing to the database.
 *
 * Returns the index it landed at as well as the list, because the caller has
 * to put the caret there. Recomputing that outside would be the same decision
 * written twice, which is how the two come to disagree.
 */
export function insertPart(
  parts: ClausePart[],
  kind: ClausePartKind,
  after: number | undefined,
): { parts: ClausePart[]; index: number } {
  const row: ClausePart = { kind, text: '' };
  const index = insertIndex(parts, kind, after);

  return { parts: [...parts.slice(0, index), row, ...parts.slice(index)], index };
}

/** Where `insertPart` puts the row. See its note for each case. */
function insertIndex(
  parts: ClausePart[],
  kind: ClausePartKind,
  after: number | undefined,
): number {
  if (after === undefined || after < 0 || after >= parts.length) return parts.length;

  const at = pointOf(parts, after);
  // A point, or a sub-item added from the point it belongs to: past the whole
  // block. Otherwise directly below the focused row.
  const past = kind === 'point' || (kind === 'item' && at === after);
  return past ? at + blockAt(parts, at) : after + 1;
}

/** The point a row belongs to, or the row itself where it has no point above. */
function pointOf(parts: ClausePart[], index: number): number {
  let at = index;
  while (at > 0 && parts[at].kind !== 'point') at -= 1;
  return at;
}

/** A reference from one clause's text to another clause or paragraph. */
export interface Citation {
  /** As written, e.g. '11.2' or '8'. */
  reference: string;
  /** The clause it points at. */
  clause: number;
  /** The paragraph within that clause, where the citation names one. */
  point?: number;
}

/**
 * Every 'clause 11.2' in a body.
 *
 * It exists because derived numbering fixes one half of the renumbering
 * problem and cannot fix the other. Moving a paragraph rewrites its own
 * marker; it cannot rewrite a sentence in a different clause that points at
 * the old position, because that sentence is prose and editing prose
 * automatically is exactly what this codebase refuses to do with legal text.
 *
 * So the editor surfaces them instead: what this clause cites, and whether the
 * target exists. The judgement stays with the person, which is the right
 * division for words a lawyer has to sign off.
 *
 * Matches 'clause 11.2' and both numbers in 'clauses 11.2 and 12', in either
 * case. It does not try to catch every English construction that refers to a
 * clause without the word: that way lies a parser nobody trusts, and a missed
 * citation is no worse than today, where none are found at all.
 */
export function citations(body: string[]): Citation[] {
  const found: Citation[] = [];
  const seen = new Set<string>();

  for (const paragraph of body) {
    // The cue word, then the run of numbers joined by commas, 'and' or 'to'
    // that follows it. Captured as one span and split, because 'clauses 4 and
    // 5' names two clauses and matching only the first would report the
    // second as uncited.
    for (const match of paragraph.matchAll(
      /\bclauses?\s+(\d+(?:\.\d+)?(?:\s*(?:,|and|to)\s*\d+(?:\.\d+)?)*)/gi,
    )) {
      for (const reference of match[1].split(/\s*(?:,|and|to)\s*/i)) {
        if (!reference || seen.has(reference)) continue;
        seen.add(reference);
        const [clause, point] = reference.split('.');
        found.push({
          reference,
          clause: Number(clause),
          point: point === undefined ? undefined : Number(point),
        });
      }
    }
  }

  return found;
}
