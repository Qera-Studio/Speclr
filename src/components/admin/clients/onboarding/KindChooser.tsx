'use client';

import { Building2, User } from 'lucide-react';
import type { ClientKind } from '@/lib/domain/entityType';

/**
 * Person or company? Asked before the first field.
 *
 * The two flows diverge more than they overlap. A company is asked for a legal
 * entity name, a CIN, three contact people and a vendor portal; a freelancer has
 * none of those and is one person who is their own contact. Asking once at the
 * top is a click; asking implicitly, by leaving a page full of company fields
 * blank, is a record nobody can tell apart from an unfinished one.
 *
 * **The answer is never stored.** It picks which entity types the identity step
 * offers, and the entity type is what every later reader derives the kind from
 * (`clientKindOf`). A column here would be a second place for a record to say
 * what it is, and a second place for it to disagree (`PRINCIPLES.md` rule 3).
 *
 * No next button, deliberately: there are two options and choosing one *is* the
 * decision. A confirm step would ask the same question twice.
 */
export default function KindChooser({ onChoose }: { onChoose: (kind: ClientKind) => void }) {
  return (
    <div className="m-auto w-full max-w-2xl">
      <h2 className="mb-1 text-center text-lg font-medium">Who are you adding?</h2>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        It decides what they are asked for. You can change it later by changing their entity type.
      </p>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <li>
          <KindCard
            icon={<User aria-hidden className="size-10" />}
            title="An individual"
            line="A freelancer, a consultant, or a sole proprietor billing under a trading name."
            onClick={() => onChoose('individual')}
          />
        </li>
        <li>
          <KindCard
            icon={<Building2 aria-hidden className="size-10" />}
            title="A company"
            line="An incorporated entity — a private limited, an LLP, a partnership or a trust."
            onClick={() => onChoose('company')}
          />
        </li>
      </ul>
    </div>
  );
}

/**
 * A real `<button>` in a real list, so tab order, Enter and Space are free and
 * a screen reader is told what it is rather than what it looks like.
 */
function KindCard({
  icon,
  title,
  line,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  line: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/kind flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="text-muted-foreground transition-colors group-hover/kind:text-primary">
        {icon}
      </span>
      <span className="text-base font-medium text-foreground">{title}</span>
      <span className="max-w-[28ch] text-xs/relaxed text-balance text-muted-foreground">{line}</span>
    </button>
  );
}
