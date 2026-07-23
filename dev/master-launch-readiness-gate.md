# Launch Readiness Gate

> **READ THIS FIRST — what this is and isn't.**
> This is the **single go/no-go ritual you run before every production deploy.** It does not contain new rules — it **aggregates the non-negotiable floor items** already owned by the seven master docs into one pre-ship checklist, ordered by precedence, so the things that become *public incidents* can't be silently skipped. The detail and the *why* live in the source docs; this is the gate that confirms the floor is actually met.
>
> **The rule:** any unchecked floor item is a **NO-GO** — you either fix it before deploy, or you *consciously and explicitly* accept and document the risk (and "we'll do it later" is the one that breaks first). A gate only works if it can stop a ship.
>
> **Honest scope:** this catches the **catastrophic-omission class** — the missing auth check, the exposed key, the unhandled failure, the data-loss path. It is **not a quality guarantee** and not a substitute for the work the master docs drive *throughout* the build. It's the last line, not the only line. Passing the gate means "no known floor failure," not "flawless."
>
> **Status:** v1 — orchestration layer over the seven Qera master docs (verified against them June 2026). Not ranked in the 1–7 precedence order; it *spans* all of them. Living document — when a master doc's floor changes, update the matching line here.

---

## How to use

1. **Run before every production deploy** (and re-run after any significant change).
2. **Ordered by precedence** (Legal → Security → Accessibility → Backend → Performance → SEO → Design) — the same conflict order as the system. Each item names its **owning doc** for the full detail; this gate is the *confirmation*, not the *explanation*.
3. **Scope honestly.** A true throwaway prototype can defer the `[prod]`-tagged items — but the moment real users or real data are involved, the whole floor applies. Most disasters are "a prototype that quietly became production."
4. **Floor fail = NO-GO.** Fix, or document an explicitly accepted risk with an owner and a date.

---

## 1 — Legal floor *(owner: Legal & Compliance)*
- [ ] **Privacy policy live and accurate**, consent captured where required (cookies/marketing), cookie banner declines non-essential by default
- [ ] **Data-deletion & retention path exists** for personal data (the technical means to honour a deletion request)
- [ ] **Licensing clean** — fonts, assets, libraries, and any AI-generated assets are licensed for this use
- [ ] **No dark patterns** — no disguised ads, fake urgency, sneak-into-basket, or hard-to-cancel flows
- [ ] **Jurisdiction triggers checked** — anything market-specific live for this launch (see Legal master)

## 2 — Security floor *(owner: Security)* — the densest gate
- [ ] **Auth enforced server-side on every protected route/endpoint** — not in the UI only *(test: call it directly, logged out)* **(non-negotiable)**
- [ ] **Ownership verified on every data access** — `WHERE user_id = :authedUser`, no IDOR *(test: swap an ID → 403/404)* **(non-negotiable)**
- [ ] **Secrets out of code and git** (incl. history); privileged keys server-side only **(non-negotiable)**
- [ ] **RLS on + ownership policies** for every table (Supabase/Postgres) **(non-negotiable)**
- [ ] **All input validated & queries parameterised server-side** — SQL/NoSQL/command/SSTI/ReDoS guarded **(non-negotiable)**
- [ ] **HTTPS everywhere + security headers (CSP, HSTS, nosniff)**; no mixed content
- [ ] **No stack traces / debug info to clients**; debug mode off in prod
- [ ] **Rate limiting on auth + expensive endpoints**, anchored on identity (not IP alone)
- [ ] **Session invalidated server-side on logout** *(test: replay token after logout → rejected)*
- [ ] **Dependencies scanned**, no known criticals shipped

## 3 — Accessibility floor *(owner: Accessibility)*
- [ ] **Keyboard-operable end to end**, no keyboard trap *(test: unplug the mouse)* **(non-negotiable)**
- [ ] **Visible focus indicator** on every interactive element **(non-negotiable)**
- [ ] **Meaningful `alt` on meaningful images**; decorative marked empty
- [ ] **Every form input has a real, associated label**; errors announced **(non-negotiable)**
- [ ] **Text contrast ≥ AA** (4.5:1 body) **(non-negotiable)**
- [ ] **`prefers-reduced-motion` honoured** for significant motion
- [ ] **Page language set; content reflows at 400%/320px** without loss

## 4 — Backend & Data floor *(owner: Backend/Data/Code)*
- [ ] **Every failure path handled** — no happy-path-only code, no swallowed errors **(non-negotiable)**
- [ ] **Related writes wrapped in transactions**; idempotency on pay/create **(non-negotiable)**
- [ ] **DB constraints enforced** (FK, NOT NULL, UNIQUE); money/time types correct **(non-negotiable)**
- [ ] **Migrations versioned & tested on a copy** — never hand-edited in prod; env verified before running **(non-negotiable)**
- [ ] **Backups exist and a restore has been tested** *(don't assume — verify)* **(non-negotiable)**
- [ ] **Every line of AI-generated code read and understood** **(non-negotiable)**
- [ ] **Env separation** (dev/staging/prod, distinct creds); config validated on boot
- [ ] **Server is authoritative** for prices/permissions/balances (client never trusted)

## 5 — Performance floor *(owner: Performance)*
- [ ] **Pagination/limits on every list** — no unbounded queries or load-everything **(non-negotiable)**
- [ ] **No N+1 (reads) and no one-row-at-a-time (writes)** on hot paths
- [ ] **Indexes on hot queries**; connection pooling on (serverless)
- [ ] **Images optimised** (format/size/lazy) and **compression (Brotli/gzip) on** text/JSON
- [ ] **Core Web Vitals not in the red** on a real mid-tier mobile device *(test: throttled, real device)*

## 6 — SEO floor *(owner: SEO)* — for any public, indexable site
- [ ] **No accidental `noindex` / blocked `robots.txt`** shipping to prod *(the classic launch-killer)* **(non-negotiable for public sites)**
- [ ] **Titles & meta descriptions** present and unique on key pages
- [ ] **Canonical tags correct**; sitemap submitted; redirects (not broken links) for moved URLs
- [ ] **Crawlable content** — primary content not locked behind client-only rendering where it matters

## 7 — Design floor *(owner: Design & Brand)*
- [ ] **On-brand and consistent** across the shipped surfaces
- [ ] **Real states designed** — empty, loading, error, success (not just the happy path) **(non-negotiable)**
- [ ] **Responsive at every breakpoint** (not just desktop scaled down)
- [ ] **Build matches the design** (a fidelity pass was done)

---

## The adversarial test battery
> The highest-leverage manual checks — run these against the built thing, not the mockup. Most map to a floor item above.
- [ ] **Call your own API directly (Postman/curl)** — logged out, and as the wrong user → auth/ownership holds
- [ ] **Swap an ID** → another user's data is never returned (IDOR)
- [ ] **Replay a request/token after logout** → rejected
- [ ] **Feed the edges** — empty, null, zero, negative, huge, duplicate, malformed input
- [ ] **Fire a mutation twice fast** (double-submit) → one record, not two
- [ ] **Kill a multi-step write mid-operation** → data is consistent, not half-done
- [ ] **Unplug the mouse** → complete the core flow by keyboard
- [ ] **One screen-reader pass** on the critical flow → coherent and operable
- [ ] **Zoom to 400% / reduce motion** → usable and calm
- [ ] **Automated scan** — axe (a11y) + Lighthouse (perf/SEO) + secret scan → clean
- [ ] **Read every line of AI-generated code in the diff** → you can explain it

## Deploy mechanics floor *(owner: Backend §28)*
- [ ] **CI green** (lint + types + tests + security/perf gates) before deploy **(non-negotiable)**
- [ ] **Tested rollback path** — a bad deploy is a flip, not a fix-forward scramble **(non-negotiable)**
- [ ] **Backup taken before any destructive/migration deploy** **(non-negotiable)**
- [ ] **Post-deploy smoke test** of critical paths + watch error rate/latency for the first minutes

---

## The Go / No-Go decision
- **GO** — every floor item checked, the test battery passes, deploy mechanics ready.
- **NO-GO** — any unchecked floor item. Either fix it, or record an **explicitly accepted risk**: what it is, why it's acceptable for this launch, the owner, and the date it'll be resolved. An undocumented "we'll do it later" is not an accepted risk — it's the thing that breaks first.

> **Remember the honest scope:** a green gate means *no known floor failure*, not *flawless*. The depth lives in the seven master docs, applied throughout the build — this gate just makes sure none of the catastrophic ones slipped through on the way out the door.
