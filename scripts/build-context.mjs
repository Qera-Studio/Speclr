#!/usr/bin/env node
// Builds the two hand-off files a Claude with no access to this repo reads:
//   docs/speclr-context.md            the core, meant to be read whole
//   docs/speclr-context-reference.md  the bulk, for lookup
// Everything is copied verbatim from the live sources, so the files are only
// as stale as the last run. Run: node scripts/build-context.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 }).trim()
const read = (p) => readFileSync(p.startsWith('/') ? p : join(root, p), 'utf8').trim()
const memoryDir = join(homedir(), '.claude/projects/-Users-shivanshupareek-Developer-qera-speclr/memory')
const globalClaude = join(homedir(), '.claude/CLAUDE.md')

const head = git('rev-parse', '--short', 'HEAD')
const dirty = git('status', '--short').split('\n').filter(Boolean).length
const today = new Date().toISOString().slice(0, 10)

let n = 0
const part = (title, body, note = '') =>
  `\n\n---\n\n# Part ${++n}: ${title}\n\n${note ? `> ${note}\n\n` : ''}${body}\n`
const file = (path, note) => part(path, read(path), note)
const fence = (lang, body) => '```' + lang + '\n' + body + '\n```'

const stamp = `Generated ${today} from commit \`${head}\`${dirty ? ` plus ${dirty} uncommitted working-tree changes` : ''} by \`node scripts/build-context.mjs\`. This is a snapshot: rerun the script rather than trusting an old copy.`

// ---------------------------------------------------------------- core

const preface = `# speclr: the complete project context

> ${stamp}

## Read this first

You are a Claude with no access to the speclr repository. This file is the
whole of what the project knows about itself: every rule, decision, reason,
deviation and open item, copied verbatim from the files the project keeps them
in, plus the database schema, the file layout and the full commit history.
Its companion, \`speclr-context-reference.md\`, holds the bulk material (the
design system, the full service catalogue, every contract clause, the eight
master checklists and the original design specs) for lookup when a task needs
it.

Nothing below is paraphrased except this preface. Where two parts disagree,
the more specific and more recent one wins, and \`CONTEXT.md\` (Part 4) and
\`PRINCIPLES.md\` (Part 5) outrank \`README.md\`.

## What speclr is, in one paragraph

speclr is the internal operations tool of **Qera Studio**, an Indian design and
build studio (Ghaziabad, Uttar Pradesh) run by one founder, **Shivanshu
Pareek**, with no team. It issues **real financial and legal documents**: tax
invoices, receipts, credit notes, service quotations, contracts (a Master
Service Agreement plus Schedules and Parts), stipend slips, pay slips and HR
letters (offer, experience, exit). It also onboards the clients and employees
those documents are about, holds the studio's service catalogue (16 services,
293 priced items) and its contract clause library, and carries a set of tools
(an icon spec validator and icon generator, a component library). The documents
are issued to real people and may be produced years later for tax or legal
reasons (CGST s.36 requires a tax invoice be kept unaltered for 72 months), so
correctness, immutability and legal wording outrank everything else.

## How it was built (the timeline, from the commit history in Part 17)

- **23 July 2026: extraction.** speclr lived inside the qera.studio marketing
  site as \`/kessler-admin\` and \`/kessler-spec\` on Upstash Redis. It was moved
  into its own Next.js 16 app in five phases (Part 12, the migration runbook):
  scaffold and the eight master checklists, the portable domain core lifted
  verbatim with its tests, Postgres (Neon + Drizzle) and Clerk auth, the admin
  UI rebuilt in shadcn, the icon tool rebuilt.
- **Late July to August 2026: the domain hardens.** Client onboarding as a
  seven-step record that documents derive from, real check-digit validation of
  every identifier (GSTIN mod-36, PAN, UK VAT mod-97, ABN, IBAN), place of
  supply and GST treatment derived rather than typed, the snapshot pattern
  extended to studio identity and document wording, the CGST Rule 46 gaps
  closed one by one, credit notes, discounts, pay slips beside stipend slips,
  the two-profile split (\`/client\` and \`/admin\`), the clause library in the
  database, design rules enforced by tests, security headers, the Service
  Quotation, finalize-time PDF rendering, and the move of both the Vercel
  function and the database to Singapore for latency.
- **September 2026: the catalogue and the shell.** The Service / Part split,
  16 services and 293 items generated from \`docs/service-catalogue.md\`,
  invoices and quotations and contracts billing items rather than services, the
  contract editor as a five-phase flow, the inset-card app shell and nav, print
  fixes, the drawer, a PWA manifest.
- **October 2026: tables and the library.** A shared record table, client
  industry, lead and team, the component library's table specimens. On 4
  October the repo collapsed to one branch, \`latest\` (no \`main\`, no feature
  branches; the old history is archived as \`speclr-archive-2026-10-04\`).
- **Status:** nothing has been finalized and issued to a real client yet. The
  gate ahead of that is the **format freeze** in \`ROADMAP.md\` (Part 7): every
  document type is audited clause by clause against its statute and frozen
  before the first real one is issued. Open compliance gaps are ranked in
  \`COMPLIANCE.md\` (Part 8). Production login still needs a Clerk production
  instance.

## How the work is done (the working agreement)

These are the user's standing expectations, from Parts 1, 2, 3 and 16. They
carry over to any new project unless the user says otherwise.

- Act as a **principal engineer with ownership**: push back firmly on anything
  that risks correctness, security, accessibility, performance or the legal
  integrity of a document, and propose the better path *before* writing code.
- **Ask before acting** on anything ambiguous, and always on money, numbering,
  immutability, auth, or a document's legal wording.
- **One change at a time**, verified with evidence (tests green, build green,
  checked in a real browser for anything visual or print). Small commits.
- **Rules are enforced by tests or hooks, not by prose.** A rule that matters
  gets a failing test or a hook in the same commit that states it (Part 4
  §5e, the \`rules-need-enforcement-not-prose\` memory).
- **Every reason is written down.** The docs record *why*, including the
  alternatives refused and the deviations the user overrode. Keep doing that.
- **Writing:** never an em dash, anywhere (chat, code, docs, UI copy,
  commits). En dash only in numeric ranges.
- **Commits:** Shivanshu is the sole author. No co-author trailer, no
  "Generated with" line, no em dash in a message. A hook enforces it.

## What carries over to a brand-new project

If the new project is not speclr itself, these are the parts that are
deliberately portable rather than speclr-specific:

1. **The eight master checklists** (reference file) and their precedence:
   Legal, Security, PRINCIPLES, Accessibility, Backend, Performance, SEO,
   Design. They "travel to every Qera project".
2. **The five modelling rules** in \`PRINCIPLES.md\` (Part 5): shared things get
   their own library; identity lives on the party record; derive, never store
   as editable (with an explicit, recorded override as the one exception);
   snapshot whatever a finalized record shows; country variation lives in a
   jurisdiction pack. And its two "corrections": a bug is not evidence of
   missing architecture, and nav churn is a data-model symptom.
3. **The enforcement mechanism**: design and validation rules policed by
   source-walking tests (\`design-system.test.ts\`, \`design-tokens.test.ts\`,
   \`contrast.test.ts\`), measurements in Playwright because jsdom sees every
   box as zero, and "a test never seen to fail proves nothing".
4. **The vendor ledger** (Part 9): every dependency gets a row saying what it
   is, why, the substitute, the cost of switching, and why it beat its two
   closest competitors.
5. **The working agreement** above.

## Contents

The core (this file):

| Part | Source | What it holds |
|---|---|---|
| 1 | \`~/.claude/CLAUDE.md\` | The user's global instructions for every project |
| 2 | \`CLAUDE.md\` | Project brief, stakes, collaboration style |
| 3 | \`AGENTS.md\` | Stack, coding, input, writing, DB, auth, testing and git rules |
| 4 | \`CONTEXT.md\` | Every non-obvious domain rule and the reason for it |
| 5 | \`PRINCIPLES.md\` | The modelling law, current audit, logged deviations |
| 6 | \`README.md\` | The public overview: features, architecture, data model, setup |
| 7 | \`ROADMAP.md\` | Planned, deferred, in flight, format freeze, go-live blockers |
| 8 | \`COMPLIANCE.md\` | Ranked legal gaps, P0 to P3 |
| 9 | \`docs/vendors.md\` | Every third party, its substitute and switching cost |
| 10 | \`docs/maturity.md\` | Measured standing against industry practice |
| 11 | \`docs/contract-system.md\` | Contract architecture: MSA, Schedules, Parts, blanks |
| 12 | \`docs/MIGRATION_RUNBOOK.md\` | How the extraction was done, phase by phase |
| 13 | \`package.json\` | Exact stack versions and scripts |
| 14 | \`src/db/schema.ts\` + migrations | The database, verbatim |
| 15 | \`git ls-files\` | Every file in \`src/\`, \`e2e/\` and \`scripts/\` |
| 16 | Memory files | Lessons and preferences saved across sessions |
| 17 | \`git log\` | Every commit, oldest first: what was done and when |

The reference file: \`docs/design.md\`, \`docs/service-catalogue.md\`,
\`docs/contract-content.md\`, \`docs/ux-review.md\`,
the original design specs and plans, and the eight checklists in \`dev/\`.

## Vocabulary you will meet

- **paise**: 1/100 of a rupee. All money is integer paise.
- **FY**: the Indian financial year, April to March. \`2627\` is FY 2026-27.
- **GSTIN / PAN / TAN / CIN / SAC / IFSC / UPI / LUT / SEZ / FIRC / TDS**:
  Indian tax and banking identifiers and concepts, each explained where it
  first matters in Part 4.
- **Rule 46**: CGST Rules 2017, rule 46, the contents of a tax invoice.
- **finalize**: the one-way step that numbers a document, snapshots it and
  makes it immutable.
- **snapshot**: the frozen copy of client, employee, studio identity and
  wording stored on a finalized document.
- **Service / Item / Part / Schedule / MSA**: see Part 4 §5h and Part 11.
- **client profile / admin profile**: the two halves of the app, \`/client\`
  and \`/admin\`.
`

const memories = existsSync(memoryDir)
  ? readdirSync(memoryDir)
      .filter((f) => f.endsWith('.md') && f !== 'MEMORY.md')
      .sort()
      .map((f) => `## ${f}\n\n${read(join(memoryDir, f))}`)
      .join('\n\n')
  : '_No memory directory on this machine._'

const migrations = readdirSync(join(root, 'src/db/migrations'))
  .filter((f) => f.endsWith('.sql'))
  .sort()

const core =
  preface +
  (existsSync(globalClaude)
    ? part('~/.claude/CLAUDE.md', read(globalClaude), "The user's global instructions, applied to every project.")
    : '') +
  file('CLAUDE.md', 'Its first three lines import AGENTS.md, CONTEXT.md and PRINCIPLES.md, which are Parts 3 to 5.') +
  file('AGENTS.md') +
  file('CONTEXT.md') +
  file('PRINCIPLES.md') +
  file('README.md') +
  file('ROADMAP.md') +
  file('COMPLIANCE.md') +
  file('docs/vendors.md') +
  file('docs/maturity.md') +
  file('docs/contract-system.md') +
  file('docs/MIGRATION_RUNBOOK.md', 'Historical: the record of the July 2026 extraction.') +
  part('package.json', fence('json', read('package.json'))) +
  part(
    'src/db/schema.ts and migrations',
    fence('ts', read('src/db/schema.ts')) +
      `\n\nMigrations, in order (${migrations.length}):\n\n` +
      migrations.map((m) => `- \`${m}\``).join('\n'),
  ) +
  part('Every tracked file in src/, e2e/ and scripts/', fence('', git('ls-files', 'src', 'e2e', 'scripts'))) +
  part(
    'Memory: lessons and preferences saved across sessions',
    memories,
    'Each was written after something happened. They are as binding as the docs.',
  ) +
  part('Commit history, oldest first', fence('', git('log', '--reverse', '--format=%cs %h %s')))

// ---------------------------------------------------------------- reference

n = 0
const ls = (dir) =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => `${dir}/${f}`)

const reference =
  `# speclr: reference material\n\n> ${stamp}\n\n` +
  'The companion to `speclr-context.md`. Read that first; come here when a task ' +
  'touches the design system, the catalogue, contract wording, or a checklist. ' +
  'Everything is verbatim.\n' +
  file('docs/design.md', 'The design law: tokens, components, writing, and what tests enforce.') +
  file('docs/service-catalogue.md', 'The spec the 16 services and 293 items are generated from.') +
  file('docs/contract-content.md', 'Every word of the MSA, the four Schedules and the Parts.') +
  file('docs/ux-review.md') +
  ls('docs/superpowers/specs').map((p) => file(p, 'Original design spec.')).join('') +
  ls('docs/superpowers/plans').map((p) => file(p, 'Original implementation plan, historical.')).join('') +
  ls('dev').map((p) => file(p, 'Master checklist. Travels to every Qera project.')).join('')

writeFileSync(join(root, 'docs/speclr-context.md'), core + '\n')
writeFileSync(join(root, 'docs/speclr-context-reference.md'), reference + '\n')
console.log(`core ${(core.length / 1024) | 0} KB, reference ${(reference.length / 1024) | 0} KB`)
