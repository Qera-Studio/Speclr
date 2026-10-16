import { Fragment } from "react";
import { partSectionLabel } from "@/lib/domain/contract/completeness";
import type { ContractService, LibraryLine, ServiceRow } from "@/lib/domain/service";

/**
 * A set of contract terms, read as the contract prints them.
 *
 * Read-only on purpose. Terms are their own record, not a part of a service
 * (decided 16 October 2026): a service links to them, and they are edited on
 * their own page, where the editor states which services share them.
 *
 * Every heading is `partSectionLabel`, the map the contract sheet prints from,
 * so this view and the contract cannot call a section by different names.
 */
export default function TermsView({
  terms,
  exclusions,
  clientInputs,
}: {
  terms: ContractService;
  exclusions: LibraryLine[];
  clientInputs: LibraryLine[];
}) {
  const label = (section: string) => partSectionLabel(section, terms.scheduleKey);
  const lines = (pool: LibraryLine[], ids: string[]) =>
    ids.map((id) => pool.find((line) => line.id === id)?.text).filter((t): t is string => !!t);

  // Each section is either points or label/value rows. Empty ones are left
  // out, as the contract leaves them out.
  const sections: Array<{ key: string; texts?: string[]; rows?: ServiceRow[] }> = [
    { key: "overview", texts: terms.overview },
    { key: "included", texts: terms.included },
    { key: "account", texts: terms.accountTerms },
    { key: "limits", rows: terms.limits },
    { key: "limitsNotes", texts: terms.limitsNotes },
    { key: "completion", texts: terms.completion },
    { key: "receives", texts: terms.receives },
    { key: "receivesNotes", texts: terms.receivesNotes },
    { key: "costs", texts: terms.thirdPartyCosts.trim() ? [terms.thirdPartyCosts] : [] },
    { key: "fee", rows: terms.fee },
    { key: "exclusions", texts: lines(exclusions, terms.exclusionIds) },
    { key: "clientInputs", texts: lines(clientInputs, terms.clientInputIds) },
  ];
  const filled = sections.filter((s) => (s.texts ?? s.rows ?? []).length > 0);

  if (filled.length === 0) {
    return <p className="text-body text-tab-label">These terms say nothing yet.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {filled.map((section) => (
        <section key={section.key} className="flex flex-col gap-2">
          <h3 className="text-body font-medium">{label(section.key)}</h3>
          {section.rows ? <Rows rows={section.rows} /> : <Points texts={section.texts ?? []} />}
        </section>
      ))}
    </div>
  );
}

function Points({ texts }: { texts: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-4 text-body text-muted-foreground marker:text-tab-label">
      {texts.map((text, i) => (
        <li key={i}>
          <WithBlanks text={text} />
        </li>
      ))}
    </ul>
  );
}

function Rows({ rows }: { rows: ServiceRow[] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-x-6 gap-y-1 text-body">
      {rows.map((row, i) => (
        <Fragment key={i}>
          <dt className="text-tab-label">{row.label}</dt>
          <dd className="text-muted-foreground">
            <WithBlanks text={row.value} />
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

/**
 * A `[blank]` reads as a quiet chip: the contract asks for that figure when
 * the service is put on one, so here it is a placeholder, not a value.
 */
function WithBlanks({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/).map((part, i) =>
        /^\[[^\]]+\]$/.test(part) ? (
          <span key={i} className="rounded-sm bg-muted px-1 text-tab-label">
            {part.slice(1, -1)}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
