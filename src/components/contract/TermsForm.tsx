'use client';

import { Fragment } from 'react';
import { FieldGroup, FieldSeparator } from '@/components/ui/field';
import { BlankSection } from '@/components/contract/BlankFields';
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
 * Grouped the way the document is: the Master Agreement first, then each
 * Schedule the contract actually includes, in printing order. A Schedule with no
 * Part does not appear, because `contractScopes` does not yield it.
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
        <h2 className="text-lg font-semibold">Agreement &amp; schedule terms</h2>
        <p className="text-sm text-muted-foreground">
          The periods, rates and splits in the standing text. Every one is drafted with a
          default — change only what this engagement needs.
        </p>
      </div>

      {groups.map(({ group, scopes: inGroup }) => (
        <section key={group} className="flex flex-col gap-4">
          {/* The Agreement's own figures come first and need no label — the page
              title already says which document they belong to. The Schedules do. */}
          {group === 'Master Agreement' ? null : (
            <div className="flex items-center gap-3">
              <h3 className="shrink-0 text-sm font-semibold">{group}</h3>
              <span className="h-px min-w-0 flex-1 bg-border" />
            </div>
          )}

          {/* `FieldRow` measures the enclosing `FieldGroup`, not itself. */}
          <FieldGroup size="form">
            {inGroup.map((scope, i) => (
              <Fragment key={scope.scope}>
                {i > 0 ? <FieldSeparator /> : null}
                <BlankSection scope={scope} values={values} onChange={onChange} />
              </Fragment>
            ))}
          </FieldGroup>
        </section>
      ))}

      {scopes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing to set here yet — the standing terms that carry figures depend on which
          Schedules the contract includes.
        </p>
      ) : null}
    </div>
  );
}
