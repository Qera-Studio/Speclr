# Master SEO / AEO / GEO Checklist

> **Purpose:** Universal checklist for every project and website. The single source of truth for top-agency-grade SEO, AEO, and GEO. Checking every item at the project's tier produces work that clears the bar most agency SEO silently fails. It is a **comprehensive, maintained standard — not a guarantee of a perfect score** on any specific tool: audit tools disagree with each other, some checks are subjective, and chasing 100/100 on all of them at once can itself cause over-optimization. The goal is a site that is correct, findable, and citable — not a number.
>
> **Status:** Enhanced — compiled from seoscore.tools audit (2026-05-29) + Mainstay Digital AEO/GEO Best-Practice Checklist (March 2026) + Framer AI SEO tool audit (2026-05-29) + 5-specialist multi-agent synthesis (2026-05-29). · **Rev (2026-06):** integrated with the Master Security Checklist + Precedence Protocol; security/email-auth items handed to the Security master; honesty pass; added `[Intl]` addendum.
>
> **Living document** — the search and AI-search landscape moves fast. Crawler names, SERP-feature availability, AI citation behavior, and the specific stats below all date quickly. Verify the freshest platform-specific claims at use time, and review quarterly (see Maintenance → Quarterly).
>
> **Precedence:** When this checklist conflicts with the **Master Security Checklist**, **Security supersedes SEO** (see that doc's Master-Doc Precedence Protocol — Security ranks 2nd, SEO 6th). Conflicts are rare and usually resolvable both ways; where they aren't — e.g. listing admin URLs in `robots.txt` "for SEO hygiene" vs. keeping the attack surface private — the security position wins.
>
> **Service tier tags (on every item):**
> - `[Base]` — bare minimum for any client at any budget; without these the site is broken for search · **< ₹40,000** · ~8–12 hrs
> - `[Standard]` — meaningful SEO/AEO uplift; included in mid-tier engagements · **₹40,000 – ₹1,00,000** · +12–18 hrs on top of Base (~20–30 hrs total)
> - `[Premium]` — advanced, time-intensive, or content-heavy; reserved for top-tier clients · **₹1,00,000+** · +20–35 hrs on top of Standard (~45–65 hrs total)
> *(Hours assume a clean Next.js codebase. Content-heavy Premium items — case studies, expert quotes, original data — add significantly to the estimate.)*
>
> **How to use this checklist for a new project:**
> 1. **Spam policy check first** — before anything else, verify the site is not already penalised; all subsequent work is wasted if Google has a manual action against the domain
> 2. **Backlink audit at intake** — run a backlink profile check on any existing domain; a toxic link profile requires disavow work before any on-page work begins
> 3. **Audit existing state** — go through items for the client's tier and check off anything already passing before writing a line of code
> 4. **Gap-fill** — implement only what is missing; do not redo work that already passes
> 5. **Upgrade path** — if a client moves to a higher tier later, run the audit again from the new tier's items; Base work carries forward, nothing is redone
> 6. **Dependency note** — some Standard/Premium items assume Base items are already passing (e.g. FAQPage schema requires correct H2/H3 structure); always complete Base before moving up
>
> **Priority tags** (on items sourced from Mainstay Digital / best practices):
> - `[HIGH]` — foundational; fix before anything else
> - `[MEDIUM]` — significant uplift; do after HIGH items are complete
> - `[LOW]` — incremental gain; do when basics are solid
>
> **Type tags:**
> - `[SEO]` — traditional search engine signal
> - `[AEO/GEO]` — AI answer engine / generative engine signal
> - `[Both]` — benefits both traditional and AI search
>
> **AI readability framework (Framer tool — 4 categories):**
> - **Findable** — crawlability, robots, sitemap, canonical, AI crawler access
> - **Quotable** — content AI can extract and cite: meta description, body text, freshness, FAQs
> - **Understandable** — structure signals: H1, heading hierarchy, JSON-LD, OG tags, image alt
> - **Trustworthy** — authority signals: contextual internal links, external citations, llms.txt
>
> **Business type addendums** (applied on top of the universal checklist — see the Business Type Addendums section):
> - `[Local]` — brick-and-mortar or service-area businesses: NAP, GBP, LocalBusiness schema with geo
> - `[Ecomm]` — e-commerce: Product schema, breadcrumbs, review schema, shopping feed
> - `[SaaS]` — software products: SoftwareApplication schema, pricing page, changelog
> - `[Intl]` — multi-region or multilingual sites: hreflang, regional targeting, locale strategy
> Items without a business type tag are universal — required for all site types at all tiers.

---

## 0 — Pre-Work: Intake & Penalty Check

> Run this section before any other work. A site under a Google manual action or with a toxic backlink profile will not benefit from any on-page or technical SEO until the penalty is resolved. This is non-negotiable.

- [ ] **Google manual action check** — open Google Search Console → Security & Manual Actions → Manual Actions; confirm zero manual actions before starting any work `[Base]`
- [ ] **Spam policy compliance review** — scan for: doorway pages (thin pages targeting keyword variants), cloaking (serving different content to Google vs. users), hidden text (`color:white` on white background), keyword stuffing (unnatural density), scraped or AI-generated thin content; fix all violations before any other work `[Base]`
- [ ] **Backlink profile audit** — run domain through Ahrefs / Moz / GSC Links report; identify toxic, spammy, or irrelevant inbound links; disavow via GSC disavow tool if toxic link pattern confirmed `[Base]`
- [ ] **Domain history check** — if working on an acquired/rebranded domain, check Wayback Machine and Google cache for previous content; penalties follow the domain, not the owner `[Standard]`
- [ ] **Existing penalties cleared** — confirm GSC shows no manual actions and organic traffic has not crashed in the last 90 days (Helpful Content/Core Update impact) `[Base]`

---

## 1 — Search Intent & SERP Analysis

> Intent analysis must happen before any content, keyword, or structural work. The wrong page type for a query's intent will not rank regardless of technical quality.

- [ ] **Search intent classified for every target keyword** — Informational (how/what/why), Navigational (brand + destination), Commercial (best/vs/review), Transactional (buy/hire/book); the page type, content format, and CTA must match the dominant intent `[Base]`
- [ ] **SERP page-type match** — check the top 10 results for the target keyword; if Google shows landing pages, build a landing page; if it shows blog posts, build a blog post; mismatching page type is the single biggest avoidable ranking failure `[Base]`
- [ ] **SERP feature inventory** — identify which features appear: Featured Snippet, PAA, Image Pack, Local Pack, Video Carousel, Shopping; the content format must be designed to capture relevant features `[Standard]`
- [ ] **People Also Ask (PAA) mining** — collect all PAA questions for the target query; verify each one is answered on the page, either in body copy or a FAQ section `[Standard]`
- [ ] **Keyword cannibalization check** — confirm no two pages on the site target the same primary keyword; cannibalization splits ranking signals and suppresses both pages; fix by consolidating or differentiating content `[Standard]`
- [ ] **Keyword mapping** — every primary keyword maps to exactly one page; documented in a keyword map so future content doesn't accidentally cannibalise existing pages `[Standard]`
- [ ] **Topic cluster architecture** — pillar pages cover broad topics; cluster pages cover sub-topics and link back to the pillar; improves topical authority for both search engines and AI `[Premium]`
- [ ] **Competitor gap analysis** — identify pages ranking above the client for target keywords; document what they cover that the client's page does not; fill the gap `[Premium]`

---

## 2 — Meta & Head

- [ ] Title tag is present `[Base]`
- [ ] Title length is 30–60 characters — optimal range for search snippets `[Base]`
- [ ] Title includes primary keyword in the first 30 characters `[Standard]`
- [ ] Title written with psychological CTR triggers: numbers ("5 ways"), year ("2026"), power words ("proven", "complete", "free"), question format — these measurably increase click-through rates from SERP `[Premium]`
- [ ] Meta description is present `[Base]`
- [ ] Meta description length is 120–160 characters `[Base]`
- [ ] Meta description contains a CTA verb ("Get", "Discover", "Book", "Start") — descriptions with action words have measurably higher CTR `[Standard]`
- [ ] Title and meta description are NOT identical — each must be unique per page `[Base]`
- [ ] Title and H1 share key terms — aim for at least partial word overlap `[Standard]`
- [ ] `<html lang="...">` attribute is set correctly (e.g. `en`, `en-IN`, `ar`) `[Base]`
- [ ] `<meta charset="UTF-8">` declared `[Base]`
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">` present — allows zoom; do NOT use `user-scalable=no` `[Base]`
- [ ] `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">` on all public pages *(max-image-preview:large allows Google to show large image thumbnails in SERP — missing = small thumbnail fallback and measurable CTR drop on visual queries)* `[Base]`
- [ ] `noindex` set on private/utility pages (staging, internal tools, duplicate parameter URLs) `[Base]`
- [ ] `<!DOCTYPE html>` declared `[Base]`
- [ ] No meta refresh redirect tags — use HTTP 301 instead `[Base]`
- [ ] Remove deprecated `<meta name="keywords">` tag — Google ignores it, Bing barely uses it; adds HTML noise `[Base]`
- [ ] `<link rel="dns-prefetch">` and `<link rel="preconnect">` for all third-party origins — each unresolved domain adds 50–200ms on first load `[Standard]`
- [ ] `<link rel="preload" as="image">` on the LCP image — fetchpriority="high" equivalent for static markup `[Standard]`
- [ ] RSS/Atom feed linked in `<head>` — helps content discovery by aggregators and AI crawlers `[Premium]`

---

## 3 — Heading Structure

- [ ] Exactly one `<h1>` per page `[Base]`
- [ ] H1 length is 20–70 characters `[Base]`
- [ ] H2–H6 hierarchy is correct — no skipped levels (H1 → H2 → H3, not H1 → H3) `[Base]`
- [ ] At least 6 H2 sections on content-rich pages `[Standard]`
- [ ] Every H2 section contains at least 50 words of supporting content — thin sections are filtered out by AI extractors `[Standard]`
- [ ] H1 and title tag share key terms `[Standard]`
- [ ] At least one H2 or H3 phrased as a question ending in "?" — AI tools specifically scan for this pattern as a FAQ signal `[Standard]`

---

## 4 — Content

- [ ] Minimum 100 words of readable body text per page — floor check; AI cannot quote pages that are mostly images or short copy [Quotable baseline] `[Base]`
- [ ] Minimum 750 words on content pages `[Standard]`
- [ ] Minimum 1,000–1,500 words on pages targeting AI Overview or featured snippets `[Premium]`
- [ ] **YMYL check** — if the page touches money, legal, health, safety, or major life decisions (Your Money or Your Life), E-E-A-T requirements are higher; author credentials, citations, and expert review are non-negotiable, not optional `[Standard]`
- [ ] Readability score 60+ (Flesch-Kincaid or equivalent) `[Standard]`
- [ ] Long sentences (>20 words) kept under 25% of total sentences `[Standard]`
- [ ] At least 20% of sentences use transition words (however, therefore, additionally, etc.) `[Premium]`
- [ ] Text-to-HTML ratio above 15% `[Standard]`
- [ ] Each page focuses on a single, clearly defined topic [HIGH · Both] `[Base]`
- [ ] Concise topic definition in the first or second paragraph — AI systems frequently quote opening definitions `[Standard]`
- [ ] **Featured snippet targeting** — for informational queries, include one paragraph of 40–60 words that directly answers the primary question; format: H2 question → 40–60 word answer paragraph → supporting bullet list; this is the strongest predictor of Google AI Overview inclusion `[Standard]`
- [ ] **Passage indexing readiness** — each major section (H2 block) is self-contained and independently answerable; optimal AI citation passage length is 134–167 words (distinct from the 40–60 word featured snippet cap — these are different mechanisms) `[Standard]`
- [ ] **People Also Ask coverage** — every PAA question identified during intent analysis is answered somewhere on the page `[Standard]`
- [ ] No duplicate content across pages `[Base]`
- [ ] **Keyword cannibalization cleared** — confirmed no other page targets this page's primary keyword `[Standard]`
- [ ] **Content decay audit** — pages not updated in 12+ months should be refreshed or consolidated; stale pages drag down domain freshness signals `[Standard]`
- [ ] **Helpful Content alignment** — content is written for people first, not for search engines; primary purpose is to help a real user accomplish something; thin affiliate, doorway, and auto-generated content removed `[Base]`
- [ ] **AI-generated content audit** — if AI tools were used to draft content, verify it has been fact-checked, personalised with real experience/opinion, and does not match "content written primarily for search engines" patterns `[Standard]`
- [ ] Author byline present on content pages — required for E-E-A-T trust signals *(Google's Quality Rater Guidelines explicitly weight author identity for advice and YMYL content)* `[Standard]`
- [ ] Author page exists (linked from byline) — name, role, expertise, credentials, social profiles `[Standard]`
- [ ] First-person pronouns used naturally to signal real human experience (aim for 5+) `[Premium]`
- [ ] Clear, factual writing — prefer direct explanatory language over vague marketing copy `[Standard]`
- [ ] Step-by-step content present where applicable — AI heavily favors procedural, ordered answers `[Standard]`
- [ ] At least 5 statistics or specific data points with units ("300+ clients", "+40% conversion") *(Princeton study: 5+ data points → +30–40% AI citation rate)* `[Standard]`
- [ ] All statistics attributed to named sources inline — unattributed data is ignored by AI for citation purposes `[Premium]`
- [ ] Expert quotes present — named professionals with titles and credentials `[Premium]`
- [ ] Real-world examples or case studies — concrete evidence AI can cite `[Premium]`
- [ ] Original research or proprietary data signals ("our analysis shows...") — original insights are the highest-cited content type `[Premium]`
- [ ] Conclusion or verdict section present — "Our recommendation:", "The bottom line:" — AI pulls conclusions from labeled summary sections `[Standard]`

---

## 5 — Images

- [ ] All images have `alt` text attribute present `[Base]`
- [ ] Decorative images use `alt=""` + `aria-hidden="true"` on wrapper `[Base]`
- [ ] Meaningful images have descriptive alt text under 125 characters `[Base]`
- [ ] Image alt text coverage ≥ 50% — decorative `alt=""` images lower this ratio; ensure all content images have descriptive alt text to keep the ratio passing [Understandable · Framer threshold] `[Base]`
- [ ] **Image filenames are descriptive** — `brand-identity-design.webp` not `IMG_0034.webp`; Google uses filename as an additional alt signal `[Base]`
- [ ] All images specify `width` and `height` attributes — prevents CLS `[Base]`
- [ ] All images use modern formats: WebP or AVIF — no PNG/JPEG where avoidable `[Standard]`
- [ ] Responsive images use `sizes` prop for all breakpoints `[Standard]`
- [ ] **LCP image has `fetchpriority="high"`** — direct browser instruction to prioritise the LCP resource; 10–30% LCP improvement `[Base]`
- [ ] Above-the-fold images use `priority` / `loading="eager"` — LCP critical `[Base]`
- [ ] Below-the-fold images use `loading="lazy"` `[Standard]`
- [ ] `next/image` (or equivalent) used for all images — never bare `<img>` in Next.js `[Base]`
- [ ] `<figure>`/`<figcaption>` wrapping all meaningful images — captions are AI-readable content descriptions `[Standard]`
- [ ] **`ImageObject` schema** on pages featuring key images (product photos, team photos, infographics) — enables Image Pack appearance `[Premium]`
- [ ] **Image sitemap** — if the site has 10+ important images, submit a separate image sitemap or include `<image:image>` tags in the main sitemap `[Premium]`
- [ ] **Image Pack targeting** — for visual/product queries, ensure images have descriptive filenames, alt text, `ImageObject` schema, and appear in the sitemap; Image Pack positions can appear above traditional results `[Premium]`

---

## 6 — Open Graph / Social

- [ ] `og:title` present `[Base]`
- [ ] `og:description` present `[Base]`
- [ ] `og:image` present — 1200×630px, absolute URL `[Base]`
- [ ] `og:url` present and matches canonical URL `[Base]`
- [ ] `og:type` present (`website` for homepages, `article` for blog/content pages) `[Base]`
- [ ] `og:site_name` present — appears as the brand label in WhatsApp, Slack, iMessage, and Discord link previews *(missing = platform shows the raw domain URL instead of the brand name)* `[Base]`
- [ ] `og:locale` set (e.g. `en_IN`, `en_US`, `en_AE`) `[Standard]`
- [ ] OG image uses absolute URL (not relative path) `[Base]`
- [ ] Twitter Card type set (`summary_large_image` for visual pages) `[Standard]`
- [ ] `twitter:title` present `[Standard]`
- [ ] `twitter:description` present `[Standard]`
- [ ] `twitter:image` present `[Standard]`
- [ ] `twitter:creator` and `twitter:site` handles set `[Standard]`
- [ ] OG image is exactly 1200×630px and under 8 MB — Facebook/LinkedIn reject oversized images `[Base]`
- [ ] OG image tested with Facebook Sharing Debugger and Twitter Card Validator `[Standard]`

---

## 7 — Canonical & URLs

- [ ] Canonical tag present on every public page `[Base]`
- [ ] Canonical is self-referencing — canonical URL matches the page URL exactly `[Base]`
- [ ] OG URL matches canonical URL `[Base]`
- [ ] URL length is under 75 characters `[Base]`
- [ ] URLs use hyphens as separators — no underscores, no spaces, no camelCase `[Base]`
- [ ] **Trailing slash canonicalization** — `/page/` and `/page` must not both return HTTP 200; one must 301-redirect to the other; the canonical must match the actual serving URL; this is the most common Next.js misconfiguration `[Base]`
- [ ] **www vs non-www** — `www.domain.com` and `domain.com` must not both serve content; one redirects permanently to the other; DNS and server must agree `[Base]`
- [ ] **URL case sensitivity** — `/Services` and `/services` must not both return 200; server must serve one and redirect the other `[Base]`
- [ ] No empty `href` attributes on any links `[Base]`
- [ ] No `nofollow` on internal links — preserve link equity flow `[Standard]`
- [ ] All `target="_blank"` links have `rel="noopener noreferrer"` `[Base]`
- [ ] **Syndicated content** — if content appears on other sites, the original page has a `rel="canonical"` pointing to itself; syndication partners must use `rel="canonical"` pointing back to the original `[Standard]`
- [ ] URL parameters that don't create unique content are handled — either via canonical, `robots.txt` disallow, or GSC parameter handling `[Standard]`
- [ ] No parameter-based URLs indexed — GSC → URL Inspection confirms no parameter variants are indexed as separate pages `[Standard]`

---

## 8 — Internal Linking

- [ ] Minimum 3 contextual internal links in the page body — nav and footer links do NOT count; AI checks for links embedded in actual content [Trustworthy · Framer threshold] *(pages below this threshold fail the Trust category entirely in the Framer AI tool)* `[Base]`
- [ ] Minimum 10 total internal links per page (including nav, footer, CTAs) `[Standard]`
- [ ] All link texts are descriptive — no "click here", "read more", "here", "this" `[Base]`
- [ ] All internal links are working — 0 broken internal links `[Base]`
- [ ] **Orphan page audit** — every indexed page has at least one internal link pointing to it; orphan pages receive zero PageRank and are effectively invisible to search engines `[Standard]`
- [ ] **Dead-end page audit** — every page links out to at least one other page; pages with no outbound internal links trap PageRank `[Standard]`
- [ ] **Anchor text strategy** — use keyword-rich anchor text for internal links where natural; avoid generic anchors on navigational links to key pages `[Standard]`
- [ ] About page linked from site navigation or footer `[Base]`
- [ ] Contact page linked from site `[Base]`
- [ ] Privacy Policy linked from site `[Base]`
- [ ] Terms of Service linked from site `[Base]`
- [ ] **User journey mapping** — internal links guide the user through a logical path (awareness → consideration → conversion); link structure reflects the intended conversion funnel `[Standard]`
- [ ] Topic clusters cross-linked — cluster pages link to each other and to the pillar page; pillar page links to all cluster pages `[Premium]`

---

## 9 — Schema / Structured Data

> Schema is the highest-leverage technical AEO/GEO signal. Implement in this order: required → recommended → type-specific.

### Core schemas (all sites)

- [ ] `Organization` schema present — `name`, `url`, `logo`, `contactPoint`, `address`, `sameAs` (6+ social profiles) `[Standard]`
- [ ] `WebSite` schema with `SearchAction` / `potentialAction` — enables sitelinks search box `[Standard]`
- [ ] `WebPage` schema on each page — `name`, `description`, `url`, `breadcrumb` `[Standard]`
- [ ] `BreadcrumbList` schema on all inner pages `[Standard]`
- [ ] `FAQPage` schema on any page with Q&A content *(Google-confirmed rich result type — directly increases SERP real estate and CTR; also critical for AI Overview eligibility)* `[Standard]`
- [ ] `Person` / Author schema — `name`, `jobTitle`, `url`, `sameAs`, `knowsAbout` — required for E-E-A-T `[Standard]`

### Recommended schemas (most sites)

- [ ] `LocalBusiness` or `ProfessionalService` schema on service/location pages — includes `geo` with lat/long `[Standard]`
- [ ] `Service` schema listing each service with `name`, `description`, `provider`, `areaServed` `[Standard]`
- [ ] `Article` or `BlogPosting` schema on all blog/editorial content — includes `author`, `datePublished`, `dateModified` `[Standard]`
- [ ] `ImageObject` schema for key images `[Premium]`
- [ ] `VideoObject` schema if video content is present — `name`, `description`, `thumbnailUrl`, `uploadDate`, `duration` `[Premium]`
- [ ] `Speakable` schema — marks content sections as voice-search ready `[Premium]`

### Schema validation pipeline

- [ ] All JSON-LD blocks have valid syntax `[Standard]`
- [ ] All schema types include required properties (check schema.org for each type) `[Standard]`
- [ ] Validated with Google Rich Results Test after every change `[Standard]`
- [ ] Schema not excessive — target under 4 JSON-LD blocks on any single page, under 4 KB total `[Standard]`
- [ ] No duplicate schema types on the same page — merge if possible `[Standard]`
- [ ] `@id` properties present with persistent URLs — enables cross-page entity cross-referencing and Knowledge Graph signal `[Premium]`
- [ ] `datePublished` and `dateModified` present in Article/WebPage schema — freshness signal for AI ranking `[Standard]`

### Implementation rules

- [ ] JSON-LD format used — not microdata or RDFa; JSON-LD is the only format that can be placed in `<head>` without modifying HTML structure `[Standard]`
- [ ] Schema injected server-side via a Server Component — avoid the client-side innerHTML injection pattern with runtime-dynamic data, which can create hydration mismatches and is harder to validate `[Standard]`
- [ ] Organization schema includes `logo` URL pointing to an actual image file (not a placeholder) `[Standard]`
- [ ] Schema matches visible page content — do not add schema for content that does not appear on the page (Google's spam policies explicitly prohibit this) `[Base]`

### Knowledge Graph signals

- [ ] Organization `@id` is a persistent URL (e.g. `https://qera.studio/#organization`) — consistent `@id` across pages builds entity graph `[Standard]`
- [ ] `sameAs` includes Wikidata, Crunchbase, or LinkedIn as minimum — these are the strongest Knowledge Graph verification sources `[Premium]`
- [ ] Wikipedia article exists for the brand (if applicable) — single strongest KG signal; not always achievable for SMBs `[Premium]`
- [ ] Brand entity has consistent name across: title tag, `og:site_name`, schema `name`, all social profiles — inconsistency causes AI entity misidentification `[Standard]`

---

## 10 — Performance & Core Web Vitals

> **Critical distinction:** Google uses field data (CrUX — real user measurements) for ranking, NOT lab data (Lighthouse/PageSpeed Insights). Always verify CWV in Google Search Console → Core Web Vitals report and CrUX data, not just PageSpeed scores.

### Core Web Vitals targets

- [ ] **LCP ≤ 2.5s** — in field data (CrUX / GSC); verify, not just lab score *(Google confirmed page experience ranking signal since 2021)* `[Standard]`
- [ ] **CLS ≤ 0.1** — in field data; check on mobile specifically (most CLS issues are mobile-only) `[Standard]`
- [ ] **INP ≤ 200ms** — Interaction to Next Paint; replaced FID in March 2024; test with real interactions, not just page load `[Standard]`
- [ ] **TTFB < 200ms** — Time to First Byte; largest single LCP lever after image optimization; address server response time, CDN setup, and caching `[Standard]`

### Image performance

- [ ] LCP image uses `fetchpriority="high"` and `loading="eager"` — 10–30% LCP improvement `[Base]`
- [ ] LCP image is not lazy-loaded — confirm no `loading="lazy"` on the LCP element `[Base]`
- [ ] All images have `width` and `height` — prevents layout shift `[Base]`
- [ ] Images served in WebP or AVIF `[Standard]`

### Loading performance

- [ ] HTTPS enabled — all resources over HTTPS `[Base]`
- [ ] No mixed content `[Base]`
- [ ] HTTP/2 or HTTP/3 enabled — multiplexed requests; check response headers for `HTTP/2` `[Standard]`
- [ ] Brotli compression enabled (`Content-Encoding: br`) — smaller than gzip `[Standard]`
- [ ] CDN serving static assets — CDN reduces TTFB for geographically distributed users `[Standard]`
- [ ] Cache-Control headers set: `public, max-age=14400, s-maxage=86400, stale-while-revalidate` `[Standard]`
- [ ] 0 render-blocking scripts in `<head>` — all scripts use `defer` or `async` `[Standard]`
- [ ] Inline JS under 10 KB `[Premium]`
- [ ] Inline CSS: 0 KB — all styles in external stylesheets `[Standard]`
- [ ] Font preload configured — `<link rel="preload">` for primary font `[Standard]`
- [ ] DOM size under 1,500 elements (aim for under 800) `[Standard]`

### Third-party scripts

- [ ] Third-party script audit — list every third-party script loaded; each one adds DNS lookup + connection + download overhead `[Standard]`
- [ ] **Facade pattern** for heavy third-party embeds (chat widgets, video players) — load a static placeholder; replace with real embed only on user interaction; eliminates INP failures and INP regressions from third-party scripts `[Standard]`
- [ ] Tag Manager not loading unnecessary tags — audit active tags; remove unused ones `[Standard]`

### Mobile usability

- [ ] Mobile usability passing in Google Search Console — 0 mobile usability errors `[Standard]`
- [ ] **Tap targets minimum 48×48px** with 8px spacing between targets — documented GSC mobile usability error type; failing = GSC warning `[Standard]`
- [ ] **Font size minimum 16px** on body text (14px absolute minimum) — GSC flags "text too small to read" below this threshold `[Standard]`
- [ ] **No intrusive interstitials** above the fold on mobile — pop-ups, banners, or overlays that cover the main content on page load are a confirmed Google ranking penalty since 2017 `[Base]`
- [ ] **Above-the-fold content loads without JavaScript** — at least the hero/LCP content must render server-side; JavaScript-dependent above-the-fold content increases LCP `[Standard]`

### Web App Manifest

- [ ] Web App Manifest present (`manifest.json` linked in `<head>`) `[Premium]`
- [ ] Manifest icons are real, correctly-sized, non-transparent PNGs — `"purpose": "maskable"` icons specifically need their own safe-zone-padded variant, not a reused flat `"any"` file (see Design & Brand §2 favicon sub-items — same underlying gap, different lens) `[Premium]`

---

## 11 — JavaScript Rendering

> Googlebot can render JavaScript, but it is queued separately and may take days or weeks. If content depends on JS, it may not be indexed immediately.

- [ ] All SEO-critical content (title, H1, meta description, body copy, schema) is present in server-rendered HTML — verify by viewing page source (Ctrl+U), not DevTools `[Base]`
- [ ] GSC URL Inspection tool → View Crawled Page → Screenshot shows full content rendered `[Standard]`
- [ ] No SEO-critical content loaded via client-side API calls that fire after hydration — server-fetch or use RSC `[Base]`
- [ ] Schema JSON-LD blocks present in server-rendered HTML — validate by viewing page source `[Standard]`
- [ ] Internal links present in server-rendered HTML — not injected post-hydration `[Standard]`
- [ ] `robots.txt` does not block CSS or JavaScript files — Googlebot must be able to render the page; blocking CSS/JS causes "page cannot be rendered" in GSC `[Base]`
- [ ] JavaScript errors do not break page rendering — check Chrome DevTools Console for JS errors on a clean cache `[Standard]`
- [ ] Next.js App Router used correctly — Server Components handle SEO-critical rendering; only add `'use client'` when the component genuinely needs browser APIs or interactivity `[Base]`

---

## 12 — Security Headers & Email Auth → owned by Security master

> **Ownership transfer (Precedence Protocol, Rule 1 — ownership, not repetition).** Security headers (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`), `security.txt`, and email authentication (SPF / DKIM / DMARC) are owned by the **Master Security Checklist** (§8 Security Headers, §16 Infrastructure). Do **not** re-specify them here — set them there once, so two docs can't drift.
>
> **Why this section still exists (the SEO-only concern):** these headers are not a direct ranking signal, but the *absence* of HTTPS/HSTS, or a CSP that accidentally blocks your own scripts or schema injection, will damage crawlability, Core Web Vitals, and rendering. So the SEO requirement collapses to one thing: **a misconfigured header hurts SEO; a correct one is invisible to it — confirm the Security master's items pass and that nothing is broken.**

- [ ] Security master §8 (headers + `security.txt`) confirmed passing for this project `[Base]`
- [ ] Security master §16 (SPF / DKIM / DMARC) confirmed passing for any sending domain `[Standard]`
- [ ] No misconfigured CSP blocking legitimate scripts, JSON-LD injection, or render — verify in the browser console; a broken CSP can silently break SEO-critical server-rendered content `[Standard]`

---

## 13 — Crawlability & Indexing

### robots.txt

- [ ] `robots.txt` present at root and allows crawling of all public pages `[Base]`
- [ ] `robots.txt` includes `Sitemap:` directive `[Base]`
- [ ] `robots.txt` does NOT block CSS or JavaScript files — Googlebot must render pages correctly `[Base]`
- [ ] AI crawlers explicitly allowed: GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Bytespider, Amazonbot, Meta-ExternalAgent, YouBot — or simply: no Disallow rules targeting these bots `[Base]`
- [ ] **Note on AI bots:** GPTBot covers ChatGPT training; OAI-SearchBot covers ChatGPT search/browse (no training data); Google-Extended controls AI Overview eligibility — blocking Google-Extended opts the site out of AI Overviews `[Base]`
- [ ] **WAF / Cloudflare check** — robots.txt permissions can be overridden by WAF rules; if Cloudflare or any WAF is active, verify AI crawler IPs are not rate-limited or blocked at the network level (check server logs) `[Standard]`
- [ ] robots.txt tested after any change — a mis-typed rule can accidentally block entire directories `[Standard]`
- [ ] robots.txt reviewed quarterly for new AI crawlers that should be explicitly allowed `[Standard]`

### Sitemap

- [ ] `sitemap.xml` present with valid format `[Base]`
- [ ] Sitemap includes all public pages `[Base]`
- [ ] Sitemap excludes: noindex pages, paginated duplicates, parameter URLs `[Standard]`
- [ ] **`<lastmod>` accuracy** — `<lastmod>` date reflects the actual date content changed, not the sitemap generation date; Google ignores inaccurate `<lastmod>` values and stops trusting the sitemap `[Standard]`
- [ ] **Do NOT include `<changefreq>` or `<priority>` tags** — explicitly ignored by Google; adds file size without benefit `[Base]`
- [ ] Sitemap submitted to Google Search Console `[Standard]`
- [ ] Sitemap submitted to Bing Webmaster Tools `[Standard]`
- [ ] **IndexNow** integration — instant Bing, Yandex, and Naver indexing on content changes; does NOT notify Google (common misconception); Bing is the ChatGPT Copilot index `[Premium]`
- [ ] Sitemap URL discoverable via `robots.txt` AND `<link rel="sitemap">` in HTML head `[Standard]`

### HTTP status codes

- [ ] All public pages return HTTP 200 `[Base]`
- [ ] All redirects use HTTP 301 (permanent) — not 302 (temporary); temporary redirects do not pass PageRank `[Base]`
- [ ] **Redirect chains** — maximum 1 redirect hop; each additional hop leaks PageRank and adds latency; audit with Screaming Frog or Ahrefs `[Standard]`
- [ ] **Soft 404 audit** — pages that return HTTP 200 but show "not found", "no results", or near-empty content; Google treats these as thin content; the most underdiagnosed indexation issue; check GSC Coverage → Crawled but not indexed `[Standard]`
- [ ] 404 page returns HTTP 404 (not 200) `[Base]`
- [ ] No 5xx server errors in GSC — indicates server instability `[Base]`
- [ ] Redirect chains from old URLs cleaned up after any site migration `[Standard]`

### Indexation health

- [ ] All important pages appear in GSC Coverage → Indexed `[Standard]`
- [ ] GSC Coverage → Excluded reviewed — investigate any unexpected exclusions `[Standard]`
- [ ] No pages appear in GSC as "Crawled – currently not indexed" for more than 30 days `[Standard]`
- [ ] Pagination handled correctly — `rel="next"` / `rel="prev"` is deprecated; use canonical on the first page and ensure paginated pages have unique content `[Standard]`
- [ ] **Faceted navigation** — if the site has filters (e-commerce, directory), parameter URLs must be handled via `noindex` + `Disallow` or GSC parameter configuration; uncontrolled facets can produce thousands of thin duplicate pages `[Standard]`
- [ ] Crawl budget check (Premium clients) — large sites (1000+ pages) should review GSC crawl stats and server logs to confirm Googlebot is spending crawl budget on valuable pages `[Premium]`
- [ ] Site architecture — every public page reachable in ≤ 3 clicks from homepage `[Standard]`
- [ ] No hreflang tags on single-language sites — adding hreflang with no actual translations creates invalid markup `[Base]`

---

## 14 — Accessibility (SEO-relevant)

- [ ] All form inputs have associated `<label>` elements `[Base]`
- [ ] ARIA landmarks present: `main`, `nav`, `header`, `footer` at minimum `[Standard]`
- [ ] Skip-to-main-content link as first focusable element `[Standard]`
- [ ] `<main id="main-content">` present as skip link target `[Standard]`
- [ ] No duplicate IDs on the page `[Base]`
- [ ] No iframes without `title` attribute `[Base]`
- [ ] Viewport allows zoom — do NOT use `user-scalable=no` `[Base]`
- [ ] Colour contrast meets WCAG AA — minimum 4.5:1 for normal text, 3:1 for large text `[Standard]`
- [ ] Keyboard navigation works end-to-end — all interactive elements reachable and operable without a mouse `[Standard]`
- [ ] Focus indicators visible on all interactive elements `[Standard]`
- [ ] **Breadcrumb schema aligned with visual breadcrumb** — if `BreadcrumbList` schema is present, the visual breadcrumb component on the page must match it exactly; mismatch triggers a Google Search Console warning `[Standard]`
- [ ] Lighthouse accessibility score ≥ 90 `[Standard]`

---

## 15 — E-E-A-T Signals

> E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) is not a direct ranking signal but influences how Google's Quality Raters evaluate the site, which informs algorithm training.

- [ ] About page exists and is linked in navigation or footer `[Base]`
- [ ] About page describes real people, real experience, and real business history — not generic "we are a team of experts" `[Standard]`
- [ ] Author name and byline present on all content pages `[Standard]`
- [ ] Author page exists — name, role, credentials, photo, social profiles linked `[Standard]`
- [ ] Contact page exists with a real contact method (email, phone, or form) `[Base]`
- [ ] Privacy Policy page exists `[Base]`
- [ ] Terms of Service/Use page exists `[Base]`
- [ ] **Refund or Cancellation Policy** visible if the site accepts payments — builds transactional trust `[Standard]`
- [ ] **Transparent business information** — company registration, physical address, or verified contact details; absence is a Quality Rater flag for YMYL sites `[Standard]`
- [ ] **No deceptive urgency** — fake countdown timers, false "only 3 left" stock indicators, or artificial scarcity that cannot be verified; Google Quality Raters explicitly penalise deceptive trust signals `[Standard]`
- [ ] **Third-party reviews** — links to verified reviews on Google, Clutch, Trustpilot, or G2; external review platforms are more trusted than on-site testimonials alone `[Standard]`
- [ ] **Press mentions or media coverage** — links to or references to articles, interviews, or features in external publications `[Premium]`
- [ ] Organization schema includes logo, address, and contact information `[Standard]`
- [ ] Consistent entity signals — organisation name, services, and expertise consistently described across all pages `[Standard]`
- [ ] 7+ external links to authoritative sources in content — links out signal trust; Google does not penalise linking to quality external sources `[Standard]`
- [ ] First-person language signals real human experience `[Standard]`
- [ ] Named credentials for any content author — "anonymous content is a GEO penalty" `[Premium]`

---

## 16 — SERP Feature Targeting

> Different SERP features require different content and technical signals. Target only the features that appear for your client's target queries (check via intent analysis in Section 1).

### Featured Snippets

- [ ] For informational queries: H2 question heading → 40–60 word direct answer → supporting list or table `[Standard]`
- [ ] Paragraph snippets: single paragraph of 40–60 words, starting with the keyword, directly answering the question `[Standard]`
- [ ] List snippets: `<ul>` or `<ol>` with 5–8 concise items immediately following a question heading `[Standard]`
- [ ] Table snippets: `<table>` with clear column headers for comparison queries `[Standard]`
- [ ] Featured snippet content is in the first 1,000 words of the page `[Standard]`
- [ ] **Featured snippet is the strongest predictor of Google AI Overview inclusion** — if the page is the featured snippet for a query, it is very likely to appear in AI Overview for that query `[Standard]`

### People Also Ask (PAA)

- [ ] PAA questions mined from SERP during intent analysis `[Standard]`
- [ ] Each PAA question answered in a dedicated H3 or within a FAQ section `[Standard]`
- [ ] `FAQPage` schema added when PAA-style Q&A format is used — increases eligibility for PAA boxes `[Standard]`

### Local Pack

- [ ] Google Business Profile created and optimised `[Local · Standard]`
- [ ] LocalBusiness schema complete with `geo`, `openingHoursSpecification`, `priceRange` `[Local · Standard]`
- [ ] Reviews actively collected and responded to — review count and recency are Local Pack ranking factors `[Local · Standard]`
- [ ] NAP consistent across all citations and the website `[Local · Base]`

### Image Pack

- [ ] Images have descriptive filenames, alt text, and `<figcaption>` `[Standard]`
- [ ] `ImageObject` schema on key images `[Premium]`
- [ ] Images submitted in sitemap `[Premium]`

### Video Carousel

- [ ] `VideoObject` schema present on pages with video `[Premium]`
- [ ] Video has `thumbnailUrl`, `description`, `uploadDate`, `duration` in schema `[Premium]`
- [ ] Video hosted on YouTube or embedded from YouTube — Google indexes YouTube content for Video Carousel `[Premium]`

---

## 17 — Monitoring & Tracking

> Tracking is not optional for ongoing SEO. Without baseline data, improvements cannot be measured and regressions cannot be detected.

### Setup (day 1 of any engagement)

- [ ] Google Search Console verified and sitemap submitted `[Base]`
- [ ] Bing Webmaster Tools verified and sitemap submitted `[Standard]`
- [ ] Google Analytics 4 or equivalent installed and tracking page views `[Standard]`
- [ ] GA4 goals/conversions configured — track form submissions, CTA clicks, and contact initiations `[Standard]`
- [ ] Baseline report captured — current ranking positions, organic traffic, CWV scores documented before starting work `[Standard]`

### Ongoing monitoring

- [ ] GSC checked monthly — Coverage, CWV, Manual Actions, Search Performance `[Standard]`
- [ ] GSC CWV report checked — field data, not lab; flag any new LCP/CLS/INP regressions `[Standard]`
- [ ] Rank tracking configured — top 10 target keywords tracked weekly; position changes caught early `[Standard]`
- [ ] Uptime monitoring active — site downtime causes crawl errors and, over time, ranking drops `[Standard]`
- [ ] **Core Update monitoring** — Google releases broad core updates ~4× per year; track organic traffic in GA4 around confirmed update dates; investigate if traffic drops >20% `[Standard]`
- [ ] **AI citation monitoring** — periodically query target topics in ChatGPT, Perplexity, and Google AI Overviews; verify the brand/site is mentioned correctly and content is attributed accurately `[Premium]`
- [ ] Structured data errors monitored in GSC → Enhancements — schema errors suppress rich results `[Standard]`

---

## 18 — AEO — Answer Engine Optimization

### Content structure for AI parsing

- [ ] First paragraph is 40–80 words and directly answers the page topic — featured snippet format `[Standard]`
- [ ] First 200 words contain topic/primary keywords `[Standard]`
- [ ] **Passage indexing readiness** — each H2 section is self-contained and independently answerable; optimal AI citation passage length is 134–167 words (distinct from the 40–60 word featured snippet; different mechanisms) `[Standard]`
- [ ] At least one FAQ section on content-heavy pages `[Standard]`
- [ ] Question-style headings: H2/H3 phrased as questions ending in "?" `[Standard]`
- [ ] Concise answer paragraphs immediately follow each question heading — 40–80 words max per answer `[Standard]`
- [ ] At least 6 well-structured content sections `[Standard]`
- [ ] Step-by-step content present where applicable `[Standard]`
- [ ] Key Takeaways / Summary section present `[Premium]`
- [ ] Table of Contents with anchor jump links `[Premium]`
- [ ] Average 200+ words per H2 section `[Premium]`

### Semantic HTML for AI comprehension

- [ ] Definition lists (`<dl>`, `<dt>`, `<dd>`) for term/value pairs — highest AEO signal for definitions `[Premium]`
- [ ] `<details>`/`<summary>` for expandable Q&A content `[Premium]`
- [ ] `<code>`/`<pre>` for technical content `[Standard]`
- [ ] Data tables for comparisons, pricing, or specs `[Standard]`
- [ ] At least 5 HTML lists (`<ul>` or `<ol>`) `[Standard]`
- [ ] `<figure>`/`<figcaption>` on all meaningful images `[Standard]`
- [ ] `<time datetime="...">` on all dates `[Standard]`

### Content formatting for AI extraction

- [ ] Key-value patterns: **Label:** value — AI reads bold labels as field names `[Standard]`
- [ ] Specific data points with units `[Standard]`
- [ ] Minimum 5 statistics or data points `[Standard]`
- [ ] Source citations on all statistics `[Premium]`
- [ ] Active voice dominant — under 20% passive voice `[Standard]`
- [ ] 100% concise paragraphs — no paragraph exceeds 150 words `[Standard]`

### AI discoverability & access

- [ ] `robots.txt` explicitly allows: GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Amazonbot, Meta-ExternalAgent, Bytespider, YouBot `[Base]`
- [ ] **WAF / Cloudflare not blocking AI crawlers at network level** — robots.txt rules are irrelevant if AI crawler IPs are blocked by firewall; verify with server access logs `[Standard]`
- [ ] `/llms.txt` present and correctly structured: H1 (site name) → blockquote summary (40–80 words) → H2 sections with absolute URLs — malformed llms.txt is worse than no llms.txt `[Standard]`
- [ ] `/llms-full.txt` present — concatenated full text of all key pages; Perplexity reads this directly `[Premium]`
- [ ] No `nosnippet` or `max-snippet:0` on content pages `[Base]`
- [ ] `Last-Modified` HTTP header present — freshness signal `[Standard]`
- [ ] `dateModified` in schema — freshness signal `[Standard]`
- [ ] Content updated within 6 months — minimum freshness threshold `[Standard]`
- [ ] Content updated within 90 days — 3.2× more AI citations `[Premium]`
- [ ] Content references current year `[Standard]`
- [ ] **Prompt injection resistance** — content on publicly indexed pages does not contain hidden instructions attempting to manipulate AI systems; Google and AI platforms are now explicitly filtering for this *(security-adjacent: if pages render user-generated content, the Security master's input-validation and output-encoding controls own the injection surface — this item is the SEO-side check that your own published content stays clean so AI doesn't distrust it)* `[Base]`

### Platform-specific AEO

- [ ] **ChatGPT Browse (OAI-SearchBot)** — allow in robots.txt; OAI-SearchBot is the search/retrieval bot (no training concern); GPTBot is the training crawler; they are distinct `[Base]`
- [ ] **Perplexity** — allow PerplexityBot; Perplexity reads llms-full.txt if present; citation-rich content with named sources is most frequently cited `[Standard]`
- [ ] **Bing Copilot** — Bing Webmaster Tools verified; sitemap submitted; IndexNow configured; Copilot answers draw from Bing's index `[Standard]`
- [ ] **Google AI Overviews** — featured snippets are the strongest predictor of AI Overview inclusion; FAQPage schema and E-E-A-T signals are secondary signals; Google-Extended must not be blocked `[Standard]`
- [ ] **Zero-click optimization** — brand is positioned as a direct answer in content ("Qera Studio is a systems-first digital studio that...") — if AI quotes the page, the answer should include the brand name naturally `[Standard]`

### Schema for AEO

- [ ] `FAQPage` schema with all Q&A pairs `[Standard]`
- [ ] `Speakable` schema — voice-search ready sections `[Premium]`
- [ ] `SearchAction` / `WebSite` schema with `potentialAction` `[Standard]`
- [ ] `Organization` schema with `sameAs` pointing to 6+ social profiles `[Standard]`

### E-E-A-T for AEO

- [ ] Author schema (`Person` with `jobTitle`, `url`, `sameAs`) `[Standard]`
- [ ] Publication date and last-modified date both visible on page and in schema `[Standard]`
- [ ] 7+ external links to authoritative sources `[Standard]`
- [ ] 18+ named entities in content (real people, places, organisations) `[Premium]`

---

## 19 — GEO — Generative Engine Optimization

### Content depth & AI Overview eligibility

- [ ] Minimum 1,000–1,500 words for AI Overview target pages `[Premium]`
- [ ] First 200 words contain primary topic keywords `[Standard]`
- [ ] Title and H1 share core terms `[Standard]`
- [ ] At least 4 Q&A-style headings `[Standard]`
- [ ] Conclusion or verdict section present `[Standard]`
- [ ] Actionable content throughout — prescriptive, step-by-step `[Standard]`
- [ ] Multi-perspective content ("on the other hand...", "alternatively...") `[Premium]`
- [ ] Comparison / "vs." sections with tables `[Premium]`
- [ ] Original data or proprietary research signals `[Premium]`
- [ ] Expert quotes with named credentials `[Premium]`
- [ ] Real-world examples or case studies `[Premium]`

### Content authority signals

- [ ] Source citations linking to authoritative domains `[Standard]`
- [ ] At least 7 unique external domains linked `[Standard]`
- [ ] Author schema with `knowsAbout`, `jobTitle`, `sameAs` `[Standard]`
- [ ] Author credentials stated in text explicitly `[Standard]`
- [ ] 5+ statistics with units and named sources `[Standard]`
- [ ] 8+ authoritative `sameAs` links in schema (Wikipedia, LinkedIn, Crunchbase, government registries) `[Premium]`

### Brand & entity for GEO

- [ ] Brand name consistent across: title tag, `og:site_name`, Organization schema `name`, all social profiles `[Base]`
- [ ] **Entity disambiguation** — brand name paired with a unique descriptor ("Qera Studio — digital studio for service businesses, Dubai") to prevent AI systems from misidentifying or conflating the brand with other entities that have similar names `[Standard]`
- [ ] **Knowledge Graph establishment** — Wikidata entry created with brand's `@id` URL, founding date, location, and service description; cross-referenced with Wikipedia if applicable; Wikidata is the strongest Knowledge Graph verification source available to SMBs `[Premium]`
- [ ] 6+ `sameAs` social profile links in Organization schema `[Standard]`
- [ ] 8+ authoritative `sameAs` links `[Premium]`

### GEO content architecture

> **Caveat on the correlation figures below (Reddit ~0.7, YouTube ~0.737):** these come from individual third-party GEO studies, not settled or independently replicated metrics. Treat them as **directional** — Reddit and YouTube presence plausibly help AI citation, and the relative ranking is useful — but do not quote the specific decimals to a client as established fact. The *mechanism* (independent third-party corroboration of your brand) is sound; the precise number is one study's finding and will shift.

- [ ] **AI freshness architecture** — high-priority pages have a documented content review schedule; freshness metadata (`dateModified`, `Last-Modified` header, sitemap `<lastmod>`) reflects actual content update dates `[Standard]`
- [ ] **Temporal consistency** — if content references dates, events, or statistics, they are consistent across all mentions on the page; AI systems check for temporal contradictions as a credibility signal `[Standard]`
- [ ] **Reddit signals** — for informational content, Reddit threads discussing the same topic cite similar brands; encourage brand mentions and participation in relevant subreddits (~0.7 correlation with ChatGPT/Perplexity citations) `[Premium]`
- [ ] **YouTube presence** — video content on YouTube discussing the brand or service area; YouTube has ~0.737 correlation with AI citation frequency — the highest published GEO signal `[Premium]`

### GEO monitoring

- [ ] **Brand mention monitoring** — set up alerts (Google Alerts, Mention.com) for brand name; monitor AI citation accuracy `[Standard]`
- [ ] **AI citation audit** — monthly: query target topics in ChatGPT, Perplexity, and Google AI Overviews; verify the brand is cited and content is attributed correctly; flag any factual errors in AI-generated descriptions of the brand `[Premium]`
- [ ] **Brand accuracy audit** — if AI systems consistently describe the brand inaccurately, update the brand's Wikipedia/Wikidata entry, About page, and Organization schema to correct the authoritative source `[Premium]`

### Schema for GEO

- [ ] `FAQPage` schema — critical for Google AI Overview eligibility `[Standard]`
- [ ] `Author` / `Person` schema — required for AI trust `[Standard]`
- [ ] `BreadcrumbList` schema `[Standard]`
- [ ] `Organization` schema complete with all properties `[Standard]`
- [ ] At least 7 schema types across the site `[Premium]`
- [ ] `@id` properties for entity cross-referencing `[Premium]`
- [ ] `og:locale` set alongside `html lang` `[Standard]`

### Technical GEO signals

- [ ] `max-image-preview:large` in robots meta `[Standard]`
- [ ] Open Graph fully configured: title, description, image, url, type, site_name, locale `[Standard]`
- [ ] Content freshness signals: `Last-Modified` header + `dateModified` in schema `[Standard]`
- [ ] 3+ industry/domain-specific terminology — signals topical expertise to AI `[Standard]`
- [ ] Page size under 150 KB — lean pages process faster by AI crawlers `[Standard]`

---

## Business Type Addendums

> These items are **IN ADDITION** to the universal checklist above. Apply the relevant section(s) for your client's business model.
> - Local service business → Base + Standard + [Local]
> - E-commerce → Base + Standard + [Ecomm]
> - SaaS / software → Base + Standard + [SaaS]
> - Multi-region / multilingual → add [Intl] on top of any of the above
> - A client can have more than one type (e.g. a local e-commerce shop = [Local] + [Ecomm])

### [Local] — Brick-and-Mortar & Service-Area Businesses

- [ ] NAP (Name, Address, Phone) identical across all site pages, GBP, and every directory listing `[Base]`
- [ ] Google Business Profile listing created and verified `[Standard]`
- [ ] GBP listing has: logo, cover photo, services, business hours, and description `[Standard]`
- [ ] GBP URL added to `sameAs` in Organization/LocalBusiness schema `[Standard]`
- [ ] LocalBusiness schema includes `geo` with exact latitude and longitude `[Standard]`
- [ ] LocalBusiness schema includes `openingHoursSpecification`, `priceRange`, `areaServed` `[Standard]`
- [ ] Location page exists per physical location (one page per city/area) `[Standard]`
- [ ] Local keywords in title and H1 of location pages (city/area name + service) `[Standard]`
- [ ] Embedded map on location/contact page (Google Maps iframe) `[Standard]`
- [ ] Local phone number visible in header or above the fold `[Standard]`
- [ ] **Apple Maps** — submit business to Apple Maps Connect; Apple Maps feeds Siri and Spotlight results `[Standard]`
- [ ] **Yelp listing** created and claimed — Yelp is indexed by Bing and Apple Maps; reviews influence Local Pack signals `[Standard]`
- [ ] **Local Pack signals** — proximity (can't control), review count + recency, NAP citation consistency — focus on reviews and citations `[Standard]`
- [ ] Citation building — NAP listed on 5+ major local directories (Justdial, Sulekha, IndiaMart, Yelp, etc.) `[Premium]`
- [ ] Customer reviews/testimonials on-site, linked to Google/GBP review page `[Premium]`
- [ ] `AggregateRating` schema if 10+ reviews collected — includes `ratingValue`, `ratingCount`, `bestRating` — enables star ratings in SERP `[Standard]`

### [Ecomm] — E-Commerce

- [ ] `Product` schema on every product page — `name`, `image`, `description`, `sku`, `offers` (with `priceCurrency`, `price`, `availability`) `[Standard]`
- [ ] `BreadcrumbList` schema on all product and category pages `[Standard]`
- [ ] `AggregateRating` schema on products with reviews — `ratingValue`, `ratingCount`, `bestRating` — enables star ratings in SERP `[Standard]`
- [ ] `Review` schema for individual reviews `[Standard]`
- [ ] Product pages have unique title and meta description `[Standard]`
- [ ] Product images: minimum 4 angles, WebP format, descriptive alt text `[Standard]`
- [ ] Category pages have unique H1 and at least 100 words of descriptive content `[Standard]`
- [ ] `OfferCatalog` in Organization schema `[Standard]`
- [ ] Out-of-stock products use `availability: OutOfStock` in schema — do NOT remove the page; deleting product URLs creates 404s for indexed links `[Standard]`
- [ ] Google Merchant Center feed set up and verified `[Premium]`
- [ ] `ShippingDetails` schema with estimated delivery window `[Premium]`
- [ ] `ReturnPolicy` schema `[Premium]`

### [SaaS] — Software Products

- [ ] `SoftwareApplication` schema — `applicationCategory`, `operatingSystem`, `offers` (with pricing tiers) `[Standard]`
- [ ] Pricing page exists with clear tier breakdown `[Standard]`
- [ ] Pricing page has `Offer` or `PriceSpecification` schema `[Standard]`
- [ ] Product screenshot or demo video on homepage and features pages `[Standard]`
- [ ] Changelog or "What's New" page exists — signals active development `[Standard]`
- [ ] `FAQ` section covering pricing, security, and integrations `[Standard]`
- [ ] Integration/compatibility pages ("Works with Zapier, Slack, etc.") `[Premium]`
- [ ] Technical documentation or help centre indexed and not behind login `[Premium]`

### [Intl] — Multi-Region & Multilingual Sites

> Apply only when the site targets more than one country or language. Given Qera's India + Dubai footprint and internationally-trading clients, this is a recurring real need — but **incorrectly implemented hreflang is worse than none**: it can split authority, mis-serve the wrong-region page, or get ignored entirely. This is the most error-prone area in technical SEO, so treat every item as verify-don't-assume.

- [ ] **URL structure strategy chosen and documented** — ccTLD (`example.ae`), subdirectory (`example.com/ae/`), or subdomain (`ae.example.com`); subdirectory is usually best for SMBs (consolidates domain authority, cheapest to run); ccTLD only when strong local trust or a legal/physical presence justifies splitting authority `[Intl · Standard]`
- [ ] **hreflang annotations present and correct** — each localized page declares every language/region variant *including a self-reference*; format `hreflang="en-AE"`, `hreflang="ar"`, etc.; the single most error-prone item in international SEO `[Intl · Standard]`
- [ ] **`x-default` hreflang set** — points to the default/fallback page for users whose language or region isn't explicitly targeted `[Intl · Standard]`
- [ ] **hreflang is bidirectional (return tags present)** — if page A lists B as a variant, B must list A back; non-reciprocal hreflang is silently ignored by Google `[Intl · Standard]`
- [ ] **hreflang declared in ONE place only** — HTML `<head>` OR XML sitemap OR HTTP headers; never mix methods (conflicting signals) `[Intl · Standard]`
- [ ] **Language and region kept distinct** — `en-AE` (English for UAE) and `ar-AE` (Arabic for UAE) are different variants; targeting a region does not auto-translate; each variant has genuinely localized content `[Intl · Standard]`
- [ ] **No automatic IP/browser-language redirects** — let users and crawlers choose; auto-redirects can trap Googlebot (which crawls predominantly from the US) into only ever seeing one variant; use a visible region/language selector instead `[Intl · Standard]`
- [ ] **Localized content is genuinely localized** — currency, units, contact details, spelling (color/colour), examples, and legal/compliance references match the target region; thin machine-translated copy is a Helpful Content liability `[Intl · Standard]`
- [ ] **Geotargeting set where structure requires it** — for subdirectory/subdomain setups, set target country per section in GSC (International Targeting); not needed for ccTLDs (implicit) `[Intl · Standard]`
- [ ] **Per-region performance measured** — TTFB and Core Web Vitals checked *from each target region*, not just the home market; a CDN with regional PoPs covers most of this `[Intl · Standard]`
- [ ] **Locale formatting correct** — `og:locale` set per variant; visible currency, number, and date formats match the locale `[Intl · Standard]`
- [ ] **RTL support for Arabic/Hebrew targets** — `dir="rtl"` on the document; layout mirroring, alignment, and font rendering verified — directly relevant to Qera's UAE-facing work `[Intl · Standard]`
- [ ] **Cross-locale duplicate content handled via hreflang, not canonical** — near-identical `en-US` / `en-GB` / `en-AE` pages keep self-referencing canonicals and rely on correct hreflang to serve the right region; canonicalising all variants to one page de-indexes the others `[Intl · Premium]`

---

## Maintenance Schedule

> **Retainer pitch.** Initial setup (Base/Standard/Premium) is one-time work. The items below are recurring — use this section to scope monthly or quarterly retainer engagements.

### Monthly

- [ ] Core Web Vitals check — PageSpeed Insights on key pages; flag regressions in LCP, CLS, INP
- [ ] Broken internal link scan — crawl for 404s
- [ ] GSC coverage report — new crawling/indexing errors or excluded pages
- [ ] GSC Search Performance — track impressions, clicks, CTR, average position for top 20 queries
- [ ] Content freshness review — pages approaching the 90-day staleness threshold
- [ ] GBP listing check — no unauthorised edits; respond to new reviews `[Local]`
- [ ] AI citation spot-check — query 3–5 target topics in ChatGPT and Perplexity; verify brand citation accuracy `[Premium]`
- [ ] Uptime monitoring review — confirm zero downtime incidents in the month

### Quarterly

- [ ] Schema re-validation — all pages through Google Rich Results Test; fix warnings
- [ ] Security header audit — **owned by the Security master's quarterly schedule**; the SEO-side check is only that no header change has broken render/crawl (CSP not blocking scripts, HTTPS/HSTS intact)
- [ ] Full broken link scan — internal AND external links (external destinations change without notice)
- [ ] Redirect chain audit — no chains longer than 1 hop
- [ ] Soft 404 audit — GSC → Coverage → Crawled but not indexed; investigate
- [ ] Sitemap freshness — all new pages in sitemap; re-submitted to GSC and Bing Webmaster Tools
- [ ] Competitor benchmark — run a direct competitor through the same audit tools and compare scores
- [ ] DMARC aggregate report review — **owned by the Security master**; listed here only as a reminder it must happen (clean email auth indirectly supports deliverability and brand-trust signals)
- [ ] robots.txt review — any new major AI crawlers need to be explicitly allowed
- [ ] Accessibility check — Lighthouse accessibility score; fix new WCAG violations
- [ ] Backlink profile check — new inbound links; identify any new toxic links for disavow
- [ ] Rank tracking review — position changes for top 30 keywords; flag drops >5 positions
- [ ] `<lastmod>` accuracy audit — confirm sitemap `<lastmod>` dates reflect actual content changes
- [ ] **Core Update check** — if a broad core update landed in the quarter, compare pre/post traffic in GA4

### Annually

- [ ] Full SEO/AEO/GEO audit re-run — all tools (seoscore.tools, Framer AI, Lighthouse, GSC)
- [ ] Tier upgrade review — assess whether growth justifies next tier
- [ ] Schema version check — Schema.org and Google's supported types evolve; update deprecated types (see Notes → Deprecated Schema)
- [ ] Privacy policy and terms review — regulatory updates (GDPR, PDPL, DPDPA)
- [ ] Domain and SSL certificate expiry — confirm auto-renewal active
- [ ] Full backlink audit — toxic or spammy links; GSC Links report + Ahrefs disavow review
- [ ] Keyword mapping refresh — new keyword opportunities; cannibalisation re-check
- [ ] Brand entity audit — verify Wikipedia/Wikidata entry is accurate and up to date
- [ ] Hosting and infrastructure review — is the current stack still the right choice for traffic volume?

---

## Notes

### Deprecated Schema & Meta (do not implement)

| Type / Tag | Status | Notes |
|---|---|---|
| `HowTo` schema | **Deprecated** — September 2023 | Google discontinued HowTo rich results; schema still valid per schema.org but produces no SERP feature |
| `FAQPage` commercial | **Restricted** — August 2023 | Google restricted FAQPage rich results to government/healthcare SERP; commercial sites still benefit for AI/LLM citation and AEO but will NOT see SERP FAQ accordions |
| `rel="next"` / `rel="prev"` | **Deprecated** — 2019 | Google no longer uses pagination link hints; use canonical on page 1 and ensure paginated pages have unique content |
| `FID` (First Input Delay) | **Removed** — September 2024 | Replaced by INP; removed from all Google tools; do not reference or test FID |
| `<meta name="theme-color">` | **Ignore for ranking** | Chrome UI hint only; no SEO or AI ranking impact; include for PWA if needed |
| `<changefreq>` / `<priority>` in sitemap | **Ignored by Google** | Explicitly ignored; adds file size without benefit; do not include |
| `rel="alternate"` media=handheld | **Deprecated** | Old mobile/desktop split era; irrelevant with responsive design |
| `<meta name="keywords">` | **Ignored by Google** | Include removal of this tag in any audit; it is noise |

