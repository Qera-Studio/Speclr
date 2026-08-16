# MATURITY: where speclr stands against industry practice

> A point-in-time, **measured** assessment. Every raw number here came from a
> command, not an impression, and §6 has the commands so the next reading is
> comparable to this one.
>
> **First reading: 17 August 2026.** Re-read it when something material changes
> (CI lands, the first real document is issued, a second developer appears), not
> on a schedule. A benchmark nobody acts on is a number that makes you feel
> something.
>
> Companion to [`vendors.md`](vendors.md), which asks what speclr *runs on*.
> This asks how well it is *built and operated*, which are two different
> questions with very different answers.

---

## 1. The finding, in one line

**An engine built to a high standard, in a shed, with no factory around it.**

Engineering craft scores about **8/10** against funded-product practice.
Operational maturity scores about **1.5/10**. The gap between those two numbers
is the honest summary of the project, and it is not a criticism: every item on
the operational side is **absent rather than badly built**, which means none of
it is debt. Operations only compound once other people depend on you, and today
nobody does.

---

## 2. Raw metrics (17 August 2026)

| Metric | Value |
|---|---|
| Source | **45,156 lines**, 282 files (tests excluded) |
| Tests | **21,800 lines**, 157 files, **1,679 tests**, 154 suites |
| Statement coverage | **77.3%** (6,342 / 8,202) |
| Branch coverage | **73.7%** (3,675 / 4,988) |
| Function coverage | **76.3%** (1,348 / 1,767) |
| Line coverage | **79.2%** (5,730 / 7,235) |
| Test-to-source, by line | 0.48 : 1 |
| Tests per KLOC | **37** |
| Documentation | **10,986 lines** (24% of source volume) |
| Migrations, checked in | 15 |
| Files asserting by ARIA role | 75 |
| Commits / distinct authors | 184 / **1** |

---

## 3. Against the industry

| Dimension | Benchmark | speclr | Read |
|---|---|---|---|
| Line coverage | Google's published bands: 60% acceptable, 75% commendable, 90% exemplary | **79.2%** | Commendable. Well above the 20-40% typical of funded early-stage products. |
| Tests per KLOC | 10-30 for code considered well tested | **37** | Top decile. Many small focused tests rather than a few large ones. |
| Test-to-code lines | 1:1 is the enterprise ideal; 0.3-0.5 the commercial median | **0.48** | Median by volume, well above it by test count. |
| Statement-to-branch gap | Under 5 points indicates conditionals are genuinely exercised | **3.6 points** | Tight. The tests are not only walking happy paths. |
| Docs-to-code | Most startups ship a README | **24%** | Unusual outside infrastructure projects. |

---

## 4. Scored

### 4.1 Engineering craft: ~8/10

| | Score | Basis |
|---|---:|---|
| Domain modelling | **9** | Snapshot pattern, atomic FY numbering, immutability at the persistence layer, `materialiseContent`. Structurally prevents a compliance bug most competitors ship (see `CONTEXT.md` §5, §5b). |
| Design system discipline | **9** | `design-system.test.ts` polices *which primitive was reached for*, not just colour. Rare in commercial code. |
| Documentation | **9** | `PRINCIPLES.md` enforced as law, with logged deviations. A practice most Series B companies do not have. |
| Data integrity | **8** | Migrations checked in, integer paise, partial unique indexes, FK-backed refusal to delete a referenced client. |
| Accessibility | **8** | Role-first assertions across 75 files, live regions, readonly-not-disabled reasoning documented. |
| Test quality | **7** | Strong density and coverage. Held back by the one blind spot that matters most here: **jsdom cannot see print, pagination or clipping**, and a clipping bug has already shipped through a green suite. |
| Security fundamentals | **6** | Authorization verified server-side on every action, Zod on every write, real response headers, private blobs, fail-closed allowlist. Held back by the gaps in §5. |

### 4.2 Operational maturity: ~1.5/10

| | Score | Basis |
|---|---:|---|
| CI/CD | **0** | No `.github/workflows`. Nothing runs the 1,679 tests except a human choosing to. |
| Observability | **1** | A `logger` and nothing downstream of it: no aggregation, alerting, tracing or error tracking. |
| Reliability engineering | **1** | No SLO, no error budget, no health endpoint, no load test, no DR drill. |
| Multi-tenancy | **0** | No tenant column on any table. `counters` is keyed `(doc_type, fy_code)` globally, so two tenants would share one invoice sequence. |
| Compliance posture | **0** | No SOC 2, no penetration test, no DPA, no sub-processor register. |
| Team process | **2** | **Bus factor: 1.** No second human reviewing a pull request. |

**None of these is technical debt.** Each is a thing that has not been built,
and most of them are correctly unbuilt at this stage.

---

## 5. The three worth closing before the first real document

Everything else on the operational list can wait for a second user. These
cannot, because they protect the founder's own use.

1. **CI running `npm test` and `tsc --noEmit`.** Free, an afternoon. Today a
   green suite is a claim, not a property the repository enforces. That
   distinction stops being philosophical the moment the output is an immutable
   legal document.
2. **Error tracking** (Sentry Team, $26/month). You want to learn a Server Action
   failed before you notice an invoice never saved.
3. **Rate limiting** on the auth surface and the two upstream proxies
   (`/api/pincode`, `/api/ifsc`). Both are session-gated, which is most of the
   protection, but an authenticated user can still walk a third party's quota.
   The Security checklist already asks for this.

---

## 6. How to reproduce these numbers

```bash
# Source and tests
find src -name "*.ts" -o -name "*.tsx" | grep -v __tests__ | xargs wc -l | tail -1
find src -path "*__tests__*" \( -name "*.ts" -o -name "*.tsx" \) | xargs wc -l | tail -1

# Coverage and test count
npx jest --coverage --coverageReporters=text-summary --silent

# Documentation volume
cat *.md docs/*.md dev/*.md | wc -l

# Operational markers (each of these returning nothing is the finding)
grep -ril "rateLimit\|ratelimit" src
grep -ril "auditLog\|audit_log" src
ls .github/workflows
```
