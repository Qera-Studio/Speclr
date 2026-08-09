import {
  blankKind,
  blankLabel,
  blankValue,
  blanksOf,
  disagreeingRows,
  fillBlanks,
  fillText,
  isUnfilled,
  parseScope,
  parseText,
  sanitiseBlank,
} from '../blanks';

describe('parseText', () => {
  it('splits a paragraph around its blanks', () => {
    const parsed = parseText('msa.8', 'payable within [7 days] of issue');
    expect(parsed.segments).toEqual(['payable within ', ' of issue']);
    expect(parsed.blanks).toEqual([{ key: 'msa.8#0', fallback: '7 days' }]);
  });

  /** Interleaving is bounds-check-free only if this holds for every input. */
  it('always yields one more segment than blanks', () => {
    for (const text of ['none', '[a]', '[a][b]', 'x [a] y [b] z', '[a] trailing']) {
      const parsed = parseText('s', text);
      expect(parsed.segments.length).toBe(parsed.blanks.length + 1);
    }
  });

  it('matches each bracket separately rather than spanning them', () => {
    const parsed = parseText('s', 'as to [50%] in advance and [50%] upon completion');
    expect(parsed.blanks.map((b) => b.fallback)).toEqual(['50%', '50%']);
  });

  /** An unclosed bracket must not swallow the rest of a clause. */
  it('does not match across a newline', () => {
    const parsed = parseText('s', 'a [3] b\nc [unclosed d');
    expect(parsed.blanks).toHaveLength(1);
  });

  it('reads an empty bracket as a blank with no default', () => {
    const parsed = parseText('part.01.fee', '[ ]');
    expect(parsed.blanks[0].fallback).toBe(' ');
  });
});

describe('parseScope', () => {
  /** A clause is one scope however many paragraphs it holds. */
  it('numbers ordinals continuously across paragraphs', () => {
    const parsed = parseScope('sch.build.2', [
      'as to [50%] in advance and [50%] upon completion',
      'engagements exceeding [₹1,00,000] may be apportioned',
    ]);
    expect(blanksOf(parsed).map((b) => b.key)).toEqual([
      'sch.build.2#0',
      'sch.build.2#1',
      'sch.build.2#2',
    ]);
  });
});

describe('blankValue', () => {
  const blank = { key: 'msa.8#0', fallback: '7 days' };

  it('prints the drafted default where nothing is stored', () => {
    expect(blankValue({}, blank)).toBe('7 days');
  });

  it('prints the stored value over the default', () => {
    expect(blankValue({ 'msa.8#0': '14 days' }, blank)).toBe('14 days');
  });

  /**
   * Clearing is an override, not a reset — the same reading of an empty input
   * as the rest of the content layer. It makes the contract unfinalizable.
   */
  it('treats a cleared value as an override, leaving the blank unfilled', () => {
    expect(blankValue({ 'msa.8#0': '' }, blank)).toBe('');
    expect(isUnfilled({ 'msa.8#0': '' }, blank)).toBe(true);
  });
});

describe('isUnfilled', () => {
  it('is true for a blank drafted empty and never filled', () => {
    const [blank] = parseText('part.01.fee', 'Fee [ ]').blanks;
    expect(isUnfilled({}, blank)).toBe(true);
  });

  it('is false once that blank is filled', () => {
    const [blank] = parseText('part.01.fee', 'Fee [ ]').blanks;
    expect(isUnfilled({ [blank.key]: '₹1,20,000' }, blank)).toBe(false);
  });

  it('is false for a blank carrying a drafted default', () => {
    const [blank] = parseText('msa.8', 'within [7 days]').blanks;
    expect(isUnfilled({}, blank)).toBe(false);
  });
});

describe('fillText', () => {
  it('round-trips text with no blanks unchanged', () => {
    const text = 'Fees are payable in advance.';
    expect(fillText(parseText('s', text), {})).toBe(text);
  });

  it('restores the original text from the drafted defaults', () => {
    const text = 'as to [50%] in advance and [50%] upon completion';
    expect(fillText(parseText('s', text), {})).toBe(text.replaceAll('[', '').replaceAll(']', ''));
  });

  it('substitutes stored values in place', () => {
    const parsed = parseText('sch.build.4', 'Each Part includes [3] rounds of Revision');
    expect(fillText(parsed, { 'sch.build.4#0': '2' })).toBe(
      'Each Part includes 2 rounds of Revision',
    );
  });

  it('fills each occurrence independently', () => {
    const filled = fillBlanks('s', ['[50%] advance, [50%] final'], { 's#1': '40%' });
    expect(filled).toEqual(['50% advance, 40% final']);
  });
});

describe('blankLabel', () => {
  it('shows the figure as a rule so the sentence names the field', () => {
    expect(blankLabel("Registration of [1] domain in the Client's name")).toBe(
      "Registration of ___ domain in the Client's name",
    );
  });

  it('rules every blank in a paragraph, not just the first', () => {
    expect(blankLabel('[50%] on signing, [50%] before launch')).toBe(
      '___ on signing, ___ before launch',
    );
  });

  it('leaves a paragraph with no blanks alone', () => {
    expect(blankLabel('Anything beyond these is Additional Work.')).toBe(
      'Anything beyond these is Additional Work.',
    );
  });
});

describe('blankKind', () => {
  const blank = (fallback: string) => ({ key: 's#0', fallback });

  /** The fee is drafted empty on purpose, so only its label can classify it. */
  it('reads an empty blank in a Fee row as money', () => {
    expect(blankKind(blank(' '), 'Fee')).toBe('money');
  });

  it('reads a rupee amount as money wherever it sits', () => {
    expect(blankKind(blank('₹1,00,000'))).toBe('money');
  });

  it('does not mistake a label merely containing the letters for money', () => {
    expect(blankKind(blank('3'), 'Feedback rounds')).toBe('count');
  });

  it('separates percentages from plain counts', () => {
    expect(blankKind(blank('50%'), 'Payment')).toBe('percent');
    expect(blankKind(blank('50'), 'Products uploaded')).toBe('count');
  });

  /** Plenty of blanks are legitimately prose; those must stay free text. */
  it('leaves anything that is not a figure as text', () => {
    expect(blankKind(blank('1], selected before start'))).toBe('text');
    expect(blankKind(blank('7 days'))).toBe('text');
  });
});

describe('sanitiseBlank', () => {
  it('prints money the way the Agreement already does', () => {
    expect(sanitiseBlank('money', '100000')).toBe('₹1,00,000');
  });

  it('rejects everything but digits as money is typed', () => {
    expect(sanitiseBlank('money', '₹5,000 abc')).toBe('₹5,000');
  });

  it('keeps a count to digits and a percentage to digits plus a sign', () => {
    expect(sanitiseBlank('count', '5a0')).toBe('50');
    expect(sanitiseBlank('percent', '50')).toBe('50%');
  });

  /** Clearing a blank is an override the content layer honours; don't fight it. */
  it('lets a field be emptied', () => {
    expect(sanitiseBlank('money', '')).toBe('');
    expect(sanitiseBlank('percent', '')).toBe('');
  });

  it('passes free text through untouched', () => {
    expect(sanitiseBlank('text', '1, selected before start')).toBe('1, selected before start');
  });
});

describe('disagreeingRows', () => {
  it('reports a label carrying two different values', () => {
    const found = disagreeingRows([
      { label: 'Revision rounds', value: '3', source: 'Part A-1' },
      { label: 'Revision rounds', value: '2', source: 'Part A-2' },
      { label: 'Languages', value: '1', source: 'Part A-1' },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].label).toBe('Revision rounds');
    expect(found[0].values.map((v) => v.source)).toEqual(['Part A-1', 'Part A-2']);
  });

  it('says nothing where every occurrence agrees', () => {
    expect(
      disagreeingRows([
        { label: 'Revision rounds', value: '3', source: 'Part A-1' },
        { label: 'Revision rounds', value: '3', source: 'Part A-2' },
      ]),
    ).toEqual([]);
  });

  it('compares labels case- and whitespace-insensitively', () => {
    expect(
      disagreeingRows([
        { label: 'Revision rounds', value: '3', source: 'a' },
        { label: ' revision ROUNDS ', value: '2', source: 'b' },
      ]),
    ).toHaveLength(1);
  });
});
