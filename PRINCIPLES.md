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
| **Service** | `src/lib/domain/contract/service.ts` | **Pre-triggered** |

A Service is namespaced under `contract/` because contracts are its only
consumer today, so rule 1 has not fired yet. **It fires the moment a quote, an
invoice, or anything else references a Service** — at which point it moves to
`src/lib/domain/service/` before the second consumer is written, not after. The
move is a directory and its imports; doing it late means doing it with two
callers instead of one.

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

**The live violation, and the one that caused the bug.**

`placeOfSupplyStateCode` is a per-document `Combobox` the operator picks
([DocumentEditor.tsx:397](src/components/docs/editors/DocumentEditor.tsx#L397)),
stored on the document's fields
([registry.ts:98](src/lib/domain/registry.ts#L98)), and merely *required* at
finalize when GST applies
([registry.ts:111-121](src/lib/domain/registry.ts#L111-L121)).

It is derivable from the recipient — `gstin.slice(0, 2)` for a registered
client, `addressParts.state` resolved through `GST_STATES` for an unregistered
one. Two sources of truth for one fact is what produced a wrong invoice. The
constrained picker made it *look* safe; a validated wrong answer is still a
wrong answer.

**Target shape:** derived from the recipient, displayed read-only, with an
explicit override that captures the reason (see the rule 3 exception above).

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
