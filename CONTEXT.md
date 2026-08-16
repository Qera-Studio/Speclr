# CONTEXT — speclr

> The warm-start brief. If you are a fresh session, read this before touching code. It captures what speclr *is*, the domain rules that aren't obvious from the code, and the decisions already made — so you don't re-derive or re-litigate them. Pair it with `AGENTS.md` (the standards) and the checklists in `dev/`.

---

## What speclr is

Qera Studio's **internal operations tool**, used by the founder (and a few trusted people). Two tools in one app:

1. **Document tool** — creates, finalizes, and prints real **financial/legal documents**: invoices, receipts, contracts, stipend slips, and HR letters (offer / experience / exit). Backed by Postgres.
2. **Icon tool** (`spec`) — validates favicon/OG icon specs with live previews (browser tab, iOS home screen, Google SERP, social card, maskable safe-zone). Entirely client-side.

It was **extracted from the qera.studio marketing site** (where it lived as `/kessler-admin` and `/kessler-spec`) into this standalone project, rebuilt on Postgres + Clerk + shadcn. The marketing site keeps its own copy until speclr is fully live; the design spec for the extraction is the source of truth for *why* things are shaped this way.

**Audience & tone:** this is a **data-dense internal tool**, not a marketing surface. Dark mode, shadcn, Geist, Lucide. It does NOT follow the marketing site's "calm pastel, low-density" aesthetic — different product, different values.

---

## The non-obvious domain rules

These are the things that will bite a fresh session if not known. **They are correctness- and legally-load-bearing.**

### 1. Money is integer paise
All amounts are stored and computed as **integer paise** (₹1 = 100 paise), never floating point. Helpers: `rupeesToPaise`, `paiseToRupees`, `formatINR`, `amountInWords`. Floats would silently corrupt totals — never introduce them.

### 2. GST financial-year numbering (India-specific, legally required)
Finalized numbered documents get a number like `QS-INV-2627-001`:
- Per **Indian financial year (April–March)**, *not* calendar year. FY 2026-27 → code `2627`.
- Sequential per (doc-type, FY), starting at `001`.
- **Claimed atomically at finalize** (Postgres row-lock/sequence via the `counters` table). A number is only taken when a document is finalized — abandoned drafts never burn a number. A gap is acceptable; a **duplicate is never** (GST Rule 46 requires consecutive, unique invoice numbers).
- **Financial** docs (invoice, receipt), **hr-slip** (stipend, pay) and **contracts** are numbered. Only the HR letters are not — nothing files them by reference. A contract's `QS-CON-2627-nnn` is an internal filing reference rather than a statutory one, but it comes from the same atomic claim, which is what guarantees two agreements can never share one.

### 3. "Place of supply" is required when GST applies
An invoice/receipt with `gstRatePercent > 0` **cannot be finalized without a place-of-supply state code**. This drives the CGST/SGST-vs-IGST split (same state as the studio → CGST+SGST; different state → IGST). This is a hard validation guard, not a nicety — issuing a GST document without it is legally incomplete. If finalize fails with "Document is incomplete," this is the usual cause.

### 3a. A document follows the *supplier's* law, not the recipient's
The single most useful thing to know before anyone plans "global compatibility"
work. Qera is an Indian company, so an invoice to a client in Scotland is an
**Indian export invoice** governed by CGST Rule 46 and IGST s.16. Nothing in UK
law binds what it prints. A foreign recipient may want particular details to
satisfy their own accountant; that is a courtesy, never a legal requirement on
the issuer.

So "valid for a client anywhere in the world" is **not** N jurisdictions. It is
India's rules plus a short set of export-specific fields, listed in
`ROADMAP.md` under the format freeze. The HR documents have **no** global
dimension at all: the employees are in India.

N jurisdictions becomes real only when speclr is sold to suppliers who are not
Indian, because then the customer's own country governs. That is
`PRINCIPLES.md` rule 5, and it is a different problem with a different budget.
**Do not conflate the two.** Making Qera's invoices work worldwide is a week;
making other people's invoices work worldwide is the product.

### 4. Finalized documents are immutable
Once finalized, a document **cannot be edited, overwritten, or deleted** — enforced in the persistence layer and surfaced in the UI (no edit/delete controls appear). Corrections happen by **duplicating as a new draft**. This is the audit-trail guarantee for issued financial records. Drafts, by contrast, are freely editable and deletable.

### 5. The snapshot pattern
At finalize, the document **freezes a copy** of the client (or employee, for HR docs) into a JSONB `snapshot` column. Editing that client/employee later **must never mutate an already-issued document** — the issued invoice reflects the client as they were *at issue time*. Never resolve client/employee data live for a finalized doc; always read its snapshot.

**The studio side is snapshotted too.** Qera's own identity block (the "from:" address, bank, GSTIN, CIN) is editable at `/settings`, so finalize freezes a `studioSnapshot` onto the document as well. Sheets read it via `studioOf(doc)` — snapshot if present, else the `STUDIO_INFO` constant — never the live settings row. This is not a nicety: CGST s.36 requires a tax invoice to be retained unaltered for 72 months, and Rule 46 wants the supplier address *as at issue*. Moving office must not silently rewrite invoices already filed. **If you ever make studio details live again, you have created a compliance bug.**

### 5a. Client `name` vs `companyName`
Two different jobs, deliberately split: `name` is the short reference ("Clayora") used in lists, the client picker and the editor heading; `companyName` is the legal entity name ("Clayora Private Limited") that **documents print**. The form requires `companyName`; the record and the snapshot keep it **optional** so clients and snapshots written before it existed still load, and every sheet prints `companyName || name`.

### 5b. Document text is content, and it is snapshotted too
Every printed *word* that carries meaning — mastheads, the letter subject and acknowledgement, TERMS clauses, the MSA's 24 sections, the signatory block, footer identity lines — is editable per document via `content` (`src/lib/domain/docContent.ts`). Structural labels ("DESCRIPTION", "Subtotal", "GSTIN:", "Queries:") are **not**: they are the document's grammar and Rule 46 expects several of them verbatim.

Two rules keep this safe. **Drafts store only what was edited** — sheets call `contentOf(doc, spec)`, which lays a document's overrides over the type's defaults, so an untouched document prints exactly what it always did and still follows things like the intern/employee wording split. **Finalize materialises the resolved content onto the document** (`materialiseContent`), exactly as `studioSnapshot` freezes the studio identity. Without that, revising `fixedTerms` or `MSA_SECTIONS` next year would silently rewrite documents already issued. Same compliance rule as §5 — if you ever make the sheets read the constants directly again, you have created that bug.

Clearing a content field to empty is an **override**, not a reset: the document prints nothing there. That is the honest reading of an empty input.

### 5c. The MSA clauses live in the database now — and the seam is what keeps that safe

The Master Agreement's clauses moved out of `domain/contract/msa.ts` into a `clauses` table, edited at `/client/clauses`. `MSA_CLAUSES` is now the **seed and the fallback**, not the live source. This was a deliberate, logged deviation (see `PRINCIPLES.md` §7): the text was code-resident *because* content §2 wants it reviewed as one package by an Indian commercial lawyer, and a UI that adds clauses is a way for unreviewed legal text to reach a contract. The library page says so on the page.

Three things hold the line, and none may be quietly undone:

- **A contract copies the library once, when its draft is created.** `NewDocumentRoute` passes `clauseLibrary` to `ContractEditor`, which seeds `content.clauses`. `DocumentRoute` deliberately does **not** pass it — an existing document already carries its own copy, and its test mocks `@/db/store` *without* `listClauses` so a future edit that reaches for the live library fails loudly.
- **`contentOf` is unchanged and must stay pure.** Every sheet calls it per render; it never reads the database. Documents written before the library have no `clauses` override and keep resolving `MSA_CLAUSES` exactly as they always did.
- **Numbers are identity.** Clause bodies cite each other ("has the meaning given at clause 11.2"), so a new clause appends at the next number — claimed server-side, counting past archived rows — and nothing is ever inserted, renumbered or deleted. Archiving is the only removal.

### 5d. The client record is the source of truth, and documents derive from it

A client is onboarded once, through seven steps at `/client/clients/new`, and
every document then reads from that record instead of asking the operator to
remember. The steps are identity, tax & registration, contacts, commercial
terms, services & term, attachments, and delivery & access.

**One form per step, and step 1 creates the row.** Every later step is an
ordinary update through one action (`saveClientSection`), so an interrupted
onboarding needs no draft column and no "resume" concept: whatever was saved is
simply on the client already. The active step is in the URL, because this is a
task people get pulled away from.

**What is typed but not yet saved lives in `sessionStorage`, and the storage
choice is a rule, not a preference** (`src/lib/draft.ts`). A refresh used to
empty the step. It now restores, keyed on the step rather than the section
because Commercial and Services both write `commercial` and would otherwise
share one draft. The draft is cleared the moment its step saves, or the record
would be overwritten by a stale copy of itself the next time the step opened.

`localStorage` was refused for this. These forms hold a third party's PAN,
GSTIN, CIN, registered address and their staff's names, emails and phone
numbers. `localStorage` writes that to disk in plain text, keeps it after
sign-out and on a shared machine, keeps it after `deleteClient` performs the
DPDP Act 2023 erasure, and hands it to any XSS that ever reaches this origin.
`sessionStorage` survives a refresh, the back button and a profile switch,
which is all that was asked for, and dies with the tab. **Do not "upgrade" it.**

**What actually derives from it** — this is the payoff, and the reason the
record exists at all:

| Derived | From | Was |
|---|---|---|
| Place of supply | GSTIN's first two digits, else the address state | Typed per document |
| Invoice due date | `commercial.paymentTermsDays` + issue date | Hand-picked |
| Zero-rating label | SEZ flag, or a recipient outside India | Typed, or forgotten |
| Contract signatory | `contacts.signing` | Printed as a blank rule |

**The identifiers are checked properly, not shape-checked.** `taxIds/india.ts`
verifies the GSTIN's mod-36 check character, agrees its state prefix with the
client's address, agrees its embedded PAN with the PAN on the record, and
matches the PAN's holder-type character against the entity type (a Private
Limited's PAN is a `C`; an individual's on that record is as wrong as a
company's on a person). `taxIds/foreign.ts` does the same for UK VAT (mod-97),
ABN (mod-89) and EIN prefixes. The GSTIN↔address agreement is the load-bearing
one: it is what makes deriving place of supply from a GSTIN safe.

**Three things that are deliberately *not* how they look:**

- **`entityType` is a real column; the four groups are JSONB.** Entity type is
  identity (rule 2) and it validates the PAN. `tax`, `contacts`, `commercial`
  and the two lists follow the `payroll` precedent — nothing queries them, and a
  group keeps the next field migration-free.
- **There is no `country` column and no `onboardingStep` column.**
  `addressParts.country` already says where a client is, and completeness is
  derived from which groups are present (rule 3, both times).
- **The snapshot widened by exactly six optional fields** — `pan`, `cin`,
  `signatory`, `taxIdType`, `taxId`, `tds` — each because a sheet prints it.
  `ClientSnapshot` stays an explicit list rather than freezing whole groups, so
  a future field on `tax` cannot get a free ride onto every invoice. Attachments
  and access references are **not** snapshotted: a document has no business
  freezing a link to a scan of someone's PAN card.

**TDS prints as a memo and never changes the amount billed.** The taxable value
on a GST document is the full consideration; netting the deduction off would
understate the GST return. The memo exists so the smaller payment that arrives
reconciles against the invoice instead of looking short.

**Attachments are a third party's identity documents, and that governs.** Blobs
are stored **private** in Vercel Blob, read back only through
`/api/clients/[id]/files/[fileId]` behind `requireAuthorizedUser`, and the URL
names an attachment id rather than a path — so there is nothing to traverse and
an attachment only resolves for the client it belongs to. The type is **sniffed
from the bytes**, never taken from the browser's claim. Deleting one deletes the
blob, not just the row (DPDP Act 2023 erasure). **Never make these public URLs.**

**A client is deletable only until it has been on a document.** The list offers
delete on every row and the server refuses any client `documents.client_id`
points at — a foreign key already forbids it, so the check exists to turn a
constraint violation into a sentence. It is also right on its own terms: a draft
resolves its client live, and a finalized document is a record retained 72
months (CGST s.36) that a correction duplicates from. The snapshot means an
issued document would *survive* the deletion, but surviving is not a reason to
sever the link. **The attachments go with the row, blobs first** — same erasure
rule as above, and the other order orphans a file nothing points at.

**Delivery & access records where a credential lives, never the credential.**
speclr has no secret storage, no envelope encryption and no rotation. A password
typed into that step would sit in plain text in Postgres and in every backup. If
a field there ever starts holding secrets, that is an incident, not a feature.

**The rail form is gone.** `ClientForm` was deleted and both adding and editing
go to the route. Two surfaces writing the same row is how a section quietly goes
missing — a short form that doesn't know about tax registration saves the record
without it. (The rail's own regressions moved to `EmployeeManager.test.tsx`,
which is where `useRecordPanel` still lives.)

**A role stores a choice, never a copy of a person.** At most clients one person
is the day-to-day contact, the one who signs and the one accounts payable
chases. `contacts.roles` records where each secondary role points and
`resolveContact(contacts, key)` performs it on read: rule 3 again, because the
details are derivable. A key **absent** from that map is how the record says
"this role names its own person", stored under `contacts.billing` / `.signing`.
**Every reader must go through `resolveContact`**, and the one that matters is
`clientSnapshotOf`: it used to read `contacts.signing` directly, which is empty
for a role that points at the primary contact, so the contract would have frozen
the blank signature rule this record exists to fix. Tested in
`ContactsStep.test.tsx`.

The two roles do not offer the same choices, and that asymmetry is the domain
rather than an oversight. **Billing may be `'company'`, and that is its
default**: an invoice is addressed to the entity, so naming nobody is the
ordinary case, and it should not have to be expressed as a blank section that
reads like an unfinished form. Naming a person there does not change who is
billed; it means the invoice is *marked for their attention*, which is why
`resolveContact` returning `undefined` for a `'company'` billing role is the
correct answer rather than a missing one. **Signing may not be `'company'`,**
because a company does not hold a pen: somebody signs, and the signature block
prints their name. Its default is the primary contact, which is also the safe
one, since a forgotten signatory prints an empty rule.

There were four roles here once, plus a standalone `invoiceEmail`. Nothing read
`escalation` or that inbox, speclr sends no mail at all, and a billing contact's
email takes `accounts@` as happily as a person's address. A field nobody reads
is a field nobody maintains, so they went. They come back the day something here
actually delivers a document.

**Where invoices are addressed is a company fact, not a contact's.**
`clients.billing_address_parts` (page 1, behind a checkbox) holds the address to
bill when that is not the registered office, and null means the registered one,
which is what most clients will always mean. Two rules hold it: it is **complete
or absent**, because half an address on a tax invoice goes nowhere, and it
**never decides tax**. GST place of supply follows the recipient's registration,
so a client registered in Karnataka whose accounts department sits in Maharashtra
is still a Karnataka supply. `placeOfSupplyOf` reads the GSTIN and the registered
address and must keep doing so.

Neither the billing address nor the Attn line prints yet: they are collected,
validated and frozen-ready, and `ROADMAP.md` holds the change that teaches the
sheets to read them, snapshot included.

### 5e. The design system is enforced by tests, not by convention

`src/__tests__/design-tokens.test.ts` polices colour — no raw Tailwind palette
classes, no hex literals. Its sibling `design-system.test.ts` polices **which
primitive was reached for**, and exists because the failure that actually
happened was not a stray hex code: `ui/date-picker.tsx` says in its own
docstring that it replaces the browser's native date input, and an onboarding
step used `type="date"` anyway. Five rules today, all of them ones that were
broken:

| Banned outside `ui/` | Use instead |
|---|---|
| `<FieldDescription>` | `FieldInfo` / `InfoTip`, or a placeholder |
| a native date input | `DatePicker` |
| a *visible* `<input type="file">` | `form/UploadDropzone` (the input must be `sr-only`) |
| `register('pan' / 'gstin' / 'tan' / 'cin')` | the matching component in `form/fields.tsx` |
| `.email(` in a component | `emailSchema()` from `domain/fields.ts` |

Both walk the tree through `src/__tests__/policedSource.ts`, so their exemption
lists cannot drift apart. **When a primitive becomes the house answer for
something, ban the thing it replaced in the same commit** — that is the whole
mechanism, and it is cheap.

The same pass consolidated the two hand-rolled drop zones (the icon tool's and
the UPI QR upload's, whose comment said it "mirrors the icon tool's
UploadDropzone") into one shared `form/UploadDropzone`, which now also serves
client attachments. Its `<input type="file">` is `sr-only` rather than absent:
the styled box is a `role="button"`, but the input is what carries the accept
filter, the file dialog and the change event.

**One layout note that is a real bug fix, not a preference.** `AdminShell` uses
`overflow-clip`, not `overflow-hidden`. A hidden box is still a *scroll
container* — the user cannot scroll it but the browser can, and focusing
anything inside triggers a scroll-into-view that walks up every ancestor scroll
box. That pushed the header off the top of the shell with no way to bring it
back. `clip` creates no scroll container at all. Don't change it back.

### 5f. A field is declared twice, and only twice

The last two rows of the table above are the same lesson as the first three,
learned on validation instead of layout. The *validators* were already shared:
`PAN_RE`, `gstinError`, `cinError` and `tanError` each existed in exactly one
place. Everything wrapped around them was not, and it had drifted.

**The pair.** `src/lib/domain/fields.ts` holds the rule (`panSchema`,
`gstinSchema`, `tanSchema`, `cinSchema`, `emailSchema`); `src/components/form/fields.tsx`
holds the input, named to match. Rules run on both sides of the wire, so they
stay framework-free next to the validators they call; the inputs are client-only
and own the label, placeholder, length cap, upper-casing, tick and error slot.
Every schema in the app imports the first, every form the second. `IfscField`
and `PhoneField` were already built this way; this is the pattern reaching the
identifiers.

**What the drift had already cost**, in the order it matters:

- **Qera's own GSTIN and CIN were not validated at all.** `studioInputSchema`
  had `z.string().min(1).max(20)` while a *client's* GSTIN was held to its
  mod-36 check character. Ours is the one `studioSnapshot` freezes onto every
  invoice and CGST s.36 keeps unaltered for 72 months, so a transposed pair of
  characters would have been wrong on every document issued until someone
  noticed. Both now run the shared rule.
- PAN's rule was written three times, two different messages, one length cap
  between them.
- Email was written seven times, three different messages.

**Three deliberate shapes, so they are not mistaken for oversights.**

- **Blank-tolerant by default; `required` is passed by the form.** Onboarding
  saves one step at a time against a row that already exists, so a half-filled
  client is a normal state. Required-ness is a property of the form, which can
  explain it, not of the identifier, which would strand rows.
- **`superRefine`, not `.refine`.** The old schemas collapsed every failure into
  one generic line, discarding the specific finding the validator had already
  made. A reader told "the check character does not match" fixes a character; a
  reader told "this GSTIN is not valid" retypes the same fifteen.
- **Cross-record checks stay out.** A PAN's holder type needs the entity type, a
  GSTIN needs the address state and the PAN. Those are on the record, not in the
  field, so they stay in `clientTaxCrossErrors` where the whole client is in
  hand. A client passes `panSchema({ holder: [] })` and that empty array is the
  deliberate half of the split, not an omission.

**What is deliberately *not* a component.** A "Name" or "Notes" input has no
rule to share, and wrapping it would be an abstraction with one behaviour and
one caller. The line is whether the field knows something the caller would
otherwise have to remember.

### 5g. Every text field has a rule now, and the rule is not what stops XSS

§5f closed the *identifiers*. This closed everything else: roughly ninety
fields that were `z.string().trim().max(n)`, which is length and presence and
nothing about content. `src/lib/domain/text.ts` holds the replacements
(`textSchema`, `multilineSchema`, `personNameSchema`, `orgNameSchema`,
`codeSchema`, `httpsUrlSchema`), and `fields.ts` gained the three rules that
were still missing (`phoneSchema`, `ifscSchema`, `upiSchema`).

**Start with what this is not, because the inverse belief is dangerous.**
Neither SQL injection nor XSS is prevented by any of it. Both are already
structurally impossible: Drizzle parameterises every query, and React escapes
every interpolation. A `<script>` typed into a field is stored as those
characters and printed as those characters. **Validation is the second lock.**
If it were the first, the architecture would already be wrong, and a session
that starts "tighten validation so nobody can inject SQL" has the model
backwards and should be told so.

**Invisible is stripped, visible is refused.** That split is the whole design.
A right-to-left override (U+202E) reorders how a line *renders* while leaving
the bytes alone, so an invoice can display one payee and hold another (Trojan
Source, CVE-2021-42574); a zero-width space makes one client into two; a soft
hyphen copied out of a PDF breaks the GSTIN it lands in. None of those are
visible in an input, so none can be found by whoever has to fix them, and they
are removed rather than rejected. A digit in a person's name or a bracket in a
company's *is* visible, so it is refused, with the offending character named.
**U+200C and U+200D are deliberately kept** — ZWNJ and ZWJ are load-bearing in
Devanagari, and stripping them would corrupt a name written in Hindi.

`textSchema` and `multilineSchema` keep every visible character including `<`,
because they back notes and terms clauses where "amounts < ₹5,000" is ordinary,
and React escapes it anyway. Narrow the set where the field has a known shape;
leave prose alone.

**Three gaps this closed that were real, not theoretical:**

- **`phone` was validated only in `PhoneField`.** Every schema behind it was
  `z.string().max(30)`, so a number reaching a Server Action any other way was
  never checked, and it prints on an invoice. The old note called a strict rule
  impossible because it would strand legacy rows; that was wrong on the facts.
  These schemas run on **write, never on read**, so a bad value surfaces an
  error on the field and the save proceeds once it is fixed.
- **`vendorPortalUrl` accepted `javascript:`.** `z.url()` does. Nothing renders
  it as a link *today*, which is the only reason it was not live.
  `httpsUrlSchema` means the obvious next change cannot introduce it.
- **The studio's UPI ID had no rule.** It is the handle a client pays into.

**Autofill is off unless a field asks for it,** defaulted in `ui/input.tsx` and
`ui/textarea.tsx`. Left unset a browser guesses from the field name and offers
the **operator's own** saved profile, and almost every form here describes
somebody else. The exception is `/admin/settings`, which really is Qera's own
organization and passes real tokens. `AddressFields` and `PhoneField` say `off`
explicitly, because a reader would otherwise expect `address-line1` there.

**Headers exist now, and they did not before** (`next.config.ts`): CSP, HSTS,
`nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, COOP/CORP,
and `poweredByHeader: false`. **The CSP has no nonce, and that was measured
rather than assumed.** A nonce policy with `'strict-dynamic'` was built and
tested against a real server: Clerk's script tag carries no nonce (Clerk emits
it, not Next), and `'strict-dynamic'` makes browsers *ignore* the host
allowlist, so enforcing it blocks Clerk and breaks sign-in. `next-themes` emits
a second un-nonced inline script. A nonce also cannot coexist with
`'unsafe-inline'`. So `script-src` allows inline, which gives up a primitive
nothing in this app can reach, and keeps the ones that matter: a host allowlist,
`connect-src` (exfiltration has nowhere to go), and `base-uri 'self'`.

**Enforced by tests, the same mechanism as §5e.** `design-system.test.ts` gained
two rules — a hand-written `z.string().trim()` outside `text.ts`/`fields.ts`, and
a hand-written phone rule — and the walker now polices `.ts` as well as `.tsx`.
`security-headers.test.ts` reads the real config, and `ui/__tests__/autofill.test.tsx`
pins the default. Both were confirmed to fail when the thing they guard is
removed; a rule that matches nothing is a test that passes forever.

### 6. Intern vs. employee is a legal distinction (not cosmetic)
HR documents branch on `engagementType`:
- The **exit document auto-switches**: an intern gets an **"Internship Completion Letter"**; an employee gets a **"Relieving Letter"**. These are legally different — an intern is never "relieved from services," never "resigned," and internship docs must not contain salary/employment language.
- Offer-letter and other HR wording similarly varies by engagement type.
- Legal-assertion lines (e.g. "no TDS applicable," "dues settled") are **editable**, not fixed boilerplate — because their truth depends on the specific case.

### 6a. The stipend slip and the pay slip are different documents
Two doc types (`STP`, `PAY`), one sheet and one editor (`SlipSheet` / `SlipEditor`), branching on `doc.type` — **not** on `engagementType`.

- A **stipend slip** is a *voluntary* record of a discretionary payment to an intern. Its first clause exists to **deny** an employment relationship.
- A **pay slip** is a *statutory* wage record — Code on Wages 2019, Payment of Wages Act s.13A, and the state Shops & Establishments rules require the employer to keep a wage register and issue a wage slip. So it alone carries **itemised deductions** (`gross − deductions = net`, the Form IV shape), **days worked/paid/LOP**, the **designation**, and the **statutory identifiers** (employee code, PAN, UAN, PF, ESIC) — which are snapshotted onto the slip like everything else in §5.

Why separate types rather than one that adapts: `engagementType` lives in the **frozen snapshot**, so converting an intern to an employee would silently change the legal identity of an open draft. And a wage register wants its own consecutive series — `QS-PAY-2627-nnn`, never interleaved with `QS-STP-…`.

**Each slip offers only its own kind of recipient** — the pay slip picker lists employees, the stipend picker lists interns. That is why neither sheet branches on `engagementType` any more: the slip type *is* the distinction, so `stipendTerms` has one set of (internship) clauses and `payslipTerms` has its own, and the ACCOUNT heading follows `doc.type`. Filtering is the convenience; the finalize guard is the enforcement.

Three guards, all load-bearing:
- **A pay slip cannot be finalized for an intern.** Refused in `finalizeDocument` (the schema can't see the engagement type), warned in the editor.
- **Net pay cannot be negative** at finalize — no lawful deduction leaves an employee owing wages back. The *sheet* still renders a negative net as a signed amount rather than throwing, because the editor previews it live on every keystroke.
- **The pay slip's `deductionsNote` defaults to empty.** The stipend slip's "No statutory deductions (PF, ESI, TDS) are applicable." is a claim about the employee's tax position, and it stops being true the moment TDS u/s 192 does.

**Prescribed figures always print**, even when nil: the deductions table shows a `Nil` row rather than vanishing, and Days paid / Loss of pay always appear (defaulting to the month's length and 0). A blank where a required figure belongs reads as an omission; "0 days" is a statement. A count that was genuinely never recorded prints "—", never a fabricated one.

**PAN is structure-checked, not verified.** Its 4th character encodes holder type (must be `P`, an individual — blocking) and its 5th is the surname's initial (a hint only; real PANs mismatch honestly). We deliberately call **no** verification API: official access is restricted to entity categories a design studio is not in, resellers need business KYC and per-call billing, and none return an address. See `panHolderTypeError` / `panSurnameMismatch`.

**Employee codes are assigned, never typed — and only to employees.** `QS-EMP-001` upward, claimed from the same `counters` table as document numbers (`claimEmployeeCode`), with a partial unique index on `payroll->>'employeeCode'` behind it. **Interns get none**: they are not on the payroll, are never issued a pay slip, and the stipend slip does not print a code, so claiming one would burn a number in the employee series for someone outside it. An intern hired properly gets their first code on that save. **No financial year and no engagement letter in the code**, because a code once held is never reassigned or removed — not on an update, not on reclassification — it is frozen onto every slip already issued to that person (`withEmployeeCode`). This replaced free text, under which two employees came to share `000001`; migrations `0005`/`0006` sorted the existing rows out.

**Pay is quoted the way each engagement is actually quoted.** An employee has an `annualSalaryPaise` (what the offer letter names, what a raise is discussed in); an intern has only `payAmountPaise`, a monthly stipend. `payAmountPaise` is always monthly and is what every *document* reads — **derived server-side** from the annual figure (`withDerivedPay`) so the pair can never drift, with whatever the form sent for it discarded. "Salary" means what the employee is paid, not a CTC inflated by employer contributions: Qera has none to add (PF needs 20+ employees, gratuity five years), so gross and CTC are the same number today. The offer letter follows suit — an employee is offered "a gross annual salary of ₹X, payable in equal monthly instalments and subject to deductions required by law", an intern "a stipend of ₹X per month". Calling a stipend an annual package would frame the internship as employment.

**A slip line prints its description and nothing else.** The free-text `detail` an invoice line carries is collected on invoices and receipts only. On a slip it merely restated the wage period and the deductions note — both of which DETAILS and TERMS already state — and a second copy is one more thing that can disagree with the first. The single exception is the rate × qty working on a line billed by quantity, which is arithmetic the reader needs to check the amount.

**Not built, deliberately**: any payroll *engine*. EPF needs 20+ employees, ESI 10+ and gross ≤ ₹21,000, and UP has no Professional Tax — so for Qera today the only live statutory deduction is TDS. Deductions are a free list of lines.

**The pay slip is not paginated.** It shares the stipend slip's fixed single A4 frame, which *clips*. Earnings and deductions print side by side (the conventional Indian form) precisely so a realistic run fits — roughly 6 earnings against 5 deductions. Beyond that a row is silently cut. If a slip ever needs a second page, flow it through the `Paginator` as the contract and letters already do. **Verify any change to this sheet in a real browser** — jsdom cannot see clipping, and this bug got through the test suite once already.

### 7. Ordinal dates everywhere
Documents show dates as **"10th June 2026"** (ordinal), never `10/06/2026`. Use the `dates` domain helpers; don't format dates ad hoc.

---

## Architecture at a glance

```
form → Zod validate → Server Action → Drizzle → Postgres
```

- **`src/lib/domain/`** — the portable core, lifted ~verbatim from the source project: `money`, `dates`, `amountInWords`, `gstStates`, `registry` (the doc-type spec table + Zod schemas + numbering format), `studio` (Qera's legal constants — CIN, GSTIN, bank, address), `employee`, `hrContent`, `msaBoilerplate` (the 24-clause contract text), `scheduleLetter`, `serviceTemplate`, `types`. **Pure TypeScript, zero UI, zero framework coupling.** Its tests are lifted verbatim and must pass unchanged.
- **`src/db/`** — Drizzle schema + queries + migrations. Relational tables (`clients`, `employees`, `service_templates`, `documents`, `counters`) with JSONB for the doc-type-specific parts. Zod validates JSONB on write.
- **`src/server/actions/`** — Server Actions (documents, clients, employees, services). Each verifies the Clerk session server-side.
- **`src/components/docs/sheets/`** — the **pixel-faithful document sheets**. Pure `data → markup`. Tailwind + `src/styles/print.css` for A4/print. Do not redesign.
- **`src/components/`** — everything else, fresh shadcn (dashboard Table, forms, nav, editors, the Paginator).
- **`src/app/(app)/{client,admin}/`** — the two profiles (see below). `_routes/` holds the route bodies both profiles share; the page files under each profile are thin wrappers that say which one they are.
- **`src/lib/profile.ts`** — which side a thing belongs to, and the one documented seam between them.

---

## The two profiles

speclr is **two applications in one shell**: `/client/…` (contracts, invoices,
receipts, the clients who receive them) and `/admin/…` (the slips and HR
letters, the employees they are about, settings, and every tool). Only one is
live at a time. A switcher under the wordmark moves between them, and so does a
horizontal swipe over the rail. Each profile has its own home, its own nav, its
own ⌘D palette and its own ⌘K search.

**A profile is derived, never stored.** `profileOfDocType` is a rename of the
existing `isHrDocType` — every document type already names either a client or an
employee. So there is no `profile` column, no migration, and no way for a
document to disagree with the side it is filed under (`PRINCIPLES.md` rule 3).

Three things follow, and none of them should be quietly undone:

- **`src/lib/profile.ts` is the backdoor.** The halves are otherwise sealed.
  Anything that ever needs to cross routes through that file, so the seam is one
  place to find rather than a rule scattered through the UI. `listDocuments()`
  is deliberately left unscoped for the same reason; the homes call
  `listDocumentsByProfile`.
- **Wrong-profile URLs behave differently by kind.** `/client/docs/pay-slip`
  404s — a slug under the wrong prefix names nothing and never did.
  `/client/docs/<uuid-of-a-pay-slip>` *redirects* — that names something real
  that merely moved, and these links get emailed and bookmarked.
- **Every pre-split URL still works.** The static ones are declared in
  `next.config.ts`; `/docs/<id>` and friends resolve through
  `_routes/legacyDocs.ts` because only the database knows a document's type. A
  dead link to an issued invoice is not an acceptable cost of a nav change.

The profile you land on is remembered in a `speclr_profile` cookie, and so is
the **exact page** on each side, in `speclr_last_client` / `speclr_last_admin`.
Switching sides and coming back resumes rather than resetting to the dashboard,
search string included, because that is where onboarding keeps its active step.

Three things about that memory:

- **One writer, `RememberLocation`**, from wherever you actually landed. Not the
  switcher's click: the swipe, the Settings link, a legacy redirect and a pasted
  URL all move you too. It is its own component only because it needs
  `useSearchParams`, which must sit under a Suspense boundary.
- **The path is validated on the way in and again on the way out**
  (`isProfilePath`). A cookie is client-writable and `/` feeds this value
  straight to `redirect()`, so without the check it is an open redirect. The
  boundary-character test is the load-bearing half: `/clientele.evil.com`
  passes a naive `startsWith('/client')`.
- **The side you are already on still links to its own home.** That is the
  ordinary "back to the top" affordance; only the side you are not on resumes.

---

## How the Paginator / print pipeline works

The document preview shows **one A4 page at a time in a carousel** (prev/next arrows, page counter, Fit/100% zoom). Under the hood:
- Each sheet exposes its content as a **flat list of atomic blocks** (cover, parties, each clause, signatures…).
- The `Paginator` **measures each block and packs them into fixed A4 page frames**, breaking only *between* blocks — so a clause heading never separates from its body.
- On screen it's a carousel (one page visible); for print/PDF the same blocks flow via real CSS page breaks in `print.css`.
- Sheets stay pure `data → markup`, which keeps a future **server-side PDF renderer** a non-breaking, additive upgrade (deferred — see below).

**jsdom cannot validate this layout** — always verify pagination/print in a real browser.

---

## Decisions already made (do not re-litigate)

- **Next.js, not TanStack Start** — maturity + Vercel + existing Server Actions.
- **Postgres (Neon) + Drizzle, not Redis** — the source used Upstash Redis; Postgres is the right spine for queryable financial records.
- **Clerk, not a shared password** — email allowlist, all invited users full access, **no roles yet** (addable later without rewrite).
- **Documents pixel-faithful; all other UI fresh shadcn** — the sheets are finished, approved, legal artifacts; only their styling system changed (SCSS → Tailwind + print.css). The chrome is where shadcn shines.
- **Sheet styling = Tailwind + a small `print.css` layer** (not a PDF renderer yet).
- **The app is split into two profiles, with the profile in the URL** — see *The two profiles* above. The alternative considered was deriving the profile from the route without changing any URL, which would have been a far smaller diff; carrying it in the path was chosen so a shared link states which side it belongs to.
- **No data migration** — fresh Postgres. The old Upstash test data (incl. a test invoice `QS-INV-2627-001`) was **not** carried over. speclr's first real document starts a clean FY sequence.

## Deferred work → `ROADMAP.md`

The YAGNI list that used to live here (PDF renderer, roles/permissions, payslip
document type, analytics dashboards) now lives in [`ROADMAP.md`](ROADMAP.md)
under *Deliberately deferred*, alongside every other piece of unbuilt work.

This file records **decisions already made**; the roadmap records **work not yet
done**. Keeping deferred items in one place stops the two lists drifting apart.

## Access control (two independent locks — do not weaken)

speclr holds sensitive financial/legal documents. Access is defence-in-depth:

1. **Clerk sign-up is Restricted (invite-only).** The public cannot self-register — accounts exist only if invited/created from the Clerk dashboard. (Set in Clerk → Restrictions. Do not switch back to public sign-up.)
2. **App-level allowlist.** `SPECLR_ALLOWED_EMAILS` (comma-separated) — every protected page/action calls `requireAuthorizedUser()` = valid Clerk session AND allowlisted email. **Fail-closed**: empty allowlist admits nobody. A signed-in but non-allowlisted user lands on `/no-access` (sees zero documents).

**To add a person:** invite them in Clerk *and* add their email to `SPECLR_ALLOWED_EMAILS` (both `.env.local` locally and Vercel for prod). Both locks must pass.

> Verified: a signed-in user whose email is not allowlisted is blocked at `/no-access` with no data access — confirmed in-browser during Phase 3.

## Known issues / watch-list

- **npm audit** flags transitive `postcss`/`sharp` advisories bundled inside Next.js. **Do NOT `audit fix --force`** — it downgrades Next 16 → 9.3.3 (catastrophic). Resolve by upgrading Next when a patch lands.
- **Clerk keys are `pk_test_` (dev instance)** — they only work on `localhost`. Production login needs a Clerk *production instance* + the `speclr.qera.studio` domain configured. A go-live task, not done yet.
- **`SPECLR_ALLOWED_EMAILS` in Vercel** must be kept in sync with `.env.local` (currently `shivanshu@qera.studio,ops@qera.studio`).

---

## Where to look first

- Domain rules unclear? → `src/lib/domain/registry.ts` (the doc-type spec table) and this file.
- Standards / how to work? → `AGENTS.md` + `dev/` checklists.
- Why is it shaped this way? → the extraction design spec (in the source project's `docs/superpowers/specs/`).
