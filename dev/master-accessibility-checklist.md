# Master Accessibility Checklist

> **READ THIS FIRST — what accessibility actually is.**
> Accessibility is not a checklist score or a compliance badge. It is whether a real person — blind, low-vision, deaf, motor-impaired, neurodivergent, or temporarily one-handed on a train — can actually **use** what Qera built. A site can pass every automated test and still be unusable with a screen reader. So this document's measure of success is not "the scanner is green"; it's "a disabled user can complete the task." Build for the human; the conformance follows.
>
> **The honest ceiling, stated up front:** automated tools catch roughly **30–40%** of accessibility issues. The rest — meaningful alt text, logical focus order, sensible screen-reader output, real keyboard operability — requires **manual testing and assistive technology**, and the highest bar requires **testing with actual disabled users**. Treat the scanner as a smoke detector, not a certificate.
>
> **Purpose:** the single source of truth for building digital products everyone can use, to **WCAG 2.2 Level AA** (the current, stable, legally-operative standard) and beyond. Covers the products Qera builds and Qera's own content.
>
> **Status:** v1 — grounded in WCAG 2.2 (W3C Recommendation, Oct 2023; ISO/IEC 40500:2025), WAI-ARIA Authoring Practices, and current assistive-technology behaviour, verified June 2026. Third-ranked document in the Qera master system. **Living document — WCAG 3.0 is in Working Draft (March 2026, ~2028–2030 to Recommendation) and will *coexist* with, not replace, WCAG 2.2; building to 2.2 AA now is correct and durable. Review quarterly.**

---

## Master-Doc Precedence Protocol (replicated)

> Canonical copy with worked examples lives in the **Master Security Checklist**. Pasted here verbatim per Rule 1.

### Precedence order (highest wins on irreconcilable conflict)
1. **Legal & Compliance**
2. **Security**
3. **Accessibility** ← *this document*
4. **Data integrity / Backend correctness**
5. **Performance**
6. **SEO / AEO / GEO**
7. **Design & Brand preference**

### The three rules
1. **Ownership, not repetition.** Each concern's items live in their own doc; others cross-reference.
2. **Resolve before you rank.** Try the technique that satisfies both; only then does the higher-ranked doc win.
3. **Floor is never traded.**

### What rank 3 means in practice
Accessibility sits above Performance, SEO, and **Design** — so **excluding a disabled user is a correctness failure, not a style choice, and design preference never wins against it.** The common collisions and their resolutions:
- **Accessibility vs Design (rank 7):** brand colours that fail contrast lose — adjust the palette or the usage, don't ship inaccessible text. Removing focus outlines "because they're ugly" is prohibited. Tiny tap targets for a dense aesthetic lose to the 24px minimum. **Most accessibility failures are design decisions made without accessibility in the room — so accessibility enters at the design phase, not as a retrofit.**
- **Accessibility vs Performance (rank 5):** the two mostly align (semantic HTML is light and accessible). Where they tension — e.g. a motion effect that boosts perceived performance but triggers vestibular symptoms — accessibility wins: `prefers-reduced-motion` is honoured. **Accessibility *owns* the reduced-motion requirement; Performance §11 owns its implementation.**
- **Accessibility vs SEO (rank 6):** strongly aligned — semantic headings, alt text, and link purpose serve both. No real conflict; where framing differs, accessibility owns the user-facing requirement.
- **Accessibility is subordinate to Legal (1) and Security (2):** the **legal mandate** for accessibility (which laws require it, in which jurisdictions) is owned by the **Legal master §10** — this doc owns the *technical standard and how to meet it*, not the question of whether it's legally required. Accessible-authentication requirements are coordinated with **Security §1**.

---

## How this document is tiered — read before using

Tiering mirrors SEO/Performance for joint client scoping, mapped to WCAG conformance levels. Like Security and Performance, accessibility has a **non-negotiable floor**: a handful of failures don't just lower a score — they **lock a person out entirely** (no keyboard access, no alt text on meaningful images, an unlabelled form, a keyboard trap, body text below contrast threshold). Those are marked **(non-negotiable)** and apply to every project at any budget.

> **Tier tags (on every item):**
> - `[A]` — **WCAG Level A**: the floor. Failing these excludes whole groups of users outright. Bundled into every build; items marked **(non-negotiable)** apply even to the cheapest project.
> - `[AA]` — **WCAG Level AA**: the real target and the **legal standard** worldwide (ADA, Section 508, EAA, and — per the Legal master — the practical bar for Qera's jurisdictions). **This is what "accessible" means in practice; default every client to AA.** · scoped into build or a "Accessibility (AA) Conformance" line
> - `[AAA]` — **WCAG Level AAA + beyond-conformance UX**: enhanced access, applied where feasible (W3C notes AAA can't be met for all content); plus usability-beyond-conformance and user testing. Top-tier / public-sector / high-stakes. · "Accessibility Audit & Remediation" engagement
>
> *Default target is **AA**. A is never sufficient alone; AAA is selectively applied, not blanket. WCAG 2.2 has 86 success criteria across the three levels; this doc organises them by the POUR principles below rather than by number, so they're actionable.*

> **Verify:** accessibility is highly testable, so almost every item carries a **Verify:** note — but verification is layered: **automated** (axe / WAVE / Lighthouse — catches the 30–40%), **manual** (keyboard-only, 400% zoom), **assistive tech** (screen reader), and at `[AAA]` **user testing** with disabled people. An item isn't "done" until it passes the layer its Verify names. Tooling is consolidated in Notes → Verification Toolbox.

> **The POUR framework** (WCAG's four principles) organises the core sections: **P**erceivable, **O**perable, **U**nderstandable, **R**obust. If content fails any one principle, it fails for someone.

> **Stack addendums** (layered on top): `[React/NextJS]`, `[Managed]` (Framer/Webflow), `[Animation/WebGL]` (Qera's motion craft), `[Design]` (designing for accessibility before a line of code).

> **How to use this for a new project:**
> 1. **Scope & baseline (§0)** — set the target (default AA), identify the legal trigger via Legal §10, run a baseline audit.
> 2. **Floor (incl. non-negotiables) is automatic** — every `[A]` item and every non-negotiable applies; audit whether it passes, not whether to do it.
> 3. **AA is the default target** — treat `[AA]` as in-scope for essentially every client.
> 4. **Design phase first** — the cheapest accessibility is the kind designed in (contrast, focus states, target sizes, content structure) rather than retrofitted. Apply `[Design]` at handoff.
> 5. **Verify in layers** — automated, then keyboard, then screen reader; never ship on the scanner alone.
> 6. **Test with real users where the stakes justify it** — the only way to know it truly works.

---

## 0 — Pre-Work: Scope, Target & Baseline

- [ ] **Conformance target set and documented** — default **WCAG 2.2 Level AA**; raise to AAA-selective for public-sector, healthcare, finance, or high-traffic. Record the target. `[A]` *(Verify: target stated in project docs.)*
- [ ] **Legal trigger checked via Legal master §10** — is accessibility legally mandated for this client/market (jurisdiction, sector, public body)? Legal owns the mandate; this sets the urgency and the conformance-claim stakes. `[AA]`
- [ ] **Baseline audit captured** — run automated (axe/Lighthouse) + a keyboard pass + one screen-reader pass on the current state before work; record the gap. You can't show remediation without a before. `[AA]` *(Verify: baseline report saved.)*
- [ ] **Assistive-technology test matrix defined** — which screen readers / browsers / devices will be tested (see §17); set it now so "tested" has a definition. `[AA]`
- [ ] **Accessibility owned by a named person on the project** — someone accountable, not "everyone" (which means no one). `[AA]`
- [ ] **Component inventory flagged for accessibility risk** — modals, menus, carousels, custom selects, drag-drop, data tables, canvas/WebGL — the high-risk patterns get extra attention (§14–16). `[AA]`

---

## 1 — Perceivable: Text Alternatives

> If a user can't see it, the text alternative *is* the content. Cross-ref SEO (alt text also aids SEO) — Accessibility owns the user-facing requirement.

- [ ] **Every meaningful image has a meaningful `alt`** — describing the *purpose/content*, not "image of"; a product photo's alt conveys the product, a chart's alt conveys the finding. `[A]` **(non-negotiable)** *(Verify: screen reader announces useful text; automated flags missing alt.)*
- [ ] **Decorative images have empty `alt=""`** (or CSS background) — so screen readers skip them; a decorative image with verbose alt is noise. `[A]` *(Verify: decorative images are silent to AT.)*
- [ ] **Functional images convey the action** — an icon-only button's accessible name describes what it *does* ("Search"), not what it depicts ("magnifying glass"). `[A]` **(non-negotiable)**
- [ ] **Complex images (charts, diagrams, maps) have a long description** — a nearby text equivalent or linked description conveys the data/relationships, not just a label. `[A]`
- [ ] **Images of text avoided** — use real text (styleable, zoomable, translatable); images of text only where essential (logos). `[AA]` *(Verify: text zooms/reflows; not baked into an image.)*
- [ ] **Icons paired with text or an accessible name** — never rely on an icon's shape alone to convey meaning. `[A]`
- [ ] **CAPTCHA has an accessible alternative** — if used, provide a non-visual alternative; prefer no-interaction methods (cross-ref Security — but note Security prohibits Claude *solving* CAPTCHAs; here it's about not locking out disabled users). `[A]`

---

## 2 — Perceivable: Time-Based Media (Audio & Video)

> The most-skipped area, because it's labour. If a build has video or audio, these are not optional.

- [ ] **Captions for all prerecorded video with audio** — synchronised, accurate captions (not auto-generated-and-left); covers deaf/HoH users and sound-off viewing. `[A]` **(non-negotiable for video with speech)** *(Verify: captions present, accurate, synced.)*
- [ ] **Transcript for prerecorded audio** (podcasts, audio-only) — a full text alternative. `[A]`
- [ ] **Audio description for prerecorded video** — narration of important visual information not conveyed in the audio (AA requires it; AAA extends it). `[AA]`
- [ ] **Live captions for live audio content** — webinars, live streams. `[AA]`
- [ ] **No audio autoplays for >3 seconds without a control** — or provide a pause/stop/volume control independent of system volume (interferes with screen readers). `[A]` **(non-negotiable)**
- [ ] **Media player controls are keyboard-accessible and labelled** — play/pause/caption toggle operable without a mouse (§5). `[A]`

---

## 3 — Perceivable: Structure, Semantics & Adaptability

> Semantic structure is the backbone of accessibility — it's what lets a screen reader user navigate, and what makes content reflow. Get this right and half the battle is won.

- [ ] **Native semantic HTML used** — real `<button>`, `<a>`, `<nav>`, `<main>`, `<header>`, `<footer>`, `<ul>`, `<table>`; a `<div>` with a click handler is the single most common accessibility failure. Semantics carry role, state, and keyboard behaviour for free. `[A]` **(non-negotiable)** *(Verify: elements expose correct roles in the accessibility tree.)*
- [ ] **Logical heading hierarchy** — one `<h1>`, no skipped levels, headings describe structure (not styled for size); screen-reader users navigate by heading. `[A]` *(Verify: heading outline is logical via an outline tool / screen reader.)*
- [ ] **Landmark regions present** — `<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>` so AT users jump between regions. `[A]`
- [ ] **Reading & DOM order matches visual order** — content makes sense when linearised; CSS doesn't reorder content away from a sensible source order (screen readers/keyboard follow DOM). `[A]` **(non-negotiable)** *(Verify: tab order and screen-reader order match the visual flow.)*
- [ ] **Information not conveyed by structure alone is programmatically available** — relationships (labels↔fields, headers↔cells) exposed in markup, not just visually. `[A]`
- [ ] **Content reflows at 320px / 400% zoom without horizontal scroll or loss** — responsive down to a 320 CSS-px width equivalent; no two-dimensional scrolling for reading content. `[AA]` **(non-negotiable)** *(Verify: zoom to 400% / 320px wide — content reflows, nothing lost.)*
- [ ] **Orientation not locked** — works in both portrait and landscape (unless essential). `[AA]`
- [ ] **Data tables use proper markup** — `<th>` with `scope`, `<caption>`; layout tables avoided (use CSS). `[A]`
- [ ] **Lists marked up as lists**, quotes as quotes — semantics match meaning. `[A]`

---

## 4 — Perceivable: Distinguishable (Colour, Contrast, Spacing)

> Where design and accessibility collide most — and accessibility wins (rank 3 > 7). These are usually palette/styling decisions, so they belong in the design phase (§ Design addendum).

- [ ] **Text contrast ≥ 4.5:1 (normal) / 3:1 (large ≥24px or ≥18.66px bold)** — body text below threshold is unreadable for low-vision users. `[AA]` **(non-negotiable for body text)** *(Verify: contrast checker on real text/background pairs, incl. over images.)*
- [ ] **Non-text contrast ≥ 3:1** — UI component boundaries, icons, focus indicators, and graphical objects needed for understanding meet 3:1 against adjacent colours. `[AA]` *(Verify: contrast checker on borders/icons/states.)*
- [ ] **Colour is never the only means of conveying information** — error states, required fields, links, chart series also use text/shape/pattern, not colour alone (colour-blind users). `[A]` **(non-negotiable)** *(Verify: view in greyscale — all meaning survives.)*
- [ ] **Links distinguishable from body text without relying on colour alone** — underline or other non-colour cue (esp. in-text links). `[A]`
- [ ] **Text resizes to 200% without loss of content or function** — using browser text zoom; no clipping or overlap. `[AA]` *(Verify: 200% text zoom.)*
- [ ] **Text-spacing overrides don't break layout** — line-height 1.5×, paragraph/letter/word spacing adjustments (for dyslexia) don't clip or hide content. `[AA]` *(Verify: apply the WCAG text-spacing bookmarklet.)*
- [ ] **Content on hover/focus is dismissable, hoverable, persistent** — tooltips/popovers can be dismissed (Esc), hovered without vanishing, and stay until dismissed. `[AA]`
- [ ] **No information lost in high-contrast / forced-colours mode** — respects Windows High Contrast / `forced-colors`. `[AAA]`

---

## 5 — Operable: Keyboard Access

> The keyboard is the foundation of input accessibility — screen-reader, switch, and voice users all rely on the keyboard interface. **If it doesn't work by keyboard, it doesn't work.**

- [ ] **All functionality operable by keyboard alone** — every interactive element reachable and usable with Tab/Shift-Tab/Enter/Space/arrows; nothing mouse-only. `[A]` **(non-negotiable)** *(Verify: unplug the mouse — complete every key task.)*
- [ ] **No keyboard trap** — focus can always move *out* of a component (modal, embed, widget) via keyboard; the classic lock-in bug. `[A]` **(non-negotiable)** *(Verify: Tab through everything — focus never gets stuck.)*
- [ ] **Visible focus indicator on every focusable element** — a clear, high-contrast focus ring; **never `outline: none` without a replacement**. `[AA]` **(non-negotiable)** *(Verify: Tab through — focus is always visible.)*
- [ ] **Logical focus order** — Tab order follows reading/visual order and doesn't jump around. `[A]` *(Verify: tab through a page — order is sensible.)*
- [ ] **Focus not obscured when focused** — a focused element isn't hidden behind sticky headers/footers/overlays (WCAG 2.2: 2.4.11 Focus Not Obscured Minimum AA; 2.4.12 Enhanced AAA). `[AA]` *(Verify: tab to elements near sticky bars — focus stays visible.)*
- [ ] **Enhanced focus appearance** — focus indicator meets minimum size/contrast (2.4.13, AAA). `[AAA]`
- [ ] **Character-key shortcuts can be turned off or remapped** — single-key shortcuts don't fire accidentally for speech-input users. `[A]`
- [ ] **Custom widgets implement expected keyboard patterns** — per WAI-ARIA Authoring Practices (arrow keys in menus/tabs/listboxes, Esc to close, Home/End) — see §15. `[A]`

---

## 6 — Operable: Enough Time

- [ ] **Time limits are adjustable, extendable, or absent** — users can turn off, adjust, or extend any time limit (except real-time/essential ones); covers slow readers, motor and cognitive disabilities. `[A]` *(Verify: any timeout can be extended/disabled.)*
- [ ] **Session-timeout warning with the chance to continue** — and, where feasible, data preserved on re-auth (cross-ref Security session management — Security owns the timeout, Accessibility owns the warning/recovery). `[AA]`
- [ ] **Auto-updating/moving content can be paused, stopped, or hidden** — carousels, auto-refresh, tickers have a pause control. `[A]` *(Verify: a pause control exists and works.)*
- [ ] **No content requires interaction within a tight window** — avoid disappearing menus/messages that punish slow interaction. `[AA]`

---

## 7 — Operable: Seizures & Vestibular Safety

> Can cause physical harm — the highest-stakes accessibility failures. Ties tightly to Qera's motion work (GSAP/WebGL).

- [ ] **Nothing flashes more than 3 times per second** — no general or red flash exceeding the threshold; flashing content can trigger seizures. `[A]` **(non-negotiable)** *(Verify: check animations/video against the 3-flash rule.)*
- [ ] **`prefers-reduced-motion` honoured for all non-essential motion** — parallax, scroll-jacking, large transitions, autoplaying animation reduce to static/minimal for users who set the OS preference. **Accessibility owns this requirement; Performance §11 / Animation addendum own implementation.** `[AA]` **(non-negotiable for significant motion)** *(Verify: enable OS Reduce Motion — heavy motion stops/simplifies.)*
- [ ] **Motion from interactions can be disabled** — animation triggered by scrolling/hover has a reduced path (2.3.3, AAA, but treat as standard for motion-heavy builds). `[AAA→treat as AA for motion builds]`
- [ ] **No large-scale unexpected motion on load/scroll for reduced-motion users** — vestibular disorders (dizziness, nausea) are triggered by exactly the parallax/zoom effects that look impressive. Design the reduced-motion experience deliberately, not as an afterthought. `[AA]`

---

## 8 — Operable: Navigable

- [ ] **Skip link to main content** — a keyboard-reachable "Skip to content" lets users bypass repeated nav. `[A]` *(Verify: Tab once from top — skip link appears and works.)*
- [ ] **Descriptive, unique page titles** — `<title>` identifies the page; first thing a screen reader announces. `[A]`
- [ ] **Link purpose clear from the link text (or context)** — no bare "click here"/"read more" without context; screen-reader users browse links out of context. `[A]` *(Verify: pull the links list in a screen reader — each is meaningful.)*
- [ ] **Multiple ways to find pages** — nav + search or sitemap (for multi-page sites). `[AA]`
- [ ] **Headings and labels are descriptive** — they describe topic/purpose. `[AA]`
- [ ] **Consistent Help available** — where help (contact, chat, FAQ) appears, it's in a consistent location across pages (WCAG 2.2: 3.2.6 Consistent Help, **Level A**). `[A]`
- [ ] **Current location indicated** — `aria-current` for the active nav item / breadcrumb. `[AA]`

---

## 9 — Operable: Input Modalities (Pointer, Touch, Motion)

> Beyond keyboard — accommodating touch, pointer, voice, and motion inputs. Several are new in WCAG 2.2.

- [ ] **Target size ≥ 24×24 CSS px** (with spacing exceptions) — tap/click targets meet the minimum so motor-impaired and touch users can hit them (WCAG 2.2: 2.5.8 Target Size Minimum, **AA**); 44×44 is best practice. `[AA]` **(non-negotiable on touch)** *(Verify: measure interactive targets.)*
- [ ] **Dragging has a single-pointer alternative** — anything drag-and-drop also works via tap/click (WCAG 2.2: 2.5.7 Dragging Movements, **AA**). Relevant to any custom reorder/slider UI. `[AA]` *(Verify: complete drag tasks without dragging.)*
- [ ] **Complex gestures have simple alternatives** — pinch/swipe/multi-finger actions also achievable with a single tap/click (2.5.1). `[A]`
- [ ] **Pointer actions are cancellable** — actions fire on up-event, not down, so users can slide off to abort (2.5.2). `[A]`
- [ ] **Accessible name contains the visible label** — a control's programmatic name includes its visible text, so voice-input users can say what they see (2.5.3 Label in Name). `[A]` *(Verify: visible label is in the accessible name.)*
- [ ] **Motion-actuated functions have a UI alternative and can be disabled** — shake/tilt features also have a button (2.5.4). `[A]`

---

## 10 — Understandable: Readable

- [ ] **Page language declared** — `<html lang="…">`; and **language of parts** marked where content switches language (`lang` on the element). Lets screen readers use the right pronunciation. `[A]` (page) / `[AA]` (parts) **(non-negotiable: page lang)** *(Verify: `lang` present and correct.)*
- [ ] **Plain, clear language** — concise sentences, common words, defined jargon; serves cognitive, low-literacy, and non-native users (and everyone). `[AAA]` for the formal reading-level criterion, but **treat clarity as a baseline craft value**.
- [ ] **Unusual words, abbreviations, and idioms explained** — first-use definitions / expansions where comprehension depends on them. `[AAA]`
- [ ] **Consistent terminology** — the same thing called the same name throughout (cognitive load). `[AA-spirit]`

---

## 11 — Understandable: Predictable

- [ ] **No unexpected context change on focus** — focusing an element doesn't auto-submit, navigate, or open something (3.2.1). `[A]` *(Verify: tab through — nothing surprising happens on focus.)*
- [ ] **No unexpected context change on input** — selecting a radio/option doesn't auto-navigate without warning (3.2.2). `[A]`
- [ ] **Consistent navigation** — nav appears in the same place and order across pages (3.2.3). `[AA]`
- [ ] **Consistent identification** — components with the same function are labelled consistently (3.2.4). `[AA]`
- [ ] **Changes of context are user-initiated** — opening new windows, redirects, etc. are triggered by the user, with warning where helpful. `[AAA]` for the strict criterion; good practice generally.

---

## 12 — Understandable: Input Assistance (Forms & Errors)

> Forms are where most real-world task failure happens. This section + §14 are the highest-impact for conversion *and* accessibility.

- [ ] **Every input has a programmatically-associated label** — `<label for>` or wrapping; placeholder is **not** a label (it vanishes on input and often fails contrast). `[A]` **(non-negotiable)** *(Verify: screen reader announces a label for every field.)*
- [ ] **Required fields and constraints stated in text** — not colour/asterisk alone; format requirements given upfront (3.3.2 Labels or Instructions). `[A]`
- [ ] **Errors identified in text and programmatically** — the field in error is named, the problem described in text (not colour alone), and exposed to AT (3.3.1). `[A]` **(non-negotiable)** *(Verify: trigger an error — screen reader announces which field and why.)*
- [ ] **Error suggestions provided** — where the fix is known, suggest it ("date must be DD/MM/YYYY") (3.3.3). `[AA]`
- [ ] **Error prevention on important actions** — legal/financial/data-deleting submissions are reversible, checked, or confirmed (3.3.4). `[AA]`
- [ ] **Redundant Entry avoided** — don't make users re-enter info already provided in the same process; auto-populate or let them select it (WCAG 2.2: 3.3.7 Redundant Entry, **Level A**). `[A]`
- [ ] **Accessible Authentication — no cognitive-function test without an alternative** — don't force users to memorise/transcribe/solve puzzles to log in; allow paste, password managers, and avoid cognitive tests (WCAG 2.2: 3.3.8 Accessible Authentication Minimum, **AA**; 3.3.9 Enhanced, AAA). **Coordinate with Security §1** — accessible auth and secure auth must both hold. `[AA]` *(Verify: login works with a password manager and paste; no puzzle-only path.)*
- [ ] **Errors summarised and focus moved to the error context** — on submit failure, surface a summary and move focus so AT users find it. `[AA]`
- [ ] **Autocomplete attributes on common fields** — `autocomplete="email"` etc. helps everyone, esp. cognitive/motor users (1.3.5). `[AA]`

---

## 13 — Robust: Compatible (Markup, ARIA, Status)

- [ ] **Valid, well-formed markup** — no duplicate IDs, properly nested elements; AT relies on a clean accessibility tree. (Note: WCAG 2.2 retired 4.1.1 Parsing, but clean markup still matters for AT.) `[A]`
- [ ] **Name, Role, Value exposed for every UI component** — every interactive element has an accessible name, correct role, and current state/value in the accessibility tree (4.1.2). The core robustness criterion. `[A]` **(non-negotiable)** *(Verify: inspect the accessibility tree / screen-reader output for each control.)*
- [ ] **Status messages announced without moving focus** — success/error/loading/results-count announced via `aria-live` / role="status"/"alert" so AT users hear them (4.1.3 Status Messages). `[AA]` *(Verify: trigger a status change — screen reader announces it without focus moving.)*
- [ ] **ARIA used correctly or not at all** — see §15; incorrect ARIA is worse than none. `[A]`

---

## 14 — Forms & Interactive Components (deep dive)

> Expands §12 with the patterns that break most often.

- [ ] **Grouped controls use `<fieldset>` + `<legend>`** — radio groups, checkbox groups, address blocks; gives AT users the group context. `[A]`
- [ ] **Inline validation is announced** — live validation messages use live regions so they're heard, and don't fire disruptively on every keystroke. `[AA]`
- [ ] **Disabled vs read-only used correctly** — disabled controls aren't focusable (can be missed); prefer clear states. `[AA]`
- [ ] **Custom selects/comboboxes follow the ARIA combobox pattern** — or use native `<select>` (almost always better). `[A]`
- [ ] **Required/optional, character limits, and progress are perceivable** — multi-step forms announce step/position. `[AA]`
- [ ] **Submit buttons are real buttons with clear labels** — `<button type="submit">`, not a styled div. `[A]` **(non-negotiable)**
- [ ] **Date pickers, sliders, and file uploads are keyboard + AT operable** — or offer a plain text-input fallback. `[AA]`

---

## 15 — ARIA & Component Patterns

> **The first rule of ARIA: don't use ARIA if a native element will do.** ARIA changes how AT *describes* an element but adds **no behaviour** — you must wire the keyboard interaction yourself. Most accessibility regressions in modern apps come from custom ARIA widgets that look right but don't behave right. Follow the **WAI-ARIA Authoring Practices Guide (APG)** patterns exactly.

- [ ] **Native element preferred over ARIA** — `<button>` over `<div role="button">`, `<nav>` over `role="navigation"`, native `<dialog>`/`<details>` where they fit. `[A]` **(non-negotiable principle)**
- [ ] **Every custom widget implements its full APG keyboard pattern** — roles + states + expected keys (arrows, Esc, Home/End, Enter/Space). A `role` without the behaviour is a lie to the screen reader. `[A]`
- [ ] **Modal dialogs done right** — `role="dialog"`/native `<dialog>`, `aria-modal="true"`, **focus moved in on open, trapped while open, returned to the trigger on close, Esc closes**, background inert. *(Directly relevant to the Clayora cards modal — the native `<dialog>` choice is the right one; verify focus-return and inert background.)* `[A]` **(non-negotiable for modals)** *(Verify: open via keyboard, tab stays inside, Esc closes, focus returns to trigger.)*
- [ ] **Menus, tabs, accordions, carousels follow APG** — correct roles, arrow-key navigation, `aria-expanded`/`aria-selected`/`aria-controls`. `[A]`
- [ ] **Tooltips/popovers are accessible** — reachable, dismissable, not the only place critical info lives. `[AA]`
- [ ] **`aria-label`/`aria-labelledby` used sparingly and correctly** — they override visible text for AT (and can desync from it); prefer visible labels. Overusing `aria-label` is a common anti-pattern. `[A]`
- [ ] **No redundant or conflicting ARIA** — don't add `role="button"` to a `<button>`; don't `aria-hidden` focusable content. `[A]`
- [ ] **Dynamic content updates use live regions appropriately** — `aria-live="polite"` for most, `"assertive"` only for urgent; don't spam. `[AA]`

---

## 16 — Motion, Animation & Vestibular Accessibility

> Qera's craft area, and the highest-risk for harm. The rule: **motion is a design choice that some users cannot safely receive — always provide the reduced path.** Deep cross-ref to Performance §11 (implementation) and the Animation addendum. **Accessibility owns the requirement; it cannot be traded for visual impact (rank 3 > design rank 7).**

- [ ] **`prefers-reduced-motion: reduce` implemented for every non-trivial animation** — scroll-driven effects, parallax, large transitions, autoplay reduce to static or minimal. Not a global "turn off all CSS transitions" — a *designed* calmer experience. `[AA]` **(non-negotiable for motion builds)** *(Verify: OS Reduce Motion on — the experience is calm and complete.)*
- [ ] **Parallax and scroll-jacking have a reduced-motion alternative** — these are prime vestibular triggers; the reduced path removes the parallax/large-scroll movement. `[AA]`
- [ ] **No motion exceeds the flash threshold** (§7) — verify GSAP/WebGL sequences. `[A]` **(non-negotiable)**
- [ ] **Autoplaying video/animation respects reduced-motion and has a pause control** (§2, §6). `[A]`
- [ ] **WebGL/canvas experiences degrade gracefully and offer a reduced/static version** — for reduced-motion users and AT users who can't perceive the canvas; provide an accessible text/static equivalent of any information conveyed (cross-ref Performance §11 graceful degradation). `[AA]`
- [ ] **Essential motion (where it conveys meaning) still has a non-motion way to get the information** — don't lock meaning inside an animation. `[A]`

---

## 17 — Screen Reader & Assistive-Technology Support

> The test that the scanner can't do. Conformance on paper means nothing if the screen-reader experience is incoherent.

- [ ] **Tested with at least one screen reader per major platform** — recommended matrix: **NVDA + Firefox/Chrome (Windows)**, **VoiceOver + Safari (macOS/iOS)**, **TalkBack + Chrome (Android)**; JAWS for enterprise/public-sector. `[AA]` *(Verify: complete key tasks with each AT in the matrix.)*
- [ ] **The reading experience is coherent, not just present** — content is announced in a sensible order with correct roles/states; the user can build a mental model. (Automated tools can't judge this — a human must listen.) `[AA]`
- [ ] **Dynamic updates are announced** — added items, filtered results, validation, loading states reach the user via live regions (§13). `[AA]`
- [ ] **Focus is managed on view changes** — in SPAs/route changes/modal open-close, focus moves intentionally and the user is told where they are (§ React addendum). `[AA]`
- [ ] **No "screen-reader-only" crutches hiding broken semantics** — `.sr-only` text is for genuine enhancement (e.g. extra context), not to paper over a non-semantic build. `[AA]`
- [ ] **Voice-control tested where feasible** — Dragon/Voice Control users rely on visible labels matching accessible names (§9 Label in Name). `[AAA]`
- [ ] **Zoom/magnification usable** — content works at 200–400% and with screen magnifiers (focus stays in view). `[AA]`

---

## 18 — Cognitive & Neurodiversity Accessibility

> The largest and most-overlooked group — ADHD, dyslexia, autism, anxiety, memory and learning differences. WCAG 2.x covers this least (WCAG 3.0 will expand it), so go beyond the letter of the criteria. **Do not skip this section because it's under-specified by the standard — that under-specification is exactly why most sites fail these users.**

- [ ] **Clear, consistent layout and navigation** — predictable patterns reduce cognitive load (§11). `[AA]`
- [ ] **Plain language, short sentences, clear headings** — scannable content; front-load the point (§10). `[AA-spirit]`
- [ ] **Instructions and feedback are explicit** — don't rely on the user inferring what to do or what went wrong. `[AA]`
- [ ] **Minimise memory burden** — don't require remembering info across steps (§12 Redundant Entry); show, don't make recall. `[A]`
- [ ] **Reduce distraction** — avoid unnecessary auto-motion, flashing, and attention-stealing elements; let users focus. `[AA]`
- [ ] **Generous time and easy error recovery** — no punishing timeouts; mistakes are easy to undo (§6, §12). `[AA]`
- [ ] **Dyslexia-friendly defaults** — readable line length, adequate line-height (1.5×), left-aligned (not justified) body text, real text (zoomable), sufficient spacing. `[AA]`
- [ ] **Consistent, findable help** — (§8 Consistent Help) supports users who get stuck. `[A]`
- [ ] **Avoid idioms, sarcasm, and ambiguity in critical UI** — literal clarity helps autistic and non-native users. `[AA-spirit]`

---

## 19 — Mobile & Touch Accessibility

> Most traffic is mobile, and mobile AT (VoiceOver/TalkBack) plus touch introduce their own failures.

- [ ] **Zoom not disabled** — never `user-scalable=no` / `maximum-scale=1`; users must be able to pinch-zoom. `[AA]` **(non-negotiable)** *(Verify: pinch-zoom works on device.)*
- [ ] **Touch targets ≥ 24px (44px best practice) with spacing** (§9). `[AA]` **(non-negotiable on touch)**
- [ ] **Tested with mobile screen readers** — VoiceOver (iOS) and TalkBack (Android) swipe navigation (§17). `[AA]`
- [ ] **Gestures have alternatives; orientation not locked** (§9, §3). `[AA]`
- [ ] **Inputs use correct mobile types** — `type="email"`/`tel`/`number` for the right keyboard; reduces effort. `[AA]`
- [ ] **Content reflows on small screens without loss** (§3) — no horizontal scroll for reading. `[AA]` **(non-negotiable)**

---

## 20 — Documents & Non-Web Content

> Qera produces PDFs, Word docs, slide decks (cross-ref the docx/pptx/pdf skills), and emails — these have their own accessibility, often forgotten.

- [ ] **PDFs are tagged and accessible** — real tags (headings, reading order, alt text, table structure), not a scanned image; or provide an accessible HTML alternative. `[AA]` *(Verify: PDF accessibility checker + screen-reader read-through.)*
- [ ] **Word/PPT outputs use real styles and structure** — heading styles, alt text on images, meaningful slide titles, reading order set; built in, not bolted on. `[AA]`
- [ ] **Exported/generated documents inherit accessibility** — if a build generates PDFs/invoices/reports, the output is tagged (relevant to Qera's HTML-to-PDF systems). `[AA]`
- [ ] **Email templates are accessible** — semantic structure, alt text, sufficient contrast, not image-only; works with email-client AT. `[AA]`
- [ ] **Embedded/third-party content is accessible or has an alternative** — maps, players, widgets either meet the bar or have an accessible fallback. `[AA]`

---

## 21 — Testing & Validation Methodology

> **The most important section for honesty.** Accessibility "done" is defined by *how* you tested, not whether a scanner passed. Layer the methods; each catches what the others miss.

- [ ] **Layer 1 — Automated** (catches ~30–40%) — axe DevTools / Lighthouse / WAVE / Pa11y in dev and CI; catches missing alt, contrast, missing labels, ARIA misuse. Necessary, never sufficient. `[AA]` *(Verify: clean automated run as a floor.)*
- [ ] **Layer 2 — Keyboard-only** — unplug the mouse; reach and operate everything; check focus order, focus visibility, no traps, skip link, modal focus management. `[AA]` **(non-negotiable test)**
- [ ] **Layer 3 — Zoom & reflow** — 200% text and 400%/320px reflow; nothing lost or clipped. `[AA]`
- [ ] **Layer 4 — Screen reader** — at least the §17 matrix; complete real tasks listening to the output, judging coherence. `[AA]` **(non-negotiable test)**
- [ ] **Layer 5 — Reduced motion & forced colours** — verify the calmer experience and high-contrast survival. `[AA]`
- [ ] **Layer 6 — User testing with disabled people** — the only way to truly know; scope for high-stakes/public-sector/AAA work. `[AAA]`
- [ ] **CI gate for regressions** — automated a11y tests (axe-core/Pa11y) run on PRs so accessibility doesn't silently regress (mirrors Performance's Lighthouse-CI gate). `[AA]` *(Verify: a planted violation fails CI.)*
- [ ] **Test on real assistive tech, not just simulations** — emulators approximate; real AT is the truth (mirrors Performance's "real device" rule). `[AAA]`

---

## 22 — Accessibility Statement & Conformance Claims

> The public-facing and legal-facing artefact. **Legal master §10 owns whether conformance is *required* and the liability; this section owns the *technical* conformance claim and statement.** Don't overclaim — a false "WCAG AA compliant" badge is a misrepresentation (cross-ref Legal/honesty).

- [ ] **Accessibility statement published** — states the target (e.g. WCAG 2.2 AA), conformance status, known limitations, the date assessed, and a contact route for accessibility problems. `[AA]`
- [ ] **Conformance claims are honest and scoped** — claim what was actually tested and met; "partially conformant" with a remediation note beats a false blanket claim. `[AA]`
- [ ] **A feedback/contact mechanism for accessibility issues** — a monitored route so users can report barriers (and you can fix them). `[AA]`
- [ ] **VPAT/ACR prepared where a client/market requires it** — formal conformance reporting for procurement/public-sector (coordinate with Legal). `[AAA]`
- [ ] **Remediation plan for known gaps** — documented, dated, prioritised by user impact. `[AA]`

---

## Stack Addendums

### [React/NextJS]
- [ ] **Semantic JSX** — real elements, not `<div onClick>`; `<button>`/`<a>`/landmarks. `[A]` **(non-negotiable)**
- [ ] **Route-change focus & announcement** — on client-side navigation, move focus to the new view's heading and announce the page (SPAs break the browser's native page-load behaviour AT relies on). `[AA]` *(Verify: screen-reader announces new pages on client nav.)*
- [ ] **Focus management in modals/menus** — move focus in, trap, return on close (§15); use refs, not guesswork; native `<dialog>` where it fits (Clayora pattern). `[A]`
- [ ] **Live regions for async UI** — loading/results/errors announced via an `aria-live` region or a library (§13/§17). `[AA]`
- [ ] **`next/image` alt is meaningful and present** — `alt` is required; decorative gets `alt=""`. `[A]`
- [ ] **Accessible component library or audited custom components** — Radix/React Aria/Headless UI give APG-correct behaviour; if rolling custom, test against §15. `[AA]`
- [ ] **Linting for a11y** — `eslint-plugin-jsx-a11y` in the pipeline catches common JSX issues early. `[AA]`
- [ ] **No accessibility lost to hydration/Suspense** — focus and announcements survive streaming/hydration. `[AA]`

### [Managed] — Framer / Webflow
- [ ] **Semantic structure set in the tool** — proper heading levels, landmarks, lists; don't leave everything as generic `<div>`. `[A]`
- [ ] **Alt text entered for every meaningful image; decorative marked decorative.** `[A]` **(non-negotiable)**
- [ ] **Contrast checked on the brand palette as used** — platform themes don't guarantee AA (§4). `[AA]`
- [ ] **Keyboard & focus tested on interactions/animations** — platform interactions can produce traps or invisible focus (§5). `[AA]`
- [ ] **Custom embeds/code audited for a11y** — embedded widgets carry their own accessibility (§20). `[AA]`
- [ ] **Reduced-motion respected on platform animations** — verify the tool's motion honours the OS setting; add custom handling if not (§16). `[AA]`
- [ ] **Platform a11y limits known and disclosed** — some patterns can't be made fully accessible in a given tool; if the project needs AA and the tool can't, that's a build-method escalation. `[AA]`

### [Animation/WebGL]
- [ ] **`prefers-reduced-motion` path for every effect** (§7/§16). `[AA]` **(non-negotiable)**
- [ ] **No flash-threshold violations in any sequence** (§7). `[A]` **(non-negotiable)**
- [ ] **Canvas/WebGL information has an accessible equivalent** — text/static alternative for anything meaningful conveyed visually (§16). `[AA]`
- [ ] **Interactive canvas is keyboard-operable or has an accessible alternative path** — a pure-pointer canvas locks out keyboard/AT users (§5). `[AA]`
- [ ] **Graceful, accessible degradation when WebGL/motion unavailable** (cross-ref Performance §11). `[AA]`

### [Design]
> Accessibility designed-in is cheap; retrofitted is expensive. These belong in the design/handoff phase (cross-ref the design-handoff skill).
- [ ] **Contrast verified in the design tool** — text and non-text pairs meet AA *before* build (Stark/Figma plugins). `[AA]` **(non-negotiable)**
- [ ] **Focus states designed for every interactive element** — not left to the browser default or removed; specified in the design system. `[AA]`
- [ ] **Target sizes and spacing meet the minimum in the layout** (§9). `[AA]`
- [ ] **Meaning never carried by colour alone** — states/series/required use text+shape too (§4). `[A]`
- [ ] **Type for readability** — adequate size, line-height 1.5×, line length, left-aligned body (§18). `[AA]`
- [ ] **Content order designed to linearise sensibly** — visual order maps to a logical source order (§3). `[A]`
- [ ] **Error, empty, loading, and disabled states designed accessibly** — including how they're announced (§12/§13). `[AA]`
- [ ] **Motion designed with a reduced-motion variant from the start** (§16). `[AA]`

---

## Consultant Layer — Tooling & Escalation

> What to tool, what needs a human, and when to bring in a specialist. Core principle (like Performance): **automation is a floor, not a verdict — the spend that matters is human and AT testing, and at the top, disabled users.**

### Automated testing (adopt now, free/cheap)
- **axe DevTools** (browser extension + axe-core for CI) — the industry standard engine; **Lighthouse** (a11y category, built into Chrome); **WAVE** (visual in-page); **Pa11y** (CLI/CI). Lean answer: axe + Lighthouse now, axe-core/Pa11y in CI as a gate. `[Floor]`
- **Linting:** `eslint-plugin-jsx-a11y` for React. `[Floor]`
- **Design-phase:** Stark / Figma contrast & a11y plugins. `[Floor]`

### Manual & assistive tech (the real test — adopt now)
- **Screen readers:** NVDA (free, Windows), VoiceOver (built into Mac/iOS), TalkBack (Android), JAWS (paid, enterprise). Lean answer: NVDA + VoiceOver now — free and cover the majority. `[Floor]`
- **Keyboard + zoom:** no tool needed — discipline and a checklist (§21). `[Floor]`
- **Contrast/color:** TPGi Colour Contrast Analyser; browser DevTools. `[Floor]`

### Monitoring & scale
- **Continuous monitoring** (axe Monitor, Siteimprove) — for large/regulated sites tracking regressions across many pages. `[Growth]`
- **Formal audit / VPAT** — a structured WCAG audit and conformance report; trigger: public-sector/procurement, a legal demand, or a high-stakes launch (coordinate Legal). `[Growth]`
- **User testing with disabled people** — recruit via panels/specialist agencies; the only way to validate real usability. Trigger: AAA work, public services, or when the stakes justify certainty. `[Enterprise]`

### A caution on "accessibility overlays"
- **Overlay widgets (one-line "instant accessibility" scripts) do not make a site conformant** and are widely criticised by the accessibility community and disabled users; many have been the subject of complaints. **Don't sell or rely on them as a fix** — they're a red flag, not a solution. Real accessibility is built in, not bolted on with a script. `[All]`

### Sequencing for Qera
1. **Now, every project (free):** axe + Lighthouse + WAVE, NVDA + VoiceOver testing, keyboard/zoom discipline, Stark in design, jsx-a11y lint, axe-core CI gate.
2. **When a client needs assurance/scale (`[Growth]`):** formal WCAG audit + accessibility statement/VPAT; monitoring for large sites.
3. **High-stakes/public-sector (`[Enterprise]`):** user testing with disabled people; AAA-selective targets.

**Bottom line:** accessibility is a differentiator most agencies fake with an overlay and a green Lighthouse score. Qera doing it *for real* — keyboard, screen reader, designed-in — is both the right thing and a defensible market position.

---

## Maintenance Schedule

> Accessibility regresses with every new feature, content edit, and dependency — and the standard itself evolves (WCAG 3.0 on the horizon). A site accessible at launch and never re-tested will not stay accessible.

### Per-project (kickoff → launch)
- [ ] §0 scope/target/baseline done
- [ ] Full §21 testing layers run before launch (automated + keyboard + zoom + screen reader + reduced-motion)
- [ ] Accessibility statement published (§22)
- [ ] New components tested against §14/§15 before shipping

### Monthly
- [ ] Automated a11y scan of key pages/flows; triage regressions
- [ ] New content alt-text/heading/contrast spot-check (content edits are a top regression source)
- [ ] Any new component/interaction keyboard + screen-reader tested

### Quarterly
- [ ] **Full re-audit** of key flows at the project's level (automated + manual + AT)
- [ ] **Reduced-motion & forced-colours re-check** (esp. after design/animation changes)
- [ ] **AT/browser matrix refresh** — screen-reader and OS updates change behaviour; re-confirm
- [ ] **This checklist reviewed** — WCAG 3.0 progress, new techniques, deprecated patterns
- [ ] **Accessibility statement currency** — re-dated and accurate to the current state

### Annually
- [ ] **Independent/formal audit** for high-stakes clients
- [ ] **User testing with disabled people** where scoped
- [ ] **Standard-version watch** — WCAG 3.0 milestones (Candidate Rec ~2027), and any legal-mandate changes (owned by Legal §10)

---

## Notes

### Verification Toolbox
| Need | Tool / method |
|---|---|
| Automated scan (the floor) | axe DevTools · Lighthouse (a11y) · WAVE · Pa11y · axe-core (CI) |
| Keyboard operability | Manual — unplug the mouse (§21 Layer 2) |
| Screen-reader experience | NVDA+Firefox/Chrome · VoiceOver+Safari · TalkBack+Chrome · JAWS |
| Contrast | TPGi Colour Contrast Analyser · DevTools · Stark (design) |
| Zoom / reflow | Browser zoom to 200% text & 400%/320px |
| Reduced motion | OS "Reduce Motion" + `prefers-reduced-motion` |
| Text spacing | WCAG text-spacing bookmarklet |
| Documents | PDF/Office accessibility checkers + AT read-through |
| Linting (React) | eslint-plugin-jsx-a11y |
| Reference | WCAG 2.2 (How to Meet / Understanding) · WAI-ARIA Authoring Practices Guide (APG) |

### The 6 tests that catch the most real-world exclusion
> If a deadline forces triage, run these six. They map to the highest-impact, most-common failures — and they're mostly free.
1. **Unplug the mouse** — keyboard-complete every key task; check focus visibility, order, no traps, modal focus.
2. **One screen-reader pass** (NVDA or VoiceOver) on the key flow — is it coherent, are controls named, are updates announced?
3. **Contrast check** on body text and UI states — 4.5:1 / 3:1.
4. **Zoom to 400% / 320px wide** — does it reflow without loss?
5. **Reduce Motion on** — is the experience calm and complete?
6. **Tab to every form field** — labelled? errors announced? (forms are where tasks die).

### Deprecated & Anti-Patterns (do NOT do)
| Practice | Why it's wrong | Instead |
|---|---|---|
| `<div>`/`<span>` with a click handler as a button/link | No role, no keyboard, no focus | Native `<button>` / `<a>` |
| `outline: none` with no replacement | Removes focus visibility (§5) | Visible, high-contrast focus indicator |
| Placeholder as the only label | Vanishes on input, low contrast (§12) | Real `<label>` |
| `aria-label` everywhere / to "fix" semantics | Desyncs from visible text; masks broken markup | Visible labels + native semantics |
| Positive `tabindex` (>0) | Breaks natural focus order | `tabindex="0"`/`-1` and source order |
| `user-scalable=no` / `maximum-scale=1` | Disables zoom (§19) | Allow pinch-zoom |
| Colour as the sole information cue | Excludes colour-blind users (§4) | Add text/shape/pattern |
| Auto-playing audio/large motion without control | Disrupts AT; vestibular harm (§2/§7) | Pause control + reduced-motion |
| Accessibility overlay widgets | Don't achieve conformance; community-rejected | Build accessibility in |
| Justified body text / image-of-text | Hurts dyslexic/low-vision users | Left-aligned real text |
| `aria-hidden` on focusable/interactive content | Hides it from AT but not keyboard — confusion | Don't hide interactive content from AT |
| Auto-generated captions left unreviewed | Often wrong = misinformation for deaf users (§2) | Reviewed, accurate captions |
| Shipping on a green automated scan alone | Catches ~30–40%; misses the real experience | Add keyboard + screen-reader testing |

### Scope, honesty & the human point
- **Accessibility is for people, measured by whether they can complete the task** — not by a scanner score. A green automated report on an unusable page is a failure, not a pass.
- **Automated tools catch ~30–40%.** Manual + assistive-tech testing is mandatory for a real AA claim; user testing with disabled people is the gold standard.
- **Default target is WCAG 2.2 AA.** Level A alone is never sufficient; AAA is applied selectively (W3C notes it can't be met for all content).
- **WCAG 3.0 is coming but not here** — Working Draft (2026), ~2028–2030 to Recommendation, will coexist with 2.2. Building to 2.2 AA now is correct and durable, not throwaway.
- **Precedence:** Accessibility (rank 3) is never traded for Performance, SEO, or Design. The **legal mandate** is owned by Legal §10; this doc owns the technical standard and conformance claim. Don't publish a conformance claim you haven't earned.
- **Designed-in beats bolted-on.** The cheapest, best accessibility is decided in the design phase (contrast, focus, target size, structure, motion) — which is why the `[Design]` addendum exists.
- **Living document.** Re-test on change; review quarterly; watch WCAG 3.0. v1 reflects standards current as of June 2026.
