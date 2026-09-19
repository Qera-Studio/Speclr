# Service catalogue: the complete structure

> **This document is the spec, and the seed is written from it.** Nothing in the
> service system is built until this file is right: the previous attempt guessed
> the structure and produced a catalogue that reached no document.
>
> Companion files: `contract-system.md` holds the four Schedules and the 22 legal
> Parts; `contract-content.md` holds their text. This file holds **what is sold**.
>
> Every rate and unit below is **transcribed from the five rate-card PDFs** via
> `scripts/rate-card-menu.json`, which holds all 278 lines. Nothing is invented.
> Decisions are marked **[DECISION]**; unresolved questions **[OPEN]**. Ten
> questions were put to the founder and nine closed on 19 September 2026; §8
> records each answer and what is still open.

Status: **proposed, 19 September 2026.** Not yet built. §8 lists the one
remaining open question, which does not block the build.

---

## 1. Why this exists

### The diagnosis

One concept is modelled as three half-overlapping ones.

1. **The 22 services** (`src/lib/domain/contract/seed/services.ts`) were
   transcribed from `contract-content.md`. They are **contract Parts by origin**:
   legal scope units with `[blanks]`, limits, completion criteria and exclusion
   ids. They were never a sales catalogue.
2. **`included[]`** is contract prose parsed for `[blanks]` against an exact key
   set in `blankMeta.ts`. A form may not write to it: shifting an ordinal moves a
   client's stored figure onto a different sentence.
3. **`menu[]`** (18 September 2026, commit `7f4eb9a`) holds 278 priced rate-card
   lines and **is read by nothing outside the services admin screen**: no reader
   exists under `src/components/docs/`, `src/components/contract/` or
   `src/lib/domain/contract/`. `MenuLine.id`'s never-reissue rule exists to
   protect `ClientEngagedService.menuIds`, **a field that was never added**.

The rate cards were poured into a structure that could not carry them, and the
data proves it: `rate-card-menu.json` files **88 of its 278 lines under service
`06`** while services `02` and `05` get none, and **18 of its 46 groups span more
than one service** (`Foundation system` → 01 and 06; `Retainership` → 18, 19, 20).
The `_review` block at the top of that file is the previous session listing seven
filing problems it could not resolve. The filing is not wrong; the shape is.

### Already written down

`ROADMAP.md` §10, reported 3 September 2026 while onboarding a real client, names
the same sub-items ("analytics, CRO, a CMS, interactivity... cookie consent,
3D/WebGL, booking systems, payment gateway integration") and instructs:
*"Needs its own design pass; do not bolt it onto `fee`/`lines`."* The previous
session bolted on a pricing menu instead of designing the item. This is that pass.

### Decisions taken

- **[DECISION]** A handful of sales services with items underneath, not 22.
- **[DECISION]** An item's **name is its scope**. No per-item inclusion or
  exclusion prose: see §4 for the three reasons, of which the first is that a new
  user must not have to author 600 sentences before issuing anything.
- **[DECISION]** Exclusions stay at **service** level, from the existing shared
  library, opt-out as today. That library is kept, not replaced.
- **[DECISION]** Shape for a second tenant; build nothing for it.
- **[DECISION]** Domain, Hosting, Email, Maintenance and Design are **separate
  services**, not sub-parts of a website. A website engagement *adds* several
  services; it does not absorb them. This is why a service never spans schedules,
  and it is what `contract-system.md` §11 already requires.

---

## 2. The two layers

| Layer | What it is | Count | Table |
|---|---|---|---|
| **Service** | A thing sold. Carries items. | 16 | `services` |
| **Part** | A legal frame: blanks, limits, completion, handover. | 22 | unchanged |

The 22 Parts are **not deleted**. They are good at being a contract frame and
that job does not change. A Service names the frames a contract pulls, via
`partCodes`. A quotation and an invoice never look at a Part.

Moving the catalogue out of `contract/` closes `PRINCIPLES.md` rule 1: a record
used by four document types stops being parented under the first one that used it.

---

## 3. File structure

```
src/lib/domain/
├── service.ts                 Service type, zod, rateUnitOf
├── serviceItem.ts             [NEW] ServiceItem type, zod, assignItemIds
├── seed/
│   ├── services.ts            [NEW] the 16 services and their items
│   └── parts.ts               [MOVED] the 22 legal frames
│                                      (was contract/seed/services.ts)
└── contract/
    ├── blanks.ts              unchanged
    ├── blankMeta.ts           unchanged
    ├── completeness.ts        unchanged
    ├── schedules.ts           unchanged, the four legal frames
    └── seed/libraries.ts      unchanged, E01-E91, I01-I65

docs/service-catalogue.md      this file
```

---

## 4. The types

```ts
// src/lib/domain/serviceItem.ts   [NEW]

/** What a rate is per. */
export type ItemUnit = 'fixed' | 'monthly' | 'perUnit';

export interface ServiceItem {
  /** 'I1', 'I2'… assigned server-side, NEVER reissued. See assignItemIds. */
  id: string;
  /** The line's description. Prints on an invoice and on a quotation. */
  name: string;
  /** One client-facing sentence, printed under the name on a quotation. */
  blurb?: string;
  /** Integer paise. Absent means quoted per engagement. */
  ratePaise?: number;
  unit: ItemUnit;
  /** 'per page', 'per screen', 'per video'. Meaningful for perUnit only. */
  unitLabel?: string;
  /**
   * The rate-card heading this line came from, e.g. 'Foundation system'.
   * A LABEL ONLY: 18 of the 46 groups span several services, so a group can
   * never own an item.
   */
  group?: string;
  /** Overrides the service's SAC where this item classifies differently. */
  sacCode?: string;
  /** The top of a range, for a retainer quoted as a band. */
  rateMaxPaise?: number;
  archived: boolean;
}
```

**There is deliberately no `inclusion` or `exclusion` field.** An item's **name
is its scope**, and that is the decision this whole model turns on. Three
reasons, in the order they matter:

1. **A new user writes nothing.** Setting up means naming items and pricing
   them. Authoring two sentences for 300 items is a week of work before a single
   document can be issued, and most of those sentences would never be read.
2. **The contract stays short.** Twenty ticked items would otherwise add forty
   sentences on top of the Schedule's terms. A named list of twenty
   deliverables is both shorter and easier to check.
3. **The names are already precise.** "Payment gateway integration", "Custom CMS
   development", "Additional standard page" say what they are. A sentence
   restating them adds length, not meaning.

**Exclusions stay where they already work**: attached at *service* level from the
shared library, rendered pre-ticked as excluded, unticked to bring something into
scope (`contract-system.md` §6). That library is 91 lines, shared across every
service, and grows only by the post-project ritual, 3 to 8 lines a project and
then flat. Nothing here is per item, so nothing here grows per item. That is what
bounds it, and it is why the library is **kept rather than replaced**: a generic
line is what makes it reusable across fifteen services.

```ts
// src/lib/domain/service.ts   [CHANGED]

export interface ServiceContent {
  /** Client-facing paragraph. Prints as the quotation service page's blurb. */
  blurb?: string;
  /** Default GST classification; an item may override it. */
  sacCode?: string;
  /** The legal frames a contract pulls when this service is on it. */
  partCodes: string[];
  items: ServiceItem[];
  /** Highest item number ever issued. The never-reissue floor. */
  itemSeq: number;
}

export interface Service extends ServiceContent {
  code: string;               // 'WEB'. Stable, cited by records and documents.
  name: string;
  scheduleKey: ScheduleKey;   // build | retainer | setup | audit
  sortOrder: number;
  archived: boolean;
}
```

**Deleted:** `dependencies` and `pairings` (no reader anywhere in the codebase),
and `menu`/`menuSeq` (replaced by `items`/`itemSeq`).

**Moved to the Part:** `included`, `accountTerms`, `limits`, `limitsNotes`,
`completion`, `receives`, `receivesNotes`, `thirdPartyCosts`, `exclusionIds`,
`clientInputIds`, `fee`, `overview`.

### What each document reads

```
                    ┌──────────────────────────┐
                    │  Service                 │
                    │    items[]               │
                    └────────────┬─────────────┘
      ┌────────────────┬─────────┴──────┬────────────────────┐
      ▼                ▼                ▼                    ▼
   INVOICE         QUOTATION        CONTRACT            CLIENT RECORD
  item.name       item.name        item.name           service.code
  item.sacCode    item.blurb        (as deliverables)  item.id[]
    ?? svc.sacCode  qty × rate     + the Schedule's    agreed ratePaise
  item.ratePaise  item.group        shared terms
  qty               → table heading
```

| Field | Invoice | Quotation | Contract | Client record |
|---|:-:|:-:|:-:|:-:|
| `id` | ✓ | ✓ | ✓ | ✓ |
| `name` | ✓ | ✓ | ✓ | |
| `blurb` | | ✓ | | |
| `ratePaise` | ✓ | ✓ | | ✓ (agreed) |
| `rateMaxPaise` | | ✓ | | |
| `unit` | ✓ | ✓ | | |
| `unitLabel` | | ✓ | | |
| `group` | | ✓ | | |
| `sacCode` | ✓ | | | |

### What a contract actually renders

Vocabulary, because it is easy to slip: a **Part** is not a separate record. It
is a Service *rendered inside a Schedule* as A1, A2, B1 (`contract-system.md` §4
step 5, and `assembly.ts`'s `type ContractPart = ContractService`). There are
**four Schedules in total**, shared by every service, never one per service: ten
build services all render inside Schedule A, because a Shopify build and a custom
build need identical payment and ownership terms.

```
Master agreement                     never changes
Schedule A (Build)                   shared legal terms
  A1  Custom Website                 the Service, rendered as a Part
        Deliverables                 the ticked items        ← NEW
          · Core website setup (5 pages)
          · Custom CMS development
          · Payment gateway integration
          · GSAP motion system
        What is not included         the service's library ids,
          · Copywriting of any kind    pre-ticked as excluded
          · Gateway account approval
  A2  Design
        Deliverables ...
Schedule B (Monthly)
  B1  Website Maintenance ...
```

**The Deliverables list is the only new thing.** Everything below it already
exists and is already reviewed. The list is what makes a contract state what
*this* client bought, which is the gap `ROADMAP.md` §10 reported.

### Editable at source, overridable per contract

Both, and the difference matters:

- **At source** (`/client/services/<code>`): the item's name and rate. Written
  once, reused on every future document.
- **Per contract**: the contract already freezes a copy of everything it
  includes (`CONTEXT.md` §5c), so editing a deliverable there changes that
  contract and nothing else.

The nesting risk raised while designing this is a screen problem, not a model
problem: the scope phase shows the ticked items as one flat list, editable in
place. Nothing in the data requires a dialog inside a sheet inside a drawer, and
a screen that needs five clicks to reach a deliverable has been built wrong.

---

## 5. The catalogue: 16 services, 293 items

Codes are three or four letters and stable. Rates are **rupees** here for
readability; stored as integer paise (`× 100`).

**Legend:** `fixed` = one-time · `monthly` = per month · `perUnit` = × quantity.
A rate shown `8,000 – 25,000` is a band: `ratePaise` is the low end,
`rateMaxPaise` the high.

---

### SCHEDULE: BUILD: fixed fee, one-time

> 6 services · 203 items · Schedule A

---

#### `WEB`: Custom Website · 52 items

```yaml
code:        WEB
name:        Custom Website
scheduleKey: build
sortOrder:   1
sacCode:     "998314"          # IT design & development
partCodes:   ["06"]            # Custom web build
blurb: >
  A website built in code rather than on a visual builder, designed as an
  experience to explore. The Client receives a live site, the repository
  containing it, and the ability to have it maintained by any competent
  developer.
```

**group: Foundation system** (9)

| id | name | rate | unit |
|---|---|---|---|
| I1 | Discovery & strategy workshop | 10,000 | fixed |
| I2 | Information architecture / sitemap | 8,000 | fixed |
| I3 | Responsive frontend development | 15,000 | fixed |
| I4 | Core website setup (5 pages) | 25,000 | fixed |
| I5 | Additional standard page | 4,000 | perUnit · per page |
| I6 | Design system setup | 18,000 | fixed |
| I7 | CMS-ready architecture | 12,000 | fixed |
| I8 | Hosting & deployment setup | 5,000 | fixed |
| I9 | Performance baseline optimisation | 10,000 | fixed |

> `Domain & DNS configuration` sat in this group on the Development card. It is
> service **`DNS`** instead (**[DECISION]**, a domain carries work of its own).

**group: Brand experience systems** (10)

| id | name | rate | unit |
|---|---|---|---|
| I10 | Premium scroll storytelling | 12,000 | fixed |
| I11 | GSAP motion system | 20,000 | fixed |
| I12 | Page transition system | 15,000 | fixed |
| I13 | Micro-interaction system | 12,000 | fixed |
| I14 | Dark/light theme system | 12,000 | fixed |
| I15 | Premium loading experience | 8,000 | fixed |
| I16 | Interactive showcase sections | 15,000 | fixed |
| I17 | Portfolio / case study system | 20,000 | fixed |
| I18 | Advanced testimonial system | 10,000 | fixed |
| I19 | FAQ experience section | 6,000 | fixed |

**group: Conversion & CRO** (10)

| id | name | rate | unit |
|---|---|---|---|
| I20 | Smart lead capture system | 12,000 | fixed |
| I21 | Multi-step conversion forms | 18,000 | fixed |
| I22 | WhatsApp lead integration | 10,000 | fixed |
| I23 | Booking & scheduling system | 18,000 | fixed |
| I24 | Funnel architecture setup | 20,000 | fixed |
| I25 | CRO audit | 15,000 | fixed |
| I26 | Heatmap integration | 8,000 | fixed |
| I27 | Session recording setup | 8,000 | fixed |
| I28 | Funnel tracking setup | 15,000 | fixed |
| I29 | A/B testing infrastructure | 20,000 | fixed |

**group: Marketing & SEO** (7, three moved to `ANLY`)

| id | name | rate | unit |
|---|---|---|---|
| I30 | SEO foundation setup | 15,000 | fixed |
| I31 | Technical SEO optimisation | 20,000 | fixed |
| I32 | Schema markup system | 8,000 | fixed |
| I33 | Blog / CMS setup | 35,000 | fixed |
| I34 | Newsletter infrastructure | 10,000 | fixed |
| I37 | Social feed integration | 8,000 | fixed |
| I39 | GEO / AI search optimisation | 8,000 | fixed |

> **[DECISION]** `Google Analytics setup` (I35), `Google Tag Manager setup` (I36)
> and `Search Console setup` (I38) moved to **`ANLY`** and are not duplicated
> here. The three ids stay retired: an id is never reissued, so `itemSeq` remains
> 55 although the service now carries 52 items. That gap is the rule working.

**group: Backend & platform** (10)

| id | name | rate | unit |
|---|---|---|---|
| I40 | Authentication system | 25,000 | fixed |
| I41 | Admin dashboard | 40,000 | fixed |
| I42 | Client portal | 45,000 | fixed |
| I43 | Database architecture | 25,000 | fixed |
| I44 | API integration | 15,000 | fixed |
| I45 | CRM integration | 18,000 | fixed |
| I46 | Payment gateway integration | 15,000 | fixed |
| I47 | Custom CMS development | 50,000 | fixed |
| I48 | SaaS MVP development | 2,00,000 | fixed |
| I49 | Membership platform | 60,000 | fixed |

**group: Infrastructure** (6, four moved out)

| id | name | rate | unit |
|---|---|---|---|
| I50 | Security hardening | 18,000 | fixed |
| I51 | Cloudflare setup | 10,000 | fixed |
| I52 | Performance engineering | 20,000 | fixed |
| I53 | Accessibility compliance | 15,000 | fixed |
| I54 | Staging environment setup | 10,000 | fixed |
| I55 | CI/CD deployment pipeline | 20,000 | fixed |

> Moved out of this group by **[DECISION]**: `Error monitoring setup`,
> `Monitoring & uptime systems` and `Backup & recovery systems` → **`MNT`**
> (they are what a maintenance retainer does); `Email infrastructure setup`
> → **`MAIL`**.

`itemSeq: 55`

---

#### `DSGN`: Design · 46 items

```yaml
code:        DSGN
name:        Design
scheduleKey: build
sortOrder:   2
sacCode:     "998391"          # specialty design
partCodes:   ["10"]            # Design system
blurb: >
  Interface and experience design, delivered as a developer-ready package.
  Design is its own engagement: it may precede a build here, feed a build
  elsewhere, or stand alone.
```

> **[DECISION]** Design is a separate service, never part of Development.

**group: UI/UX design** (10)

| id | name | rate | unit |
|---|---|---|---|
| I1 | Landing page UI design | 30,000 | fixed |
| I2 | Premium landing experience | 60,000 | fixed |
| I3 | Multi-page website design | 90,000 | fixed |
| I4 | Conversion-focused website UX | 1,20,000 | fixed |
| I5 | SaaS website design | 1,50,000 | fixed |
| I6 | High-end portfolio experience | 80,000 | fixed |
| I7 | Interactive storytelling website | 1,50,000 | fixed |
| I8 | Webflow-ready design system | 60,000 | fixed |
| I9 | Developer-ready UI package | 25,000 | fixed |
| I10 | Motion-driven website experience | 1,80,000 | fixed |

**group: Design foundations** (10)

| id | name | rate | unit |
|---|---|---|---|
| I11 | Design audit & visual review | 10,000 | fixed |
| I12 | Brand UI direction | 15,000 | fixed |
| I13 | Layout grid system | 10,000 | fixed |
| I14 | Typography system | 12,000 | fixed |
| I15 | Spacing & rhythm system | 10,000 | fixed |
| I16 | Colour & token system | 12,000 | fixed |
| I17 | UI component library | 25,000 | fixed |
| I18 | Visual consistency audit | 15,000 | fixed |
| I19 | Accessibility design layer | 12,000 | fixed |
| I20 | Responsive design adaptation | 15,000 | fixed |

**group: Conversion & UX systems** (10)

| id | name | rate | unit |
|---|---|---|---|
| I21 | CRO-focused UX audit | 20,000 | fixed |
| I22 | Landing page optimisation | 25,000 | fixed |
| I23 | CTA optimisation system | 10,000 | fixed |
| I24 | Funnel UX design | 60,000 | fixed |
| I25 | Lead capture UX system | 20,000 | fixed |
| I26 | Form optimisation UX | 15,000 | fixed |
| I27 | Behavioural UX analysis | 25,000 | fixed |
| I28 | Heatmap-based UX review | 20,000 | fixed |
| I29 | A/B test design variants | 25,000 | fixed |
| I30 | Mobile UX optimisation | 30,000 | fixed |

**group: Motion & interactive design** (10)

| id | name | rate | unit |
|---|---|---|---|
| I31 | Basic motion graphics | 8,000 | fixed |
| I32 | Premium motion system | 35,000 | fixed |
| I33 | UI micro-interaction design | 12,000 | fixed |
| I34 | Scroll animation design | 20,000 | fixed |
| I35 | Interactive cursor systems | 15,000 | fixed |
| I36 | Loading experience design | 12,000 | fixed |
| I37 | Lottie animation systems | 15,000 | fixed |
| I38 | Product reveal animations | 30,000 | fixed |
| I39 | Cinematic web motion direction | 80,000 | fixed |
| I40 | Sensory interaction design | 80,000 | fixed |

**group: 3D & advanced visual** (6)

| id | name | rate | unit |
|---|---|---|---|
| I41 | 3D visual direction | 80,000 | fixed |
| I42 | Spline experience design | 80,000 | fixed |
| I43 | Blender visual systems | 1,20,000 | fixed |
| I44 | Premium animation system | 1,00,000 | fixed |
| I45 | Interactive 3D product visuals | 90,000 | fixed |
| I46 | Experimental digital experience | 2,50,000 | fixed |

> **[DECISION]** `Spline experience design` is 80,000. The card printed 4,000,
> which was a missing zero, confirmed 19 September 2026.

`itemSeq: 46`

---

#### `APP`: Product & App Design · 20 items

```yaml
code:        APP
name:        Product & App Design
scheduleKey: build
sortOrder:   3
sacCode:     "998391"
partCodes:   ["10"]
blurb: >
  Interface design for a product rather than a marketing site: screens, flows,
  and the system that keeps them consistent as the product grows.
```

> **[OPEN]** `rate-card-menu.json`'s own `_review` says the Product & app group
> "probably wants its own service". Split here. Fold into `DSGN` for 15 services.

**group: Product & app** (10)

| id | name | rate | unit |
|---|---|---|---|
| I1 | Mobile app UI | 5,000 | perUnit · per screen |
| I2 | Web app UI | 6,000 | perUnit · per screen |
| I3 | Full app design (20 to 40 screens) | 3,00,000 | fixed |
| I4 | SaaS product design | 4,00,000 | fixed |
| I5 | Dashboard UI system | 80,000 | fixed |
| I6 | Admin panel design | 70,000 | fixed |
| I7 | Design prototype system | 40,000 | fixed |
| I8 | UX flow architecture | 60,000 | fixed |
| I9 | Product wireframing | 50,000 | fixed |
| I10 | User journey mapping | 25,000 | fixed |

**group: Design scalability** (10)

| id | name | rate | unit |
|---|---|---|---|
| I11 | Figma design system setup | 35,000 | fixed |
| I12 | Component variant system | 20,000 | fixed |
| I13 | Token-based design architecture | 25,000 | fixed |
| I14 | Developer handoff package | 15,000 | fixed |
| I15 | Design documentation | 15,000 | fixed |
| I16 | Scalable UI system | 60,000 | fixed |
| I17 | Enterprise component library | 1,00,000 | fixed |
| I18 | Multi-brand design system | 1,20,000 | fixed |
| I19 | Product design governance | 80,000 | fixed |
| I20 | Team collaboration system | 30,000 | fixed |

`itemSeq: 20`

---

#### `BRND`: Brand Identity · 41 items

```yaml
code:        BRND
name:        Brand Identity
scheduleKey: build
sortOrder:   4
sacCode:     "998391"
partCodes:   ["09"]            # Brand identity
blurb: >
  The brand's visual and verbal system: how it looks, how it sounds, and the
  guide that keeps it consistent wherever it is applied.
```

**group: Base branding structure** (5)

| id | name | rate | unit |
|---|---|---|---|
| I1 | Brand discovery session | 5,000 | fixed |
| I2 | Audience & market research | 10,000 | fixed |
| I3 | Competitor analysis | 8,000 | fixed |
| I4 | Brand positioning statement | 12,000 | fixed |
| I5 | Brand messaging framework | 15,000 | fixed |

**group: Logo** (3)

| id | name | rate | unit |
|---|---|---|---|
| I6 | Logo design (basic) | 10,000 | fixed |
| I7 | Logo system (primary + variants) | 30,000 | fixed |
| I8 | Premium logo exploration (multiple directions) | 55,000 | fixed |

**group: Visual identity** (5)

| id | name | rate | unit |
|---|---|---|---|
| I9 | Colour system | 8,000 | fixed |
| I10 | Typography system (open-source) | 8,000 | fixed |
| I11 | Spacing & layout system | 12,000 | fixed |
| I12 | Iconography | 20,000 | fixed |
| I13 | Visual language (illustrations, style) | 20,000 | fixed |

**group: Brand guidelines** (2)

| id | name | rate | unit |
|---|---|---|---|
| I14 | Basic brand guide | 35,000 | fixed |
| I15 | Complete brand book | 80,000 | fixed |

**group: Business branding** (4)

| id | name | rate | unit |
|---|---|---|---|
| I16 | Business cards | 5,000 | fixed |
| I17 | Letterhead / documents | 5,000 | fixed |
| I18 | Email signature system | 5,000 | fixed |
| I19 | Presentation deck template | 10,000 | fixed |

**group: Brand strategy** (5)

| id | name | rate | unit |
|---|---|---|---|
| I20 | Naming (brand name creation) | 25,000 | fixed |
| I21 | Tagline / slogan | 10,000 | fixed |
| I22 | Tone of voice system | 10,000 | fixed |
| I23 | Brand story writing | 15,000 | fixed |
| I24 | Content direction strategy | 20,000 | fixed |

**group: Positioning** (3)

| id | name | rate | unit |
|---|---|---|---|
| I25 | Personal brand strategy | 75,000 | fixed |
| I26 | High-end brand positioning | 2,00,000 | fixed |
| I27 | Rebranding (full overhaul) | 5,00,000 | fixed |

**group: Brand experience** (10)

| id | name | rate | unit |
|---|---|---|---|
| I28 | Visual identity integration | 40,000 | fixed |
| I29 | Brand experience direction | 40,000 | fixed |
| I30 | Premium digital brand language | 70,000 | fixed |
| I31 | Cross-platform brand consistency | 40,000 | fixed |
| I32 | Brand-led UX systems | 60,000 | fixed |
| I33 | Luxury visual systems | 1,00,000 | fixed |
| I34 | Brand perception audit | 20,000 | fixed |
| I35 | Emotional design strategy | 35,000 | fixed |
| I36 | Trust-building UX systems | 25,000 | fixed |
| I37 | Brand motion language | 50,000 | fixed |

**group: Advanced visual** (4)

| id | name | rate | unit |
|---|---|---|---|
| I38 | Illustration system | 60,000 | fixed |
| I39 | Custom iconography system | 25,000 | fixed |
| I40 | Generative visual design | 70,000 | fixed |
| I41 | AI-assisted visual concepts | 30,000 | fixed |

`itemSeq: 41`

---

#### `AUTO`: Automation Build · 31 items

```yaml
code:        AUTO
name:        Automation Build
scheduleKey: build
sortOrder:   5
sacCode:     "998314"
partCodes:   ["12"]            # Automation build
blurb: >
  Systems that capture, route and act on information without somebody doing it
  by hand: intake, lead handling, notifications and the integrations between the
  tools already in use.
```

**group: Base automation structure** (4)

| id | name | rate | unit |
|---|---|---|---|
| I1 | Website / WhatsApp / chat intake | 12,000 | fixed |
| I2 | Structured data capture | 8,000 | fixed |
| I3 | Google Sheets / CRM logging | 5,000 | fixed |
| I4 | Basic notifications | 7,000 | fixed |

**group: Lead management** (4)

| id | name | rate | unit |
|---|---|---|---|
| I5 | Lead database setup (Sheets / CRM) | 10,000 | fixed |
| I6 | Lead routing logic | 12,000 | fixed |
| I7 | Status tracking system | 8,000 | fixed |
| I8 | Lead scoring system | 15,000 | fixed |

**group: Multi-channel automation, set-up** (4)

| id | name | rate | unit |
|---|---|---|---|
| I9 | WhatsApp automation (set-up) | 12,000 | fixed |
| I10 | Instagram / Facebook DM automation (set-up) | 5,000 | fixed |
| I11 | Email automation (set-up) | 10,000 | fixed |
| I12 | SMS automation (set-up) | 8,000 | fixed |

> The four **monthly** counterparts live on **`AIOP`** (retainer).
> **[DECISION]** A set-up fee and a monthly fee are two items under two
> schedules, per `contract-system.md` §11.

**group: Integrations** (5)

| id | name | rate | unit |
|---|---|---|---|
| I13 | CRM integration | 30,000 | fixed |
| I14 | Google Workspace automation | 10,000 | fixed |
| I15 | Calendar integration | 8,000 | fixed |
| I16 | Payment gateway automation | 15,000 | fixed |
| I17 | Custom API integration | 45,000 | fixed |

**group: Internal operations** (3)

| id | name | rate | unit |
|---|---|---|---|
| I18 | Task automation system | 15,000 | fixed |
| I19 | Internal notifications | 8,000 | fixed |
| I20 | Approval workflows | 12,000 | fixed |

**group: Client operations** (3)

| id | name | rate | unit |
|---|---|---|---|
| I21 | Appointment automation | 15,000 | fixed |
| I22 | Follow-up system | 10,000 | fixed |
| I23 | No-show reduction system | 10,000 | fixed |

**group: Analytics and dashboards** (3)

| id | name | rate | unit |
|---|---|---|---|
| I24 | Analytics dashboard | 15,000 | fixed |
| I25 | Reporting automation | 10,000 | fixed |
| I26 | Performance tracking | 12,000 | fixed |

**group: Workflow & CRM automation** (3, from the Development card)

| id | name | rate | unit |
|---|---|---|---|
| I27 | Workflow automation | 15,000 | fixed |
| I28 | CRM automation | 20,000 | fixed |
| I29 | Email automation systems | 18,000 | fixed |

**group: Complete engine** (2)

| id | name | rate | unit |
|---|---|---|---|
| I30 | Full funnel integration (social to website to CRM) | 70,000 | fixed |
| I31 | AI content engine (bulk scripting + ideation) | 35,000 | fixed |

`itemSeq: 31`

---

#### `AI`: AI Systems · 13 items

```yaml
code:        AI
name:        AI Systems
scheduleKey: build
sortOrder:   6
sacCode:     "998314"
partCodes:   ["13"]            # AI assistant build
blurb: >
  Assistants and tools built on a language model and trained on the Client's own
  material: chat, qualification, search and internal tooling.
```

> **[OPEN]** Two cards price the same work differently. Both are kept as tiers.
> Reconcile or keep: `AI chat assistant` 45,000 (Development) vs
> `Basic chat assistant` 20,000 (Automation); `AI lead qualification` 35,000 vs
> `AI lead qualification bot` 25,000.

**group: AI chat systems** (3)

| id | name | rate | unit |
|---|---|---|---|
| I1 | Basic chat assistant | 20,000 | fixed |
| I2 | Custom trained AI | 50,000 | fixed |
| I3 | Multi-language AI | 25,000 | fixed |

**group: AI business tools** (3)

| id | name | rate | unit |
|---|---|---|---|
| I4 | AI content generator (internal) | 20,000 | fixed |
| I5 | AI FAQ system | 15,000 | fixed |
| I6 | AI lead qualification bot | 25,000 | fixed |

**group: AI platform** (7)

| id | name | rate | unit |
|---|---|---|---|
| I7 | AI chat assistant | 45,000 | fixed |
| I8 | AI lead qualification | 35,000 | fixed |
| I9 | AI knowledge base | 50,000 | fixed |
| I10 | AI search experience | 40,000 | fixed |
| I11 | AI internal tooling | 60,000 | fixed |
| I12 | Voice AI integration | 75,000 | fixed |
| I13 | AI personalisation layer | 50,000 | fixed |

`itemSeq: 13`

---

### SCHEDULE: SETUP: one-time, no revisions, hand over the keys

> 4 services · 15 items · Schedule C
>
> A Setup service configures something and gives the Client the account. The
> Client owns it from creation and the third-party cost is theirs.

---

#### `DNS`: Domain & DNS · 3 items

```yaml
code:        DNS
name:        Domain & DNS
scheduleKey: setup
sortOrder:   1
sacCode:     "998315"          # hosting & domain
partCodes:   ["01"]            # Domain and DNS
blurb: >
  Registering or transferring the domain and pointing it where it needs to go.
  Its own service because a domain often carries more with it: subdomains,
  records for mail and verification, a registrar transfer, or a migration.
```

| id | name | rate | unit |
|---|---|---|---|
| I1 | Domain & DNS configuration | 4,000 | fixed |
| I2 | Cloudflare setup | 10,000 | fixed |
| I3 | Domain transfer or migration | not priced | fixed · quoted |

> **[DECISION]** Its own service, not a website item.
> **[OPEN]** I3 is not on a rate card. Confirm it exists and price it.

`itemSeq: 3`

---

#### `HOST`: Hosting · 4 items

```yaml
code:        HOST
name:        Hosting
scheduleKey: setup
sortOrder:   2
sacCode:     "998315"
partCodes:   ["01"]
blurb: >
  Standing up the environment the site runs on and handing over the account. Its
  own service because the platform varies: a managed host, a VPS, or private
  Linux infrastructure, each with a different set-up and a different running
  cost the Client pays directly.
```

| id | name | rate | unit |
|---|---|---|---|
| I1 | Hosting & deployment setup | 5,000 | fixed |
| I2 | Staging environment setup | 10,000 | fixed |
| I3 | CI/CD deployment pipeline | 20,000 | fixed |
| I4 | VPS / private Linux provisioning | not priced | fixed · quoted |

> **[DECISION]** Its own service. The monthly platform charge (Vercel, a VPS) is
> a **third-party cost billed at actual**, never a Qera item: the Colorist
> quotation prints it under recurring infrastructure.
> **[OPEN]** I4 is not on a rate card. Confirm and price.

`itemSeq: 4`

---

#### `MAIL`: Business Email · 3 items

```yaml
code:        MAIL
name:        Business Email
scheduleKey: setup
sortOrder:   3
sacCode:     "998315"
partCodes:   ["02"]            # Business email and workspace
blurb: >
  Professional mailboxes on the Client's own domain, with the records that make
  them deliverable. Added alongside most website engagements, and sold on its own
  just as often.
```

| id | name | rate | unit |
|---|---|---|---|
| I1 | Email infrastructure setup | 10,000 | fixed |
| I2 | Google Workspace setup | 5,000 | fixed |
| I3 | Email signature system | 5,000 | fixed |

> **[DECISION]** Its own service: business email is not part of a website, it is
> *added to* one. Added, never absorbed.
> **[OPEN]** I2 is not separately on a card. Confirm and price.
> I3 also appears under `BRND` (designing the signature); this is the setup.

`itemSeq: 3`

---

#### `ANLY`: Analytics & Tracking · 5 items

```yaml
code:        ANLY
name:        Analytics & Tracking
scheduleKey: setup
sortOrder:   4
sacCode:     "998313"          # IT consulting & support
partCodes:   ["03"]            # Analytics and tracking
blurb: >
  The measurement layer, configured and handed over: properties, tags, consent
  and the dashboards that read them.
```

| id | name | rate | unit |
|---|---|---|---|
| I1 | Google Analytics setup | 6,000 | fixed |
| I2 | Google Tag Manager setup | 6,000 | fixed |
| I3 | Search Console setup | 2,000 | fixed |
| I4 | Error monitoring setup | 10,000 | fixed |
| I5 | Cookie consent & data privacy | not priced | fixed · quoted |

> **[DECISION]** I1-I3 live **here only** and were removed from `WEB`. Analytics
> is a Setup service: it is configured once and the account handed over, which is
> a different legal frame from a build. Selling the same work from two services
> would be two places for its price to disagree.
> **[OPEN]** I5 appears on the Colorist quotation at ₹5,000 as "Data Privacy
> Enhancement (cookies)" but is on no rate card. Confirm at 5,000.

`itemSeq: 5`

---

### SCHEDULE: RETAINER: recurring, paid in advance

> 4 services · 51 items · Schedule B

---

#### `MNT`: Website Maintenance · 7 items

```yaml
code:        MNT
name:        Website Maintenance
scheduleKey: retainer
sortOrder:   1
sacCode:     "998316"          # operating a deployed system
partCodes:   ["18"]            # Website maintenance
blurb: >
  Keeping a site running month to month: updates, monitoring, backups, small
  changes and the support window. Applies to a site Qera built or to one the
  Client already has.
```

| id | name | rate | unit |
|---|---|---|---|
| I1 | Website maintenance | 8,000 – 25,000 | monthly |
| I5 | Technical support | 10,000 – 40,000 | monthly |
| I6 | Content / CMS management | 10,000 – 35,000 | monthly |
| I7 | Performance monitoring | 8,000 – 20,000 | monthly |
| I8 | Analytics monitoring | 10,000 – 30,000 | monthly |
| I9 | Monitoring & uptime systems | 8,000 | fixed |
| I10 | Backup & recovery systems | 8,000 | fixed |

> **[DECISION]** Five kinds of work, not five tiers of one. A client buys website
> maintenance, and separately buys technical support or content management if
> they want them. Each is a band, priced per engagement within it. There is no
> "what is included in Basic vs Full" question to answer, because these are not
> Basic and Full.
>
> **[DECISION]** `Basic maintenance`, `Active monitoring` and `Full optimisation`
> (I2-I4) **moved to `AIOP`**, where they belong. They came from the Automation
> card's "Retainer model" group and were always about running an automation; this
> file previously listed them in both places, which was a filing error, not a real
> duplication. `Error monitoring setup` (I11) went to `ANLY` for the same reason.
> Four ids retired, so `itemSeq` stays 11 against 7 live items.
>
> I9 and I10 are one-time set-up sitting inside a retainer service, which is
> allowed: a retainer often starts with a day of configuration. They are `fixed`,
> so nothing bills them monthly.

`itemSeq: 11`

---

#### `SEO`: SEO & CRO Retainer · 4 items

```yaml
code:        SEO
name:        SEO & CRO Retainer
scheduleKey: retainer
sortOrder:   2
sacCode:     "998361"          # advertising
partCodes:   ["19"]            # Conversion optimisation retainer
blurb: >
  Ongoing search and conversion work: monitoring what the site ranks for and
  converts at, and acting on it each month.
```

| id | name | rate | unit |
|---|---|---|---|
| I1 | SEO retainer | 25,000 – 75,000 | monthly |
| I2 | CRO optimisation | 20,000 – 1,00,000 | monthly |
| I3 | UX optimisation retainer | 30,000 – 1,50,000 | monthly |
| I4 | Content optimisation strategy | 8,000 | fixed |

`itemSeq: 4`

---

#### `SOC`: Social Media · 32 items

```yaml
code:        SOC
name:        Social Media
scheduleKey: retainer
sortOrder:   3
sacCode:     "998361"
partCodes:   ["15", "16", "17"]   # content production, community, paid social
blurb: >
  Running the accounts month to month: what gets made, when it goes out, who
  answers, and what the numbers say afterwards.
```

**group: Base social media structure** (4)

| id | name | rate | unit |
|---|---|---|---|
| I1 | Profile optimisation | 5,000 | fixed |
| I2 | Content and visual alignment | 5,000 | fixed |
| I3 | Competitor audit | 4,000 | fixed |
| I4 | Platform strategy (IG / LinkedIn / YouTube) | 3,000 | fixed |

**group: Short form content** (6)

| id | name | rate | unit |
|---|---|---|---|
| I5 | Script writing | 2,000 | perUnit · per video |
| I6 | Video editing (basic) | 1,000 | perUnit · per video |
| I7 | Video editing (premium storytelling) | 5,000 | perUnit · per video |
| I8 | Motion graphics add-on | 2,000 | perUnit · per video |
| I9 | Voiceover (AI / human) | 4,000 | perUnit · per video |
| I10 | Bundle: 10 reels a month | 45,000 | monthly |

**group: Carousel content** (4)

| id | name | rate | unit |
|---|---|---|---|
| I11 | Carousel content research + copy | 2,000 | perUnit · per carousel |
| I12 | Carousel design (5 slides) | 3,000 | perUnit · per carousel |
| I13 | Premium carousel | 4,000 | perUnit · per carousel |
| I14 | Bundle: 6 carousels a month | 40,000 | monthly |

**group: Static post** (1)

| id | name | rate | unit |
|---|---|---|---|
| I15 | Static post: design + caption | 2,000 | perUnit · per post |

**group: Content strategy** (4)

| id | name | rate | unit |
|---|---|---|---|
| I16 | Monthly content strategy | 15,000 | monthly |
| I17 | Content calendar (30 days) | 25,000 | monthly |
| I18 | Hook library creation | 15,000 | fixed |
| I19 | Competitor content analysis | 10,000 | fixed |

**group: Organic growth** (4)

| id | name | rate | unit |
|---|---|---|---|
| I20 | Hashtag + SEO strategy | 3,000 | fixed |
| I21 | Posting + scheduling | 10,000 | monthly |
| I22 | Engagement, organic posts | 8,000 | monthly |
| I23 | DM handling | 10,000 | monthly |

**group: Performance marketing** (4)

| id | name | rate | unit |
|---|---|---|---|
| I24 | Meta ads | 15,000 | monthly |
| I25 | Google ads | 30,000 | monthly |
| I26 | Engagement, ad creative | 25,000 | monthly |
| I27 | Social media hygiene | 20,000 | monthly |

> **[DECISION]** Both are real and they are different work, confirmed 19
> September 2026. **I22** is replying to comments and DMs on ordinary posts.
> **I26** is moderating comments on live ad creative, which is higher volume,
> time-sensitive, and directly affects what the ad spend returns. The rate cards
> gave both the same words, which is why the import flagged them; the names now
> carry the distinction, which matters more since a name is the item's scope.

**group: Social conversion** (4)

| id | name | rate | unit |
|---|---|---|---|
| I28 | Lead funnel set-up | 45,000 | fixed |
| I29 | Landing page integration | 15,000 | fixed |
| I30 | WhatsApp funnel | 45,000 | fixed |
| I31 | Auto-DM flow | 25,000 | fixed |

**group: Analytics & optimisation** (1)

| id | name | rate | unit |
|---|---|---|---|
| I32 | Monthly performance report | 10,000 | monthly |

`itemSeq: 32`

---

#### `AIOP`: AI & Automation Operation · 8 items

```yaml
code:        AIOP
name:        AI & Automation Operation
scheduleKey: retainer
sortOrder:   4
sacCode:     "998316"
partCodes:   ["20"]            # AI system operation
blurb: >
  Running an automation or assistant after it is built: the monthly platform
  work, monitoring, and tuning as the Client's volumes change.
```

| id | name | rate | unit |
|---|---|---|---|
| I1 | WhatsApp automation (monthly) | 3,500 | monthly |
| I2 | Instagram / Facebook DM automation (monthly) | 2,500 | monthly |
| I3 | Email automation (monthly) | 3,000 | monthly |
| I4 | SMS automation (monthly) | 2,000 | monthly |
| I5 | AI automation maintenance | 15,000 – 50,000 | monthly |
| I6 | Automation upkeep, basic | 5,000 | monthly |
| I7 | Automation monitoring, active | 12,000 | monthly |
| I8 | Automation optimisation, full | 40,000 | monthly |

> **[DECISION]** The build-side set-up fees are on `AUTO`; these are the monthly
> counterparts. `contract-system.md` §11: built once and operated monthly is two
> services.
>
> **[DECISION]** I6-I8 are **renamed** and are now the only copies: they came
> from the Automation card's "Retainer model" group and this file had wrongly
> listed them on `MNT` as well. "Basic maintenance" beside a Website Maintenance
> service says nothing about which is which, and since an item's name is its
> scope (§4), the name has to carry the distinction.
>
> These three **are** tiers of one thing, unlike `MNT`'s five. What separates
> them is depth of attention rather than kind of work, which is why they read as
> basic / active / full and are priced at one figure each rather than as bands.

`itemSeq: 8`

---

### SCHEDULE: AUDIT: the deliverable is a document

> 2 services · 24 items · Schedule D

---

#### `AUD`: Audit or Teardown · 15 items

```yaml
code:        AUD
name:        Audit or Teardown
scheduleKey: audit
sortOrder:   1
sacCode:     "998311"          # management consulting
partCodes:   ["21"]            # Audit or teardown
blurb: >
  A written review of something that already exists, with findings ranked by
  what they cost and what fixing them is worth. The deliverable is the document.
```

| id | name | rate | unit |
|---|---|---|---|
| I1 | CRO audit | 15,000 | fixed |
| I2 | CRO-focused UX audit | 20,000 | fixed |
| I3 | Heatmap-based UX review | 20,000 | fixed |
| I4 | Behavioural UX analysis | 25,000 | fixed |
| I5 | Design audit & visual review | 10,000 | fixed |
| I6 | Visual consistency audit | 15,000 | fixed |
| I7 | Brand perception audit | 20,000 | fixed |
| I8 | Competitor audit | 4,000 | fixed |
| I9 | Competitor content analysis | 10,000 | fixed |
| I10 | Competitor analysis | 8,000 | fixed |
| I11 | Audience & market research | 10,000 | fixed |
| I12 | A/B testing (hooks, formats) | 10,000 | fixed |
| I13 | Heatmap integration | 8,000 | fixed |
| I14 | Session recording setup | 8,000 | fixed |
| I15 | Funnel tracking setup | 15,000 | fixed |

> **[OPEN]** Heavy overlap with `WEB`, `DSGN` and `BRND`. An audit sold on its
> own is an `AUD` item; the same work inside a build is that service's item.
> Confirm the duplication is wanted, or make `AUD` reference the others.

`itemSeq: 15`

---

#### `STR`: Strategy Sprint · 9 items

```yaml
code:        STR
name:        Strategy Sprint
scheduleKey: audit
sortOrder:   2
sacCode:     "998311"
partCodes:   ["22"]            # Strategy sprint
blurb: >
  A short, fixed-length engagement that ends in a written direction: positioning,
  messaging, or the shape of a system, agreed before anything is built.
```

| id | name | rate | unit |
|---|---|---|---|
| I1 | Discovery & strategy workshop | 10,000 | fixed |
| I2 | Brand discovery session | 5,000 | fixed |
| I3 | Brand positioning statement | 12,000 | fixed |
| I4 | Brand messaging framework | 15,000 | fixed |
| I5 | Content direction strategy | 20,000 | fixed |
| I6 | Personal brand strategy | 75,000 | fixed |
| I7 | High-end brand positioning | 2,00,000 | fixed |
| I8 | Platform strategy (IG / LinkedIn / YouTube) | 3,000 | fixed |
| I9 | Personal brand system | 50,000 | fixed |

`itemSeq: 9`

---

## 6. Totals

| Schedule | Services | Items |
|---|---:|---:|
| Build | 6 | 203 |
| Setup | 4 | 15 |
| Retainer | 4 | 51 |
| Audit | 2 | 24 |
| **Total** | **16** | **293** |

293 against the source JSON's 278. Four new items were added for work that is
sold but was never on a card (`DNS` I3, `HOST` I4, `MAIL` I2, `ANLY` I5), and
roughly 17 lines appear twice on purpose, where the same work is sold both inside
a build and standalone as an audit (question 3, §8). Seven lines that were
duplicated *by mistake* in the first draft have been removed: three analytics
items off `WEB`, and four maintenance items off `MNT`.

**Item ids are never reissued, so a service's `itemSeq` is a high-water mark and
not a count.** `WEB` carries 52 items with `itemSeq: 55`; `MNT` carries 7 with
`itemSeq: 11`. Those gaps are the removed duplicates, and closing them would be
the bug the rule exists to prevent.

---

## 7. Worked example: the Colorist quotation

Proving the model reproduces a document already sent to a client.

| Printed line | Service | Item | Rate |
|---|---|---|---|
| Infrastructure Set-up | WEB | I4 Core website setup | 20,000 ≈ 25,000 |
| Web design | DSGN | I3 Multi-page website design | 15,000 |
| SEO/AEO/GEO | WEB | I30 SEO foundation setup | 15,000 |
| Data Privacy (cookies) | ANLY | I5 Cookie consent | 5,000 |
| Domain Services | DNS | I1 Domain & DNS configuration | 5,000 ≈ 4,000 |
| CMS (scalable) | WEB | I47 Custom CMS development | 25,000 |
| Custom booking section | WEB | I23 Booking & scheduling | 20,000 |
| Payment Portal (Razorpay) | WEB | I46 Payment gateway integration | 20,000 |
| Interactivity and motion | WEB | I11 GSAP motion system | 30,000 |
| Motion design & prototype | DSGN | I32 Premium motion system | 15,000 |
| WhatsApp Automation | AUTO | I9 WhatsApp automation (set-up) | 50,000 |
| Business Email | MAIL | I2 Google Workspace setup | 5,000 |
| *Recurring:* Business Email | none | third-party, at actual | 200/mo |
| *Recurring:* Hosting | none | third-party, at actual | 2,870/mo |
| *Recurring:* WhatsApp BSP | none | third-party, at actual | 1,500-5,000/mo |

**Two findings.**

1. **Quoted rates differ from list rates** (booking 20,000 quoted against 18,000
   list; motion 30,000 against 20,000). Expected, and the model allows it: a list
   price is what the studio quotes *from*. The document stores its own rate; the
   catalogue only seeds it.
2. **Every recurring row is a third-party cost, not a Qera item.** Hosting,
   Workspace and the BSP platform are billed at actual and belong on the
   quotation's recurring page, which has its own `RecurringLine` type.
   **This confirms `HOST` sells the set-up and never the monthly charge.**

---

## 8. Questions, resolved 19 September 2026

Nine of the ten are closed. Recorded here rather than deleted, so the reasoning
survives.

| # | Question | Answer |
|---|---|---|
| 1 | `APP` separate from `DSGN`? | **Separate.** 16 services. |
| 2 | `ANLY` I1-I3 duplicated on `WEB`? | **`ANLY` only.** Removed from `WEB`. |
| 3 | `AUD` overlap with other services? | **Keep it.** An audit sold on its own is its own item, even where the work also appears inside a build. |
| 4 | `MNT` tiers? | **Not tiers.** Five kinds of work, each a band. The three real tiers were `AIOP`'s all along. |
| 5 | `AIOP` I6-I8 duplicate `MNT`? | **Renamed,** and they are the only copies: `MNT` I2-I4 were a filing error here, now removed. |
| 6 | Five unpriced items | **Still open.** See below. |
| 7 | `SOC` engagement at two prices? | **Both real.** Organic posts against ad creative; renamed to say so. |
| 8 | AI tiers at two prices? | **Both kept.** |
| 9 | Spline at 4,000? | **80,000.** A missing zero on the card. |
| 10 | Item inclusion / exclusion wording | **Dropped entirely.** An item's name is its scope; see §4. |

### Still open

**Five items carry no rate**, because they appear on no rate card. Four are work
that is certainly sold and simply was never priced on paper; the fifth is on a
real quotation and needs confirming.

| Service | Item | Note |
|---|---|---|
| `DNS` | I3 Domain transfer or migration | Confirm it is a thing you sell, then price |
| `HOST` | I4 VPS / private Linux provisioning | Likewise |
| `MAIL` | I2 Google Workspace setup | Quoted at 5,000 on the Colorist document |
| `ANLY` | I5 Cookie consent & data privacy | Quoted at 5,000 on the Colorist document |

An item with no rate is valid: `ratePaise` absent means **quoted per
engagement**, and the document asks for a figure when the item is ticked. So
these do not block the build; they only mean four lines get typed by hand until
somebody sets a list price.

---

## 9. Build order

One commit per step, `npm test` green between each.

| # | Step | Touches a document? |
|---|---|---|
| 1 | `serviceItem.ts` and its tests. Pure, no consumers. Prove the id rule first. | no |
| 2 | Move the 22 to `seed/parts.ts`, renamed `PARTS`. Imports only. | no |
| 3 | `items[]` and `partCodes` on `ServiceContent`; drop `menu`, `menuSeq`, `dependencies`, `pairings`. The server action's sections follow. | no |
| 4 | `ItemsEditor` (was `MenuEditor`): name, rate, unit, group, SAC, blurb. No wording fields. | no |
| 5 | Seed the 16 services and 293 items from §5, and **retire the 22 old catalogue rows** (see below). | no |
| 6 | Invoice reads items. | **yes** |
| 7 | Quotation reads items. | **yes** |
| 8 | Contract prints the Deliverables list. | **yes** |

Steps 1 to 5 change no document's appearance, which the format freeze requires.
Steps 6 to 8 each change one, which is why they are three commits and not one.

### Step 5 is the one with a migration in it

The 22 rows are in the database now, carrying contract prose. Seeding 16 more
without retiring them leaves 38 rows in one catalogue, and the picker would offer
both "Custom web build" and "Custom Website".

**They are not deleted.** A finalized contract froze a copy of its Parts
(`CONTEXT.md` §5c), so nothing already issued depends on the live rows; but
`archived` is the house answer for removing something from a list, and the
`services` table already has the column. So: seed the 16, archive the 22, and
leave the prose where a future contract build can still read it through
`partCodes`.

Draft contracts are the case to check, not finalized ones. A draft resolves its
client live but holds its own `parts` copy, so an archived source row does not
empty it. Worth confirming against a real draft before the commit lands.

### Verification

- `npm test` green at every step.
- **Prove the id rule fails when broken:** delete an item, add another, assert
  the new id is not the dead one. Watch it go red without `itemSeq`.
- **A finalized contract renders byte-identically** after step 2, and again
  after step 5. Compare `contractBlocks` output for a fixture before and after.
- **An open draft contract still lists its Parts** after step 5's archive.
- `npm run test:e2e` after step 7: item blurbs make service pages taller and
  `e2e/quotation.spec.ts` asserts that no page overflows.
- In a browser: add an item with a rate and a SAC, then raise an invoice for a
  client engaged on that service and confirm the line carries the name, the rate
  and the SAC (Rule 46(g), currently unsatisfied).

### Not in scope

- **No multi-tenancy.** `maturity.md` scores it 0 and calls it correctly
  unbuilt. The catalogue is shaped as importable data so that work is later a
  seed file rather than a remodel.
- **No quotation flow rebuild.** Deferred pending this; it reopens afterwards.
- **No payment-phasing change.** `ROADMAP.md` §10's second gap.
- **No new legal text.** `contract-system.md` §1: adding a service must never
  require writing new legal text. Items contribute a list of names; the terms
  stay on the Schedule and the exclusions stay in the shared library.
