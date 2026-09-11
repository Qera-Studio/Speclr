# COMPLIANCE — speclr

> Every place speclr is **not fully compliant**, audited 2 September 2026 against
> three source documents: the invoice classification spec, the 100-case edge
> list, and the domain map. A thing is on this list if it is anything short of
> 100%: "95% compliant" is on the list.
>
> Each item carries a **resolution**. Where the resolution is "deliberately out
> of scope", that is itself the resolution, and the reason is recorded, because
> the third document is right that an undefined scope decision is worse than a
> negative one.
>
> **This file records gaps.** `CONTEXT.md` records domain rules and decisions
> already made; `PRINCIPLES.md` records the modelling law; `ROADMAP.md` records
> unbuilt work. When an item here is closed, delete the row and note the closure
> in whichever of those three owns it.

---

## How to read the severity column

| | Meaning |
|---|---|
| **P0** | Can produce a **legally wrong document** for a client Qera has today. Fix before the next invoice. |
| **P1** | Can produce a wrong or misleading document in a case Qera will plausibly hit within a year. |
| **P2** | Correct today, but the tool guesses or stays silent where it should refuse or say so. |
| **P3** | Out of scope by decision. Listed so the decision is written down rather than merely unmade. |

The middle category of the edge-case list ("must not silently fail") is the one
that matters most, and it maps to **P2**: a tool that produces a confident wrong
invoice is worse than one that stops.

---

# 1. P0 — can produce a legally wrong document today

## 1.1 Payment channel does not gate export zero-rating

**Cases:** classification spec §`payment_channel`, edge cases 26, 27, 35, 36.

`placeOfSupplyOf` ([placeOfSupply.ts:56](src/lib/domain/placeOfSupply.ts#L56))
treats **any** recipient whose `addressParts.country !== 'IN'` as an export and
zero-rates the supply under LUT. Location alone does not qualify a supply for
export treatment. IGST s.2(6)(iv) requires payment "received in convertible
foreign exchange, or in Indian rupees wherever permitted by the RBI".

So a client living in Dubai who pays from an ordinary Indian resident savings
account is **not** an export. speclr will currently issue a zero-rated invoice
on a supply that owes 18% IGST. That is an understated GST return, not a
cosmetic defect, and it is the single worst thing on this list.

The inverse also fails: an Indian-resident client paying from an NRE/FCNR
account is a case the tool cannot express at all.

**Resolution.** Add `paymentChannel` to `ClientCommercial`
(`domestic_account | nre_fcnr | foreign_wire`), defaulting to unset. Widen
`placeOfSupplyOf`'s input and require **country outside India AND channel in
(`foreign_wire`, `nre_fcnr`)** before returning `PLACE_OF_SUPPLY_EXPORT`. A
foreign-addressed client with `domestic_account` derives from their address
state as an ordinary domestic supply.

Where the channel is **unset on a foreign-addressed client, refuse the
finalize** rather than guessing either way — this is exactly the "must not
silently fail" category. Add the guard beside `gstTreatmentMismatch` in
[documents.ts:496](src/server/actions/documents.ts#L496), because a read-only
input is not enforcement.

Per the classification spec, the channel is a **client-level default**; an
invoice-level override is not needed until a client actually splits one invoice
across two channels (case 36), and that case should refuse rather than guess.

---

# 2. P1 — plausible within a year

## 2.1 Billing address is collected, stored, and printed by nobody

**Cases:** edge case 16 (partially), domain map §3.

`billingAddressParts` is written by
[IdentityStep.tsx:584](src/components/admin/clients/onboarding/IdentityStep.tsx#L584),
persisted at [schema.ts:89](src/db/schema.ts#L89), reconciled in
[mappers.ts:112](src/db/mappers.ts#L112) — and then **never read**.
`clientSnapshotOf` ([types.ts:231](src/lib/domain/types.ts#L231)) freezes
`client.address`, the registered one, and
[DocumentSheet.tsx:189](src/components/docs/sheets/DocumentSheet.tsx#L189)
prints that.

`CONTEXT.md` §5d already states this is unbuilt, so it is a known gap rather
than a bug. What makes it P1 rather than P3 is that **the form gives no
indication that filling it does nothing.** An operator who fills that field
reasonably believes the invoice will carry it. That is a tool quietly producing
a document its user did not intend, which is the failure class this whole audit
exists to catch.

**Resolution.** Two parts, and the second is the load-bearing one:

1. Add `billingAddress` (the composed flat string, not the parts) to
   `ClientSnapshot`, frozen at finalize like everything else in §5. Print it in
   the billed-to block when present, falling back to `address`. Keep
   `addressParts` excluded from the snapshot as it is today.
2. **`placeOfSupplyOf` must not learn about it.** GST place of supply follows
   the recipient's registration, so a Karnataka-registered client whose accounts
   department sits in Maharashtra is still a Karnataka supply. Pin this with a
   test, or the next person to touch it will "fix" the inconsistency.

Until (1) ships, the field should say on the page that it is not yet printed.

## 2.2 The LUT is real but unrecorded, and it expires 31 March 2027

**Cases:** 31, 32, 33; classification spec "Additional fields".

**Confirmed 2 September 2026: Qera holds an LUT for FY 2026-27.** So the
endorsement `EXPORT_ENDORSEMENT`
([placeOfSupply.ts:132](src/lib/domain/placeOfSupply.ts#L132)) prints is
currently **true**, and there is no live wrongness here. Two things remain.

**An LUT is granted per financial year.** Form GST RFD-11 covers one FY and must
be re-filed before the next begins; the ARN issued for FY 2026-27 ceases to
cover a supply made on 1 April 2027. So this has a **known expiry date**, and on
that date every export invoice starts asserting a bond that has lapsed, with
nothing in the code aware of it. That is the whole reason this stays on the
list: it is a compliance defect with a calendar date already attached to it,
which is the easiest kind to prevent and the easiest kind to forget.

**The ARN is not on the document.** The classification spec asks for it, and it
is what a refund claim under IGST s.16(3) is checked against.

`EXPORT_ENDORSEMENT` also hard-codes the under-LUT form, with the file stating
the on-payment-of-IGST variant "is not written down here". That stays correct as
long as the LUT is renewed on time, and becomes the fallback route if it ever is
not.

**Resolution.** Two fields on `StudioInfo` beside `gstin` and `cin`
([studio.ts:37](src/lib/domain/studio.ts#L37)), so they snapshot onto every
document through `studioSnapshot` exactly as the rest of the studio identity
does (§5) — an export invoice issued this FY must keep printing this FY's ARN
after the next one is filed:

- `lutArn?: string` — the ARN from the RFD-11 acknowledgement.
- `lutValidTo?: string` — ISO date. **`2027-03-31` for the current one.**

Then:

1. Print the ARN beside the endorsement on a zero-rated export invoice.
2. At finalize, if the document is a zero-rated export and `lutValidTo` is
   absent or **before the issue date**, refuse, naming which. This is the guard
   that turns the 31 March 2027 cliff into a message instead of a wrong invoice.
3. Advisory lint finding (3.1) when `lutValidTo` is within 60 days, so the
   renewal is prompted rather than remembered.

Both fields optional in the type and the form, because the settings row predates
them — same reason the SWIFT/IBAN fields are optional.

Do **not** add the on-payment-of-IGST variant now. It is a legal string nobody
would select, and (2) makes reaching for it a deliberate act rather than a
silent fallback.

## 2.3 FIRC is an attachment kind, not a link to an invoice

**Cases:** 34, 37; classification spec open question 3.

`firc` exists as a client attachment kind
([client.ts:471](src/lib/domain/client.ts#L471)) with a good explanatory note.
But it attaches to a **client**, not to a document. Nothing ties an FIRC to the
export invoice it realises, nothing tracks the realization window, and nothing
surfaces an export invoice whose payment has not been evidenced.

The classification spec is right that the FIRC is the actual evidence the
transaction qualified — more than anything printed on the invoice.

**Resolution.** Smallest honest version: add an optional `fircReference` to the
export invoice's own fields, plus a dashboard filter for finalized export
invoices with none. Do **not** build a payment-realisation state machine or
block a "paid" status on it — speclr has no paid status today (see 3.1), and
inventing one to hang this off is the larger change. Revisit when a payment
status exists.

## 2.4 GSTIN cancellation and mid-engagement registration are invisible

**Cases:** 7, 8, 20.

The client record holds one `gstin` with no validity window. A client whose
registration is cancelled after invoice 2 will silently keep receiving B2B
invoices carrying a dead GSTIN, and `placeOfSupplyOf` will keep deriving place
of supply from it. The reverse (registering mid-project) is equally invisible —
invoices 1 and 2 correctly showed no GSTIN and nothing prompts a re-check.

The derivation is otherwise excellent: this is the one input to it that can go
stale without anybody touching the record.

**Resolution.** Deliberately minimal. Do **not** build GSTIN validity tracking
or a status-check integration (no network verification, per the standing
`taxIds/india.ts` decision). Instead add `gstinAsAt` — the date the GSTIN was
last confirmed — and surface a soft prompt on the invoice editor when it is more
than 12 months old. This is a P2-style "say something" fix for a P1 problem,
which is the right trade: the alternative is a compliance feature nobody
maintains.

## 2.5 Multiple GSTINs per client cannot be expressed

**Case:** 6. Related: 25, 38.

One `gstin` per `ClientRecord`. A client registered in several states, where a
different registration applies to a different engagement, has no representation.
Today the operator would have to create a second client record, which splits
their document history and their attachments.

**Resolution.** Out of scope until it happens, but **write the trigger down**:
the day a client gives a second GSTIN, the fix is a `gstin` on the
*engagement/commercial* group rather than a second client row, per the domain
map's identity-vs-engagement split. Do not pre-build it. Recorded here so the
next person reaches for the right shape rather than the convenient one.

## 2.6 Advance payments have no receipt voucher

**Cases:** 74, 75.

CGST Rule 50 requires a **receipt voucher** when an advance is received before
supply — a distinct document from a tax invoice, and the current `REC` type is a
payment receipt against a finalized invoice
([documents.ts:830](src/server/actions/documents.ts#L830) refuses anything else).
There is no way to issue a document for money taken before the work.

Given the quotation's payment schedule explicitly phases 30–50% up front, this
is not hypothetical — it is the standard Qera engagement.

**Resolution.** Confirm with the CA first (marked 🔺 in the source list) whether
Qera's phase-1 payments are advances against a supply not yet made, or
consideration for a supply in progress. The answer decides whether this is a new
`RCV` document type with its own series, or nothing at all. **Do not build
before that answer** — a receipt voucher issued where an invoice was correct is
its own compliance problem.

## 2.7 The payment block is static and wrong for a domestic client's edge case

**Case:** domain map §7; edge cases partially covered.

Mostly **already fixed**: §5i added SWIFT/IBAN/bank address and switches on
place of supply `'96'`. The residual gap is that it switches on place of supply,
which after fix 1.1 will no longer equal "foreign client" in every case. A
Dubai-resident client paying from an Indian account will be domestic by place of
supply and correctly gets UPI + IFSC — which is right. But a **foreign client
paying by foreign wire whose place of supply derivation fails** (no country on
the address) would get UPI.

**Resolution.** Fold into 1.1. Once `paymentChannel` exists, resolve the payment
block from `(channel, place of supply)` rather than place of supply alone, per
the domain map's recommendation that it resolve rather than be static.

---

# 3. P2 — correct today, but the tool guesses or stays silent

## 3.1 No pre-generation lint pass

**Cases:** 85, 99, domain map §9 (its highest-leverage recommendation).

The individual checks mostly exist and are good — due date derives from terms
([DocumentEditor.tsx:406](src/components/docs/editors/DocumentEditor.tsx#L406)),
GSTIN runs mod-36, totals reconcile through `computeTotals`, `e2e/` measures
clipping. What does not exist is **one gate that runs all of them and refuses**.

They are scattered across a Zod schema, a finalize action, a React effect and a
Playwright suite that runs in CI rather than at issue time. The Playwright half
in particular proves the *fixtures* do not clip; it proves nothing about the
actual invoice being issued on the day.

This is the single highest-leverage item on the list relative to effort, and the
domain map is right about that.

**Resolution.** A `lintDocument(doc, client, studio)` pure function in
`src/lib/domain/`, returning a list of findings, each `blocking` or `advisory`.
Call it from `finalizeDocument` **and** render it in the editor rail. Seed it
with the checks that already exist plus: invisible text (case 99 — foreground
equal to background in `content`), overflow (see 3.2), due date vs terms, and
every P0/P1 guard above. This is the mechanism that turns the rest of this file
into something enforced rather than something documented.

## 3.2 Overflow is measured in CI, not at issue time

**Cases:** 100, 101, 102, 103; domain map §9.

`pagination.ts:277` marks a page `overflows: true` and the quotation e2e spec
asserts no page carries it. Good. But nothing surfaces that flag to the operator
in the app, and nothing blocks a finalize on it. A long client name or an
eight-line address on a real invoice clips silently, exactly as the pay slip did
once already.

Non-Latin scripts (101), RTL address blocks (102) and special characters in file
names (103) are all untested and all plausible for a Dubai client.

**Resolution.** Surface `overflows` in the editor as a blocking lint finding
(3.1). For 101–103, add one e2e fixture with a Devanagari name, an Arabic
address block and an ampersand-plus-accent client name, and see what breaks
before deciding what to fix. Do not pre-emptively add font embedding or RTL
support: measure first.

## 3.3 Related-party pricing is not flagged

**Case:** 12; classification spec validation rule 5.

Billing a related person (spouse, or dependent parent/child/sibling — **not** any
relative) below market rate creates open-market-valuation exposure under GST.
Nothing on the client record records the relationship and nothing warns.

**Resolution.** A boolean `relatedParty` on `ClientTax`, and an **advisory**
lint finding (never blocking, never changing a figure) when it is set. The
classification spec is explicit that this must surface as a warning and must not
silently alter invoice fields, and that is right: the valuation question is the
CA's, not the tool's.

## 3.4 The ₹50,000 B2C threshold is not modelled

**Cases:** 22, 23.

Rule 46 makes recipient name, address and state code mandatory on an
unregistered-recipient invoice above ₹50,000. speclr always prints all three, so
**the output is correct** — it is stricter than required.

What is missing is that the tool does not *know* the rule, so it cannot warn
when one of those fields is blank on a document that crosses the threshold. It
would print an incomplete invoice as readily as a complete one.

**Resolution.** One advisory lint finding (3.1): unregistered recipient,
total ≥ ₹50,000, and any of name/address/state missing. Nothing else changes —
do not add conditional field requirements, since printing them always is the
better behaviour.

## 3.5 Mixed GST rates are impossible rather than refused

**Cases:** 58, 59, 60, 61, 68.

`gstRatePercent` is a single number on the document
([types.ts:305](src/lib/domain/types.ts#L305)), so an invoice mixing 18% service
with a 5% or exempt item cannot be built. Every catalogue Service sits in the
9983 group at 18% (§5h), so this is correct for Qera's actual catalogue.

It is on this list because the failure is **silent**: an operator who needs a
mixed-rate invoice has no signal that the tool cannot express one. They would
issue two invoices, or round the exempt item into the taxed total. Cess (61) and
composite-vs-mixed supply (68) are the same shape.

**Resolution.** Deliberately not building per-line rates. Instead, when a
non-9983 SAC is entered on a line, raise an advisory lint finding saying the
document carries one rate and this line may need a different one. That converts
an invisible ceiling into a visible one for the cost of a lookup table. Case 60
(zero-rated and taxable on one invoice) should be a **blocking** finding: it is
genuinely invalid.

## 3.6 No document state beyond draft / finalized

**Cases:** 97, 98; domain map §6.

There is `draft` and `finalized`. There is no sent, viewed, partially paid,
paid, overdue, disputed, or written off. The 7-day dispute window in the terms
has no corresponding state, and an unpaid invoice has nowhere to go.

The immutability core underneath is excellent and is what makes adding states
cheap later — a state is metadata beside a frozen document, not a change to it.

**Resolution.** Out of scope for now, but the ordering matters when it is built:
`paid` first (it unlocks 2.3's FIRC tracking and the receipt flow), `disputed`
second, `written_off` last and only after the CA answers what happens to GST
already reported (🔺). Do not build the full ten-state machine; each state should
arrive when a decision depends on it.

## 3.7 Service period is not a field

**Cases:** 93, 94, 95.

Nothing on an invoice states the period the service covers. For a monthly
retainer — which §5i makes the *default* invoice shape, seeded from
`commercial.services` — an August invoice for September's retainer is
indistinguishable from an August invoice for August's. The source document
names this as a real observed defect on an issued invoice.

Continuous supply of services also has its own timing rules under CGST s.31(5)
that nothing here reflects.

**Resolution.** Add `servicePeriodFrom` / `servicePeriodTo` as optional invoice
fields, defaulted from the issue month for a retainer-seeded document, printed
under the line items. Cheap, and it closes an observed error. The s.31(5) timing
question is 🔺 for the CA and separate.

## 3.8 Backdating is unguarded

**Case:** 96.

`issueDate` is a free date. `financialYearStart(existing.issueDate)` derives the
FY from it at finalize
([documents.ts:534](src/server/actions/documents.ts#L534)), so backdating an
invoice into a closed financial year would claim a number in **that** year's
series — out of chronological order, which Rule 46(b) does not permit.

**Resolution.** Blocking lint finding when `issueDate` is before the latest
finalized document of the same type, or in a prior FY. An advisory when it is
merely in the past by more than a few days. Do not forbid backdating outright —
it is sometimes legitimate — but never do it silently.

## 3.9 Zero-value and negative lines

**Cases:** 81, 82.

`ratePaise` is `min(0)` and `qty` must be positive
([registry.ts:71](src/lib/domain/registry.ts#L71)), so a negative line is
correctly impossible — an in-invoice credit must be a credit note, which §5j
built. Good.

A **zero-value invoice** is permitted by the schema and prints. Whether it
should is a real question: a tax invoice for nil consideration is unusual and
often the wrong instrument for free or goodwill work.

**Resolution.** Advisory lint finding on a zero total. Not blocking — a nil
invoice is occasionally correct and the operator is better placed to know.

## 3.10 Reimbursables and third-party pass-throughs

**Cases:** 83, 84.

Hosting, fonts and ad spend billed alongside services are ordinary invoice lines
today, taxed at the document rate. Pure-agent treatment (Rule 33) excludes a
genuine reimbursement from the value of supply entirely, and it has conditions
this tool does not check.

The receipt's own TERMS block already says fees exclude third-party costs
"unless stated", which is the contractual half — but the tax half is unmodelled.

**Resolution.** 🔺 CA question, batched. Until answered, an advisory lint finding
when a line description matches a pass-through pattern (hosting, domain, ad
spend, stock, font), saying the line is being taxed as a supply and to confirm
that is intended. Cheap, and it is the "flag rather than guess" behaviour the
source document asks for.

---

# 4. P3 — deliberately out of scope, decision recorded

These are on the list because the source documents are right that an undefined
scope decision is worse than a negative one. Each has been decided **no**, with
the reason and the trigger that would reopen it.

| # | Item | Cases | Decision and trigger |
|---|---|---|---|
| 4.1 | **Multi-currency invoices** (dual currency, FX rate on document, rate source, INR reconciliation) | 45, 46, 48, 50, 51, 52, 53, 54; classification spec "Currency: dual" | **No.** `currency.ts` and `PRINCIPLES.md` §4 both refuse it, and the reasoning is sound: a GST document must show tax in INR regardless of billing currency, so this needs a parallel INR tax line and a recorded rate, not a label swap. **Trigger:** the first client who contractually requires their own currency as the primary amount. Then it is `ROADMAP.md` §8's jurisdiction seam, not a patch. |
| 4.2 | **Zero/three-decimal currencies** (JPY, KWD) | 49 | **No.** `money.ts` assumes a ×100 minor unit throughout and `currency.ts` documents this explicitly. **Trigger:** billing a Japanese or Kuwaiti client. Needs a per-currency exponent and a pass over `rupeesToPaise`/`paiseToRupees` first. |
| 4.3 | **Second issuer entity** (`entity` as a first-class record) | 25; domain map §2 | **No, and this is a deliberate disagreement with the domain map.** It recommends making `entity` first-class immediately with one row. `studioSnapshot` already gives the property that matters — every document freezes its issuer — so the retrofit is a foreign key onto a table whose single row already exists as `studioSettings`. **Trigger:** Qera Dubai, or a second state GSTIN. |
| 4.4 | **Jurisdiction pack** | domain map §1 | **No — already the standing position.** `PRINCIPLES.md` §4 and §5 govern: one interface, one implementation, no country selector, no second pack. The seam is worth building; the second pack is not. **Trigger:** selling speclr to a non-Indian supplier, which `CONTEXT.md` §3a is emphatic is a different product with a different budget. |
| 4.5 | **E-invoicing (IRN + signed QR)** | 65 | **No.** Threshold is ₹5 crore aggregate turnover. **Trigger:** approaching that threshold — and it is a hard statutory deadline, so track turnover rather than waiting to notice. |
| 4.6 | **HSN/SAC digit-count escalation** (2 → 4 → 6 by turnover) | 64 | **No.** All 22 seeded codes are 6-digit already (§5h), so speclr is above every threshold by construction. Listed because the *reason* it complies is accidental rather than designed. **Trigger:** none; re-check if a shorter code is ever added. |
| 4.7 | **Inbound documents** (RCM self-invoice, purchase orders, import of services) | 42; domain map §4 | **No.** speclr is outbound-only. RCM on a foreign vendor (Figma, Vercel) is a real Qera liability but it is the CA's filing, not a document speclr issues. **Trigger:** wanting the self-invoice generated rather than hand-written. |
| 4.8 | **Debit note** | domain map §4 | **No — already recorded in §5j.** The credit note's mirror; Qera has never raised one; a document type nobody issues is one nobody checks. **Trigger:** the first upward revision after issue. |
| 4.9 | **Proforma invoice** | domain map §4 | **No.** The Service Quotation covers the pre-sale case and consumes its own series. **Trigger:** a client who specifically requires a proforma for their AP process. |
| 4.10 | **Nepal/Bhutan INR-settlement exports** | 39 | **No.** Genuinely different rules from a general export. **Trigger:** a client in either. Would be caught by 1.1's refusal-on-unknown rather than silently mis-rated, which is the correct interim behaviour. |
| 4.11 | **Permissions and roles** | domain map §10 | **No — standing decision** (`AGENTS.md`, Clerk allowlist, all users full access). The two-profile split is a UI seam, not a security boundary, and `CONTEXT.md` says so. **Trigger:** a second person who should not see everything. |
| 4.12 | **Payer ≠ bill-to party** (agency billing for an end client) | 16 | **No.** The invoice is addressed to the contracting party; who transmits the money is a payment fact, not an invoice field. **Trigger:** an agency engagement. Note this interacts with 1.1: a third-party payer in a different country (case 35) is a live question for export qualification. |
| 4.13 | **Governing law / venue per counterparty** | domain map §8; edge case list generally | **No — decided 23 August 2026** (`CONTEXT.md` §5i): Ghaziabad jurisdiction for every client, foreign ones included, with the enforceability trade-off stated and accepted. Listed here only so it is not re-raised as an oversight. |
| 4.14 | **PDF accessibility / tagged PDF / machine-readable text layer** | domain map §9 | **No.** Print goes through the browser; there is no PDF renderer yet (`ROADMAP.md`). **Trigger:** building the server-side PDF renderer, at which point tagging is cheap to include and expensive to retrofit. |

---

# 5. What is already fully compliant

Recorded so this file is not read as a defect list of the whole system. Each of
these was verified against the code during this audit, not taken from the docs.

- **GSTIN validation** exceeds the spec: mod-36 check character, state-prefix
  agreement with the address, embedded-PAN agreement, holder-type agreement with
  the entity type. Cases 3, 4, 5.
- **Place of supply is derived, not typed** ([placeOfSupply.ts](src/lib/domain/placeOfSupply.ts)) and the GSTIN outranks the address. Cases 19, 24.
- **Atomic per-FY numbering** ([counter.ts:42](src/db/counter.ts#L42)) — an
  `onConflictDoUpdate` increment, so two simultaneous finalizes cannot collide.
  Cases 88, 89, 105.
- **Immutability and snapshotting.** Client, studio and document *content* all
  freeze at finalize. A regenerated document reproduces; it never recomputes.
  Cases 90, 91, 104 — and this is the domain map's §6 recommendation, already
  built.
- **Credit note** with parent invoice number *and* date, its own series, tax
  position copied from the parent. Cases 72, 73, 91, 92.
- **Discount comes off before tax and prints.** §5k, and the refusal to allow a
  gross discount is the correct reading of s.15(3)(a). Case 72.
- **GST-inclusive math** — the ÷1.18 vs −18% bug class cannot occur on an
  invoice, which is exclusive throughout; `computeTotals` is a pure, tested
  function, which is the domain map's §5 recommendation. Case 55.
- **Rounding** is one convention, `roundHalfUp`, per line then once on the
  taxable total. Cases 51, 70, 71.
- **Due date derives from payment terms.** Case 85's observed bug is closed.
- **PO number required at finalize** when the client record says so
  ([documents.ts:512](src/server/actions/documents.ts#L512)). Case 15.
- **SEZ is zero-rated but not an export**, with its own endorsement. Case 14.
- **TDS prints as a memo and never changes the amount billed.** Case 62.
- **Fractional quantities** to 2 decimals. Cases 78, 79.
- **Amount in words** is currency-aware with lakh/crore grouping. Case 80.
- **Sole proprietor legal vs trading name** (§5d-i). Case 9.
- **Negative line items impossible** — correctly forced through a credit note.
  Case 81.
- **Reverse charge line** prints under Rule 46(p). Case 41 (outbound half).
- **Export endorsement** verbatim under Rule 46's third proviso. Case 31.
- **Single invoice series** — case 44 asks for a separate export series; this is
  a **deliberate disagreement** with the source document. Rule 46(b) wants one
  consecutive series per document type, and place of supply `96` already
  identifies export rows in GSTR-1. Splitting the series would create two
  sequences where the statute expects one.

---

# 6. Questions for the CA, batched

The source documents mark these 🔺 and recommend one consolidated session rather
than asking piecemeal. Ordered by how much they block.

1. **Are Qera's phase-1 payments advances requiring a Rule 50 receipt voucher?**
   Blocks 2.6, and the quotation's payment schedule makes it the standard case.
2. **The 22 seeded SAC codes** — §5h says they are a proposal awaiting sign-off,
   with 15 to 17 named as arguable. Blocks nothing, but everything issued before
   the answer carries them.
3. **Pure-agent treatment for hosting, fonts and ad spend.** Blocks 3.10.
4. **Composite vs mixed supply** for bundled service packages. Relates to 3.5.
5. **Continuous supply of services timing** under s.31(5) for the monthly
   retainer. Relates to 3.7.
6. **Bad debt** — what happens to GST already reported on an invoice never paid.
   Blocks the `written_off` state in 3.6.
7. **Related-party valuation** exposure and where the line actually sits.
   Relates to 3.3.

---

# 7. Recommended order

1. **1.1 payment channel** — the only P0. Nothing else on this list can produce
   a wrong return today.
2. **3.1 the lint pass** — highest leverage per unit effort, and it is the frame
   every other item below plugs into. Build it second so the rest are cheap.
3. **2.1 billing address** — a snapshot field and one sheet line; closes an
   observed surprise.
4. **3.7 service period** and **3.8 backdating** — both small, both close
   observed defects.
5. **2.2 LUT** — the two fields are ~20 lines and the deadline is known:
   **31 March 2027**. Cheapest done alongside 1.1, since both touch the export
   path and the finalize guard.
6. Everything else, as its case arrives.

Items 1 through 4 are roughly a week. That is the whole cost of moving from "I
hope this is right" to "the tool refuses to output something wrong", which is
the product promise the domain map correctly identifies as the thing worth
keeping.
