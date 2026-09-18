import {
  citations,
  insertPart,
  markerAt,
  moveBlock,
  parseBody,
  serialiseBody,
  type ClausePart,
} from '../clauseBody';
import { MSA_CLAUSES } from '../msa';

describe('clause body structure', () => {
  /**
   * The load-bearing test, and the reason the editor is safe to build.
   *
   * The whole feature rests on being able to read the stored text into rows
   * and write it back. If that round trip is not exact, opening a clause in
   * the library and saving it without touching anything would rewrite the
   * words of an agreement, which is the one thing this codebase must not do.
   *
   * Every clause, byte for byte, not a sample.
   */
  it('round-trips all 28 clauses unchanged', () => {
    for (const clause of MSA_CLAUSES) {
      const back = serialiseBody(parseBody(clause.body), clause.number);
      expect(back).toEqual(clause.body);
    }
  });

  it('reads the three kinds that actually occur', () => {
    const parts = parseBody([
      '3.1 This Agreement imposes obligations upon both Parties.',
      '(a) perform the Services with reasonable skill;',
      '"Deliverables" means the final approved outputs.',
    ]);

    expect(parts.map((p) => p.kind)).toEqual(['point', 'item', 'text']);
    // The marker comes off, so the editor shows prose and derives the number.
    expect(parts[0].text).toBe('This Agreement imposes obligations upon both Parties.');
    expect(parts[1].text).toBe('perform the Services with reasonable skill;');
  });

  /**
   * The point of deriving the numbers: an insert renumbers what follows, with
   * nobody having to remember to.
   */
  it('renumbers the points below an insert', () => {
    const parts = parseBody([
      '4.1 First.',
      '4.2 Second.',
      '4.3 Third.',
    ]);
    parts.splice(1, 0, { kind: 'point', text: 'Inserted.' });

    expect(serialiseBody(parts, 4)).toEqual([
      '4.1 First.',
      '4.2 Inserted.',
      '4.3 Second.',
      '4.4 Third.',
    ]);
  });

  it('letters each run of sub-items from (a), and restarts on the next point', () => {
    const parts: ClausePart[] = [
      { kind: 'point', text: 'Qera shall:' },
      { kind: 'item', text: 'one;' },
      { kind: 'item', text: 'two;' },
      { kind: 'point', text: 'The Client shall:' },
      { kind: 'item', text: 'three;' },
    ];

    expect(serialiseBody(parts, 3)).toEqual([
      '3.1 Qera shall:',
      '(a) one;',
      '(b) two;',
      '3.2 The Client shall:',
      '(a) three;',
    ]);
  });

  /**
   * `msaClauseSchema` refuses an empty paragraph, and a blank row is somebody
   * mid-edit rather than a paragraph they meant to save. Dropping it here is
   * also what stops a stray row shifting every number below it.
   */
  it('drops an empty row rather than numbering it', () => {
    const parts: ClausePart[] = [
      { kind: 'point', text: 'First.' },
      { kind: 'point', text: '   ' },
      { kind: 'point', text: 'Second.' },
    ];

    expect(serialiseBody(parts, 9)).toEqual(['9.1 First.', '9.2 Second.']);
  });

  it('shows each row the marker it will be saved with', () => {
    const parts: ClausePart[] = [
      { kind: 'point', text: 'Qera shall:' },
      { kind: 'item', text: 'one;' },
      { kind: 'item', text: 'two;' },
      { kind: 'text', text: 'A definition.' },
    ];

    expect(markerAt(parts, 0, 3)).toBe('3.1');
    expect(markerAt(parts, 1, 3)).toBe('(a)');
    expect(markerAt(parts, 2, 3)).toBe('(b)');
    // An unnumbered paragraph has no marker to show, and says so with nothing.
    expect(markerAt(parts, 3, 3)).toBe('');
  });
});

describe('moving a paragraph', () => {
  /** '3.1 Qera shall:' with two items, then '3.2 The Client shall pay.' */
  const withItems = (): ClausePart[] => [
    { kind: 'point', text: 'Qera shall:' },
    { kind: 'item', text: 'one;' },
    { kind: 'item', text: 'two;' },
    { kind: 'point', text: 'The Client shall pay.' },
  ];

  /**
   * The bug this function exists for, and it was caught by a test rather than
   * reasoned out.
   *
   * Swapping single rows moved 3.2 above 3.1 and left the sub-items behind,
   * where they silently became items of a different point. On the words of an
   * agreement that is a changed obligation, not a layout glitch.
   */
  it('carries a point’s sub-items with it', () => {
    const moved = moveBlock(withItems(), 3, -1);

    expect(serialiseBody(moved, 3)).toEqual([
      '3.1 The Client shall pay.',
      '3.2 Qera shall:',
      '(a) one;',
      '(b) two;',
    ]);
  });

  it('moves a point down over the whole of the block below, not into it', () => {
    const parts: ClausePart[] = [
      { kind: 'point', text: 'First.' },
      { kind: 'point', text: 'Second.' },
      { kind: 'item', text: 'a;' },
    ];

    expect(serialiseBody(moveBlock(parts, 0, 1), 5)).toEqual([
      '5.1 Second.',
      '(a) a;',
      '5.2 First.',
    ]);
  });

  /** A sub-item is reordered within its own point, and moves alone. */
  it('moves a sub-item by itself', () => {
    const moved = moveBlock(withItems(), 2, -1);

    expect(serialiseBody(moved, 3)).toEqual([
      '3.1 Qera shall:',
      '(a) two;',
      '(b) one;',
      '3.2 The Client shall pay.',
    ]);
  });

  /**
   * The mirror of the case above, and the one that would be easiest to get
   * wrong silently: a sub-item moving *down* must not vault over the next
   * point and out of the run it belongs to.
   */
  it('keeps a sub-item inside its own point when moving down', () => {
    const moved = moveBlock(withItems(), 1, 1);

    expect(serialiseBody(moved, 3)).toEqual([
      '3.1 Qera shall:',
      '(a) two;',
      '(b) one;',
      '3.2 The Client shall pay.',
    ]);
  });

  it('returns the list untouched at either end', () => {
    const parts = withItems();
    expect(moveBlock(parts, 0, -1)).toBe(parts);
    expect(moveBlock(parts, 3, 1)).toBe(parts);
  });
});

/**
 * Where a new paragraph lands.
 *
 * The rule the founder asked for: below the row being worked on, not at the
 * foot of the clause. Everything interesting here is what "below" means when
 * the two kinds are nested, and the answer in every case is that the new row
 * has to arrive already belonging to the right point.
 */
describe('adding a paragraph', () => {
  /** '3.1 Qera shall:' with two items, then '3.2 The Client shall pay.' */
  const withItems = (): ClausePart[] => [
    { kind: 'point', text: 'Qera shall:' },
    { kind: 'item', text: 'one;' },
    { kind: 'item', text: 'two;' },
    { kind: 'point', text: 'The Client shall pay.' },
  ];

  it('appends when nothing is focused', () => {
    const { parts, index } = insertPart(withItems(), 'point', undefined);

    expect(index).toBe(4);
    // Empty, so `serialiseBody` drops it. The row exists in the list.
    expect(serialiseBody(parts, 3)).toEqual([
      '3.1 Qera shall:',
      '(a) one;',
      '(b) two;',
      '3.2 The Client shall pay.',
    ]);
    expect(parts).toHaveLength(5);
  });

  /**
   * The case the bug report named: a point added from 7.1 becomes 7.2.
   *
   * It has to clear the focused point's sub-items, or the new point lands
   * between 3.1 and its own (a) and silently adopts them.
   */
  it('puts a new point after the focused point and its sub-items', () => {
    const { parts: next, index } = insertPart(withItems(), 'point', 0);

    expect(index).toBe(3);
    expect(next[3]).toEqual({ kind: 'point', text: '' });
    expect(serialiseBody([...next.slice(0, 3), { kind: 'point', text: 'New.' }], 3)).toEqual([
      '3.1 Qera shall:',
      '(a) one;',
      '(b) two;',
      '3.2 New.',
    ]);
  });

  /** From a sub-item, a new point still clears the whole point it sits in. */
  it('puts a new point after the point a focused sub-item belongs to', () => {
    const { parts: next } = insertPart(withItems(), 'point', 1);

    expect(next[3]).toEqual({ kind: 'point', text: '' });
  });

  /**
   * A sub-item added from the point itself joins the end of that point's run,
   * which is the next letter in line: (a), (b), then (c).
   */
  it('adds a sub-item at the end of the focused point’s run', () => {
    const { parts: next } = insertPart(withItems(), 'item', 0);

    expect(next[3]).toEqual({ kind: 'item', text: '' });
    expect(markerAt(next, 3, 3)).toBe('(c)');
  });

  /** From a sub-item, the new one lands directly below it rather than last. */
  it('adds a sub-item directly below a focused sub-item', () => {
    const { parts: next } = insertPart(withItems(), 'item', 1);

    expect(next[2]).toEqual({ kind: 'item', text: '' });
    expect(markerAt(next, 2, 3)).toBe('(b)');
  });

  /** An unnumbered paragraph belongs to nothing, so it lands right below. */
  it('puts an unnumbered paragraph directly below the focused row', () => {
    const { parts: next } = insertPart(withItems(), 'text', 1);

    expect(next[2]).toEqual({ kind: 'text', text: '' });
  });
});

describe('cross-references', () => {
  it('finds the clause a paragraph points at, with and without a sub-number', () => {
    expect(citations(['"Retained Materials" has the meaning given at clause 11.2.'])).toEqual([
      { reference: '11.2', clause: 11, point: 2 },
    ]);
    expect(citations(['Subject to clause 8, the fee is payable.'])).toEqual([
      { reference: '8', clause: 8, point: undefined },
    ]);
  });

  it('reads the plural form and ignores a repeat', () => {
    const found = citations([
      'See clauses 4 and 5.',
      'And again at clause 4.',
    ]);
    expect(found.map((c) => c.reference)).toEqual(['4', '5']);
  });

  /**
   * Not a limitation being hidden: the matcher needs the word 'clause', and
   * this pins that so nobody later assumes every reference is caught. A missed
   * citation is no worse than today, when none are found at all.
   */
  it('does not guess at a reference with no cue word', () => {
    expect(citations(['The period in 7.1 shall apply.'])).toEqual([]);
  });

  /**
   * The real corpus, as a canary. Every citation in the shipped clauses must
   * point at a clause that exists, or the seed text has a broken reference and
   * that is worth knowing.
   */
  it('every citation in the shipped clauses resolves', () => {
    const numbers = new Set(MSA_CLAUSES.map((c) => c.number));
    const broken: string[] = [];

    for (const clause of MSA_CLAUSES) {
      for (const cite of citations(clause.body)) {
        if (!numbers.has(cite.clause)) broken.push(`${clause.number} -> ${cite.reference}`);
      }
    }

    expect(broken).toEqual([]);
  });
});
