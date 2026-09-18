import type { ClauseInput } from './msa';

/**
 * The clause library as Markdown, for the drawer's download.
 *
 * Pure, and in the domain layer rather than in the drawer, for the ordinary
 * reason: the browser half is three lines of Blob plumbing and everything worth
 * being wrong about is the text. It is also the shape a second caller would
 * want (an export of the whole agreement), which is `PRINCIPLES.md` rule 1 seen
 * coming rather than after the fact.
 *
 * **Markdown, not the printed contract.** This is a copy of the *library*: it
 * carries the editorial descriptions and the archived flag, neither of which
 * appears in an agreement. The contract's own rendering is `ContractSheet`, and
 * the two must not be confused, which is why the description is written as a
 * blockquote note rather than as body text.
 */

/** A body's paragraphs, blank-line separated so Markdown keeps them apart. */
const paragraphs = (body: string[]) => body.filter(Boolean).join('\n\n');

export function clauseMarkdown(clause: ClauseInput): string {
  const lines = [`## ${clause.number}. ${clause.heading}`];
  // Archived clauses stay readable for audit (`CONTEXT.md` §5c) and a file
  // outlives the screen that said so, so the state travels with the text.
  if (clause.archived) lines.push('**Archived**');
  if (clause.summary) lines.push(`> _${clause.summary}_`);
  lines.push(paragraphs(clause.body));
  return lines.join('\n\n');
}

export function libraryMarkdown(clauses: ClauseInput[]): string {
  const ordered = [...clauses].sort((a, b) => a.number - b.number);
  return [
    '# Master Service Agreement',
    // The page's own warning, which is the one sentence that has to travel with
    // the text: a file is read a long way from the screen that qualified it.
    '> Nothing here has been reviewed by a lawyer. Clause numbers are cited by the text itself, so a number is never reused.',
    ...ordered.map(clauseMarkdown),
  ].join('\n\n');
}
