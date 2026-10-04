import { notFound } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import ContractFlow from '@/components/contract/flow/ContractFlow';
import { PARTS } from '@/lib/domain/seed/parts';
import { SERVICES } from '@/lib/domain/seed/services';
import { copyPart } from '@/lib/domain/contract/copy';
import { CLIENT_INPUTS, EXCLUSIONS } from '@/lib/domain/contract/seed/libraries';
import type { ClientRecord, ContractDocument } from '@/lib/domain/types';

/**
 * `/preview/contract-flow` — the contract builder, inside the real shell.
 *
 * It exists because the builder cannot otherwise be seen: `/client/docs/new/contract`
 * is behind the Clerk wall, so a browser check there measures the sign-in page
 * and reports a healthy 200 while proving nothing. Every real route is
 * authorized and must stay that way, so the fixture is the way in.
 *
 * Seeded with a client who already carries an engaged service, because that is
 * the case the flow was rebuilt for: the services arrive from the record rather
 * than being picked from a blank catalogue (`PRINCIPLES.md` rule 3). A client
 * with none would show the empty path and hide the rule.
 *
 * Its own route rather than an addition to `/preview/shell`: that fixture is
 * measured by six specs, and making it heavier is what turned an unrelated
 * date-picker test red once already.
 *
 * **Not in production.** The data is the seeded catalogue and an invented
 * client, so nothing here is anybody's.
 */
export const metadata = {
  title: 'Preview — speclr',
  robots: { index: false, follow: false },
};

const CLIENT: ClientRecord = {
  id: 'preview-client',
  name: 'Clayora',
  companyName: 'Clayora Private Limited',
  address: 'Sector 62, Noida, Uttar Pradesh - 201301',
  addressParts: { state: 'Uttar Pradesh', country: 'IN' },
  email: 'hello@clayora.example',
  phone: '+919876500000',
  entityType: 'private_limited',
  commercial: {
    services: [{ code: '05' }, { code: '17' }],
    termMonths: 12,
    paymentTermsDays: 15,
  },
  createdAt: 0,
  updatedAt: 0,
} as ClientRecord;

/** A draft that already exists, so every phase is reachable. */
const DOC = {
  id: 'preview-con',
  type: 'CON',
  status: 'draft',
  clientId: 'preview-client',
  clientSnapshot: {
    name: 'Clayora',
    companyName: 'Clayora Private Limited',
    address: 'Sector 62, Noida, Uttar Pradesh - 201301',
    email: 'hello@clayora.example',
    phone: '+919876500000',
  },
  issueDate: '2026-06-10',
  lineItems: [],
  gstRatePercent: 0,
  contract: {
    parts: [PARTS.find((s) => s.code === '05')!, PARTS.find((s) => s.code === '17')!],
    blanks: {},
    library: {},
    // Carried across from the client's `commercial.termMonths` by
    // `seedFromClient`, which is what a real draft holds by the time it has a
    // client. Without it the fixture showed a summary rail with no term in it
    // and hid the derivation entirely.
    termMonths: 12,
  },
  createdAt: 0,
  updatedAt: 0,
} as unknown as ContractDocument;

/**
 * The same draft carrying only the Service whose blanks are all defaulted.
 *
 * `?only=filled` selects it, and it exists for one measurement: with nothing
 * missing anywhere, the **acknowledgement is the only thing holding the phase**.
 * The two-Service fixture cannot show that, because its second Service is
 * genuinely short and the count keeps the button disabled either way — which is
 * exactly how the first version of `contract-flow.spec.ts` came to pass with
 * the acknowledgement gate deleted.
 */
const DOC_ALL_FILLED = {
  ...DOC,
  contract: { ...DOC.contract, parts: [PARTS.find((s) => s.code === '05')!] },
} as unknown as ContractDocument;

/**
 * The same draft with nothing on it yet, which is the **empty state**:
 * the four Schedule tiles and the services they open underneath.
 *
 * `?only=none` selects it. Without this variant the tiles could not be seen in
 * a browser at all, because every other fixture here already carries Parts and
 * the tiles are what stands in their place.
 */
const DOC_EMPTY = {
  ...DOC,
  contract: { ...DOC.contract, parts: [] },
} as unknown as ContractDocument;

/**
 * The same draft carrying a **sold Service** rather than a legacy Part.
 *
 * `?only=sold` selects it, and it is the case every real contract now takes:
 * the sixteen sales Services carry no legal text of their own and name the
 * Parts that do through `partCodes`. It exists because the bug it stands for
 * was invisible to every other fixture here — they all pass legacy Parts,
 * which name no frame and carry their own sections, so a missing resolution
 * changed nothing about them.
 *
 * `SOC` specifically, because it names three frames (15, 16 and 17) and so is
 * the one that proves they concatenate rather than the first one winning.
 */
const DOC_SOLD = {
  ...DOC,
  contract: {
    ...DOC.contract,
    parts: [
      copyPart(
        SERVICES.find((s) => s.code === 'SOC')!,
        EXCLUSIONS,
        CLIENT_INPUTS,
        undefined,
        [...SERVICES, ...PARTS],
      ).part,
    ],
  },
} as unknown as ContractDocument;

export default async function ContractFlowPreview({
  searchParams,
}: {
  searchParams: Promise<{ only?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { only } = await searchParams;

  return (
    <AdminShell user={{ name: 'Preview', email: 'preview@qera.studio' }} defaultOpen>
      {/*
        Rendered straight into the inset, with no `PageBody`, because that is
        what `DocumentRoute` does.

        It used to be wrapped in one, and that made the fixture the wrong
        shape: `PageBody` is an auto-height column, so `FlowShell`'s `h-full`
        resolved to nothing here and the flow sat against the top of the card
        while production centred it in the band. A fixture that does not match
        the route it stands in for measures a layout nobody ships, which is the
        trap this file's own header warns about one paragraph up.
      */}
      {/*
        `services` is the sold catalogue and `frames` is everything, which is
        the split `DocumentRoute` makes: the sixteen sales Services carry no
        legal text and name the Parts that do through `partCodes`, and seeding
        them archived all twenty-two (`contract/copy.ts`, `frameOf`).

        The fixture passed `PARTS` as both for a while, which is why the
        empty-frame bug was invisible here: a legacy Part names no frame and
        carries its own sections, so the resolution being absent changed
        nothing. `?only=sold` is the variant that actually exercises it.
      */}
      <ContractFlow
        clients={[CLIENT]}
        services={only === 'sold' ? SERVICES : PARTS}
        frames={[...SERVICES, ...PARTS]}
        exclusions={EXCLUSIONS}
        clientInputs={CLIENT_INPUTS}
        /*
          `?only=new` passes **no document at all**, which is the one state
          every other variant here hides: `/docs/new/contract` before anything
          is saved. It is where picking a client both creates the draft and
          seeds it, and therefore the only place the resume can fire against a
          draft the reader is still filling in.
        */
        doc={
          only === 'new'
            ? undefined
            : only === 'filled'
              ? DOC_ALL_FILLED
              : only === 'none'
                ? DOC_EMPTY
                : only === 'sold'
                  ? DOC_SOLD
                  : DOC
        }
        title="Contract"
      />
    </AdminShell>
  );
}
