# PRINCIPLES — speclr

> **This file is enforced, not advisory.** `CLAUDE.md` imports it, so it is in
> context for every session. Where a request contradicts a rule here, the
> assistant states the conflict and proposes the compliant path *before* writing
> code. The user can override — but the override is explicit, and gets recorded.
>
> Relationship to the other docs: `dev/` holds the eight master checklists (the
> production floor). `CONTEXT.md` holds domain rules and decisions already made.
> `AGENTS.md` holds standards. **This file holds the domain-modelling law** — how
> data is shaped, where a fact lives, and what gets separated from what. It sits
> above `AGENTS.md` and below the Legal and Security checklists.

---

## 0. Two corrections that gate everything below

### Bugs are not evidence of insufficient architecture

The place-of-supply invoice bug was **a domain modelling gap, not a scalability
failure**. Place of supply was operator-entered when it was derivable from the
recipient. A globally-architected system with the same operator-entered field
produces the same wrong invoice.

This is load-bearing because the inverse belief — "every bug means not
architected enough" — architects forever and ships nothing. When a bug appears,
the first question is *which of the five rules below was broken*, not *what
layer is missing*.

### Nav churn is a data-model symptom

Repeatedly rearranging the sidebar is the symptom. The cause is that the data
model is still forming, so the navigation has nothing stable to reflect and gets
redecorated instead.

**Nav follows data.** When the graph settles, the moving stops on its own. A
request to rearrange navigation for the third time is a signal to go look at the
model, and the assistant should say so.

---

## 1. The three layers

Everything in the document tool belongs to exactly one of these. The seam
between them is the whole point: **the layering that makes a second country
cheap later is the same layering that makes the India fixes cheap now.** There
is no trade-off being made — the seam is paid for once and serves both.

### Layer 1 — Core. Never changes anywhere on earth.

An issuer. A recipient. A date. A number. Line items with description, quantity
and rate. A total. A lifecycle: draft → finalized → void. Immutability at
finalize. Snapshotting.

That is every invoice in every country. speclr already has most of it, and it is
the part that was built well — integer paise, atomic FY numbering, the snapshot
pattern, the persistence layer's refusal to overwrite a finalized row.

**Core must never mention GST, CGST, SGST, IGST, GSTIN, or a state code.**

### Layer 2 — Jurisdiction pack. Swappable, one per country.

- Which tax fields exist
- How tax is computed
- Which identifier each party needs (GSTIN / TRN / VAT / EIN)
- What must be printed for the document to be legally valid
- Numbering rules (India's April–March financial year is a *jurisdiction* fact,
  not a core one)

### Layer 3 — Presentation. Swappable.

Templates and layout. **Layout knows nothing about tax.** A sheet renders the
tax lines the pack hands it; it does not decide that there are two of them
because the states matched.

---

## 2. The five rules

The decision procedure. Run it in order; the first rule that matches decides.

| # | Question | Answer |
|---|---|---|
| **1** | Used by more than one document type? | Its own library, top level |
| **2** | A fact about *who someone is*? | On the party record |
| **3** | Derivable from other data? | Compute it — never store it as editable |
| **4** | On a finalized document? | Snapshot it, frozen forever |
| **5** | Varies by country? | Jurisdiction pack — never inline |

Rules 3 and 4 are not in conflict. Derive it while the document is a draft;
freeze the derived result at finalize. The frozen copy is the record; the
derivation is how it got there.

### Rule 3 has one legitimate exception, and it must be explicit

Some derivable values have lawful overrides — place of supply genuinely differs
from the recipient's state under CGST s.12(3) (immovable property) and in
bill-to/ship-to cases. The rule is therefore **derived by default, override
explicit and recorded**, never a blank field the operator fills from memory. An
override that leaves no trace of *why* is the same bug wearing a different hat.

---

## 3. The rules applied to speclr — current state

Audited 13 August 2026. This section is the enforcement target; update it when a
row changes.

### Rule 1 — shared records

| Thing | Where it lives | Verdict |
|---|---|---|
| `money`, `dates`, `amountInWords`, `address`, `phone`, `party` | `src/lib/domain/` | Compliant |
| Identifier rules (PAN, GSTIN, TAN, CIN, email, phone, IFSC, UPI) | `src/lib/domain/fields.ts` | Compliant, 15 August 2026 |
| Text rules (name, org, prose, code, URL) | `src/lib/domain/text.ts` | Compliant, 15 August 2026 |
| **Service** | `src/lib/domain/service.ts` | Compliant, 23 August 2026 |

The field rules were the rule fired late rather than broken: the *validators*
were shared from the start, but the zod fragment, message, length cap and
blank-tolerance around each were re-typed per schema, and Qera's own GSTIN was
the one that ended up with none of them. Rule 1 covers the whole rule, not the
predicate at the centre of it. See `CONTEXT.md` §5f.

The second pass found the same shape one layer out, and worse, because here
there was no shared predicate to begin with. Roughly ninety fields were
`z.string().trim().max(n)` — length and presence, nothing about content — so a
person's name accepted a digit, a `<script>` tag and a bidi override that
reorders a printed invoice. Three rules were missing outright rather than
duplicated: **phone** existed only inside `PhoneField`, so every schema behind
it accepted any thirty characters and the number on an invoice was never
checked server-side; **IFSC** had its wrapper written twice with different
blank-tolerance; **UPI** had none at all, on the handle a client pays into.

Both files are now policed by `design-system.test.ts`, which is the §5e
mechanism applied to schemas: writing the rule by hand fails the build. See
`CONTEXT.md` §5g, which also records why none of this is what stops XSS.

A Service was namespaced under `contract/` while contracts were its only
consumer, with the note that rule 1 would fire "the moment a quote, an invoice,
or anything else references a Service". **The invoice is that second consumer**,
and the move was made in the same commit, before the reference was written. It
cost a file rename and six import lines, which is the whole argument for doing
it then rather than later.

Anything referenced by multiple document types is a shared record, not a child
of whichever document type happened to touch it first.

### Rule 2 — party identity

`clients` carries `name`, `companyName`, `address`, `addressParts` (including
`state` and `country`), `email`, `phone`, `gstin`. The identity facts are
present. What is missing is that nothing *normalises* them into the GST state
code the tax layer needs — `addressParts.state` is a display name
('Uttar Pradesh') and `gstin`'s first two digits are the code, and neither is
resolved to one canonical answer.

### Rule 3 — derivation

**Closed, 14 August 2026.** `placeOfSupplyStateCode` was a per-document
`Combobox` the operator picked from memory, when it is derivable from the
recipient — `gstin.slice(0, 2)` for a registered client, `addressParts.state`
through `GST_STATES` for an unregistered one. Two sources of truth for one fact
is what produced a wrong invoice; the constrained picker made it *look* safe,
and a validated wrong answer is still a wrong answer.

It is now derived by [`placeOfSupplyOf`](src/lib/domain/placeOfSupply.ts),
displayed read-only in the editor, and overridable only behind an explicit
switch that **requires a recorded reason** — refused at finalize otherwise
([documents.ts](src/server/actions/documents.ts)). That is the rule 3 exception
implemented as written.

Two supports make the derivation trustworthy rather than merely automatic: the
GSTIN's state prefix is cross-checked against the client's address at
onboarding ([`gstinError`](src/lib/domain/taxIds/india.ts)), and the GSTIN's
own mod-36 check character is verified, so a transposed pair of characters
cannot pass as a different state.

The same pass derived two more: an invoice's **due date** from the client's
payment terms, and the **zero-rating label** for an SEZ or overseas recipient.

**16 August 2026 — the same rule at field scale.** A GSTIN carries the holder's
PAN verbatim at characters 3–12, so a registered client types their PAN whether
they mean to or not, and asking for it twice is asking for the transposition
that makes the two disagree. `TaxStep` now fills PAN from a GSTIN that fully
passes, with the `fill-flash` a pincode already uses, and the field is
**read-only while that GSTIN stands**. That went further than the first pass,
which filled an empty field only and left a typed PAN alone to be reported as a
disagreement. There is no reading of that disagreement where the typed half
wins: characters 3–12 of a GSTIN that passes mod-36 *are* the holder's PAN, so
the honest fix is always to the GSTIN. Break or clear it and the field is
typeable again, keeping what it held. `panHolderTypeError` still runs on the
result, so a company's GSTIN on a record marked individual is still caught.

**17 August 2026 — a fifth derivation, and the request that would have been a
fourth form.** Onboarding was asked to split into four flows: individual or
company, crossed with domestic or international. Rule 3 says otherwise, and it
turned four forms into two predicates. **Individual vs company is already in
`entityType`** — three of its rows are one human being — and **domestic vs
international was already derived** from `addressParts.country` and already
driving `TaxStep`, `entityTypesForCountry` and the attachment slots. So there is
no `client_kind` column, no migration, and nothing that can disagree with the
record about what the record is. `onboardingSteps(kind)` returns six steps or
seven; `clientContact` derives a person as their own contact instead of storing
a copy of their name in `contacts.primary`; `companyName` is filled from `name`
for a person who does not trade under a business name. See `CONTEXT.md` §5d-i.

**16 August 2026 — and one place the rule deliberately does not fire.**
`entityType` is derivable: a CIN's ownership triple states it outright for the
three company forms, and a PAN's 4th character narrows it to a group. Rule 3
read alone says derive it and drop the field. It stays, because deriving it
would cost more than it saves: `entityType` is what `panHolderTypeError` and
`cinEntityTypeError` check *against*, so a type derived from those same
characters agrees with them by construction, and a company's PAN pasted onto an
individual's record stops being detectable. Rule 3 governs a fact the system
knows from *another* source. It does not authorise collapsing two independent
answers into one and calling the agreement a check.

What was built instead is the offer. `entityTypeOfCin` reads the certificate's
answer, `TaxStep` shows it beside the disagreement that already blocks the save,
and `setClientEntityType` writes it only when a person accepts. The stronger
evidence wins by default and still passes through a human, which is the
place-of-supply override run the other way round.

**23 August 2026, the rest of the tax answer and the line items.** Place of
supply was derived; the two fields beside it were not. Whether GST applied was a
switch and the rate was a free number, and for an Indian recipient neither is a
choice: the tax is charged under CGST s.9 whatever the invoice says, and the
rate follows how the service is classified. `gstTreatmentOf`
([gstTreatment.ts](src/lib/domain/gstTreatment.ts)) composes `placeOfSupplyOf`
and `zeroRatingLabel` into one answer, the rail renders it read-only, and
`gstTreatmentMismatch` refuses a finalize that departs from it without a
recorded reason. An **export is deliberately not locked**: nothing in Indian law
fixes what a foreign invoice charges. Same pass, same rule: an invoice's
**retainer line items** now come from `commercial.services` and the catalogue,
where they were re-typed from memory every month, and each carries the Service's
**SAC**.

**And one bug that was rule 3 broken in the other direction.** `tax.gstin` and
the top-level `clients.gstin` column both held the GSTIN and nothing reconciled
them, so a client onboarded through the Tax step read back as *unregistered*:
their invoice printed a PAN where Rule 46(e) wants a GSTIN, and place of supply
silently fell back to the address. Two places holding one fact is the shape this
rule exists to stop; the fix is `db/mappers.ts` resolving them on read as well as
write, and the identity form no longer submitting a field the Tax step owns.

**31 August 2026 — the Service Quotation, where the rule *deleted* seven
fields.** Rebuilt from the design actually sent to clients, and the interesting
part is how much of what it stored turned out to be derivable or fixed. The
subject line is the service names plus the company and the city; the payment
schedule is the one-time total read against three bands; the summary table is
pure arithmetic over the pages before it; whether a service has an add-on page
is `addOns.length > 0`, so the toggle that was going to sit beside the list
would have been a second place for that answer to live. Four more were studio
copy that a per-document field only made editable by accident: the cover blurb,
the offer line, the four terms and the expiry ("valid for 14 days" is one of
the terms, so `validUntil` was a date nothing printed).

`attentionName`, `offerLine`, `subjectLine`, `validUntil`, `gstCountry`,
`milestones` and `termsNote` all went, and `LineItem` lost `section` and
`recurring` with them. The diff removes more model than it adds, which is the
usual shape of a rule 3 fix and worth expecting: *the compliant path is
generally the smaller one* (§7, step 2). See `CONTEXT.md` §5l.

### Rule 4 — snapshotting

Compliant, and the strongest part of the codebase. `snapshot` (client or
employee), `studioSnapshot` (Qera's own identity — CGST s.36 requires the
supplier address *as at issue*, retained 72 months), and `materialiseContent`
(the resolved document wording). See `CONTEXT.md` §5 and §5b.

**Do not weaken.** Making studio details, client details, or document content
read live again on a finalized document is a compliance bug, not a refactor.

### Rule 5 — jurisdiction

**Not built. India is spelled inline through the domain layer.**

| Inline today | File |
|---|---|
| `splitGST` — the CGST/SGST halving | `src/lib/domain/money.ts` |
| `computeTotals(lineItems, gstRatePercent)` | `src/lib/domain/money.ts` |
| GST state codes | `src/lib/domain/gstStates.ts` |
| `requirePlaceOfSupplyWithGst` | `src/lib/domain/registry.ts` |
| `gstRatePercent`, `placeOfSupplyStateCode`, `gstLabel` | `src/lib/domain/types.ts` |
| Tax-line rendering | `src/components/docs/sheets/DocumentSheet.tsx` |
| April–March financial-year numbering | `src/lib/domain/docNumber.ts` |

Two pieces of groundwork already exist and were built with the right instinct:
`countries.ts` is plain data, and `currency.ts` documents honestly *why*
invoices stay INR (a GST document must show tax in INR regardless of billing
currency, and the split is rupee-shaped).

**Target shape:** `src/lib/domain/jurisdiction/` — one interface, one
implementation in `in/`. Core calls the interface and never names GST.

---

## 4. What is explicitly NOT built

Writing India as a pack is roughly 15% more work than writing it inline. That is
the entire budget. It does not authorise any of the following, and a request
that reaches for one should be met with this list:

- **No country selector UI**
- **No second pack** — one interface, one implementation
- **No multi-currency engine** for invoices (see `currency.ts` for why)
- **No VAT or sales-tax logic**
- **No e-invoicing**
- **No payroll engine** — EPF needs 20+ employees, ESI 10+ and gross ≤ ₹21,000,
  UP has no Professional Tax. Deductions stay a free list.

Adding UAE later becomes writing `packs/ae/`. Not a remodel. That is the whole
return on the seam, and it is collected later, not now.

---

## 5. The promise

**Not promisable:** "trust it to be legally compliant" in any country. Rates
change, e-invoicing mandates arrive, formats get revised. Xero and Zoho staff
compliance teams per market. A solo founder underwriting legal correctness
across jurisdictions is a liability, not a feature.

**Promisable, and worth more than it sounds:** the document contains every field
that country requires, correctly computed, with the issuer's own details
verified once at setup.

Marketing copy, UI text, and documentation use the second promise. The assistant
pushes back on the first wherever it appears.

---

## 6. The risk that actually decides this

speclr has zero external users. **The architecture will not kill this project;
the absence of someone other than the founder who wants it might.**

Build the seam because it is cheap. Then go find one person who isn't you.

The assistant is expected to say this out loud when a session drifts into a
third consecutive week of internal refinement with no user on the other end.

---

## 7. How this is enforced

When a request, a plan, or a piece of code conflicts with the above:

1. **Name the rule** and the specific conflict, in one or two sentences.
2. **Propose the compliant path** — usually a smaller diff, not a larger one.
3. **If the user reaffirms, build it** and record the deviation here or in
   `ROADMAP.md`. A logged exception beats a silent one.

Specific standing pushbacks:

- A new tax field, rate, identifier or validity rule written outside the
  jurisdiction seam → rule 5.
- A value the operator types that the system already knows → rule 3.
- A record parented under the first document type that used it → rule 1.
- A finalized document reading anything live → rule 4, and it is a compliance
  bug, not a preference.
- "This bug means we need to re-architect" → §0, first correction.
- A third pass at rearranging navigation → §0, second correction.

### Logged deviations

**23 August 2026 — the place-of-supply override was removed, on instruction.**
Rule 3's stated exception is *derived by default, override explicit and
recorded*, and this was the reference implementation of it: a switch, a
required reason, and a finalize that refused without one. The user asked for it
gone, on the grounds that the code comes from the recipient's registration and
an invoice naming another state is a wrong return rather than a preference.

The conflict was named and the request stands, so it is built and bounded:

- **What it gives up is real but not ours.** CGST s.12(3) genuinely puts a
  supply relating to immovable property in the state the property is in, and
  bill-to/ship-to under s.10(1)(b) does the same. Qera makes neither: it sells
  design services from Ghaziabad. The day it does, this field comes back rather
  than being typed over quietly.
- **The derivation is unchanged and still the only writer.**
  `placeOfSupplyOf` still runs, the field is still read-only, and the effect
  that keeps the stored code equal to it now also **clears any stale
  `placeOfSupplyOverrideReason`** on a draft, or a reason for a departure that
  no longer exists would freeze onto the document at finalize.
- **The column stays.** `placeOfSupplyOverrideReason` is still on
  `baseFieldsShape` and still refused-without at finalize, because documents
  written while the switch existed carry it and a finalized one may not change.

The GST-treatment override (`gstOverrideReason`) is untouched: a supply really
can be exempt, and that is a question about the *supply* rather than about
where the recipient is registered.


**14 August 2026 — a second jurisdiction now sits inline on the client record.**
§4 forbids a country selector, a second pack, multi-currency invoices and VAT
logic by name. Client onboarding asked for all of it. The conflict was raised
with the three reasons behind §4 — the 15% budget, the §5 liability of implying
compliance a field is not wired to, and §6's zero foreign clients — and the user
reaffirmed the request. So it was built, and then bounded:

- **Collected, validated, snapshotted and printed. Nothing computes from it.**
  `taxIds/foreign.ts` holds per-country formats with real check digits (UK VAT
  mod-97, ABN mod-89, EIN prefixes). A foreign client's registration prints in
  the billed-to block exactly where a GSTIN would.
- **The money core is untouched.** `computeTotals`, `splitGST` and `formatINR`
  never learned a second regime, and invoices stay INR for the reason
  `currency.ts` gives. The agreed billing currency is recorded as a commercial
  term and prints nothing.
- **A foreign recipient is treated as India's own rule for one** — a zero-rated
  export of services under an LUT (IGST Act s.16), which is what
  `zeroRatingLabel` prefills into the existing `gstLabel`. No new tax concept
  reached a sheet.

What remains outstanding is unchanged: `ROADMAP.md` §8's jurisdiction seam. The
honest statement of today's position is that a UAE client's TRN is on the record
and no invoice honours it, and making it honoured is that seam's job.

**14 August 2026 — rule 3's live violation is closed.** `placeOfSupplyStateCode`
is now derived from the recipient (`placeOfSupply.ts`) and shown read-only, with
an override that **requires a recorded reason** — enforced in the editor and
refused at finalize. That is rule 3's stated exception implemented as written:
derived by default, override explicit and recorded. The GSTIN's first two digits
are cross-checked against the client's address at onboarding, which is what
makes the derivation trustworthy rather than merely automatic.


**13 August 2026 — the MSA clauses moved into the database.** `msa.ts` said the
28 clauses lived in code *because* content §2 wants them reviewed as one package
with the four Schedules by an Indian commercial lawyer, and a UI that adds
clauses is a way for unreviewed legal text to reach a contract. That was raised
and the user reaffirmed the request, so it was built with the objection carried
into the product rather than dropped:

- The library page states on the page that nothing there has been reviewed.
- New clauses append at the next number, claimed server-side and counting past
  archived rows. Nothing is inserted, renumbered or deleted, because clause
  bodies cite each other by number.
- Rule 4 is untouched and was the condition of building it: a contract copies
  the library once at draft creation and freezes it at finalize, so an edit
  reaches the next contract and nothing already open or already signed. See
  `CONTEXT.md` §5c for the three mechanisms and where each is tested.
