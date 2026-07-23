# Master Design & Brand Checklist

> **READ THIS FIRST — what this document is, and the tension it resolves.**
> Design is **craft plus system**, not pure pass/fail. Security either has a CSP or it doesn't; "is this typography good?" is not that kind of question. So this document is a **hybrid**: an objective checklist where things are checklist-able (brand consistency, design-system completeness, token discipline, handoff fidelity, and the *where-design-yields* protocol), plus a **craft bar** — principles for the parts that are taste and judgement. **It is a floor and a system, not a substitute for design sense.** A build can pass every item here and still be mediocre; taste is the part no checklist supplies. What this doc guarantees is that the *system* is sound, the brand is *consistent*, the craft *floor* is met, and design *never breaks* a higher-ranked concern.
>
> **The reframe that shapes everything below:** in the precedence order, **Design ranks 7 — last.** It yields to every other concern. But Design is also **Qera's core product** — the thing clients actually buy. Those aren't contradictory: precedence rank is about *who wins a conflict*, not *what matters most to the business*. So this doc holds two jobs at once — a studio-grade craft bar, **and** a ruthless map of where the design instinct must bend. Great design works *inside* the constraints; the constraint usually produces the better design.
>
> **Purpose:** the single source of truth for brand identity, design systems, craft standards, and design process across every Qera project — and the documented home of Qera's own brand.
>
> **Status:** v1 — synthesised from brand-strategy practice, design-systems engineering, typographic and compositional craft, and the premium web-craft references Qera works to (Linear, Cloudflare, Swiss/International typographic style). Seventh-ranked document in the Qera master system. **Living document — design *trends* move fast; design *principles* (hierarchy, contrast, rhythm, restraint, systems thinking) are stable. Tooling specifics carry verify-flags. Review quarterly.**

---

## Master-Doc Precedence Protocol (replicated)

> Canonical copy with worked examples lives in the **Master Security Checklist**. Pasted here verbatim per Rule 1.

### Precedence order (highest wins on irreconcilable conflict)
1. **Legal & Compliance**
2. **Security**
3. **Accessibility**
4. **Data integrity / Backend correctness**
5. **Performance**
6. **SEO / AEO / GEO**
7. **Design & Brand preference** ← *this document*

### The three rules
1. **Ownership, not repetition.** Each concern's items live in their own doc; others cross-reference.
2. **Resolve before you rank.** Try the technique that satisfies both; only then does the higher-ranked doc win.
3. **Floor is never traded.**

### What ranking last means in practice — the "where design yields" protocol
Design loses every irreconcilable conflict. But **"resolve before you rank" applies hardest here** — the studio's job is to achieve the aesthetic *within* the constraint, not to fight it. The map:

- **Design yields to Legal (1):** type and assets must be *licensed* for the use (an unlicensed display face loses, however perfect — cross-ref Legal §11/§16); **no dark patterns, no misleading or deceptive design** (Legal §19 — disguised ads, fake urgency, sneak-into-basket, hard-to-find unsubscribe/cancel are prohibited, not "aggressive UX"). Brand/trademark in identity work cleared (Legal §11/§18).
- **Design yields to Security (2):** the UI never encourages credential exposure or hides security-relevant state for aesthetics; trust indicators and consent stay legible.
- **Design yields to Accessibility (3) — the constant tension:** **contrast minimums, visible focus states, ≥24px targets, colour-never-alone, and `prefers-reduced-motion` are owned by Accessibility and cannot be overridden by brand or aesthetic preference.** A palette that fails AA is adjusted, not shipped. A removed focus ring is a defect, not a style. **This is where the design instinct most often must bend — so accessibility enters at the design phase** (Accessibility `[Design]` addendum). The good news: accessible design is almost always *better* design.
- **Design yields to Backend correctness (4):** design can't assume data states that can't be served truthfully; design the real states (empty, partial, error), not just the happy-path mock with perfect data.
- **Design yields to Performance (5):** asset weight, web-font payload, image-heavy layouts, and animation cost live within the Performance budget (cross-ref Performance §2/§3/§11). Achieve the look *within budget* — restraint is usually the more premium choice anyway.
- **Design yields to SEO (6):** semantic structure and real content over decoration; headings are structural, not just styled text (cross-ref SEO/Accessibility §3).

> **The principle:** design is the servant of the other six, and a great studio makes that servitude invisible — the work looks effortless precisely because it respected every constraint. When a conflict feels like a loss, it's usually a brief that wasn't solved hard enough.

---

## How this document is tiered — read before using

Tiering mirrors the other client-facing docs (SEO/Performance/Accessibility). Design is mostly additive — higher tiers add polish and system depth — but it has a **non-negotiable floor**: regardless of budget, some things are never acceptable (off-brand inconsistency, broken hierarchy, illegible contrast, undesigned error/empty states, dark patterns). Those are marked **(non-negotiable)**.

> **Tier tags (on every item):**
> - `[Base]` — required for any project: on-brand, consistent, legible, functional, with the real states designed. The floor of professional work. Items marked **(non-negotiable)** apply at any budget.
> - `[Standard]` — polished craft and a working design system: considered typography and spacing, full component states, purposeful motion, dark mode where relevant. The expected bar for Qera's positioning.
> - `[Premium]` — distinctive, award-level craft: a complete brand system with motion identity, the Linear/Cloudflare-tier detail and choreography, bespoke art direction, and the polish that makes work feel inevitable.
>
> *Qera's "premium but calm, systems-first" positioning means **Standard is the floor Qera should hold even on Base budgets where possible** — restraint and system make modest budgets look premium.*

> **Verify — different here.** Design is partly subjective, so verification is **review-based, not tool-based**, except where it isn't:
> - **Objective (tool-checkable):** contrast (cross-ref Accessibility), token consistency, brand-asset correctness, handoff completeness, responsive behaviour → *Verify* with tools/specs.
> - **Subjective (judgement):** hierarchy, craft, taste → *Verify* via **structured critique** (§20) and **design QA against intent** (§21). Two senior eyes beat any checklist for the craft layer.

> **Deliverable addendums** (design varies by output more than the tech docs): `[Identity]` (brand/logo systems), `[Web/UI]` (websites & product), `[Marketing/Social]` (campaigns, social, ads), `[Decks]` (presentations & pitch). Apply the relevant one(s).

> **How to use this for a new project:**
> 1. **Strategy before pixels (§1)** — positioning and brief first; design without strategy is decoration.
> 2. **Floor (incl. non-negotiables) is automatic** — on-brand, consistent, legible, real states designed.
> 3. **Build/extend the system, don't freestyle (Part B)** — tokens and components, not one-off screens.
> 4. **Hold the craft bar (Part C)** — the difference between "fine" and "Qera."
> 5. **Respect where design yields** — run the precedence protocol; bend the aesthetic to the constraint and make it look effortless.
> 6. **Hand off and QA rigorously (Part D)** — the design isn't done until the *built* thing matches the intent.

---

# PART A — BRAND

## 1 — Brand Strategy Foundations

> Identity without strategy is decoration. These are the inputs (per client/project) that every visual decision should trace back to.

- [ ] **Positioning defined** — what the brand is, for whom, and why it's different; the single idea the identity must express. `[Base]`
- [ ] **Audience understood** — who it speaks to, and what they value/feel; design serves them, not the founder's taste. `[Base]`
- [ ] **Brand personality / attributes** — 3–5 adjectives that the visual and verbal identity must embody and that resolve disagreements ("is this *us*?"). `[Base]`
- [ ] **Brand promise / value** — the outcome/feeling the brand delivers (ties to Qera's "sell outcomes, not tools" ethos). `[Standard]`
- [ ] **Competitive/visual landscape mapped** — so the identity is *distinctive*, not a category cliché. `[Standard]`
- [ ] **Strategy documented and signed off before design** — the brief is the contract; design is judged against it, not against taste. `[Base]` **(non-negotiable as a process step)**

---

## 2 — Brand Identity: Logo & Marks

- [ ] **Primary logo + necessary variations** — full lockup, secondary/stacked, icon/symbol, monochrome, reversed (light/dark) — the set the brand actually needs across contexts. `[Base]`
- [ ] **Construction & clearspace defined** — minimum clear space and the geometric/optical rationale; protects the mark in application. `[Standard]`
- [ ] **Minimum sizes specified** — smallest legible size per variation (print + screen). `[Standard]`
- [ ] **Favicon / app icon / social avatar** — the mark works at 16–32px and in a circle/square crop; a logo that dies at favicon size is incomplete. `[Base]`
  - [ ] **Solid background behind the mark, not transparent** — a transparent-background favicon/app-icon renders inconsistently across browser tabs, OS chrome, and app switchers (compare: Apple's own favicon sits on solid white and reads cleanly everywhere). Google's own favicon guidance explicitly flags transparent backgrounds as a common failure mode for SERP favicon display. `[Base]` — gap confirmed 2026-07-21: every current favicon/app-icon asset on qera.studio uses a transparent/raw background.
  - [ ] **PWA maskable icon has a real safe-zone variant, not a reused flat file** — Android adaptive icons crop maskable-purpose icons into a circle/squircle/rounded-square at install time; the logo must be kept within the inner ~80% safe zone (a centered circle at 40% of the icon's size) or it gets clipped. A single flat square file reused for both `"purpose": "any"` and `"purpose": "maskable"` in the manifest is not a valid maskable icon. `[Standard]` — gap confirmed 2026-07-21: `manifest.json` marks `favicon-192.png`/`favicon-512.png` as `"maskable"` but they're the same flat file used for `"any"`, with no safe-zone padding.
  - [ ] **`favicon.ico` is a proper multi-resolution container** — bundles 16×16, 32×32, and 48×48 in one `.ico` file (legacy browsers/Windows pick whichever embedded size fits); a single-resolution `.ico` is incomplete. `[Base]` — gap confirmed 2026-07-21: `src/app/favicon.ico` contains only one 32×32 layer.
  - [ ] **SVG favicon considered** — modern browsers support `<link rel="icon" type="image/svg+xml">`, rendering crisp at any zoom/DPI and optionally auto-adapting to light/dark tab chrome via embedded CSS; increasingly treated as the primary favicon with PNG/ICO as fallback rather than an extra. `[Standard]` — not present today; not yet in scope on any site here, worth adding alongside the white-bg revamp since it's the same asset-generation pass.
  - [ ] **Legacy formats (Safari pinned-tab `mask-icon`, Windows `browserconfig.xml`/`mstile`) explicitly scoped in or out** — both are largely dead outside legacy enterprise Windows/old Safari; don't build them by default, but note the decision rather than silently omitting. `[Premium]` — not present today; treat as correctly-low-priority unless a specific need surfaces.
- [ ] **Misuse rules documented** — don't stretch/recolour/rotate/add-effects/place-on-busy-bg; the "don'ts" prevent brand erosion in client hands. `[Standard]`
- [ ] **Logo files delivered in correct formats** — SVG (web), vector source, raster exports at sizes; organised and named. `[Base]`
- [ ] **Optical correctness** — the mark is *optically* balanced and aligned, not just mathematically (the craft difference). `[Premium]`

---

## 3 — Brand Identity: Colour

> Colour carries more brand recognition than any other element. Build it as a *system* with roles, not a swatch pile. **Accessibility owns the contrast minimums (§ cross-ref) — design works within them.**

- [ ] **Palette defined with roles, not just values** — primary, secondary, accent, neutrals, and semantic (success/warning/error/info); each colour has a *job*. `[Base]`
- [ ] **Accessible pairings verified at design time** — text/background and UI pairs meet WCAG AA (4.5:1 / 3:1) *as used*; **this is non-negotiable and owned by Accessibility** — adjust the palette, don't ship failing contrast. `[Base]` **(non-negotiable — Accessibility-owned)** *(Verify: contrast checker / Stark on real pairs.)*
- [ ] **Neutral scale considered** — a proper grey/neutral ramp (not pure #000/#FFF dumped); the unsung backbone of premium UI. `[Standard]`
- [ ] **Dark mode (where relevant) is a designed variant** — not an auto-invert; semantic tokens remap intentionally. `[Standard]`
- [ ] **Colour never the sole carrier of meaning** — paired with text/shape (Accessibility-owned, § cross-ref). `[Base]` **(non-negotiable)**
- [ ] **Usage ratios / do's & don'ts documented** — dominant vs accent proportions; restraint prevents the rainbow problem. `[Standard]`
- [ ] **Colour expressed as tokens** — so it's systematic and themeable (Part B §9). `[Standard]`

---

## 4 — Brand Identity: Typography

> Type does most of the work in modern brand and UI. **Licensing is owned by Legal (§11/§16); web-font performance by Performance (§3) — design specifies the system within both.**

- [ ] **Type system defined** — display/heading + body + (optional) mono; chosen for character *and* legibility, with a clear pairing rationale. `[Base]`
- [ ] **Licensing confirmed for every weight & medium** — web-embedding + commercial + the client's use; self-hosting requires the right licence (cross-ref Legal §11, Performance §3 self-host). An unlicensed face is a legal defect, not a style choice. `[Base]` **(non-negotiable — Legal-owned)**
- [ ] **Type scale & hierarchy** — a modular scale (not arbitrary sizes); defined roles (H1…body…caption) with size/weight/leading/spacing. `[Base]`
- [ ] **Web-font performance respected** — WOFF2, subset, `font-display`, weight count justified, variable fonts where multi-weight (cross-ref Performance §3). `[Standard]`
- [ ] **Fallback stack & metrics matched** — graceful system fallback; fallback metrics matched to avoid layout shift (cross-ref Performance/Accessibility). `[Standard]`
- [ ] **Body text legibility** — measure (~45–75 chars), leading ~1.5, adequate size; readability is non-negotiable (cross-ref Accessibility §18). `[Base]` **(non-negotiable)**
- [ ] **Typographic craft applied (Part C §14)** — tracking, optical alignment, widows/orphans. `[Premium]`

---

## 5 — Brand Identity: Imagery, Art Direction & Iconography

- [ ] **Art-direction style defined** — photography and/or illustration approach (mood, colour treatment, composition rules) so imagery feels *one brand*. `[Standard]`
- [ ] **Icon system coherent** — one style (stroke weight, corner radius, grid, optical sizing); not a mixed-source grab-bag. `[Standard]`
- [ ] **Imagery rights clean** — every photo/illustration/icon licensed for the use; **AI-generated imagery rights/ToS confirmed** (cross-ref Legal §11/§17). `[Base]` **(non-negotiable — Legal-owned)**
- [ ] **Imagery accessible** — meaningful images get meaningful alt; decorative marked decorative (cross-ref Accessibility §1). `[Base]`
- [ ] **Image performance** — formats, sizing, compression within budget (cross-ref Performance §2). `[Standard]`
- [ ] **Distinctive art direction** — imagery that couldn't belong to a competitor; the difference between stock-feel and brand-feel. `[Premium]`

---

## 6 — Brand Voice, Tone & Messaging

> Verbal identity is half the brand. Ties to Qera's copy work (e.g. the approved studio voice — plain, sharp, outcome-led).

- [ ] **Voice attributes defined** — how the brand *sounds* (3–5 traits), with do/don't examples. `[Standard]`
- [ ] **Tone range mapped** — how voice flexes by context (error vs celebration vs marketing). `[Standard]`
- [ ] **Messaging hierarchy / key lines** — value proposition, key messages, and approved lines for consistency. `[Standard]`
- [ ] **UX copy follows voice and is clear** — microcopy, errors, empty states, CTAs in-voice and plain (cross-ref Accessibility §18 clarity). `[Base]`
- [ ] **No misleading or manipulative copy** — claims honest and substantiated; no dark-pattern wording (cross-ref Legal §19). `[Base]` **(non-negotiable — Legal-owned)**

---

## 7 — Motion & Brand Animation Identity

> Signature motion is a brand asset (Qera's craft area). **Accessibility owns `prefers-reduced-motion`; Performance owns the cost — design owns the choreography within both.**

- [ ] **Motion principles defined** — easing curves, duration ranges, and *why* things move (clarity/feedback/delight), so motion is consistent, not ad-hoc. `[Standard]`
- [ ] **Signature interactions identified** — the few branded moments that express personality (cross-ref the GSAP/ScrollTrigger craft). `[Premium]`
- [ ] **Reduced-motion variant designed for every effect** — a *designed* calm experience, owned by Accessibility (§16) — non-negotiable. `[Standard]` **(non-negotiable for motion — Accessibility-owned)**
- [ ] **Motion within performance budget** — compositor-only, 60fps on mid devices (cross-ref Performance §11). `[Standard]`
- [ ] **Motion is purposeful, not decorative noise** — restraint; motion that aids comprehension over motion that shows off. `[Standard]`

---

## 8 — Brand Governance & Consistency

> A brand is only as strong as its consistency across touchpoints. This is the system that keeps it intact in the client's hands.

- [ ] **Brand guidelines documented and delivered** — the living reference (logo, colour, type, imagery, voice, motion, do/don't); the artefact that lets the client stay on-brand. `[Standard]`
- [ ] **Organised, versioned asset library** — single source of truth for logos/fonts/templates; clear naming; the client can find and use the right file. `[Standard]`
- [ ] **Consistency across all touchpoints** — web, social, email, deck, print share one identity (this is where most brands fray). `[Base]`
- [ ] **Brand QA before delivery** — a final pass: is everything on-brand, consistent, and correct? `[Base]`
- [ ] **Templates for recurring outputs** — social, deck, email templates so the client/team stays consistent at speed (and a retention/retainer hook). `[Standard]`

---

# PART B — DESIGN SYSTEM

## 9 — Design Tokens

> The systems-first foundation Qera is built on. Tokens make design *consistent, themeable, and code-parity-able* — the difference between a system and a pile of screens.

- [ ] **Core token sets defined** — colour, typography, spacing, radius, shadow/elevation, motion (duration/easing), z-index, breakpoints. `[Standard]`
- [ ] **Semantic (alias) tokens layered over primitives** — `color.bg.surface` → `neutral.50`, so theming/dark-mode/rebrands change once. The mark of a real system. `[Standard]`
- [ ] **Spacing as a scale, not arbitrary values** — a base unit and a consistent scale (e.g. 4/8px rhythm); no magic numbers. `[Base]`
- [ ] **Tokens are the single source of truth for both design and code** — Figma variables ↔ code tokens stay in sync (Style Dictionary / Tokens Studio / DTCG format). `[Premium]` *(Verify: a token change propagates to both.)*
- [ ] **No hardcoded values that should be tokens** — hex/px scattered in components is system rot (cross-ref the "hardcoded values" audit in the design-system skill). `[Standard]` *(Verify: scan for stray hardcoded values.)*

---

## 10 — Layout & Grid System

- [ ] **Grid & layout system defined** — columns/gutters/margins, and how layout adapts; structure, not freehand placement. `[Standard]`
- [ ] **Spacing rhythm consistent** — vertical and horizontal spacing follow the scale (§9); rhythm is what makes a page feel composed. `[Base]`
- [ ] **Responsive strategy defined** — breakpoints and how layout/typography reflow; mobile-first, content-out (cross-ref Accessibility §3 reflow, Performance). `[Base]` **(non-negotiable: must work responsively)**
- [ ] **Whitespace used deliberately** — density and breathing room are design decisions; restraint reads as premium (the Swiss/Linear discipline). `[Standard]`
- [ ] **Alignment and optical adjustment** — elements align to the grid *and* are optically corrected where math and eye disagree. `[Premium]`

---

## 11 — Component Library & Patterns

- [ ] **Components defined with all states** — default/hover/focus/active/disabled/loading/error/empty; **states are designed, not assumed** (cross-ref Accessibility §12/§13). `[Base]` **(non-negotiable: design the real states)**
- [ ] **Variants & props documented** — sizes/kinds/configurations a component supports; consistent across the system. `[Standard]`
- [ ] **Patterns for composite UI** — forms, tables, modals, navigation built from components, following accessible patterns (cross-ref Accessibility §14/§15). `[Standard]`
- [ ] **Figma ↔ code parity** — the design library and the coded components match; drift here is where systems die. `[Premium]` *(Verify: built component matches the design source.)*
- [ ] **Components documented** — usage, do/don't, accessibility notes (cross-ref the design-system skill). `[Standard]`

---

## 12 — Design System Governance

- [ ] **Consistent naming conventions** — predictable, scalable names for tokens/components/styles; naming inconsistency is the most common system smell. `[Standard]` *(Verify: naming audit.)*
- [ ] **Single source of truth established** — one canonical library; no competing copies. `[Standard]`
- [ ] **Documentation maintained** — the system is usable by others because it's documented, not tribal knowledge. `[Standard]`
- [ ] **Contribution & versioning process** — how the system evolves without fragmenting; versioned changes. `[Premium]`
- [ ] **Deprecation handled** — old patterns retired, not left to rot alongside new ones. `[Premium]`

---

# PART C — CRAFT BAR

> The difference between "fine" and "Qera." These are the judgement-and-taste items — verified by critique (§20), not a tool. Calibrated to the premium references the studio works to (Linear, Cloudflare, Swiss/International style).

## 13 — Visual Hierarchy & Composition
- [ ] **Clear focal point and reading path** — the eye knows where to go first; one primary action per view. `[Base]`
- [ ] **Hierarchy through scale, weight, colour, space** — not everything shouting; contrast of elements creates order. `[Base]`
- [ ] **Balance and intentional composition** — asymmetry and tension used deliberately; nothing accidental. `[Standard]`
- [ ] **Alignment is rigorous** — everything aligns to *something*; misalignment is the fastest "amateur" tell. `[Base]` **(non-negotiable)**
- [ ] **Optical adjustments over mechanical** — centring, spacing, and sizing corrected for the eye, not just the math. `[Premium]`

## 14 — Typography Craft
- [ ] **Measure controlled** — line length ~45–75 chars for body; not full-bleed paragraphs. `[Standard]`
- [ ] **Leading & spacing tuned** — line-height suits size/measure; headings tightened, body opened. `[Standard]`
- [ ] **Tracking adjusted where needed** — large display tightened, all-caps/small text opened. `[Premium]`
- [ ] **Widows/orphans and ragging managed** — no lonely words; balanced ragged edges in display copy. `[Premium]`
- [ ] **Optical alignment of type** — punctuation/hanging adjusted; type aligns to the eye. `[Premium]`
- [ ] **Hierarchy within text is clear and restrained** — limited, consistent type roles; not a ransom note. `[Base]`

## 15 — Spacing, Rhythm & Grid Discipline
- [ ] **Consistent spacing scale applied** — from the token scale (§9); no eyeballed gaps. `[Base]`
- [ ] **Vertical rhythm** — consistent spacing relationships down the page. `[Standard]`
- [ ] **Density appropriate to context** — dense where scanning, generous where focus; deliberate, not default. `[Standard]`
- [ ] **Grouping reflects relationships** — proximity communicates structure (Gestalt); related things sit together. `[Base]`

## 16 — Colour & Contrast Craft
- [ ] **Restraint** — a disciplined palette; accent used sparingly for impact. `[Standard]`
- [ ] **Semantic, consistent colour use** — colour means the same thing everywhere. `[Base]`
- [ ] **Accessible by design** — contrast met as a craft default, not a remediation (cross-ref Accessibility §4). `[Base]` **(non-negotiable)**
- [ ] **Dark mode crafted, not inverted** — considered surfaces/elevation in dark (§3). `[Standard]`

## 17 — Micro-interactions & Motion Craft
- [ ] **Motion is purposeful** — every animation aids feedback, continuity, or comprehension. `[Standard]`
- [ ] **Easing & timing feel right** — natural curves, appropriate durations (fast for feedback, slower for context). `[Standard]`
- [ ] **State transitions choreographed** — enter/exit/change feel intentional and consistent. `[Premium]`
- [ ] **Feedback on every interaction** — the UI always responds; no dead clicks. `[Base]`
- [ ] **Reduced-motion + performance respected** — (Accessibility §16 / Performance §11). `[Standard]` **(non-negotiable for motion)**

## 18 — Detail & Polish
- [ ] **Every state designed** — empty, loading, error, success, partial, zero-data, long-content, overflow (cross-ref §11). `[Base]` **(non-negotiable)**
- [ ] **Edge cases handled** — long names, missing images, huge numbers, RTL where relevant. `[Standard]`
- [ ] **Pixel/optical precision** — consistent radii, aligned edges, even spacing, crisp rendering. `[Standard]`
- [ ] **Responsive polish** — every breakpoint considered, not just desktop scaled down. `[Base]`
- [ ] **Consistency end-to-end** — the same care on page 10 as page 1; consistency *is* the craft. `[Standard]`
- [ ] **The "inevitability" test** — at Premium, the work feels like it couldn't be any other way (the Linear/Cloudflare quality). `[Premium]`

---

# PART D — PROCESS

## 19 — Design-to-Development Handoff

> The design isn't done when the mockup looks good; it's done when the *built* thing matches intent. Cross-ref the design-handoff skill.

- [ ] **Tokens, not screenshots** — handoff is the token system + specs, so build inherits the system (§9). `[Standard]`
- [ ] **All states & interactions specified** — including hover/focus/error/empty/loading and motion behaviour; devs shouldn't guess (cross-ref §11/§18, Accessibility). `[Base]` **(non-negotiable)**
- [ ] **Responsive behaviour specified** — what happens at each breakpoint, not just desktop. `[Base]`
- [ ] **Accessibility annotations included** — focus order, labels, alt intent, ARIA where needed (cross-ref Accessibility `[Design]` addendum). `[Standard]`
- [ ] **Assets exported and organised** — correct formats, optimised, named. `[Base]`
- [ ] **Edge cases & content extremes flagged** — long/short/empty content behaviour. `[Standard]`

## 20 — Design Critique & Review

> The verification method for the subjective layer. Structured critique beats any checklist for craft.

- [ ] **Critique against the brief, not taste** — does it solve the strategy (§1), not "do I like it"? `[Base]`
- [ ] **Structured feedback** — specific, on the work, prioritised by impact (cross-ref the design-critique skill); not vibes. `[Standard]`
- [ ] **Second senior eye before delivery** — the craft layer needs review; one designer misses what two catch. `[Standard]`
- [ ] **Accessibility & precedence reviewed at design stage** — catch contrast/focus/target/motion before build (cheaper than retrofit). `[Base]`

## 21 — Design QA & Build Fidelity

- [ ] **Built UI reviewed against the design** — spacing, type, colour, states, motion match intent; the "implemented design" review. `[Base]` *(Verify: side-by-side build vs design.)*
- [ ] **Cross-device / cross-browser fidelity** — the design holds on real devices, not just the design canvas. `[Standard]`
- [ ] **Interaction & motion match the spec** — easing/timing/behaviour as designed (within Performance/Accessibility). `[Standard]`
- [ ] **Final polish pass on the live build** — the last 5% that separates shipped-fine from shipped-Qera. `[Standard]`

---

# PART E — APPLICATION

## 22 — Qera's Own Brand Standard

> The canonical example, and the template structure for any client brand guideline. Qera's identity is the proof of the studio's standard — it must be the most rigorously consistent brand Qera touches.

- [ ] **Core palette locked & token-ised** — near-black `#1A1917` and signal-green `#A0EC06` as the defining pair, with a proper neutral ramp; roles defined; **contrast verified for every text pairing** (the green-on-dark / dark-on-green pairs checked against AA before use — Accessibility-owned). `[Base]` **(non-negotiable: verify contrast)**
- [ ] **Typography: Geist system** — defined scale, weights, and licensing confirmed for all media (cross-ref §4, Legal). `[Base]`
- [ ] **Aesthetic: Swiss minimalist / brutalist, systems-first** — restraint, strong grid, type-led, calm; "premium but calm, no AI hype" expressed visually. `[Standard]`
- [ ] **Motion identity consistent with the craft references** — purposeful, compositor-clean, reduced-motion-respecting (§7/§17). `[Standard]`
- [ ] **Applied consistently across Qera's own touchpoints** — site, social (the Swiss-minimalist content system), invoices/receipts/stipend slips, decks, proposals — one brand everywhere (the studio practising what it sells). `[Base]`
- [ ] **Qera brand guidelines maintained as the living reference** — and used as the structural template when producing client brand guidelines (§8). `[Standard]`
- [ ] **Voice: plain, sharp, outcome-led, no hype** — the approved studio voice applied consistently (§6). `[Standard]`

---

## Deliverable Addendums

### [Identity] — Brand Identity Projects
- [ ] Strategy → identity traceability (every visual choice traces to §1). `[Base]`
- [ ] Full mark set, colour, type, imagery, voice, motion (Part A). `[Standard]`
- [ ] Guidelines doc + organised asset library delivered (§8). `[Standard]`
- [ ] Application mockups proving the system in context. `[Standard]`
- [ ] Trademark/asset-licensing cleared (cross-ref Legal §11/§18). `[Base]` **(non-negotiable — Legal-owned)**

### [Web/UI] — Websites & Product
- [ ] Design system / tokens drive the build (Part B). `[Standard]`
- [ ] Every state & breakpoint designed (§11/§18). `[Base]` **(non-negotiable)**
- [ ] Accessibility designed-in (contrast/focus/target/motion — Accessibility `[Design]`). `[Base]` **(non-negotiable — Accessibility-owned)**
- [ ] Performance-aware (fonts/images/motion within budget — Performance). `[Standard]`
- [ ] Handoff + build-fidelity QA (Part D). `[Base]`

### [Marketing/Social] — Campaigns, Social, Ads
- [ ] On-brand templates and consistent system across formats (§8). `[Base]`
- [ ] Platform-correct sizing/safe-areas; legible at thumbnail. `[Base]`
- [ ] Claims honest; ads disclosed where required; no dark patterns (cross-ref Legal §19 — incl. UAE Advertiser Permit, ASCI/ACL disclosure). `[Base]` **(non-negotiable — Legal-owned)**
- [ ] Accessible content (contrast, captions on video, alt) (cross-ref Accessibility). `[Standard]`
- [ ] Distinctive art direction, not template-feel (the Swiss-minimalist content system). `[Premium]`

### [Decks] — Presentations & Pitch
- [ ] On-brand master template; consistent type/colour/spacing. `[Base]`
- [ ] Clear hierarchy per slide; one idea per slide; readable from the back. `[Base]`
- [ ] Accessible (contrast, reading order, alt) for shared/handed-off decks (cross-ref Accessibility §20). `[Standard]`
- [ ] Narrative flow and pacing, not just pretty slides. `[Standard]`

---

## Consultant Layer — Tooling & Scale

> What to tool and when system investment pays off. Core principle: **a design system is leverage, not overhead — but only when it'll be reused.** Don't build a 200-component system for a one-page site; don't freestyle a 40-screen product.

### Design & system tooling (adopt as the work demands)
- **Figma** — design + variables/tokens + libraries + dev mode handoff (the hub). `[Floor]`
- **Tokens:** Figma Variables → **Tokens Studio** / **Style Dictionary** (W3C DTCG format) for design↔code token sync. `[Growth]` (when a real system is reused)
- **Contrast/a11y in design:** **Stark** / contrast plugins (Accessibility-owned, use now). `[Floor]`
- **Handoff:** Figma Dev Mode (cross-ref the design-handoff skill). `[Floor]`
- **Motion:** prototype in Figma; spec real motion for GSAP/Framer Motion build (cross-ref Performance/Accessibility). `[Growth]`
- **Design system docs:** a documented library (Figma + a docs surface) once components are reused across projects. `[Growth]`

### Scale triggers
- **Brand guidelines doc** — worth it whenever the client (or Qera) needs consistency beyond the immediate deliverable.
- **Full design system + tokens** — worth it when the same patterns recur across pages/products/clients; premature for a single small site.
- **Component library (coded)** — when build reuse justifies it (product, multi-page, or a reusable Qera starter — ties to Qera's reusable-IP, Legal §18).
- **Motion identity** — Premium / brand-led projects where motion is part of the differentiation.

### A caution
- **Trend-chasing is not craft.** Adopting the current visual fad (whatever it is this quarter) dates fast; **systems and fundamentals (hierarchy, type, rhythm, restraint) age well.** Qera's "calm, systems-first" positioning is itself a hedge against trend decay — lean into it.
- **Decoration is not design.** If an element doesn't serve hierarchy, brand, usability, or meaning, it's noise — and noise usually costs performance and accessibility too.

**Bottom line:** most studios sell *visuals*; Qera sells *systems that happen to look excellent*. The design system and the craft bar are the moat — they're why the work is consistent, reusable, and hard to replace.

---

## Maintenance Schedule

> Brands and design systems drift — new screens freestyle off-system, tokens fork, the brand frays across touchpoints. A system unmaintained becomes a pile of screens again.

### Per-project (kickoff → delivery)
- [ ] Strategy/brief signed off before design (§1)
- [ ] Build on/extend the system, not one-offs (Part B)
- [ ] Craft-bar critique + second senior eye (§20)
- [ ] Precedence/accessibility reviewed at design stage
- [ ] Handoff complete + build-fidelity QA (Part D)

### Quarterly
- [ ] **Design-system health** — token/naming consistency audit; hardcoded-value and drift check (§9/§12)
- [ ] **Component library upkeep** — states current, deprecations cleared, Figma↔code parity (§11)
- [ ] **Brand-consistency audit** across Qera's own touchpoints (and active clients) (§8/§22)
- [ ] **This checklist reviewed** — refresh craft references and tooling; retire dated patterns

### Annually
- [ ] **Brand review** — does Qera's identity still express the positioning as the studio matures (§22)?
- [ ] **Design-system version review** — consolidate, prune, document
- [ ] **Craft-reference refresh** — re-baseline the bar against the current best work (without trend-chasing)

---

## Notes

### Verification — how to "check" subjective work
| Layer | Method |
|---|---|
| Brand consistency | Brand QA pass + asset/guideline check (§8) |
| Contrast / accessibility | Tools (Stark/contrast checker) — **Accessibility-owned**, objective |
| Token / naming / drift | Audit scan (§9/§12) |
| Hierarchy / craft / taste | **Structured critique against the brief** + second senior eye (§20) |
| Build fidelity | Side-by-side build vs design + real-device check (§21) |
| Handoff completeness | All states/breakpoints/annotations present (§19) |

### The craft references (the bar, not to copy)
Linear (restraint, system, motion craft), Cloudflare (technical-illustration craft), the Swiss/International typographic style (grid, type-led, objective clarity). **Reference the *quality and principles*, not the surface** — copying the look is trend-chasing; internalising the discipline is craft.

### Deprecated & Anti-Patterns (do NOT do)
| Practice | Why it's wrong | Instead |
|---|---|---|
| Low-contrast text "for aesthetics" | Illegible; fails Accessibility (rank 3 > 7) | Meet AA; design within it |
| Removing focus outlines | Excludes keyboard users (Accessibility-owned) | Designed visible focus state |
| Dark patterns (fake urgency, disguised ads, sneak-into-basket, hard-to-cancel) | Unlawful (Legal §19), erodes trust | Honest, clear design |
| Unlicensed fonts/assets for "the look" | Legal infringement (Legal §11/§16) | License, or choose a licensed alternative |
| Colour as the only meaning cue | Excludes colour-blind users | Add text/shape (Accessibility) |
| Centring everything / no hierarchy | No reading path; amateur tell | Deliberate hierarchy & alignment |
| Arbitrary spacing / magic numbers | System rot, inconsistency | Spacing scale / tokens (§9) |
| Font & weight overload | Visual noise, performance cost | Restrained type system |
| Decoration over function | Noise; costs performance + accessibility | Every element earns its place |
| Designing only the happy path | Real states ship broken | Design empty/error/loading/edge states |
| Trend-chasing the current fad | Dates fast | Fundamentals + system (age well) |
| Screenshot handoff / undocumented states | Build guesses, drifts from intent | Tokens + full specs (§19) |
| Auto-inverted "dark mode" | Muddy, low-contrast | Crafted dark variant (§3) |

### Scope, honesty & the design point
- **Taste is the part no checklist supplies.** This doc guarantees a sound system, a consistent brand, a met craft floor, and that design never breaks a higher-ranked concern. It does not guarantee *great* — that needs judgement, the critique loop (§20), and senior eyes.
- **Design ranks last in precedence, first in what clients buy.** Both are true. The studio's skill is making the work look effortless *because* it respected every constraint above it.
- **Accessibility and Legal own the lines design can't cross** — contrast/focus/target/motion (Accessibility) and licensing/dark-patterns (Legal). Those aren't design opinions; design works within them.
- **Systems over screens, restraint over trend.** Qera's moat is the system and the discipline, not the surface — which is also why the work survives trend cycles.
- **Living document.** Principles are stable; trends and tools move. Review quarterly; refresh references without chasing fads. v1 reflects practice current as of June 2026.
