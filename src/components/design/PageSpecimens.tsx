"use client";

import { LivePager, Specimen } from "./Specimen";
import { DECISIONS, type LibraryEntry } from "./catalogue";
import { Mono } from "@/components/patterns/Mono";
import { PageHeader } from "@/components/patterns/Page";
import { Button } from "@/components/ui/button";
import { SETTINGS_LINK } from "@/components/shell/nav";

const PROPERTIES = [
  ["Rhythm", "Everything lines up", "One 4px grid; every height, gap and inset is a multiple of it, and every line-height too."],
  ["Restraint", "Nothing is shouting", "One primary per view, two weights per screen, one accent hue, motion only where it carries information."],
  ["Response", "It did what I meant, instantly", "Hover and press at 75ms, nothing animates on mount, nothing shifts layout."],
  ["Legibility", "I never squint and never hunt", "13px body on a 20px line, 4.5:1 measured in both themes, mono with tabular figures on every compared figure."],
  ["Predictability", "I knew where it would be", "One component per job, one wording per dialog, one place for the primary action."],
];
const LADDER = [
  ["Tokens", "globals.css", "A named value. Never a component."],
  ["Atoms", "ui/", "One styled control: Button, Input, Badge, Sheet."],
  ["Patterns", "patterns/", "Compositions with one job and no domain: ConfirmDialog, RecordTable, FlowShell."],
  ["Shell", "shell/", "The frame every page sits in."],
  ["Screens", "admin/, contract/, docs/", "A pattern filled with real data."],
];
const TEMPLATES = [
  ["List", "Home, document lists, clients, employees", "Create, top right"],
  ["List with drawer", "Clauses, service items", "Create, top right; the drawer edits"],
  ["Document workspace", "Every editor", "Finalize, in the rail footer"],
  ["Flow", "Onboarding, contract", "Continue, in the flow footer"],
  ["Detail", "A service", "Each section’s own save"],
  ["Form", "Settings, the tools", "Save, at the foot of the form"],
  ["Index", "Section indexes, the dashboard", "None"],
];
const REGIONS = [
  ["Account menu", `Theme, ${SETTINGS_LINK.label}, sign out, at the foot of the nav`],
  ["Nav", "236 wide, 192 to 360 by drag, 48 collapsed"],
  ["Top panel", "48 tall: breadcrumbs, clock, bell"],
  ["Header row", "48 tall: back, the page’s title slot"],
  ["Inset card", "8px margin, 6px corners, a hairline ring and the raised shadow: the one scroll container"],
  ["Editor rail", "352 wide, inside the card, mounted only while a panel is registered"],
];
const WRITING = [
  ["Sentence case", "Save client", "Save Client"],
  ["Verb and object", "Delete draft", "Delete / OK / Yes"],
  ["No question in a title", "Leave page", "Leave this page?"],
  ["No em dash", "Edits reach the next contract only; drafts keep their copy.", "Edits reach the next contract only — drafts keep their copy."],
  ["No exclamation mark", "Saved.", "Saved!"],
  ["Optional, never in a placeholder", "the optional mark beside the label", "Optional"],
];

export function PageSpecimens({ entry }: { entry: LibraryEntry }) {
  const v = entry.variants;
  const table = (rows: readonly (readonly string[])[], heads: string[]) => (
    <table className="w-full text-body">
      <thead>
        <tr className="text-meta text-muted-foreground">
          {heads.map((h) => (
            <th key={h} className="pb-2 text-left font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]} className="border-t border-border">
            {r.map((c, i) => (
              <td key={i} className={i === 0 ? "py-2 pr-4 font-medium" : "py-2 pr-4 text-muted-foreground"}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (entry.slug === "overview") {
    return (
      <>
        <Specimen name={v[0].name} note={v[0].note} fill>{table(PROPERTIES, ["Property", "What the reader feels", "What produces it"])}</Specimen>
        <Specimen name={v[1].name} note={v[1].note} fill>{table(LADDER, ["Level", "Folder", "What lives there"])}</Specimen>
        <Specimen name={v[2].name} note={v[2].note} fill>
          <ol className="flex list-decimal flex-col gap-2 pl-4 text-body">
            <li>A value is a token in <Mono>globals.css</Mono> or it does not exist.</li>
            <li>A component is in this catalogue or it does not exist.</li>
            <li>The rule goes in <Mono>docs/design.md</Mono> and the test goes in <Mono>design-system.test.ts</Mono>, in the same commit, and the test is seen red once.</li>
            <li>A rule with existing violations lands with a shrinking allowlist in <Mono>migratedLater.ts</Mono>.</li>
          </ol>
        </Specimen>
      </>
    );
  }
  if (entry.slug === "page") {
    return (
      <>
        <Specimen name={v[0].name} note={v[0].note} fill>
          <div className="w-full">
            <PageHeader title="Clients" description="Everyone a document has been issued to.">
              <Button variant="primary">Add client</Button>
            </PageHeader>
          </div>
        </Specimen>
        <Specimen name={v[1].name} note={v[1].note} fill>{table(TEMPLATES, ["Template", "Screens", "Primary action"])}</Specimen>
      </>
    );
  }
  if (entry.slug === "specimen") {
    // Each variant is the real Specimen demonstrating its own prop, not a
    // Specimen holding a Specimen: the frame is the subject here.
    return (
      <>
        <Specimen name={v[0].name} note={v[0].note} trial>
          <Button>The subject</Button>
        </Specimen>
        <Specimen name={v[1].name} note={v[1].note} fill trial>
          <Button variant="primary">One</Button>
          <Button>Two</Button>
          <Button variant="ghost">Three</Button>
        </Specimen>
        <Specimen name={v[2].name} note={v[2].note} stage="sidebar" trial>
          <LivePager pageCount={3} />
        </Specimen>
        <Specimen name={v[3].name} note={v[3].note} empty trial>
          {null}
        </Specimen>
      </>
    );
  }
  if (entry.slug === "shell") {
    return <Specimen name={v[0].name} note={v[0].note} fill>{table(REGIONS, ["Region", "Size"])}</Specimen>;
  }
  if (entry.slug === "writing") {
    return <Specimen name={v[0].name} note={v[0].note} fill>{table(WRITING, ["Rule", "Yes", "No"])}</Specimen>;
  }
  if (entry.slug === "decisions") {
    return (
      <div className="flex flex-col gap-4">
        {[...DECISIONS].sort((a, b) => b.date.localeCompare(a.date)).map((d) => (
          <article key={d.slug} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <header className="flex flex-col gap-1">
              <h3 className="text-lead">{d.title}</h3>
              <p className="text-meta text-muted-foreground">
                {d.date} · {d.area} · <Mono>docs/design.md {d.rule}</Mono>
              </p>
            </header>
            <p className="text-body">{d.decided}</p>
            <p className="text-body text-muted-foreground">{d.why}</p>
            <dl className="flex flex-col gap-1 text-meta">
              {d.rejected.map((r) => (
                <div key={r.option} className="flex gap-2">
                  <dt className="shrink-0 font-medium">Rejected: {r.option}.</dt>
                  <dd className="text-muted-foreground">{r.why}</dd>
                </div>
              ))}
            </dl>
            <p className="text-caption text-muted-foreground">
              Held by: <Mono>{d.test}</Mono>
            </p>
          </article>
        ))}
      </div>
    );
  }
  return null;
}
