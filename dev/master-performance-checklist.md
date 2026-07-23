# Master Performance Checklist

> **Purpose:** Universal performance standard for every project and website Qera ships. The single source of truth for building the fastest, smoothest, most efficiently-delivered web experiences — from a brochure site to an enterprise-scale application. Checking every item at the project's tier produces work that clears the bar most agency builds never reach. It is a **comprehensive, maintained standard and a decision framework — not a guarantee of a perfect Lighthouse score.** Lab scores are a proxy; **field data (real users at the 75th percentile) is the truth.** The goal is a site that *feels* instant on a mid-range phone on a mediocre network — not a green number on a fast laptop.
>
> **Status:** v1.1 — synthesized from Core Web Vitals / web.dev guidance, Chrome performance engineering practice, Next.js/Vercel delivery patterns, and multi-domain optimization experience. Third document in the Qera master system (after Security and SEO/AEO/GEO). **v1.1 (checklist-review rev): §9 +batch-writes (write-side of N+1); +over-indexing write-cost nuance.** Living document — review quarterly.
>
> **Living document** — targets, APIs, and tooling move. CWV thresholds, framework rendering features, and the tooling landscape below all date. Verify the freshest platform-specific numbers at use time and review quarterly (see Maintenance → Quarterly).

---

## Master-Doc Precedence Protocol (replicated)

> The **canonical** copy of this protocol — including the worked overlap-resolution examples — lives in the **Master Security Checklist**. Pasted here verbatim per Rule 1 so this doc is self-sufficient; refer to Security for the worked examples.

### Precedence order (highest wins on irreconcilable conflict)

1. **Legal & Compliance**
2. **Security**
3. **Accessibility**
4. **Data integrity / Backend correctness**
5. **Performance** ← *this document*
6. **SEO / AEO / GEO**
7. **Design & Brand preference**

### The three rules

1. **Ownership, not repetition.** Each concern's items live in their own master doc; every other doc cross-references, never restates.
2. **Resolve before you rank.** Most conflicts dissolve with the right modern technique; only when genuinely irreconcilable does the higher-ranked doc win.
3. **Floor is never traded.** A `[Floor]` item in a higher-ranked doc is never overridden by a lower-ranked concern. For Performance specifically: **you never trade away an Accessibility or Security requirement to gain speed.**

### What this means for Performance in practice

- **Performance is below Accessibility (3rd).** `prefers-reduced-motion` is honored even when it disables a signature animation. Focus indicators, alt text, zoom, and keyboard operability are never stripped for bytes or frames. When the Animation section (§11) and accessibility collide, **accessibility wins — it is not a performance decision to make.**
- **Performance is below Security (2nd).** TLS configuration and origin-hiding stay Security-owned (Security §8/§16); Performance owns only the *speed* dimensions of delivery (cache, compression, protocol negotiation). The CSP-vs-inline-critical-CSS conflict is resolved via nonce/hash-based CSP (see Security's worked examples).
- **Performance is below Backend correctness (4th).** Fast wrong data loses to correct slow data. Performance owns query and response *speed*; the future Backend master will own correctness, integrity, and transactional guarantees. Speed optimizations (caching, denormalization for reads) must never compromise correctness.
- **Performance is ABOVE SEO (6th) and Design (7th).** Performance therefore **owns** the technical items that previously lived in the SEO doc — Core Web Vitals *implementation*, third-party-script management, resource hints (preload/preconnect), image format/sizing/lazy-load, and JS rendering cost. The SEO doc retains only the *ranking-signal framing and GSC field-data monitoring* of these; its technical copies should become pointers on its next revision. (Noted for SEO maintenance — not yet edited.)

---

## How performance tiering works — read this first

Tiering mirrors the SEO doc so the two can be scoped together for a client (they're usually sold as one engagement). Performance is mostly **additive** — higher tiers add depth and polish — but unlike pure SEO it has a **non-negotiable floor inside Base**: a handful of failures (a multi-megabyte hero image, render-blocking everything, no compression) tank the entire experience regardless of how good the rest is. Those are marked **(non-negotiable)** and apply to every project at any budget.

> **Tier tags (on every item):**
> - `[Base]` — required for any client at any budget; the site is broken-slow without these · typically **bundled into build cost** · items marked **(non-negotiable)** are the floor that applies even to the cheapest project
> - `[Standard]` — meaningful speed/smoothness uplift; mid-tier engagements · **₹40,000 – ₹1,00,000** band, or "Performance Hardening" add-on
> - `[Premium]` — advanced, measurement-driven, or craft-heavy (RUM, load testing, WebGL/animation optimization); top-tier clients · **₹1,00,000+** or a dedicated "Performance Audit & Optimization" engagement
> *(Performance work is often bundled into the build rather than sold standalone like SEO. Hours assume a clean Next.js codebase; animation/WebGL Premium work and load-testing engagements add significantly.)*

> **Verify:** Performance is the most measurable of the three concerns, so almost every item carries a **Verify:** note with a concrete proof — a Lighthouse score, a WebPageTest waterfall, a bundle-analyzer number, a RUM percentile. **An item is not "done" until its number is confirmed.** Tooling is consolidated in Notes → Verification Toolbox.

> **Stack addendums** (layered on top of the universal checklist):
> - `[NextJS/Vercel]` — custom Next.js builds on Vercel
> - `[Supabase]` — Supabase backend (query and connection performance)
> - `[Managed]` — Framer / Webflow / Wix; the platform owns delivery, your levers shift to assets, embeds, and restraint
> - `[Animation/WebGL]` — sites with significant motion, scroll-driven animation, SVG/Canvas/WebGL — Qera's craft area

> **How to use this for a new project:**
> 1. **Baseline first (§0)** — measure the current state and set explicit budgets before optimizing. You cannot improve what you didn't measure, and you cannot defend an improvement without a before/after.
> 2. **Field data over lab data** — optimize for CrUX/RUM 75th-percentile real-user metrics; use Lighthouse as a fast proxy, not the goal.
> 3. **Base (incl. non-negotiables) is automatic** — every Base item applies; audit whether it passes, not whether to do it.
> 4. **Tier up by ambition and budget** — Standard and Premium add depth; map them to the engagement.
> 5. **Verify every item** — confirm the number. "Feels fast on my machine" is how slow sites ship.
> 6. **Apply the stack addendum(s)** — and `[Animation/WebGL]` whenever the build has real motion.
> 7. **Gate regressions in CI** — the measurable items should fail the build automatically (Lighthouse CI, bundle budgets), not rely on memory.

---

## 0 — Performance Budget & Baseline

> Run before optimizing. A performance budget is a contract: explicit ceilings that, if exceeded, fail the build. Without it, "performance" is a vibe and every new feature quietly erodes speed.

- [ ] **Baseline captured** — current LCP, INP, CLS, TTFB, total page weight, and JS bundle size recorded *before* any work, on both field (if the site is live) and lab. This is the before/after that proves value. *(Verify: PageSpeed Insights + WebPageTest run saved.)* `[Base]`
- [ ] **Performance budget defined and documented** — explicit ceilings: e.g. LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, total JS ≤ a set KB, total page weight ≤ a set KB, image weight cap. The budget is project-specific but must exist. `[Standard]`
- [ ] **Target device & network defined** — optimize for a realistic mid-range Android on 4G, not a flagship on wifi; the median real user is far slower than the dev machine. State the target. `[Standard]`
- [ ] **Critical user journeys identified** — the 2–3 paths that matter (landing → CTA, product → checkout); performance work prioritizes these over rarely-seen pages. `[Standard]`
- [ ] **Budget enforced in CI** — Lighthouse CI and/or bundle-size budgets fail the build on regression, so the budget is mechanical, not aspirational. *(Verify: a deliberately oversized commit fails the pipeline.)* `[Premium]`

---

## 1 — Core Web Vitals & Field Targets

> The metrics everything else serves. Targets are **75th-percentile field values** (what 75% of real users experience), not lab. *Performance owns the implementation and measurement; SEO owns CWV-as-a-ranking-signal and GSC field monitoring — cross-ref SEO doc.*

- [ ] **LCP (Largest Contentful Paint) ≤ 2.5s** — time to the largest above-fold element (usually the hero image or heading). The headline loading metric. *(Verify: PSI field data; lab LCP in Lighthouse.)* `[Base]` **(non-negotiable: LCP > 4s is a broken experience)**
- [ ] **INP (Interaction to Next Paint) ≤ 200ms** — responsiveness to taps/clicks/keypresses across the whole visit; replaced FID in March 2024. Driven by main-thread work and long tasks. *(Verify: PSI field data; lab via DevTools Performance under interaction.)* `[Base]`
- [ ] **CLS (Cumulative Layout Shift) ≤ 0.1** — visual stability; no content jumping as the page loads. *(Verify: PSI field data; Lighthouse + DevTools layout-shift regions.)* `[Base]` **(non-negotiable: jumpy layout is felt by every user)**
- [ ] **TTFB (Time to First Byte) ≤ 800ms** — server/network responsiveness; a slow TTFB caps every downstream metric. Driven by §6 rendering strategy, §7 delivery, §9 backend. *(Verify: WebPageTest / DevTools.)* `[Standard]`
- [ ] **FCP (First Contentful Paint) ≤ 1.8s** — first pixels of content; early feedback that something is happening. *(Verify: Lighthouse / PSI.)* `[Standard]`
- [ ] **CWV measured in the field, not just lab** — CrUX / RUM data reflects real users; lab data (Lighthouse) is a controlled proxy that can diverge significantly. Optimize for field. *(Verify: CrUX via PSI or Vercel Speed Insights.)* `[Standard]`
- [ ] **All three CWV pass on mobile specifically** — mobile is the harder and more common case; passing desktop while failing mobile is failing. `[Base]`

---

## 2 — Images & Media

> Images are the largest payload on most pages and the most common LCP element. *Performance owns format, compression, sizing, priority, and lazy-loading; SEO owns alt text, filenames, and image sitemaps — cross-ref SEO doc.*

- [ ] **No oversized or uncompressed images** — every image compressed and sized to its actual display dimensions; a 4000px image in a 400px slot is the single most common performance disaster. *(Verify: DevTools shows no image far larger than its rendered size.)* `[Base]` **(non-negotiable)**
- [ ] **Next-gen formats served** — AVIF first, WebP fallback, original as last resort; 30–50% smaller than JPEG/PNG at equal quality. *(Verify: response Content-Type is image/avif or image/webp.)* `[Base]`
- [ ] **Explicit `width` and `height` (or aspect-ratio) on every image** — reserves space and prevents CLS; the top cause of layout shift. *(Verify: CLS ≈ 0 with images loading on slow network.)* `[Base]` **(non-negotiable)**
- [ ] **Responsive images** — `srcset` + `sizes` serve the right resolution per viewport/DPR; mobile users don't download desktop-sized images. `[Standard]`
- [ ] **LCP image prioritized** — `fetchpriority="high"` and preloaded; never lazy-loaded. Lazy-loading the LCP image is a frequent self-inflicted LCP failure. *(Verify: LCP image is not deferred in the waterfall.)* `[Base]`
- [ ] **Below-the-fold images lazy-loaded** — `loading="lazy"` so off-screen images don't compete for initial bandwidth. `[Base]`
- [ ] **Image CDN / optimization pipeline** — Next/Image, Vercel Image Optimization, Cloudflare Images, or Cloudinary/imgix for transform-on-the-fly, auto-format, and responsive variants. (See Consultant Layer for when a dedicated image CDN is worth it.) `[Standard]`
- [ ] **Decorative images use CSS, SVG, or are inlined** — small icons/logos as inline SVG or sprite, not individual raster requests. `[Standard]`
- [ ] **Video optimized** — compressed, adaptive streaming (HLS/DASH) for long video, `preload="none"` or poster for autoplay-on-interaction; never autoplay a heavy video on load. Consider Mux/Cloudflare Stream for real video. `[Standard]`
- [ ] **No CLS from media** — embeds, iframes, and ads have reserved space. `[Standard]`

---

## 3 — Fonts

> Web fonts are a common cause of both slow text rendering (FOIT) and layout shift. The goal: text visible immediately, no shift when the custom font swaps in.

- [ ] **Fonts self-hosted** — serve from your own origin/CDN, not a third-party (e.g. Google Fonts CSS) that adds a render-blocking cross-origin request. Self-hosting also avoids a third-party data/privacy dependency. `[Standard]`
- [ ] **WOFF2 format** — the smallest, universally supported modern format. `[Base]`
- [ ] **`font-display: swap`** (or `optional`) — text renders immediately in a fallback, swapping to the custom font when ready; prevents invisible text. *(Verify: text visible during font load on slow network.)* `[Base]`
- [ ] **Critical fonts preloaded** — `<link rel="preload" as="font" crossorigin>` for above-the-fold fonts so they fetch early. `[Standard]`
- [ ] **Font subsetting** — strip unused glyphs/scripts; a Latin-only subset is a fraction of the full file. For multilingual (e.g. Arabic for UAE work) subset per language. `[Standard]`
- [ ] **Fallback font metrics matched** — `size-adjust`, `ascent-override`, etc. (or Next.js `next/font` automatic fallback) so the swap from fallback to web font doesn't shift layout (CLS). `[Premium]`
- [ ] **Variable fonts where multiple weights are used** — one variable file replaces many static weight files. `[Standard]`
- [ ] **Limit font families and weights** — each weight is a request and payload; justify every one. `[Base]`

---

## 4 — CSS

- [ ] **Critical CSS inlined / above-the-fold styles not render-blocking** — the styles needed for first paint are available immediately; the rest deferred. (Frameworks/Next.js handle much of this — verify.) `[Standard]`
- [ ] **Unused CSS removed** — Tailwind JIT, PurgeCSS, or equivalent; ship only the classes actually used. *(Verify: coverage tab in DevTools shows low unused CSS.)* `[Standard]`
- [ ] **CSS minified** — whitespace/comments stripped in production build. *(Verify: production CSS is minified.)* `[Base]`
- [ ] **No `@import` in CSS** — `@import` chains are render-blocking and serial; use bundler imports or `<link>`. `[Base]`
- [ ] **`content-visibility: auto` on long off-screen sections** — skips rendering work for content not yet visible; large win on long pages. `[Premium]`
- [ ] **CSS containment (`contain`)** on independent components — limits layout/paint scope, reducing recalculation cost. `[Premium]`
- [ ] **Avoid expensive selectors and deep nesting at scale** — minor for most sites, matters on very large DOMs. `[Premium]`
- [ ] **No layout-triggering CSS in animations** — see §11; animate `transform`/`opacity` only. `[Standard]`

---

## 5 — JavaScript

> JS is the most expensive resource byte-for-byte — it must be downloaded, parsed, compiled, and executed, and it blocks the main thread (hurting INP). The cheapest JS is the JS you don't ship.

- [ ] **JS bundle within budget** — initial JS kept to the budget set in §0; every dependency justified against its cost. *(Verify: @next/bundle-analyzer / bundle size report.)* `[Standard]`
- [ ] **Code splitting** — route- and component-level; users download only the JS for what they're viewing, via dynamic `import()`. `[Standard]`
- [ ] **Tree-shaking effective** — import only what's used (`import { x } from 'lib'`, not the whole lib); confirm the bundler is eliminating dead code. `[Standard]`
- [ ] **Non-critical scripts `defer`/`async`** — nothing render-blocking in `<head>` without reason. `[Base]`
- [ ] **Heavy dependencies audited before adding** — check Bundlephobia; a date library or icon set can dwarf your app code. Prefer native APIs and lighter alternatives. `[Standard]`
- [ ] **Long tasks broken up** — no main-thread task > 50ms; chunk work, `requestIdleCallback`, or move to a Web Worker; long tasks directly damage INP. *(Verify: DevTools Performance shows no long-task pileup under interaction.)* `[Premium]`
- [ ] **Web Workers for heavy computation** — parsing, physics, image processing off the main thread (relevant to §11's physics sim). `[Premium]`
- [ ] **Event handlers debounced/throttled** — scroll, resize, input handlers don't fire unthrottled; a common INP killer. `[Standard]`
- [ ] **Minimal hydration cost** — see §6; prefer server-rendered/zero-JS components (RSC) and hydrate only what's interactive. `[Standard]`
- [ ] **No `document.write`, no synchronous XHR** — both block parsing/rendering. `[Base]`
- [ ] **Polyfills only for browsers you support** — don't ship legacy polyfills to modern browsers; use modern output. `[Standard]`

---

## 6 — Rendering Strategy

> The biggest TTFB/LCP lever is *where and when* HTML is generated. There is no single right answer — it's a per-route decision. This section is a framework, not a prescription.

- [ ] **Rendering mode chosen per route, deliberately** — static (SSG) for unchanging pages, ISR for semi-dynamic, SSR for per-request/personalized, client-only for app shells behind auth. Document the choice. `[Standard]`
- [ ] **Static generation (SSG) for everything that can be static** — marketing pages, blog, docs; served from CDN edge, near-instant TTFB. `[Standard]`
- [ ] **ISR / on-demand revalidation for semi-dynamic content** — static speed with periodic freshness; avoids per-request server cost. `[Standard]`
- [ ] **Server Components (RSC) for non-interactive UI** — render on the server, ship zero JS for those parts; only `'use client'` where browser interactivity is genuinely needed. *(Verify: client bundle excludes server-only component code.)* `[Standard]`
- [ ] **Streaming SSR / Suspense** — stream HTML so the shell paints while slow data resolves; don't block the whole page on the slowest query. `[Premium]`
- [ ] **Edge rendering for global audiences** — render at the edge near the user for low TTFB worldwide (ties to §7 and Consultant Layer edge compute). `[Premium]`
- [ ] **Above-the-fold content server-rendered** — first meaningful paint doesn't wait on client JS. (Also an SEO crawlability concern — cross-ref SEO doc; **Performance owns the cost dimension, SEO owns the crawlability dimension**.) `[Base]`
- [ ] **Avoid waterfalls in data fetching** — parallelize independent fetches; don't chain requests that could run concurrently. `[Standard]`

---

## 7 — Network & Delivery

> *Performance owns cache strategy, compression, protocol, and resource hints. Security owns TLS configuration and origin-hiding (Security §8/§16) — cross-ref, don't restate.*

- [ ] **Served via CDN** — static assets and (where possible) HTML from edge PoPs near users; the foundational delivery decision. (Vercel/Cloudflare provide this.) `[Base]` **(non-negotiable for any non-trivial site)**
- [ ] **Compression enabled** — Brotli (preferred) or gzip on all text assets (HTML/CSS/JS/JSON/SVG). *(Verify: response Content-Encoding: br.)* `[Base]` **(non-negotiable)**
- [ ] **HTTP/2 or HTTP/3 (QUIC)** — multiplexing eliminates head-of-line blocking; HTTP/3 improves on lossy/mobile networks. (Platform-provided — confirm active.) `[Standard]`
- [ ] **`preconnect` to critical third-party origins** — establish the connection (DNS+TCP+TLS) early for origins on the critical path (e.g. an image CDN). `[Standard]`
- [ ] **`dns-prefetch` for non-critical third-party origins** — cheaper hint for less-critical domains. `[Standard]`
- [ ] **`preload` critical assets** — LCP image, critical font, critical CSS; fetch before the parser discovers them. `[Standard]`
- [ ] **`prefetch` likely next navigation** — Next.js `<Link>` prefetches in-viewport routes; near-instant subsequent navigation. `[Standard]`
- [ ] **103 Early Hints** where supported — lets the browser preconnect/preload while the server prepares the response. `[Premium]`
- [ ] **Minimize redirects** — each redirect is a full round trip; cross-ref SEO doc (redirect chains). `[Base]`

---

## 8 — Caching Architecture

> Caching is the highest-leverage performance lever: the fastest response is one you never recompute. Layer caches deliberately.

- [ ] **Hashed static assets cached immutably** — `Cache-Control: public, max-age=31536000, immutable` for fingerprinted JS/CSS/images; they never change (the hash changes instead). *(Verify: response headers on a hashed asset.)* `[Base]`
- [ ] **HTML cached appropriately** — static/ISR HTML cached at the CDN with sensible revalidation; never cache personalized HTML publicly. `[Standard]`
- [ ] **`stale-while-revalidate`** — serve cached content instantly while refreshing in the background; best-of-both for semi-dynamic content. `[Standard]`
- [ ] **Data-layer caching** — expensive/repeated queries cached (in-memory, Redis/Upstash, or framework data cache); see §9 and Consultant Layer. `[Premium]`
- [ ] **Client-side data caching** — React Query / SWR to dedupe and cache fetches, avoid refetching unchanged data. `[Standard]`
- [ ] **Cache invalidation strategy defined** — how cached content is purged/revalidated on change; a cache with no invalidation plan serves stale data (ties to Backend correctness — correctness outranks the speed gain). `[Premium]`
- [ ] **Service worker caching considered carefully** — powerful for repeat visits/offline, but a misconfigured SW serves stale assets indefinitely; only with a clear update strategy. `[Premium]`

---

## 9 — Backend & Server Speed

> *Performance owns the speed dimension; the future Backend master owns correctness, integrity, and transactional guarantees. Never trade correctness for speed — Backend ranks above Performance.*

- [ ] **TTFB within target** — server responds quickly; slow TTFB caps every downstream metric. Driven by the items below. *(Verify: WebPageTest TTFB by region.)* `[Standard]`
- [ ] **No N+1 queries** — fetch related data in batched/joined queries, not in a loop; the most common backend slowdown. (Correctness co-owned by Backend doc.) *(Verify: query log shows no per-row query loops.)* `[Standard]`
- [ ] **Batch writes — don't insert/update one row at a time** — the write-side of N+1: looping individual `INSERT`/`UPDATE` statements adds a full round-trip of overhead per row. Use bulk insert / multi-row writes / `COPY` for sets of rows. Invisible at one user, molasses at a thousand. *(Verify: bulk operations issue one statement, not N.)* `[Standard]`
- [ ] **Database indexes on queried columns** — unindexed lookups scan the whole table; index what you filter/sort/join on. **But don't index everything — every index slows writes and costs disk/memory, so target the hot queries and revisit with `EXPLAIN` rather than blanket-indexing.** *(Verify: `EXPLAIN` shows index use, not seq scan.)* `[Standard]`
- [ ] **Connection pooling** — reuse DB connections (Supavisor/PgBouncer); serverless without pooling exhausts connections under load. `[Standard]`
- [ ] **Slow third-party API calls don't block response** — parallelize, cache, or defer; never let a slow external call serialize the whole render. `[Standard]`
- [ ] **Response payloads lean** — return only needed fields; don't over-fetch and filter client-side (also a Security concern — cross-ref Security §9). `[Standard]`
- [ ] **Pagination on large collections** — never return thousands of rows in one response. `[Base]`
- [ ] **Read replicas / edge data for read-heavy scale** — see Consultant Layer; only when reads are the bottleneck. `[Premium]`
- [ ] **Heavy work moved to background jobs/queues** — don't do slow processing in the request path; queue it. `[Premium]`

---

## 10 — Third-Party Scripts

> The most common source of performance regressions you don't control. Each third-party script is a DNS lookup, a connection, a download, parse/execute cost, and a main-thread tax — often loaded from a slow origin. *Performance owns this fully; SEO/Marketing requests for scripts are subordinate (rank 6/7).*

- [ ] **Every third-party script inventoried and justified** — list each (analytics, chat, pixels, embeds); each must earn its cost. *(Verify: WebPageTest "third-party" breakdown.)* `[Standard]`
- [ ] **Facade pattern for heavy embeds** — chat widgets, video players, maps load a lightweight placeholder and only fetch the real embed on interaction; eliminates their load-time and INP cost. `[Standard]`
- [ ] **Third-party scripts deferred / loaded after interactive** — never render-blocking in `<head>`; load post-hydration or on idle. `[Base]`
- [ ] **Tag manager audited** — remove unused tags; GTM can silently accumulate expensive tags. `[Standard]`
- [ ] **Consider Partytown / Web Worker offloading** — move analytics and non-UI third-party scripts off the main thread. `[Premium]`
- [ ] **Self-host where feasible** — some analytics/scripts can be proxied/self-hosted to remove a third-party connection. `[Premium]`
- [ ] **SRI on third-party scripts** — integrity hash (cross-ref Security §12 supply chain). `[Standard]`
- [ ] **Consent-gated scripts don't block** — marketing/tracking scripts load after consent and never on the critical path (cross-ref Security/privacy). `[Standard]`

---

## 11 — Animation & Interaction Performance

> **Qera's craft area.** Smooth motion is a competitive differentiator — and the easiest place to wreck performance and accessibility. The rule beneath every item: **stay on the compositor, off the main thread, and always provide a reduced-motion path.** Targets: 60fps = 16.6ms/frame budget; 120fps = 8.3ms.
>
> **Accessibility hard-requirement (ranks above Performance):** `prefers-reduced-motion: reduce` must disable or substantially reduce non-essential motion, with a static or minimal fallback. This is not optional and not a performance trade-off — it is owned by Accessibility and Performance cannot override it.

### Core animation rules

- [ ] **Animate only `transform` and `opacity`** — these are GPU-composited and skip layout/paint. Never animate `width`, `height`, `top`, `left`, `margin`, etc. — they trigger layout on every frame (jank). *(Verify: DevTools Performance shows no layout/paint during the animation.)* `[Base]` **(non-negotiable for any animation)**
- [ ] **No layout thrash** — batch DOM reads then writes; never interleave reading layout (`offsetHeight`) and writing styles in a loop. Use `requestAnimationFrame`. `[Standard]`
- [ ] **`will-change` used surgically and removed after** — promotes an element to its own layer for a known-upcoming animation; overuse creates excessive layers and memory pressure, *hurting* performance. Apply just-in-time, remove on completion. `[Standard]`
- [ ] **`prefers-reduced-motion` fallback for every non-essential animation** — static or minimal alternative. *(Verify: enable Reduce Motion in OS — animations stop/simplify.)* `[Base]` **(non-negotiable — accessibility-owned)**
- [ ] **Animations don't block interaction (INP)** — heavy animation work doesn't monopolize the main thread when the user is trying to interact. `[Standard]`
- [ ] **60fps verified on a mid-range device** — not just the dev machine; throttle CPU 4–6× and watch the FPS meter. *(Verify: DevTools Rendering → FPS meter under CPU throttle.)* `[Premium]`

### GSAP / scroll-driven (your stack)

- [ ] **Tweens/triggers cleaned up on unmount** — `gsap.context()` + `ctx.revert()` in React, or `ScrollTrigger.kill()`; orphaned triggers leak memory and stack listeners. `[Standard]`
- [ ] **ScrollTrigger uses `scrub` and batching sensibly** — avoid heavy per-frame main-thread work during scroll; debounce `refresh()` on resize; `markers` in dev only. `[Premium]`
- [ ] **Pinning used sparingly** — pinned sections force layout work; verify they don't cause jank or CLS. `[Premium]`
- [ ] **Smooth-scroll libraries (Lenis etc.) tested on mobile** — they can hurt scroll/INP on low-end devices and conflict with native scrolling; respect reduced-motion. `[Premium]`

### SVG animation (your trade-route map)

- [ ] **Animate SVG via `transform`/`opacity`, not geometry attributes** — animating `x`/`y`/`d`/`r` triggers layout/paint per frame; transform stays on the compositor. `[Standard]`
- [ ] **SVG DOM kept lean** — simplify paths, reduce node count; a huge SVG DOM is expensive to animate. Optimize with SVGO. *(Verify: node count reasonable; paths simplified.)* `[Standard]`
- [ ] **`stroke-dashoffset` route-draw animations profiled** — visually ideal for animated trade routes but can be paint-heavy with many/long paths; profile, and if it janks, move to Canvas. `[Premium]`
- [ ] **Many animated elements → consider Canvas over SVG DOM** — beyond a few dozen simultaneously-animating nodes, Canvas (or WebGL) outperforms the SVG DOM. For a world map with many concurrent routes, evaluate Canvas. `[Premium]`
- [ ] **Avoid SMIL (`<animate>`)** — inconsistent support and being phased out; use CSS, Web Animations API, or JS (GSAP). `[Standard]`

### Canvas / WebGL / physics (your elastic-band sim, Three.js path)

- [ ] **`requestAnimationFrame` drives the render loop** — never `setInterval`; rAF syncs to the display and pauses in background tabs. `[Base]`
- [ ] **Render loop pauses when offscreen** — `IntersectionObserver` stops rAF when the canvas isn't visible; a hidden canvas burning CPU/GPU is pure waste and battery drain. *(Verify: loop stops when scrolled away.)* `[Standard]`
- [ ] **Device pixel ratio capped** — rendering a canvas/WebGL scene at full DPR (2–3×) on mobile is a major GPU cost; cap at ~2 and test. `[Premium]`
- [ ] **Physics decoupled from render** — run the simulation at a fixed timestep, interpolate for display; consider a Web Worker so the sim doesn't block the main thread (your elastic-band sim). `[Premium]`
- [ ] **Frame rate throttled to need** — not every visualization needs 60fps; cap where it's imperceptible to save battery/CPU. `[Premium]`
- [ ] **(WebGL/Three.js) draw calls minimized** — merge geometries, use instancing for repeated objects; draw calls are the usual bottleneck. *(Verify: spector.js / stats.js draw-call count.)* `[Premium]`
- [ ] **(WebGL/Three.js) GPU resources disposed** — `dispose()` geometries, materials, textures on teardown; undisposed resources are GPU memory leaks that crash mobile tabs. `[Premium]`
- [ ] **(WebGL/Three.js) textures sized and compressed** — power-of-two where needed, compressed formats (KTX2/Basis), no 4K textures for small elements. `[Premium]`
- [ ] **Graceful degradation on low-end / no-WebGL** — feature-detect; provide a static image or reduced version when WebGL is unavailable or the device is weak. `[Premium]`

---

## 12 — Mobile & Low-End Devices

> The median real user is on a device several times slower than a developer's machine, on a worse network. "Fast on my laptop" is not a measurement.

- [ ] **Tested under CPU throttling** — 4–6× slowdown in DevTools; reveals the main-thread cost real users feel. *(Verify: DevTools Performance with CPU throttle.)* `[Standard]`
- [ ] **Tested under network throttling** — Slow 4G profile; reveals payload and waterfall problems. `[Standard]`
- [ ] **Tested on a real low-end device** — an actual mid/low-range Android, not just emulation; the truth that throttling approximates. `[Premium]`
- [ ] **Touch interactions responsive (INP on mobile)** — no input delay on tap; mobile main-thread budget is tighter. `[Standard]`
- [ ] **Tap targets and viewport correct** — (also Accessibility/SEO — cross-ref); 48×48px targets, responsive viewport without disabling zoom. `[Base]`
- [ ] **Reduced motion and data honored** — `prefers-reduced-motion` and (where relevant) `Save-Data` respected. `[Standard]`

---

## 13 — Build & Bundle

- [ ] **Production build minified** — JS and CSS minified and compressed; no dev build in production. *(Verify: production assets are minified.)* `[Base]` **(non-negotiable)**
- [ ] **Modern JS output** — target modern browsers; don't ship ES5 + heavy transpilation to browsers that don't need it. `[Standard]`
- [ ] **Bundle analyzed** — `@next/bundle-analyzer` / webpack-bundle-analyzer run; the largest contributors known and justified. *(Verify: bundle report reviewed.)* `[Standard]`
- [ ] **Dead code eliminated** — tree-shaking confirmed; no large unused modules in the bundle. `[Standard]`
- [ ] **Bundle-size budget gate in CI** — Bundlewatch / size-limit fails the build when the bundle grows past budget; stops silent bloat. *(Verify: oversized commit fails CI.)* `[Premium]`
- [ ] **Source maps not served publicly in production** — generate for error tracking but restrict access (cross-ref Security §15). `[Standard]`
- [ ] **Assets fingerprinted/hashed** — enables immutable caching (§8) and safe cache-busting on change. `[Base]`
- [ ] **Compression done at build/deploy** — pre-compressed Brotli assets where the platform supports it. `[Standard]`

---

## 14 — Monitoring & Measurement

> You can't manage what you don't measure, and lab numbers drift from reality. Combine field (real users) with synthetic (controlled) and gate regressions automatically.

- [ ] **RUM (Real User Monitoring) active** — Vercel Speed Insights, Cloudflare Web Analytics, or SpeedCurve/Calibre/Datadog at scale; tracks field CWV at the 75th percentile. *(Verify: RUM dashboard receiving data.)* `[Standard]`
- [ ] **Synthetic monitoring** — scheduled Lighthouse / WebPageTest / DebugBear runs on key pages catch regressions before users do. `[Premium]`
- [ ] **Lighthouse CI in the pipeline** — runs on every deploy/PR with budget assertions that fail the build on regression. This is the mechanical enforcement layer. *(Verify: a regression fails CI.)* `[Premium]`
- [ ] **CWV tracked over time** — trend, not snapshot; a slow creep is the common failure mode. `[Standard]`
- [ ] **Performance regression alerting** — a notification when a metric crosses budget, not a quarterly surprise. `[Premium]`
- [ ] **Error/perf APM for backend** — Sentry (errors + performance) at small scale; Datadog/New Relic at enterprise; surfaces slow endpoints. `[Premium]`
- [ ] **Field CWV cross-checked in Search Console** — Google's CrUX view (this is the SEO-owned monitoring surface — cross-ref SEO doc). `[Standard]`

---

## 15 — Scalability & Load

> Fast at low traffic is table stakes; the question is whether it stays fast under load. Scope to the project — a brochure site doesn't need load testing; a launch with real traffic does.

- [ ] **CDN absorbs the static load** — cacheable content served from edge, not origin; the first line of scale defense. `[Standard]`
- [ ] **Caching layers reduce origin/DB load** — §8 caching means traffic spikes don't all hit the database. `[Standard]`
- [ ] **Autoscaling / serverless scaling confirmed** — platform scales with traffic (Vercel/serverless do this — verify limits and cold-start behavior). `[Premium]`
- [ ] **Load tested before high-traffic launch** — k6 / Artillery simulate expected (and peak) traffic; find the breaking point before users do. *(Verify: load-test report at target concurrency.)* `[Premium]`
- [ ] **Database scaled for read load** — connection pooling, read replicas, or edge data where reads dominate (§9, Consultant Layer). `[Premium]`
- [ ] **Rate limiting protects against overload** — (Security-owned, §11 of Security doc — cross-ref); also a performance/availability safeguard. `[Standard]`
- [ ] **Graceful degradation under stress** — the site degrades (cached/static fallback) rather than failing hard when a dependency is slow. `[Premium]`
- [ ] **Cold-start cost understood** — serverless/edge cold starts measured and mitigated (keep-warm, lighter functions) where they affect TTFB. `[Premium]`

---

## Stack Addendums

### [NextJS/Vercel]

- [ ] **`next/image` for all images** — automatic AVIF/WebP, responsive sizing, lazy-loading, CLS prevention. `[Base]`
- [ ] **`next/font` for fonts** — self-hosts, preloads, and auto-matches fallback metrics to prevent CLS. `[Base]`
- [ ] **Server Components by default; `'use client'` only when needed** — minimizes client JS (§5/§6). *(Verify: client bundle excludes server component code.)* `[Base]`
- [ ] **`<Link>` for navigation** — automatic prefetch of in-viewport routes. `[Base]`
- [ ] **Rendering mode chosen per route** — `generateStaticParams`/SSG, ISR (`revalidate`), or dynamic, deliberately (§6). `[Standard]`
- [ ] **Streaming with Suspense for slow data** — shell paints immediately (§6). `[Premium]`
- [ ] **Vercel Speed Insights + Analytics enabled** — field RUM with minimal setup (§14). `[Standard]`
- [ ] **Edge runtime for latency-sensitive/global routes** — where appropriate (§6/§7). `[Premium]`
- [ ] **`@next/bundle-analyzer` wired up** — bundle visibility (§13). `[Standard]`
- [ ] **Caching/`revalidate` semantics understood** — Next's fetch cache and ISR configured intentionally, not by accident (§8). `[Standard]`

### [Supabase]

- [ ] **Indexes on filtered/sorted/joined columns** — `EXPLAIN ANALYZE` to confirm (§9). `[Standard]`
- [ ] **Supavisor connection pooling** — especially for serverless/edge clients; avoids connection exhaustion (§9). `[Standard]`
- [ ] **Select only needed columns** — not `select('*')` when a few fields suffice (payload + speed; also Security §9). `[Standard]`
- [ ] **Pagination / range on large tables** — never fetch unbounded rows (§9). `[Base]`
- [ ] **Heavy/repeated reads cached** — edge cache, client cache (SWR/React Query), or Redis for hot data (§8). `[Premium]`
- [ ] **Realtime subscriptions scoped** — subscribe narrowly; broad subscriptions flood the client (also respects RLS — Security). `[Standard]`
- [ ] **Database functions/views for expensive aggregations** — compute in Postgres rather than shipping rows to compute client-side. `[Premium]`
- [ ] **Storage assets via CDN + transforms** — Supabase Storage/image transforms or front with a CDN (§2). `[Standard]`

### [Managed] — Framer / Webflow / Wix

> The platform owns rendering, CDN, and protocol. Your levers shift to **what you add and how much**: assets, embeds, and restraint.

- [ ] **Images compressed and correctly sized before upload** — platforms serve responsive variants but can't fix a 5MB source; optimize first (§2). `[Base]` **(non-negotiable)**
- [ ] **Custom code embeds audited for weight** — every embedded script/widget adds the same third-party cost as a custom build (§10); vet and minimize. `[Base]`
- [ ] **Heavy animations/interactions tested on mobile** — platform animation tools can still cause jank/CLS; profile on a real device (§11). `[Standard]`
- [ ] **Fonts limited** — extra families/weights cost the same here (§3). `[Standard]`
- [ ] **Third-party integrations minimized** — marketing/chat/analytics embeds gated and justified (§10). `[Standard]`
- [ ] **CWV checked on the published site** — platforms don't guarantee passing CWV; measure with PSI and fix what you control (§1). `[Standard]`
- [ ] **Lazy-load galleries/long pages** — use the platform's lazy-load/visibility features (§2/§4). `[Standard]`
- [ ] **Platform plan adequate for traffic** — confirm the tier's bandwidth/performance matches expected load. `[Standard]`

### [Animation/WebGL]

> Apply whenever the build has significant motion. This addendum is the §11 craft items distilled into a pre-flight — Qera's differentiator, and the easiest place to ship something beautiful that runs at 20fps on a phone.

- [ ] **Compositor-only properties** — `transform`/`opacity` only; profiled clean of layout/paint (§11). `[Base]` **(non-negotiable)**
- [ ] **`prefers-reduced-motion` path implemented** — accessibility hard-requirement, ranks above performance (§11). `[Base]` **(non-negotiable)**
- [ ] **60fps verified on a mid-range device under CPU throttle** (§11). `[Premium]`
- [ ] **Animation library weight justified** — GSAP vs Framer Motion vs CSS vs Rive vs Lottie chosen on cost/need (see Consultant Layer); don't ship a heavy lib for a fade. `[Standard]`
- [ ] **rAF render loops pause offscreen** — IntersectionObserver gating (§11). `[Standard]`
- [ ] **Tweens/triggers/GPU resources cleaned up on unmount** — no leaks (§11). `[Standard]`
- [ ] **DPR capped and frame rate throttled to need on canvas/WebGL** (§11). `[Premium]`
- [ ] **Physics/heavy compute decoupled from render / in a Web Worker** (§5/§11). `[Premium]`
- [ ] **Graceful degradation when WebGL unavailable or device is weak** (§11). `[Premium]`
- [ ] **Lottie used judiciously** — large Lottie JSON can be heavy; prefer Rive or CSS for simple motion; lazy-load and limit complexity. `[Standard]`

---

## Enterprise Performance Architecture — Consultant Layer

> Same purpose as the Security doc's consultant layer: the tooling landscape the fastest sites in the world use, with a verdict on **when each becomes worth it and the lean answer until then.** You asked where to add libraries, frameworks, and third-party tools — this is that map. The core principle holds: **over-buying is waste.** Most of this you don't need yet, and the lean answer covers the vast majority of Qera's work.
>
> Tier tags here = *organizational/project scale*: `[Floor]` adopt now (mostly free) · `[Growth]` when a client crosses the trigger · `[Enterprise]` only at genuine scale.

### Image & media optimization
- *Best-in-class:* Cloudinary, imgix (transform-heavy); Cloudflare Images, Vercel Image Optimization (built-in); Mux, Cloudflare Stream (video).
- *Trigger:* large media libraries, user-uploaded images at scale, or heavy on-the-fly transform needs.
- *Lean answer:* **`next/image` or Cloudflare Images covers almost everything.** Reach for Cloudinary/imgix only when media volume or transform complexity justifies it. Mux/Stream when video is core. `[Floor]` (built-in) → `[Growth]` (dedicated image CDN)

### CDN & edge network
- *Best-in-class:* Cloudflare, Fastly, Akamai; Vercel Edge Network.
- *Lean answer:* **Vercel/Cloudflare built-in edge is the right tier for nearly all client work.** Fastly/Akamai are enterprise-scale concerns. `[Floor]`

### Edge compute
- *Best-in-class:* Cloudflare Workers, Vercel Edge Functions, Deno Deploy.
- *Trigger:* global audience needing low TTFB everywhere, or edge personalization/auth.
- *Lean answer:* Default to regional serverless; move to edge when global TTFB or edge logic is a measured need. `[Growth]`

### Data caching layer
- *Best-in-class:* Redis — Upstash (serverless), Vercel KV; Memcached.
- *Trigger:* repeated expensive queries or high read volume where the DB is the bottleneck.
- *Lean answer:* **ISR + CDN cache + client cache (SWR/React Query) first.** Add Redis/Upstash only when the data layer is the measured bottleneck. `[Growth]`

### RUM (Real User Monitoring)
- *Best-in-class:* SpeedCurve, Calibre, Datadog RUM (enterprise); Vercel Speed Insights, Cloudflare Web Analytics, Sentry Performance (accessible).
- *Lean answer:* **Vercel Speed Insights / Cloudflare Web Analytics now** — cheap and sufficient. SpeedCurve/Calibre when performance is a tracked KPI across many pages. `[Floor]` (built-in) → `[Growth]` (SpeedCurve/Calibre)

### Synthetic monitoring & CI gates
- *Best-in-class:* Lighthouse CI (free), WebPageTest, DebugBear, Calibre.
- *Lean answer:* **Lighthouse CI in GitHub Actions — adopt now, it's free and it's the enforcement layer.** WebPageTest for deep waterfalls. DebugBear when you want managed dashboards. `[Floor]`

### Load & stress testing
- *Best-in-class:* k6 (Grafana), Gatling, Artillery, Locust.
- *Trigger:* any launch with real traffic expectations, or scale-sensitive apps.
- *Lean answer:* **k6 — free, scriptable, run before a high-traffic launch.** Don't load-test a brochure site. `[Growth]`

### APM & observability
- *Best-in-class:* Datadog, New Relic, Grafana + Prometheus (enterprise); Sentry (accessible, errors + perf).
- *Lean answer:* **Sentry now** for errors + basic performance. Datadog/Grafana at genuine infra scale with someone to operate them (a dashboard nobody watches is waste). `[Floor]` (Sentry) → `[Enterprise]` (Datadog/New Relic)

### Bundle analysis & budgets
- *Best-in-class:* `@next/bundle-analyzer`, webpack-bundle-analyzer, Bundlephobia (pre-install check), Bundlewatch / size-limit (CI gate).
- *Lean answer:* **Adopt all of these now — free, and they prevent silent bloat.** `[Floor]`

### Database performance
- *Best-in-class:* Supavisor / PgBouncer (pooling), Postgres read replicas, `pg_stat_statements` (query analysis), PlanetScale (scale-out MySQL).
- *Trigger:* DB is the measured TTFB bottleneck or read volume is high.
- *Lean answer:* Pooling + correct indexes covers most. Read replicas when reads genuinely saturate. `[Growth]`

### Animation & rendering libraries (choose by cost/need)
- **CSS / Web Animations API** — zero dependency; first choice for simple motion. `[Floor]`
- **GSAP** — powerful, performant, great for complex/scroll-driven sequences (your stack). Worth its weight when motion is central. `[Growth]`
- **Framer Motion** — ergonomic for React; heavier than CSS — justify for interaction-rich UIs. `[Growth]`
- **Rive** — interactive, state-machine animations at tiny file sizes; **strongly performance-friendly vs heavy Lottie JSON** — consider for complex interactive motion. `[Growth]`
- **Lottie** — designer-friendly but JSON can be heavy; lazy-load, limit complexity, prefer Rive/CSS for simple cases. `[Growth]`
- **Three.js + React Three Fiber + drei** — full 3D/WebGL (your Three.js path); heavy — use when 3D is the point. `[Growth]`
- **OGL** — lightweight WebGL alternative to Three.js when you need raw performance and less abstraction. `[Growth]`
- **Lenis** — smooth scroll; test on mobile and respect reduced-motion (can hurt INP). `[Growth]`

### Sequencing for Qera
1. **Now, every project (free/near-free):** Vercel/Cloudflare edge + image optimization · Lighthouse CI + Bundlewatch gates · Vercel Speed Insights · Sentry · bundle-analyzer · CSS/GSAP per need.
2. **When a client crosses into scale/media/traffic (`[Growth]`):** dedicated image CDN · Redis/Upstash · k6 load testing · SpeedCurve/Calibre · read replicas · Rive/R3F where motion justifies.
3. **Only at genuine enterprise scale (`[Enterprise]`):** Datadog/New Relic · Fastly/Akamai · multi-region data architecture.

**Bottom line:** the fastest sites aren't fast because they bought the most tools — they're fast because someone set a budget, measured the field, and cut what didn't earn its bytes. Right-sizing is the expertise.

---

## Maintenance Schedule

> **Retainer pitch — and a real obligation.** Performance decays continuously: every new feature, image, dependency, and third-party script erodes it. A site fast at launch and never re-measured will not stay fast. Scope these into "Performance Retainer" / "Managed Performance" engagements.

### Monthly
- [ ] Field CWV review — LCP/INP/CLS at the 75th percentile (RUM / PSI); flag any regression
- [ ] Lighthouse run on key pages — lab check against budget
- [ ] Bundle size check — has the JS budget crept up since last month?
- [ ] New third-party scripts audit — anything added that wasn't justified?
- [ ] Image weight spot-check — any oversized assets shipped this month?
- [ ] Uptime/error review (cross-ref Security/monitoring) — availability affects perceived performance

### Quarterly
- [ ] **Full performance audit** at the project's tier — re-run the checklist
- [ ] **Performance budget review** — still realistic? Tighten if the site improved
- [ ] **WebPageTest from target regions** — waterfall and TTFB by geography
- [ ] **Real low-end device test** — the truth that lab approximates
- [ ] **Dependency weight review** — have any libraries bloated; lighter alternatives now available?
- [ ] **Caching effectiveness** — cache hit rates; anything uncacheable that shouldn't be?
- [ ] **Animation/WebGL profiling** (if applicable) — still 60fps on mid-range; no GPU memory growth `[Animation/WebGL]`
- [ ] **This checklist reviewed** — new CWV thresholds, framework features, deprecated practices

### Annually
- [ ] **Full audit re-run** across all client sites at tier
- [ ] **Load test re-run** for high-traffic clients — has the breaking point moved?
- [ ] **Rendering strategy reassessment** — is each route still on the right SSG/ISR/SSR/edge choice as traffic and content evolved?
- [ ] **Infrastructure/tooling reassessment** — has any client crossed a Consultant-Layer trigger (image CDN, Redis, read replica, RUM platform)?
- [ ] **Stack currency** — framework/runtime/CDN feature updates that unlock new performance wins

---

## Notes

### Verification Toolbox

| Need | Tool |
|---|---|
| Field CWV (real users) | CrUX · PageSpeed Insights (field) · Vercel Speed Insights · Search Console (SEO-owned) |
| Lab CWV / overall score | Lighthouse · PageSpeed Insights (lab) · WebPageTest · DebugBear |
| Network waterfall / TTFB by region | WebPageTest · Chrome DevTools Network panel |
| Main-thread / long tasks / INP | Chrome DevTools Performance panel (CPU throttle) |
| Layout shift sources | DevTools Performance (layout-shift regions) · Lighthouse |
| Bundle size | @next/bundle-analyzer · webpack-bundle-analyzer · Bundlephobia · Bundlewatch |
| Animation FPS / paint / layers | DevTools Rendering (FPS meter, paint flashing, layer borders) |
| WebGL / draw calls / GPU | spector.js · stats.js · DevTools |
| Load / stress | k6 · Artillery · Gatling |
| Regression gate (CI) | Lighthouse CI · Bundlewatch / size-limit |

### The 6 tests that catch the most real-world slowness

> If a deadline forces triage, run these six.

1. **PageSpeed Insights field data (CrUX)** on key pages — real-user CWV, the truth.
2. **Lighthouse mobile, throttled** — fast lab catch of obvious failures.
3. **WebPageTest waterfall from a target region** — see exactly what blocks the load.
4. **Bundle analyzer** — find the JS bloat; it's almost always a few oversized dependencies.
5. **DevTools Performance under 4–6× CPU throttle** — long tasks and INP problems the dev machine hides.
6. **Real low-end Android test** — the single most honest measurement available.

### Deprecated & Anti-Patterns (do NOT implement)

| Practice | Status | Use instead |
|---|---|---|
| Animating layout properties (`width`/`top`/`left`/`margin`) | **Jank by design** | `transform` / `opacity` (compositor) |
| `@import` in CSS | **Render-blocking, serial** | Bundler imports / `<link>` |
| `document.write` | **Blocks parsing** | DOM APIs / framework |
| Synchronous XHR | **Blocks main thread** | `fetch` / async |
| FID (First Input Delay) | **Removed Sept 2024** | INP |
| Shipping all JS upfront / no code splitting | **Anti-pattern** | Route/component code splitting |
| Unoptimized / non-next-gen images | **Top payload offender** | AVIF/WebP, responsive, compressed |
| Lazy-loading the LCP image | **Self-inflicted LCP failure** | `fetchpriority="high"` + preload |
| Excessive `will-change` | **Memory/layer pressure** | Surgical, just-in-time, removed after |
| `user-scalable=no` | **Accessibility violation** (a11y outranks perf) | Responsive layout, allow zoom |
| SMIL SVG animation (`<animate>`) | **Phased out, patchy** | CSS / Web Animations API / GSAP |
| Heavy Lottie JSON for simple motion | **Oversized** | CSS / Rive |
| Layout thrash (interleaved read/write) | **Forced reflow per frame** | Batch reads then writes; rAF |
| `setInterval` for animation | **Drifts, runs in background** | `requestAnimationFrame` |
| Public source maps in production | **Exposes source (Security §15)** | Generate but restrict access |
| jQuery for new builds | **Unnecessary weight** | Native APIs / framework |

### Scope & honesty notes

- **Not a guarantee of a perfect score.** A green Lighthouse number on a fast laptop can coexist with a slow experience for real users. **Field data is the truth; lab is a proxy.** Optimize for the 75th-percentile real user.
- **Performance is contextual.** The right rendering strategy, caching layer, and tooling depend on the app. This is a decision framework, not one fixed answer — the judgment is in applying it.
- **Accessibility and Security outrank Performance.** Never trade `prefers-reduced-motion`, zoom, focus indicators, alt text, TLS, or a security control for speed. When they conflict, the higher-ranked concern wins (see Precedence).
- **Backend correctness outranks Performance.** Caching and denormalization must never serve wrong or stale-when-it-matters data; the future Backend master owns that boundary.
- **Right-size the tooling.** The Consultant Layer exists so you adopt enterprise tools *when the trigger fires*. A 10-image brochure site does not need imgix; a brochure site does not need k6. Over-buying is negative ROI.
- **Living document.** CWV thresholds, framework features, and tooling move. Review quarterly. v1 reflects standards current as of authoring; verify specifics for anything you're staking a client result on.
