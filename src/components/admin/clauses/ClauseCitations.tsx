'use client';

import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { citations } from '@/lib/domain/contract/clauseBody';

/**
 * What this clause points at, and whether it is there.
 *
 * It exists because deriving the paragraph numbers fixes only half of the
 * renumbering problem. Moving a point rewrites its own marker; it cannot
 * rewrite the sentence in *another* clause that cites the old position,
 * because that sentence is prose and this codebase does not edit legal prose
 * automatically. The clauses cite each other nineteen times, so the risk is
 * real rather than theoretical.
 *
 * So the judgement is handed to the reader instead: here is what you are
 * pointing at, and here is the one that does not resolve. That is the right
 * division of labour for words a commercial lawyer has to sign off, and it is
 * the same shape as the rest of the library, which warns rather than corrects.
 *
 * A reference to a clause that does not exist is marked, not blocked. A clause
 * being drafted before the one it cites is an ordinary state, and refusing the
 * save would make the library unusable in the order people actually write.
 */
export default function ClauseCitations({
  body,
  known,
  self,
}: {
  /** The clause body as it would be saved. */
  body: string[];
  /** Every clause number in the library, for resolving a reference. */
  known: Set<number>;
  /** This clause's own number, so a self-reference is not flagged as missing. */
  self: number;
}) {
  const found = citations(body);
  if (found.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">Refers to</span>
      {found.map((cite) => {
        const missing = !known.has(cite.clause) && cite.clause !== self;
        return (
          <Badge
            key={cite.reference}
            variant={missing ? 'destructive' : 'secondary'}
            className="font-normal tabular-nums"
          >
            {missing ? <AlertTriangle className="size-3" aria-hidden="true" /> : null}
            {cite.reference}
            {missing ? <span className="sr-only"> (no such clause)</span> : null}
          </Badge>
        );
      })}
    </div>
  );
}
