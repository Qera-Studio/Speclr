'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import IdentityStep from '@/components/admin/clients/onboarding/IdentityStep';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * `/preview/client-draft` — the identity step, with no session.
 *
 * Exists for `e2e/client-draft.spec.ts`, which measures things jsdom cannot
 * see. Onboarding's fields are `register`-based, so a value lives on the DOM
 * node while react-hook-form keeps a second copy in its store, and the two can
 * disagree without anything throwing. jsdom answers `input.value` from the
 * store, so it reports agreement that the browser never had: two Jest tests
 * written against the draft-restore bug passed while the form was visibly
 * broken in Chromium.
 *
 * **It mirrors the shell's own state transition**, which is the part a simpler
 * fixture missed. `ClientOnboarding` holds `client` in state, starts it at
 * `null` on the create path and sets it to the saved record on `onSaved`, so
 * `IdentityStep` goes from "no record" to "a record" **without unmounting**.
 * That is what changes the draft key under a live form, and it is the case the
 * real bug lives in. Rendering the step with a fixed `client={null}` cannot
 * reach it.
 *
 * **It does not exist in production**, like its siblings. Nothing is written:
 * the step's server actions are the real ones, so the spec drives it only as
 * far as the client-side behaviour it is measuring.
 */
export default function ClientDraftPreview() {
  if (process.env.NODE_ENV === 'production') notFound();

  const [client, setClient] = useState<ClientRecord | null>(null);

  return (
    <div className="flex h-screen flex-col p-4">
      <IdentityStep
        client={client}
        onSaved={setClient}
        submitLabel="Tax"
        kind="individual"
        country="IN"
      />
    </div>
  );
}
