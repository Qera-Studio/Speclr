'use client';

import { FieldGroup } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { BlankField } from '@/components/contract/BlankFields';
import type { BlankValues } from '@/lib/domain/contract/blanks';
import type { BlankScope } from '@/lib/domain/contract/completeness';

/**
 * The Agreement's and the Schedules' own figures, as a page.
 *
 * Periods, rates and splits in the standing text: the payment window, the
 * interest rate, the advance/balance split, how long confidentiality survives.
 * They belong to the contract rather than to any Part, and there are around
 * thirty of them on a four-Part contract — which is why they are no longer in
 * the 384px rail, where they were a scroll of unlabelled boxes under everything
 * else.
 *
 * Grouped the way the document is: the Contract Agreement first, then each
 * Schedule the contract actually includes, in printing order. A Schedule with no
 * Part does not appear, because `contractScopes` does not yield it.
 *
 * **One grid per group, not one section per clause.** Measured: the Master
 * Agreement's thirteen figures sit in seven scopes, so the page spent seven
 * headings and six separators laying out what fits in five rows of three. Two
 * of those scopes hold a *single* blank each and were spending a heading, a
 * separator and a whole row on one input, which reads as far more to fill in
 * than there is.
 *
 * The clause headings were checked before they went rather than assumed
 * redundant: every one of the thirteen titles from `blankMeta` already names
 * its own clause ("Confidentiality term", "Non-solicit period", "Breach cure
 * period"), and none of them collide. The ⓘ beside each carries the
 * consequence. A figure whose label needed its heading to be understood would
 * be a `blankMeta` copy fix, not a reason to keep six separators.
 */
export default function TermsForm({
  scopes,
  values,
  onChange,
}: {
  /** The non-Part scopes, in document order. */
  scopes: BlankScope[];
  values: BlankValues;
  onChange: (key: string, value: string) => void;
}) {
  const groups: { group: string; scopes: BlankScope[] }[] = [];
  for (const scope of scopes) {
    const last = groups.at(-1);
    if (last?.group === scope.group) last.scopes.push(scope);
    else groups.push({ group: scope.group, scopes: [scope] });
  }

  return (
    <div className="flex max-w-5xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-section font-medium">Agreement &amp; schedule terms</h2>
        <p className="text-body text-muted-foreground">
          The periods, rates and splits in the standing text. Every one is drafted with a
          default — change only what this engagement needs.
        </p>
      </div>

      {groups.map(({ group, scopes: inGroup }) => (
        <section key={group} className="flex flex-col gap-4">
          {/* The Agreement's own figures come first and need no label — the page
              title already says which document they belong to. The Schedules do. */}
          {group === 'Contract Agreement' ? null : (
            <div className="flex items-center gap-3">
              <h3 className="shrink-0 text-body font-medium">{group}</h3>
              <span className="h-px min-w-0 flex-1 bg-border" />
            </div>
          )}

          {/* `FieldRow` measures the enclosing `FieldGroup`, not itself.

              Three to a row, not four. Four across this 896px panel gives each
              track about 200px to carry a label, an input and its ⓘ, and the
              group reads as a wall of boxes rather than as fields. Three is
              also the simpler grid: `FieldRow`'s 4 is two breakpoints (pairs,
              then four at `@lg`), so between 288px and 512px it was showing
              two anyway. Measured in `e2e/contract-flow.spec.ts`, which counts
              the inputs sharing a top edge rather than reading the class. */}
          <FieldGroup size="form">
            <FieldRow columns={3}>
              {inGroup.flatMap((scope) =>
                scope.parsed.flatMap((parsed, i) =>
                  parsed.blanks.map((blank, j) => (
                    <BlankField
                      key={blank.key}
                      blank={blank}
                      rowLabel={scope.rowLabels?.[i]}
                      text={scope.texts[i]}
                      ordinal={parsed.blanks.length > 1 ? j + 1 : 0}
                      values={values}
                      onChange={onChange}
                    />
                  )),
                ),
              )}
            </FieldRow>
          </FieldGroup>
        </section>
      ))}

      {scopes.length === 0 ? (
        <p className="text-body text-muted-foreground">
          Nothing to set here yet — the standing terms that carry figures depend on which
          Schedules the contract includes.
        </p>
      ) : null}
    </div>
  );
}
