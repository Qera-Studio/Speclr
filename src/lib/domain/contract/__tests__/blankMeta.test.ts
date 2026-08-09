import { blankMeta, PROSE_META, ROW_META } from '../blankMeta';
import { contractScopes } from '../completeness';
import { SERVICES } from '../seed/services';

/**
 * Every figure a contract can hold, from a contract holding every Service.
 * That covers all 22 Parts, the Master Agreement and all four Schedules — a
 * Schedule's own clauses only appear once one of its Parts is present.
 */
const scopes = contractScopes({ parts: SERVICES.map((s) => ({ ...s })), blanks: {} });

const rowLabels = new Set<string>();
const proseKeys = new Set<string>();
for (const scope of scopes) {
  for (const [i, parsed] of scope.parsed.entries()) {
    if (parsed.blanks.length === 0) continue;
    const rowLabel = scope.rowLabels?.[i];
    if (rowLabel !== undefined) rowLabels.add(rowLabel.trim().toLowerCase());
    else for (const blank of parsed.blanks) proseKeys.add(blank.key);
  }
}

/**
 * The copy lives beside the drafted text rather than inside it, so nothing keeps
 * the two in step but this. Both directions matter: a figure with no title ships
 * an input labelled "Figure", and a title for a figure that no longer exists is
 * a line of copy nobody will ever read again.
 */
describe('blankMeta covers every figure, and nothing else', () => {
  it('has a title and an explanation for every Limits or Fee row', () => {
    expect([...rowLabels].filter((label) => !(label in ROW_META)).sort()).toEqual([]);
  });

  it('has a title and an explanation for every figure written into a sentence', () => {
    expect([...proseKeys].filter((key) => !(key in PROSE_META)).sort()).toEqual([]);
  });

  it('carries no copy for a row label that no longer exists', () => {
    expect(Object.keys(ROW_META).filter((key) => !rowLabels.has(key)).sort()).toEqual([]);
  });

  it('carries no copy for a figure that no longer exists', () => {
    expect(Object.keys(PROSE_META).filter((key) => !proseKeys.has(key)).sort()).toEqual([]);
  });

  /** Two or three words. Longer than that and the form stops lining up. */
  it('keeps every title short enough to be a form label', () => {
    const long = Object.values({ ...ROW_META, ...PROSE_META })
      .map((m) => m.title)
      .filter((title) => title.split(/\s+/).length > 3);
    expect(long).toEqual([]);
  });

  it('writes an explanation that says more than the title does', () => {
    const thin = Object.entries({ ...ROW_META, ...PROSE_META })
      .filter(([, m]) => m.help.length < 30)
      .map(([key]) => key);
    expect(thin).toEqual([]);
  });
});

describe('blankMeta', () => {
  it('reads a table row by its label, whatever its casing', () => {
    expect(blankMeta('part.05.limits#4', '  Revision Rounds ').title).toBe('Revision rounds');
  });

  it('reads a figure in prose by its key', () => {
    expect(blankMeta('part.01.included#1').title).toBe('Domains registered');
  });

  /** A Service seeded with unknown copy still renders an editable field. */
  it('falls back to the subject of an unwritten label', () => {
    expect(blankMeta('x#0', 'Widgets — red, green, blue')).toEqual({
      title: 'Widgets',
      help: 'Widgets — red, green, blue',
    });
  });

  it('falls back to the sentence for an unwritten figure in prose', () => {
    expect(blankMeta('x#0', undefined, 'Up to [5] widgets')).toEqual({
      title: 'Figure',
      help: 'Up to ___ widgets',
    });
  });
});
