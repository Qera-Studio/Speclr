'use client';

import { ChevronRight } from 'lucide-react';
import type { DocContent, ResolvedContent, TermItem } from '@/lib/domain/docContent';
import type { MsaSection } from '@/lib/domain/msaBoilerplate';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RemoveButton } from '@/components/ui/remove-button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/**
 * The inputs behind the editable document text.
 *
 * One rule runs through all of them: **show the resolved value, store only what
 * was edited.** An input renders `content[key] ?? resolved[key]`, so you always
 * see the real words rather than a blank box, while an untouched document keeps
 * resolving its defaults live — and picking a different employee still re-reads
 * the wording that branches on engagement type. The moment you type, the
 * override is stored, and finalize freezes the lot.
 *
 * Clearing a field to empty is therefore a deliberate edit, not a reset: the
 * document prints nothing there. That is the honest reading of an empty input,
 * and `contentOf` is tested for it.
 */

export type ContentPatch = (patch: Partial<DocContent>) => void;

export function ContentText({
  id,
  label,
  description,
  value,
  onChange,
  rows,
}: {
  id: string;
  label: string;
  description?: string;
  value: string;
  onChange: (next: string) => void;
  /** Set for prose; omit for a single line. */
  rows?: number;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {rows ? (
        <Textarea
          id={id}
          rows={rows}
          className="font-normal leading-relaxed"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

/**
 * The TERMS block — the legal assertions a document carries.
 *
 * Collapsed one per clause, like the line items: they are correct almost every
 * time, and six expanded title+body pairs would bury the rest of the rail.
 */
export function TermsFields({
  terms,
  onChange,
}: {
  terms: TermItem[];
  onChange: (next: TermItem[]) => void;
}) {
  const update = (index: number, patch: Partial<TermItem>) =>
    onChange(terms.map((t, i) => (i === index ? { ...t, ...patch } : t)));

  return (
    <div className="flex flex-col gap-2">
      {terms.map((term, index) => (
        <Collapsible key={index} className="group/term rounded-md border border-border">
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              >
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[open]/term:rotate-90"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {term.title.trim() || `Term ${index + 1}`}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{term.body}</span>
                </span>
              </button>
            }
          />
          <CollapsibleContent>
            <div className="flex flex-col gap-3 border-t border-border p-3">
              <Field>
                <FieldLabel htmlFor={`term-title-${index}`}>Title</FieldLabel>
                <Input
                  id={`term-title-${index}`}
                  value={term.title}
                  onChange={(e) => update(index, { title: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`term-body-${index}`}>Body</FieldLabel>
                <Textarea
                  id={`term-body-${index}`}
                  rows={4}
                  value={term.body}
                  onChange={(e) => update(index, { body: e.target.value })}
                />
              </Field>
              <div>
                <RemoveButton
                  label={`Remove term ${index + 1}`}
                  onConfirm={() => onChange(terms.filter((_, i) => i !== index))}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange([...terms, { title: '', body: '' }])}
        >
          Add term
        </Button>
      </div>
    </div>
  );
}

/** A blank line separates paragraphs; runs of blank lines collapse to one. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * The MSA clauses.
 *
 * Each clause's paragraphs are edited as one pane with a blank line between
 * them, the way the letter body is — and for the same reason: a stack of
 * per-paragraph boxes is unusable for prose, and round-tripping split/join on
 * every keystroke eats the character being typed. Here the raw text lives in
 * the stored array and is only split on change, so nothing is derived twice.
 */
export function ClauseFields({
  clauses,
  onChange,
}: {
  clauses: MsaSection[];
  onChange: (next: MsaSection[]) => void;
}) {
  const update = (index: number, patch: Partial<MsaSection>) =>
    onChange(clauses.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  return (
    <div className="flex flex-col gap-2">
      {clauses.map((clause, index) => (
        <Collapsible key={index} className="group/clause rounded-md border border-border">
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              >
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[open]/clause:rotate-90"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {clause.number}. {clause.heading.trim() || 'Untitled clause'}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {clause.body[0] ?? ''}
                  </span>
                </span>
              </button>
            }
          />
          <CollapsibleContent>
            <div className="flex flex-col gap-3 border-t border-border p-3">
              <Field>
                <FieldLabel htmlFor={`clause-heading-${index}`}>Heading</FieldLabel>
                <Input
                  id={`clause-heading-${index}`}
                  value={clause.heading}
                  onChange={(e) => update(index, { heading: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`clause-body-${index}`}>Body</FieldLabel>
                <Textarea
                  id={`clause-body-${index}`}
                  rows={8}
                  className="font-normal leading-relaxed"
                  value={clause.body.join('\n\n')}
                  onChange={(e) => update(index, { body: splitParagraphs(e.target.value) })}
                />
                <FieldDescription>One blank line starts a new paragraph.</FieldDescription>
              </Field>
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

/**
 * Reads the value an input should show: the stored override if there is one,
 * else the resolved default. Keeps every call site to one short expression.
 */
export function shown<K extends keyof DocContent & keyof ResolvedContent>(
  content: DocContent,
  resolved: ResolvedContent,
  key: K,
): ResolvedContent[K] {
  return (content[key] ?? resolved[key]) as ResolvedContent[K];
}
