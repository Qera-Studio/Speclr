# UX review — speclr, August 2026

> **Planning only. Nothing here is built, and nothing here should be built
> without being picked out of this list deliberately.** Written alongside the
> August 2026 UI changes (autosave, the collapsed-rail flyout, the card view),
> because those changes kept running into the same underlying shapes.
>
> The audience is one person — the founder — plus whoever is invited next. That
> is the whole design constraint: speclr does not need to be learnable by
> strangers, it needs to stop costing its one user attention on the tenth
> invoice that it cost on the first.

---

## Where the friction actually is

Not in any single screen. Every screen here is fine. The friction is in the
*seams* — the places where the app has four answers to one question because it
grew four times.

### 1. Four editors, four implementations

| Editor | Form state | Recipient | Steps |
|---|---|---|---|
| `DocumentEditor` (INV, REC) | react-hook-form | client | one long rail |
| `SlipEditor` (STP, PAY) | react-hook-form, `watch(name)` per field | employee | one long rail |
| `LetterEditor` (OFR, EXP, EXT) | plain `useState` | employee | one long rail |
| `ContractEditor` (CON) | plain `useState` | client | three stages |

Autosave has just pulled the *save* half of these together into one hook. The
rest has not converged: three different ways of holding form state, two
different recipient vocabularies, and prose overrides (`content`) living outside
the form in all four for the same good reason, restated four times.

This is the single largest source of "why does this document behave differently
from that one". It is also the thing most likely to produce a real defect —
`SlipEditor` had to hand-assemble a `liveValues` object for autosave precisely
because it never had one.

**Direction, not a plan:** one editor shell owning recipient + issue date +
content overrides + autosave + finalize/delete, with each document type
supplying only its own middle. That is a large refactor and it should be costed
before it is started. Its value is not fewer lines; it is that the next document
type is a body, not a fifth editor.

### 2. The recipient is the real first step, and the UI hides it

Autosave surfaced this rather than causing it. `createDraft` refuses an empty
client id, so nothing about a document can be written down before a recipient
exists. Today that constraint is invisible until you meet it — you can type an
entire invoice into a form that is saving none of it, and the only sign is a
line of grey text.

The honest shape is that picking who a document is *for* is a step, not a field:
it decides the snapshot, the numbering series (via doc type), which people are
even offered (`SlipEditor` already filters interns vs employees), and whether
anything can be persisted at all.

**Direction:** the create palette (⌘D) already asks "which type". It could ask
"for whom" in the same breath, and hand the editor a document that already
exists. Every editor then loses its "no row yet" branch, `AutosaveStatus` loses
its "pick a client" case, and Finalize/Delete stop appearing halfway through.

The cost is real and should be weighed: abandoned drafts would then be created
rather than never existing. Numbering is safe (serials are claimed at finalize,
not create — see `CONTEXT.md` §2), so the cost is clutter in the list, not burnt
invoice numbers. A "drafts older than N days" sweep would pay for itself.

### 3. Too many doors into the same room

Ways to start a document today:

- `NewDocumentButton` on the dashboard → ⌘D palette
- `NewDocumentButton` in the sidebar → the same palette
- ⌘D from anywhere → the same palette
- Seven nav rows under **Documents**, each → a type list → its own "new"
- `/docs/new/[type]` directly
- **Duplicate** on any document
- **Copy for next month** on a slip

The first three are one door with three handles, which is fine and deliberate.
The nav rows are a different thing wearing the same coat: they are really
*filters on the list*, and they are shaped like *creation entry points*.

**Direction:** demote the seven type rows to what they are. The dashboard list
already filters by type; `DocumentTypeList` is that same list pre-filtered. Two
rows — "All documents" and the palette — plus filters would cover it, and the
rail would stop being seven-eighths document types.

This interacts with item 6 below, so decide them together.

### 4. Draft → finalize → print is a progression shown as three buttons

The most consequential moment in the app is finalize: a number is claimed
atomically, the client, studio and content are frozen, and the document becomes
permanently immutable. It is presented as one of three buttons in a row at the
bottom of a rail, distinguished only by a confirm dialog.

Nothing about the editor says which of the three states a document is in, how
far along it is, or that the step is one-way. The `ConfirmActionButton` copy
carries all of that weight, and it is only read once.

**Direction:** make the state visible — a small three-step indicator at the top
of the rail (Draft → Issued → Printed) rather than more warning text. The
warning is already correct; what is missing is that the user can see where they
are before they get there. This is cheap, and it is probably the highest
value-per-hour item on this page.

### 5. Search is the best navigation in the app and it is in the header

`SearchCommand` already searches documents, clients, employees and services in
one list, debounced, keyboard-driven, ⌘K from anywhere. It is strictly better
than the nav rail for finding a specific thing, and it gets better as the
document count grows while the rail gets worse.

**Direction:** as the corpus grows past a few hundred documents, search becomes
the primary and the rail becomes a shortcut list. That is a re-weighting, not a
rebuild — the pieces exist. Worth revisiting when the dashboard list needs SQL
filtering (see the note in `DocumentsBrowser`, which already anticipates the same
threshold).

### 6. The sidebar carries two different kinds of thing

**Records** (clients, employees) are *nouns the app owns*. **Documents** are
*things the app produces*. **Tools** are *unrelated apps sharing the shell* —
the icon spec is client-side only and shares nothing with the document tool but
the chrome.

They are three lists in one rail because they arrived in that order, not because
they are peers. The icon spec in particular is a separate product wearing the
same shell.

**Direction:** no strong recommendation. Flagging it because item 3 will force
the question, and because the rail is now the same width as the editor — which
makes "what is this rail *for*" a live question rather than a cosmetic one.

---

## What is deliberately *not* on this list

- **The document sheets.** They are finished, approved, legal artifacts. Nothing
  in a UX review touches what a document prints.
- **Anything about numbering, immutability or snapshots.** Those are correctness
  rules, not interface choices, and `CONTEXT.md` is their home.
- **A mobile layout.** This is a desktop internal tool used by one person at a
  desk. Building responsive editors would be the clearest YAGNI on the page.
- **Onboarding, empty-state tours, help text.** One user, who wrote the domain
  rules.

---

## If only one thing gets done

**Item 4** — the visible draft/issued state. It is small, it touches one
component per editor, and it addresses the moment where a mistake is permanent.

**Item 2** is the one that most improves the daily feel, but it is entangled with
item 1 and should not be started as a standalone.

**Item 1** is the one that pays off longest and costs most. It should be a
decision, taken once, with the cost known — not something that happens by
accident while doing item 2.
