# VENDORS: what speclr runs on, and what it would cost to run on better

> **Purpose.** Everything in speclr that is somebody else's: a hosted platform, a
> third-party API, a data source, a framework, a library. Each entry answers the
> same five questions, so that the day a free tier stops being good enough, the
> decision is a purchase rather than a research project.
>
> **The five questions, for every entry:**
>
> 1. **What we use today.**
> 2. **Why we use it.**
> 3. **The industry substitute.** What a company with a budget would run.
> 4. **What it costs.**
> 5. **Why it beats its two closest competitors.**
>
> **This is a standing rule, not a one-off document.** Adding a dependency, an
> API, a data source or a platform means adding its row here in the same commit.
> A vendor nobody wrote down is a vendor nobody can replace. `AGENTS.md` carries
> the rule; this file carries the answers.
>
> **Prices are indicative and dated.** Every figure below is list price as
> understood on **16 August 2026** and is a planning number, not a quote. Confirm
> current pricing before committing to anything. Where a vendor prices per
> request or per seat, the number that matters is speclr's actual volume, which
> today is one operator and a handful of documents a month.
>
> **Read §1 first if you are here to spend money.** It is the only section where
> the free tier is a genuine quality ceiling rather than merely a smaller version
> of the paid one.

---

## Table of contents

1. [Data sources and third-party APIs](#1-data-sources-and-third-party-apis). The ones with a real quality ceiling
2. [Platform and infrastructure](#2-platform-and-infrastructure)
3. [Framework and language](#3-framework-and-language)
4. [UI and styling](#4-ui-and-styling)
5. [Data, forms and validation](#5-data-forms-and-validation)
6. [Testing and tooling](#6-testing-and-tooling)
7. [What we deliberately do not use](#7-what-we-deliberately-do-not-use)
8. [The upgrade order, if money appears](#8-the-upgrade-order-if-money-appears)

---

## 1. Data sources and third-party APIs

This is the section that matters. Everything else here is a library choice that
can be revisited at leisure; these are **facts printed on legal documents**, and
the free tiers are the places where speclr's data quality is genuinely capped.

### 1.1 Indian postcode to city and state

| | |
|---|---|
| **Today** | `api.postalpincode.in` (India Post data, community-run mirror). No key, no published rate limit, no SLA. Proxied through `/api/pincode/[code]`, session-gated, 3s timeout, 24h cache, silent failure. |
| **Why** | It is the only free source that returns the **District**, which is what an Indian address line wants, and it covers every live pincode. Zero setup, zero cost, and the failure mode is already harmless: city and state stay hand-editable, so a dead upstream cannot block a save. |
| **Industry substitute** | **Google Geocoding API**. Authoritative, global, returns structured components (locality, administrative_area_level_1) plus a formatted address, and is the same data behind Maps. |
| **Cost** | Google Geocoding: **$5 per 1,000 requests** after a $200/month free credit (~40,000 free calls). At speclr's volume, effectively free but requires a billing account and a key. **Zippopotam commercial tier: ~$50/month** flat. **Loqate / Melissa (address verification): from ~$200/month**, priced per lookup batch. |
| **Beats its two closest competitors** | vs **Zippopotam** (see 1.2): Google covers every Indian pincode; Zippopotam's Indian coverage is partial and returns a place name rather than a district. vs **India Post's own API**: there is no official, documented, keyed public endpoint. `postalpincode.in` *is* the community mirror, so "going official" is not an option that exists, which is exactly why the paid substitute is a global geocoder rather than a better Indian one. |

**The honest ceiling:** no SLA, no support, and a single volunteer-run host. If
it disappears the feature silently stops working and nobody is notified. Add a
health check before that matters.

### 1.2 Rest-of-world postcode to city and state

| | |
|---|---|
| **Today** | `api.zippopotam.us`. No key, ~60 countries. Same proxy, same gating, same silent failure. Wired 16 August 2026. |
| **Why** | It is the only no-key, no-signup source covering enough countries to make the field useful outside India, and it returns both the place name and the top-level region (Scotland for GB, a Bundesland for DE). Partial coverage is acceptable **because the field was always hand-typeable**: an uncovered country is exactly the experience every country had the day before. |
| **Industry substitute** | **Google Geocoding API**, same as 1.1. One vendor for both would also collapse two upstreams into one. |
| **Cost** | As 1.1. **Zippopotam commercial: ~$50/month** for an SLA and higher limits on the same data. |
| **Beats its two closest competitors** | vs **GeoNames** (free, 250k+ places): GeoNames' postal-code file needs hosting and updating ourselves, and its free web service is rate-limited per username and frequently over quota. vs **Loqate/Melissa**: they are address *verification* suites, which is a much stronger product (they correct and standardise a whole address, not just a postcode) and priced accordingly. Worth buying when speclr posts physical mail, which it does not. |

**Known quirk, already handled:** several countries index only part of the code,
so a full postcode misses and the route retries on the first segment. Where more
than one place comes back, the code covers a district rather than an address, so
only the region is filled and the town is left blank and typeable: a guess
presented as a lookup is worse than no lookup.

**The UK is no longer served from here.** See 1.2a.

### 1.2a UK postcode to town and region

| | |
|---|---|
| **Today** | `api.postcodes.io`. No key, no signup, open source (Ideal Postcodes), built on the ONS Postcode Directory and Royal Mail's PAF-derived open data. Same proxy, same gating, same silent failure. Wired 18 August 2026. |
| **Why** | Zippopotam is not thin in Great Britain, it is **wrong**: it indexes the outward code only, so `PH2` answers with the thirty villages that share it, and `places[0]` filled a Perth address in as Bridge of Earn and then locked the field. Postcodes.io resolves the *full* postcode and returns `admin_district` ('Perth and Kinross'), plus county, region and country. The UK is the one foreign country speclr already has a client in. |
| **Industry substitute** | **Ideal Postcodes' own paid API** (the same people, the same data, plus the Royal Mail PAF address list and an SLA), or **Loqate**. |
| **Cost** | Ideal Postcodes: **from ~£0.02 per lookup**, or ~£20/month for a small bundle; PAF address data carries Royal Mail licensing on top. Loqate: **from ~$200/month**. |
| **Beats its two closest competitors** | vs **Zippopotam** (1.2): it cannot answer a full UK postcode at all, which is the whole failure this replaced. vs **Google Geocoding** (1.1's substitute): Google would answer, but it needs a billing account and a key for a field that is hand-editable anyway, and it returns a locality rather than the administrative district a UK address line names. Buy Ideal Postcodes' paid tier the day speclr needs the *building* (a full PAF address picker), not just the town. |

**The honest ceiling:** free tier, no SLA, and **the post town is not in it**.
The town on a UK letter comes from Royal Mail's PAF, which is licensed, so the
route approximates it from the built-up area and the travel-to-work area. That
is right for 11 of 13 real post towns tested; the two misses are inner London,
where it names the borough ('Islington' where the letter says LONDON). It is a
real, checkable answer in an editable field, which is the bar this feature sets.
Buying Ideal Postcodes' paid tier is what replaces the approximation with PAF.

### 1.3 IFSC to bank and branch

| | |
|---|---|
| **Today** | `ifsc.razorpay.com`. No key, free, sourced from the RBI's published IFSC master. Proxied through `/api/ifsc/[code]`. |
| **Why** | Razorpay publish it as a public good, it is derived from the RBI's own file, and IFSC data barely changes. There is no meaningful quality gap to close here. |
| **Industry substitute** | **Razorpay's authenticated banking APIs**, or the **RBI master file** ingested directly and served from our own database. |
| **Cost** | Free today. RBI file: free, costs a periodic import job. Razorpay's paid banking products are transaction-priced (~2% per payment) and are a different product entirely. |
| **Beats its two closest competitors** | vs **self-hosting the RBI file**: identical data, but we would own the refresh cadence for a field used a handful of times a year. vs **paid bank-verification services (Cashfree, Signzy, ~₹3-5 per verification)**: those confirm an account *exists and matches a name*, which is a genuinely stronger check, but speclr collects a client's bank details for a contract, it does not push money to them. Buy that the day speclr initiates a payout. |

### 1.4 PAN / GSTIN verification

| | |
|---|---|
| **Today** | **Nothing.** Structure only: the mod-36 check character on a GSTIN, holder-type character on a PAN, cross-checks against the client's address and entity type (`taxIds/india.ts`). |
| **Why** | Deliberate, and documented in `CONTEXT.md` §6a. Official NSDL/Protean PAN verification is restricted to entity categories a design studio is not in; resellers require business KYC and per-call billing; none return an address. The structural checks catch every transposition and most typos, which is the failure mode that actually occurs. |
| **Industry substitute** | **Signzy, Karza (now Perfios), Surepass, IDfy**, all KYC-as-a-service. Live GSTIN status (active/cancelled), registered legal name, registered address, filing status. |
| **Cost** | Typically **₹2-8 per GSTIN lookup, ₹1-5 per PAN**, with a minimum commitment of **₹10,000-25,000/year** and business KYC to onboard. Surepass is usually the cheapest entry; Karza/Perfios the most complete. |
| **Beats its two closest competitors** | vs **the free public GST portal search**: it exists and returns real data, but scraping it is against its terms and it has no API contract, so it breaks without notice. vs **structural validation alone (today)**: a check character proves the GSTIN is well-formed, not that it belongs to this client or is still active, and a cancelled GSTIN on a tax invoice is a real compliance exposure that only a live lookup catches. |

**This is the highest-value paid upgrade on the list.** It is the only one where
the free option cannot in principle produce the answer.

### 1.5 Currency conversion

| | |
|---|---|
| **Today** | **Nothing.** Invoices are INR only, by decision (`domain/currency.ts`: a GST document must show tax in INR regardless of billing currency). A foreign client's agreed currency is recorded as a commercial term and prints nothing. |
| **Industry substitute** | **Open Exchange Rates** or **Fixer**, plus the **RBI reference rate** for anything a tax return depends on. |
| **Cost** | Open Exchange Rates: free tier 1,000 calls/month (USD base only), **$12/month** for other bases, $47/month for hourly rates. Fixer: similar. RBI reference rate: free, published daily. |
| **Beats its two closest competitors** | Not applicable until there is a reason to convert. When there is, the answer is almost certainly **the RBI reference rate**, not a market-rate API, because Indian tax treatment of an export invoice keys off the notified rate, not the spot rate. A market-rate API would be the wrong tool bought for the right-sounding reason. |

### 1.6 Email delivery

| | |
|---|---|
| **Today** | **Nothing.** speclr sends no mail at all. Documents are printed or PDF'd by the operator. This is why `contacts.escalation` and the standalone `invoiceEmail` field were removed: nothing read them. |
| **Industry substitute** | **Resend** (developer-first, React Email templates), **Postmark** (transactional deliverability specialist), **AWS SES** (cheapest at volume). |
| **Cost** | Resend: free 3,000/month, **$20/month** for 50,000. Postmark: **$15/month** for 10,000. SES: **$0.10 per 1,000** plus the operational cost of managing reputation yourself. |
| **Beats its two closest competitors** | Resend for this codebase: it is the only one of the three whose templating is React, which means an invoice email could reuse the sheet components rather than being a second implementation of the same document. vs **Postmark**: better deliverability reputation and analytics, but the templating is its own language. vs **SES**: an order of magnitude cheaper and an order of magnitude more work, and speclr's volume would be dozens of mails a month, where the price difference is pennies and the setup difference is days. |

### 1.7 PDF generation

| | |
|---|---|
| **Today** | **The browser's own print-to-PDF.** Sheets are HTML plus `print.css`; the operator prints. |
| **Why** | Zero cost, zero dependency, and pixel-identical to what the preview shows because it *is* what the preview shows. Deferred deliberately (`ROADMAP.md`). |
| **Industry substitute** | **Playwright/Puppeteer on a serverless function** (self-hosted Chromium), or **DocRaptor / PDFShift / Browserless** as a service. |
| **Cost** | Self-hosted Playwright on Vercel: free beyond compute (but a ~50MB Chromium layer and cold starts). Browserless: **from $50/month**. DocRaptor: **from $15/month** for 125 documents. PDFShift: **$9/month** for 500. |
| **Beats its two closest competitors** | When it happens, self-hosted Playwright wins for speclr: the sheets are already pure `data → markup`, so the same components render server-side with no second template, and there is no per-document cost on a tool that may issue thousands over its life. vs **DocRaptor**: excellent PDF/A and accessible-PDF support (which would matter for archival compliance) but per-document pricing on a document tool is the wrong shape. vs **a PDF library like pdfkit/react-pdf**: it is a complete re-implementation of five finished, legally-approved layouts, which is the most expensive option on this list despite being the only free one. |

### 1.8 Error tracking and uptime

| | |
|---|---|
| **Today** | **Nothing beyond Vercel's own logs** and the app's `logger`. No alerting. |
| **Industry substitute** | **Sentry** for errors, **Better Stack** or **Checkly** for uptime and the third-party health checks §1.1 wants. |
| **Cost** | Sentry: free 5,000 errors/month, **$26/month** Team. Better Stack: free 10 monitors, **$29/month**. Checkly: free 10k checks, **$40/month**. |
| **Beats its two closest competitors** | Sentry vs **Vercel's built-in observability**: Vercel shows you that a function failed; Sentry shows you the stack, the release, and which user hit it. vs **Highlight/LogRocket**: session replay is aimed at diagnosing what a *user* did wrong, and speclr has one user who is sitting next to the developer. |

---

## 2. Platform and infrastructure

### 2.1 Hosting: Vercel

| | |
|---|---|
| **Why** | It is Next.js's own platform: zero-config builds, preview deploys per branch, and no gap between what the framework ships and what the host supports. speclr is one small Next app with one operator; anything else is work for no return. |
| **Industry substitute** | **AWS (ECS/Fargate + CloudFront)** or **Google Cloud Run**, for cost control and data residency at scale. |
| **Cost** | Vercel: free Hobby (non-commercial only, and **speclr is commercial use, so Pro is the correct tier**), **$20/user/month** Pro. AWS equivalent: ~$30-60/month for a small always-on service, plus the engineering time to own it. Cloud Run: near-zero at this traffic, ~$5/month. |
| **Beats its two closest competitors** | vs **Netlify**: comparable DX, but Next.js support is a compatibility layer rather than the reference implementation, and speclr uses Server Actions and App Router features that land on Vercel first. vs **self-hosted on a VPS (Hetzner, ~€5/month)**: ten times cheaper and genuinely viable for this app, but it moves TLS, deploys, rollbacks and Node upgrades onto a solo founder with no ops time. The premium buys back hours, which is the scarce resource here. |

### 2.2 Database: Neon Postgres

| | |
|---|---|
| **Why** | Real Postgres (so the atomic FY numbering is a row lock, not an emulation), serverless-friendly driver over HTTP (so Vercel functions need no connection pooler), and branching per preview deploy. Chosen over the source project's Upstash Redis because financial records want a queryable relational spine. |
| **Industry substitute** | **AWS RDS / Aurora Postgres**, or **Google Cloud SQL**, for a managed instance with committed capacity and point-in-time recovery measured in weeks. |
| **Cost** | Neon: free tier 0.5 GB and 24h history, **$19/month** Launch (10 GB, 7-day PITR), $69/month Scale (30-day PITR). RDS: **from ~$30/month** for a db.t4g.micro with storage and backups, more with Multi-AZ. Supabase: free tier, **$25/month** Pro. |
| **Beats its two closest competitors** | vs **Supabase**: Supabase bundles auth, storage and realtime, all of which speclr already solves elsewhere (Clerk, Vercel Blob), so buying the bundle would mean two auth systems. Neon is the database alone, which is the part we actually want. vs **PlanetScale**: excellent branching and scale, but it is MySQL-lineage and speclr leans on Postgres specifics (JSONB operators, partial unique indexes, `SELECT … FOR UPDATE` for the counters). Porting the numbering guarantee is not a migration anyone should want. |

**The one to watch:** free-tier PITR is 24 hours. These are documents retained 72
months by law (CGST s.36). **The $19/month Launch tier is the first paid upgrade
that is about correctness rather than comfort.**

### 2.3 Auth: Clerk

| | |
|---|---|
| **Why** | Invite-only sign-up, hosted UI, session verification that works in Server Actions and middleware, and no password storage of our own. Paired with an app-level email allowlist so there are two independent locks. |
| **Industry substitute** | **Auth0/Okta** for enterprise SSO and audit logs, or **WorkOS** for SAML/SCIM if speclr ever sells to companies. |
| **Cost** | Clerk: free to 10,000 MAU, **$25/month** Pro plus $0.02/MAU, SAML add-on extra. Auth0: free to 25,000 MAU, then **from $35/month**, enterprise connections priced separately and steeply. WorkOS: free to 1M users for AuthKit, **$125/connection/month** for SAML. |
| **Beats its two closest competitors** | vs **NextAuth/Auth.js (free)**: genuinely free and self-owned, but sessions, invites, the sign-in UI and the account recovery flow all become ours to build and secure, on an app whose entire threat model is "nobody unauthorised sees these documents". vs **Supabase Auth**: free and good, but it lives in a Supabase project, and §2.2 explains why the database is Neon. Two vendors for one concern. |

### 2.4 File storage: Vercel Blob

| | |
|---|---|
| **Why** | Client attachments are a third party's identity documents. Blob stores them **private**, they are read back only through a session-gated route, and it is one line of config on the platform already hosting the app. |
| **Industry substitute** | **AWS S3** with a bucket policy, presigned URLs and lifecycle rules. |
| **Cost** | Vercel Blob: 1 GB free, then **~$0.023/GB stored** and **$0.05/GB served**. S3: **$0.023/GB stored**, $0.09/GB egress, plus request charges. Cloudflare R2: **$0.015/GB stored, zero egress**. |
| **Beats its two closest competitors** | vs **S3**: identical pricing on storage, materially more setup (IAM, bucket policy, CORS) for a feature holding a few dozen PDFs. vs **Cloudflare R2**: cheaper and egress-free, and the obvious choice if attachments ever became large or heavily read. They are neither. Revisit at the first gigabyte. |

---

## 3. Framework and language

### 3.1 Next.js 16 (App Router, React 19, Turbopack)

| | |
|---|---|
| **Why** | Server Components keep the document sheets and their data on the server; Server Actions remove an entire API layer; it is the framework the host is built for. |
| **Industry substitute** | There is no "paid Next.js". The substitutes are architectural: **Remix/React Router 7**, **TanStack Start**, or a **Vite SPA + a separate API**. |
| **Cost** | Free (MIT). The real cost is the platform coupling in §2.1. |
| **Beats its two closest competitors** | vs **TanStack Start**: already considered and rejected in `CONTEXT.md`: better type-safety story, materially less mature, and speclr's Server Actions would need rewriting. vs **Remix**: excellent progressive-enhancement model and a cleaner data story, but no equivalent of Server Components, which is what keeps the sheets off the client bundle. |

### 3.2 TypeScript (strict)

| | |
|---|---|
| **Why** | Money in integer paise, discriminated document types, snapshot shapes. Every one of those is a place a type catches a real bug. |
| **Substitute / cost** | Free (Apache 2.0). The alternative is JavaScript plus JSDoc, which is strictly worse here. Nothing to buy. |

### 3.3 React Compiler (`babel-plugin-react-compiler`)

| | |
|---|---|
| **Why** | Automatic memoisation, so the editors re-render cheaply without hand-written `useMemo`. |
| **Watch item** | It freezes impure calls made during render, so a plain function called in render caches its first result forever. This has bitten this codebase before. |
| **Substitute / cost** | Free. Alternative is manual memoisation, which is more code and drifts. |

---

## 4. UI and styling

### 4.1 shadcn/ui over Base UI

| | |
|---|---|
| **Why** | Components are copied into `src/components/ui/` and owned outright, so a primitive can be extended (the `size="form"` variants, `FieldInfo`, `UploadDropzone`) without fighting a library. Base UI supplies the unstyled, accessible behaviour underneath. |
| **Industry substitute** | **MUI X** or **AG Grid**, commercial component suites with data grids, date pickers and enterprise support. |
| **Cost** | shadcn/Base UI: free (MIT). MUI X Pro: **$180/developer/year**. AG Grid Enterprise: **$999/developer/year**. |
| **Beats its two closest competitors** | vs **MUI**: a complete, supported suite with a real data grid. Worth buying the day speclr needs virtualised tables with column pinning and Excel export. It does not. vs **Radix + hand-rolled styles**: essentially what shadcn is, minus the copied starting point. Same result, more typing. |

### 4.2 Tailwind CSS v4

| | |
|---|---|
| **Why** | The document sheets are pixel-faithful artifacts; utility classes keep their layout adjacent to their markup, and `print.css` carries only what Tailwind cannot express (A4 sizing, page breaks, `print-color-adjust`). |
| **Substitute / cost** | Free (MIT). Alternatives are CSS Modules or vanilla-extract, both fine, neither worth a migration. **A note that matters:** class strings must be spelled out literally, never composed at runtime, or the JIT scanner purges them. |

### 4.3 Lucide, Motion, next-themes, `tw-animate-css`

| | |
|---|---|
| **Why** | Lucide is the icon set the design language is defined against. Motion drives the wizard's step transitions. `next-themes` handles dark mode without a flash. `tw-animate-css` supplies the keyframes shadcn expects. |
| **Substitute / cost** | All free (MIT/ISC). Paid icon sets (**Phosphor Pro ~$39 one-off**, **Font Awesome Pro $99/year**) buy more glyphs and weights; Lucide's ~1,600 icons have not run out. |
| **Note** | Most of speclr's motion is CSS, not Motion, including `CycleArrowIcon` and `animate-fill-flash`. Prefer that: it costs no bundle and no JS. |

---

## 5. Data, forms and validation

### 5.1 Drizzle ORM + drizzle-kit

| | |
|---|---|
| **Why** | SQL-shaped, so `SELECT … FOR UPDATE` for the atomic FY counter is written as itself rather than fought for through an abstraction. Types come from the schema. Migrations are checked-in SQL. |
| **Industry substitute** | **Prisma** (broader ecosystem, Prisma Studio, managed Accelerate/Pulse products). |
| **Cost** | Drizzle: free (Apache 2.0). Prisma ORM: free; **Accelerate from $29/month**. |
| **Beats its two closest competitors** | vs **Prisma**: better tooling and a friendlier client, but its query engine is a separate binary that has historically been awkward on serverless, and raw SQL escapes are second-class, which is a problem when the correctness-critical query *is* raw SQL. vs **Kysely**: a purer query builder with arguably better types, but no migration story of its own, and speclr wants migrations checked in beside the schema. |

### 5.2 Zod v4

| | |
|---|---|
| **Why** | One schema validates a JSONB payload on write and drives the form resolver, so the rule is written once and runs on both sides of the wire. `domain/fields.ts` and `domain/text.ts` depend on this. |
| **Substitute / cost** | Free (MIT). **Valibot** is smaller (bundle-size wins matter on the client) and **ArkType** is faster, but Zod has the `@hookform/resolvers` integration and the ecosystem, and revalidating ~ninety fields to save a few kB is not a trade worth making. |

### 5.3 react-hook-form + `@hookform/resolvers`

| | |
|---|---|
| **Why** | Uncontrolled by default, so a seven-step wizard with ninety fields does not re-render on every keystroke. |
| **Substitute / cost** | Free (MIT). **TanStack Form** is the strongly-typed challenger and the likely successor in a few years; **Formik** is the incumbent it replaced and is effectively in maintenance. Neither is worth moving to today. |

### 5.4 libphonenumber-js

| | |
|---|---|
| **Why** | Phone numbers print on invoices and offer letters. This is Google's libphonenumber metadata, which is the reference implementation for every country's numbering plan. |
| **Substitute / cost** | Free (MIT). The paid tier of this concern is **number *verification***: Twilio Lookup (**$0.008 per lookup**) or Vonage, which confirms a number is live and reachable. Buy it the day speclr sends an SMS or a WhatsApp document. Formatting is not verification, and today only formatting is claimed. |

### 5.5 react-day-picker

| | |
|---|---|
| **Why** | Backs `ui/date-picker.tsx`, which is the house answer for dates. A native `<input type="date">` is banned outside `ui/` and the ban is enforced by `design-system.test.ts`. |
| **Substitute / cost** | Free (MIT). **MUI X Date Pickers** (part of the $180/dev/year Pro licence) is the commercial substitute; it buys range pickers, time pickers and locale depth speclr has no use for. |

---

## 6. Testing and tooling

### 6.1 Jest + React Testing Library

| | |
|---|---|
| **Why** | The domain tests were lifted verbatim from the source project and must pass unchanged; they are Jest tests. RTL enforces testing by role, which keeps the accessibility floor honest. |
| **Industry substitute** | **Vitest** (faster, Vite-native) for unit tests; **Playwright** for the browser-level checks jsdom structurally cannot do. |
| **Cost** | All free (MIT/Apache). Playwright on CI is compute only. **Paid tier: Playwright + a visual-regression service. Chromatic from $149/month, Percy from $99/month.** |
| **Beats its two closest competitors** | Jest vs **Vitest**: Vitest is meaningfully faster and would be the choice for a new project, but the lifted domain tests are the reason this codebase exists in its current shape, and "must pass unchanged" is a hard constraint. Migrate only if the suite gets slow enough to hurt. |

**The real gap here is not the runner.** `CONTEXT.md` says it in four places:
**jsdom cannot validate print layout, pagination or clipping**, and the pay slip
shipped a clipping bug through a green suite. **Playwright is free and closes
exactly that gap**, and it is the highest-value unpaid upgrade on this entire list.

### 6.2 drizzle-kit, tsx, ts-node, dotenv

| | |
|---|---|
| **Why** | Migration generation and the scripts that run them. |
| **Substitute / cost** | All free. Nothing to evaluate. |

### 6.3 CI

| | |
|---|---|
| **Today** | **Nothing.** Tests run locally, on demand. |
| **Industry substitute** | **GitHub Actions**, running `npm test`, `tsc --noEmit` and the launch-readiness gate on every push. |
| **Cost** | **Free** for public repos; 2,000 minutes/month free on private, then $0.008/minute. This suite is ~30 seconds. |
| **Beats its two closest competitors** | vs **CircleCI / Buildkite**: both are better at complex build matrices and neither is needed for one Node job. vs **Vercel's build step alone**: it type-checks the build but does not run the test suite, so a green deploy today proves nothing about the 1,669 tests. |

**This is free, takes an afternoon, and the standard says "a task is not complete
until `npm test` passes."** Nothing currently enforces that but discipline.

---

## 7. What we deliberately do not use

Recorded so the absence reads as a decision rather than an oversight. Each is
argued in full in `PRINCIPLES.md` §4 or `CONTEXT.md`.

| Not used | Why not | What it would cost if we changed our mind |
|---|---|---|
| **Analytics** (PostHog, Plausible, GA) | One user, an internal tool, `noindex`. There is no funnel. | PostHog free to 1M events, **$0.00005/event** after. Plausible **$9/month**. |
| **A payroll engine** | EPF needs 20+ employees, ESI 10+ and gross ≤ ₹21,000, UP has no Professional Tax. The only live deduction is TDS. | RazorpayX Payroll **from ₹100/employee/month**; Keka/greytHR similar. |
| **E-invoicing (IRP/IRN)** | Mandatory above ₹5 crore turnover. Not applicable. | ClearTax / Masters India: **from ₹5,000/year**. |
| **A jurisdiction pack / second country** | `PRINCIPLES.md` §4. One interface, one implementation, and the interface is not built yet either. | Engineering time only. |
| **Multi-currency invoicing** | A GST document must show tax in INR. See `domain/currency.ts`. | See §1.5. |
| **A CDN or image service** | No public traffic and no images to optimise. | Cloudinary free tier; Vercel's own optimisation is included. |
| **Secret storage / a vault** | speclr stores *where a credential lives*, never the credential. If a field starts holding secrets, that is an incident. | Doppler **$8/user/month**, Infisical free tier, AWS Secrets Manager $0.40/secret/month. |

---

## 8. The upgrade order, if money appears

Ranked by what actually changes, not by price. The two free ones come first
because they close real gaps for nothing.

| # | Change | Cost/month | What it buys |
|---|---|---|---|
| 1 | **GitHub Actions CI** | £0 | The test suite actually gates a deploy. |
| 2 | **Playwright** | £0 | The print, pagination and clipping bugs jsdom is structurally blind to. |
| 3 | **Neon Launch** | $19 | 7-day point-in-time recovery on records the law says keep for 72 months. |
| 4 | **Sentry Team** | $26 | Knowing a Server Action failed before the operator tells you. |
| 5 | **Vercel Pro** | $20/user | Already required: Hobby excludes commercial use. |
| 6 | **GSTIN/PAN verification** (Surepass or similar) | ~₹1,000 | The only item here the free tier cannot in principle deliver: is this GSTIN live, and does it belong to this client? |
| 7 | **Google Geocoding** | ~$0 within credit | One postcode vendor instead of two, with an SLA and full coverage. |
| 8 | **Resend** | $20 | The day speclr delivers a document rather than printing it. |

**Items 1 and 2 are free and should not be waiting on a budget.**
