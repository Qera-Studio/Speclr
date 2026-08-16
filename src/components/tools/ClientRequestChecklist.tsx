'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { draftKey, useDraft } from '@/lib/draft';

/**
 * What to ask a client for, as a list of ticks.
 *
 * The seven onboarding steps say what the record *holds*; this says what has to
 * be asked for before it can be filled in, which is a conversation rather than
 * a form. So it is deliberately dumb: a line and a checkbox, no fields, no
 * server, nothing derived from any particular client.
 *
 * The groups mirror `ONBOARDING_STEPS` by hand rather than being generated from
 * it. They are not the same list: a step is a screen, and several of these
 * items ("their LUT number, if they are exporting") are one question behind one
 * field. Generating this from the steps would tie a phone call's script to a
 * wizard's layout.
 *
 * **Ticks live in `sessionStorage`, and nowhere else** (`src/lib/draft.ts`).
 * They are a scratchpad kept while you are on the call, so they survive a
 * refresh and a walk over to the client's record, and die with the tab. Nothing
 * here is a record of what a client actually supplied — the client row and its
 * attachments are that.
 */

/**
 * Which of the two lists a line belongs to. Absent means both.
 *
 * One tagged list rather than two lists, because most of what you ask for is
 * the same conversation either way and a second copy would be a second place
 * for "payment terms, in days" to go stale. It is also not a jurisdiction pack
 * (`PRINCIPLES.md` rule 5): nothing computes from this, no tax is worked out
 * from it, and the words are a prompt for a human. When the jurisdiction seam
 * does get built, this list is one of the things it should feed.
 */
type Scope = 'india' | 'foreign';

interface Item {
  text: string;
  only?: Scope;
}

const CHECKLIST: readonly { heading: string; items: readonly Item[] }[] = [
  {
    heading: 'Identity',
    items: [
      { text: 'Legal entity name, exactly as registered' },
      { text: 'Entity type (private limited, LLP, proprietorship, individual)', only: 'india' },
      { text: 'Entity type, and the register it is incorporated in', only: 'foreign' },
      { text: 'Registered address, with pincode', only: 'india' },
      { text: 'Registered address, with country and postal code', only: 'foreign' },
      { text: 'Billing address, if invoices go somewhere else' },
      { text: 'Company email and phone' },
    ],
  },
  {
    heading: 'Tax & registration',
    items: [
      { text: 'GSTIN', only: 'india' },
      { text: 'PAN', only: 'india' },
      { text: 'CIN, if a registered company', only: 'india' },
      { text: 'Whether they deduct TDS, under which section and at what rate', only: 'india' },
      { text: 'Their TAN, if they deduct', only: 'india' },
      { text: 'Whether they are an SEZ unit, and their LOA', only: 'india' },
      { text: 'Their tax registration: VAT number, ABN, EIN or local equivalent', only: 'foreign' },
      { text: 'Whether they account for the tax on their side (reverse charge)', only: 'foreign' },
      { text: 'Whether they withhold tax at source, and at what rate', only: 'foreign' },
      { text: 'Whether they need a tax residency certificate from us', only: 'foreign' },
      { text: 'Whether they need a W-8BEN-E from us (US clients)', only: 'foreign' },
    ],
  },
  {
    heading: 'Contacts',
    items: [
      { text: 'Primary contact: name, designation, email, phone' },
      { text: 'Who accounts payable is, or the inbox invoices go to' },
      { text: 'Who signs the contract, and their designation' },
    ],
  },
  {
    heading: 'Commercial terms',
    items: [
      { text: 'Payment terms, in days' },
      { text: 'Billing currency, and who bears the conversion and bank charges', only: 'foreign' },
      { text: 'Late payment interest, if any' },
      { text: 'For a retainer: how often it is billed, and on which day' },
      { text: 'Whether a PO is required, and its number' },
      { text: 'Vendor portal address, if invoices are submitted through one' },
      { text: 'Their remitting bank, and the details it needs from us', only: 'foreign' },
    ],
  },
  {
    heading: 'Services & term',
    items: [
      { text: 'Which services are engaged, and the rate agreed for each' },
      { text: 'Start date' },
      { text: 'Term length and notice period' },
      { text: 'Whether the term renews on its own' },
      { text: 'Which law and which courts the contract runs under', only: 'foreign' },
    ],
  },
  {
    heading: 'Documents',
    items: [
      { text: 'GST registration certificate', only: 'india' },
      { text: 'PAN card', only: 'india' },
      { text: 'Certificate of incorporation', only: 'india' },
      { text: 'Certificate of incorporation, or local equivalent', only: 'foreign' },
      { text: 'Their tax registration certificate', only: 'foreign' },
      { text: 'W-8 / W-9, where they ask for one', only: 'foreign' },
      { text: 'Signed contract or MSA' },
      { text: 'Purchase order' },
      { text: "The signatory's signature" },
      { text: 'FIRC / FIRA from our bank, once the payment lands', only: 'foreign' },
    ],
  },
  {
    heading: 'Delivery & access',
    items: [
      { text: 'Brand assets' },
      { text: 'Domain registrar' },
      { text: 'DNS' },
      { text: 'Hosting' },
      { text: 'Analytics and Search Console' },
      { text: 'Ad accounts' },
      { text: 'Social accounts' },
      { text: 'Repository and deployment' },
      { text: 'Where each of the above is kept, never the credential itself' },
    ],
  },
];

const SCOPES: readonly { value: Scope; label: string }[] = [
  { value: 'india', label: 'In India' },
  { value: 'foreign', label: 'Outside India' },
];

const idOf = (item: string) => `req-${item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export default function ClientRequestChecklist() {
  const [scope, setScope] = useState<Scope>('india');
  // One set of ticks across both lists, keyed on the line's own text. Switching
  // does not clear what was already asked for, and the lines the two share stay
  // ticked — which is what happens when a client turns out to be the other kind
  // half way through the call.
  const [ticked, setTicked] = useState<string[]>([]);
  useDraft(draftKey(undefined, 'request-checklist'), ticked, setTicked);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
        <TabsList>
          {SCOPES.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Two columns by CSS multicol rather than a grid: the groups are
          different lengths, and multicol flows them down one column and on into
          the next, so the shorter list ("Contacts", three lines) does not leave
          a hole beside the longer one. `break-inside-avoid` keeps a group whole
          rather than splitting its heading from its lines. The box scrolls on
          its own so the page header stays put. */}
      <div className="max-h-[65vh] overflow-y-auto pr-2 md:columns-2 md:gap-x-10">
        {CHECKLIST.map((group) => (
          <fieldset
            key={group.heading}
            className="flex break-inside-avoid flex-col gap-3 pb-6"
          >
            <legend className="text-sm font-medium">{group.heading}</legend>
            {group.items
              .filter((item) => !item.only || item.only === scope)
              .map(({ text }) => (
                <div key={text} className="flex items-start gap-3">
                  <Checkbox
                    // The line itself is the id, minus everything an id may not
                    // hold. Stable because the text is, and unique because no
                    // two lines say the same thing.
                    id={idOf(text)}
                    className="mt-0.5"
                    checked={ticked.includes(text)}
                    onCheckedChange={(checked) =>
                      setTicked((prev) =>
                        checked ? [...prev, text] : prev.filter((t) => t !== text),
                      )
                    }
                  />
                  <Label htmlFor={idOf(text)} className="font-normal leading-snug">
                    {text}
                  </Label>
                </div>
              ))}
          </fieldset>
        ))}
      </div>
    </div>
  );
}
