import { clauseMarkdown, libraryMarkdown } from '../clauseMarkdown';
import type { ClauseInput } from '../msa';

const CLAUSE: ClauseInput = {
  number: 4,
  heading: 'Scope and Additional Work',
  summary: 'What is in scope, and how work beyond it is quoted',
  body: [
    '4.1 The Services are those described in the applicable Part.',
    '(a) anything not described there is Additional Work;',
    '"Additional Work" means any work not expressly specified.',
  ],
  archived: false,
};

/**
 * The download, as text rather than as a file.
 *
 * Pure so it can be asserted: the browser half is three lines of Blob plumbing
 * in the drawer, and everything worth being wrong about is here.
 */
describe('clauseMarkdown', () => {
  it('writes the number and heading as a heading, and the body beneath it', () => {
    const md = clauseMarkdown(CLAUSE);
    expect(md).toContain('## 4. Scope and Additional Work');
    expect(md).toContain('4.1 The Services are those described in the applicable Part.');
  });

  /**
   * The description is the library's own editorial note and never appears in a
   * contract (`CONTEXT.md` §5c). It is still written here, because this file is
   * a copy of the library rather than a copy of the agreement, but it is marked
   * as a note so nobody pastes it into one.
   */
  it('marks the description as a note rather than as clause text', () => {
    const md = clauseMarkdown(CLAUSE);
    expect(md).toMatch(/> _What is in scope, and how work beyond it is quoted_/);
  });

  it('leaves the note out when a clause has no description', () => {
    const md = clauseMarkdown({ ...CLAUSE, summary: undefined });
    expect(md).not.toContain('>');
  });

  it('says so when a clause is archived, because the file outlives the screen', () => {
    expect(clauseMarkdown({ ...CLAUSE, archived: true })).toContain('Archived');
    expect(clauseMarkdown(CLAUSE)).not.toContain('Archived');
  });

  /**
   * Body lines are separated by a blank line rather than a single newline.
   *
   * Markdown joins consecutive lines into one paragraph, so without this every
   * clause renders as a single run-on block and the numbered points stop being
   * points. The one thing this format exists to preserve is the structure.
   */
  it('keeps each paragraph separate rather than running them together', () => {
    const md = clauseMarkdown(CLAUSE);
    expect(md).toContain('applicable Part.\n\n(a) anything');
  });
});

describe('libraryMarkdown', () => {
  const OTHER: ClauseInput = {
    number: 11,
    heading: 'Confidentiality',
    body: ['11.1 Each Party shall keep confidential.'],
    archived: false,
  };

  it('opens with a title and writes every clause in number order', () => {
    const md = libraryMarkdown([OTHER, CLAUSE]);
    expect(md.startsWith('# Master Service Agreement')).toBe(true);
    expect(md.indexOf('## 4.')).toBeLessThan(md.indexOf('## 11.'));
  });

  /**
   * The same warning the page carries. A file leaves the app and is read
   * without it, and "nothing here has been reviewed by a lawyer" is the one
   * sentence that must travel with the text.
   */
  it('carries the not-reviewed warning into the file', () => {
    expect(libraryMarkdown([CLAUSE])).toMatch(/reviewed by a lawyer/i);
  });

  it('separates clauses so they do not run into one another', () => {
    const md = libraryMarkdown([CLAUSE, OTHER]);
    expect(md).toContain('\n\n## 11. Confidentiality');
  });
});
