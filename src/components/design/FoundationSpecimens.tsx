"use client";

import { useEffect, useState } from "react";
import { Specimen } from "./Specimen";
import { Mono } from "@/components/patterns/Mono";
import { Button } from "@/components/ui/button";
import type { LibraryEntry } from "./catalogue";

/**
 * The tokens, read back from the stylesheet at runtime rather than copied
 * here, so this page cannot show a value the app does not have. Light and
 * dark are both read: the dark values come from a hidden `.dark` probe, since
 * a token's value is whatever the cascade says it is where it is read.
 */
function useTokens(names: string[]) {
  const [values, setValues] = useState<Record<string, [string, string]>>({});
  useEffect(() => {
    const probe = document.createElement("div");
    probe.className = "dark";
    probe.style.display = "none";
    document.body.appendChild(probe);
    const light = getComputedStyle(document.documentElement);
    const dark = getComputedStyle(probe);
    setValues(
      Object.fromEntries(
        names.map((n) => [n, [light.getPropertyValue(n).trim(), dark.getPropertyValue(n).trim()]]),
      ),
    );
    probe.remove();
  }, [names]);
  return values;
}

const ROLES = [
  "--background", "--foreground", "--card", "--popover", "--raised", "--hover", "--muted", "--muted-foreground",
  "--accent", "--accent-foreground", "--border", "--input", "--ring", "--placeholder", "--sidebar", "--sidebar-foreground",
];
const SIGNALS = ["--primary", "--destructive", "--warning", "--success"];
const TYPE = [
  ["caption", "Badge text, kbd, a timestamp in a cell"],
  ["meta", "Field labels, column headers, help"],
  ["control", "Button, tab, chip and menu labels"],
  ["body", "Prose, table cells, inputs. The default."],
  ["lead", "Row titles, card titles, the name column"],
  ["section", "Section headings, dialog titles"],
  ["title", "The page h1, one per page"],
  ["display", "A figure that is the page’s result"],
] as const;
const SPACING = [
  ["gap-1", "4", "hairline: icon to text inside a chip"],
  ["gap-1.5", "6", "inline: icon to label inside a button"],
  ["gap-2", "8", "control: between controls in a row"],
  ["gap-3", "12", "group: label to field"],
  ["gap-4", "16", "card: between cards, card padding"],
  ["gap-6", "24", "section: between sections of a page"],
  ["gap-8", "32", "page: the inset"],
] as const;

export function FoundationSpecimens({ entry }: { entry: LibraryEntry }) {
  const tokens = useTokens(entry.slug === "colour" ? [...ROLES, ...SIGNALS] : []);
  const [first, second] = entry.variants;

  if (entry.slug === "colour") {
    const swatch = (name: string) => (
      <div key={name} className="flex items-center gap-3">
        <span className="size-7 shrink-0 rounded-sm border border-border" style={{ background: `var(${name})` }} />
        <span className="size-7 shrink-0 rounded-sm border border-border dark" style={{ background: tokens[name]?.[1] }} />
        <Mono className="text-meta">{name.slice(2)}</Mono>
        <span className="text-caption text-muted-foreground">{tokens[name]?.[0]}</span>
      </div>
    );
    return (
      <>
        <Specimen name={first.name} note={first.note} fill>
          <div className="grid w-full grid-cols-2 gap-x-8 gap-y-2">{ROLES.map(swatch)}</div>
        </Specimen>
        <Specimen name={second.name} note={second.note} fill>
          <div className="grid w-full grid-cols-2 gap-x-8 gap-y-2">{SIGNALS.map(swatch)}</div>
        </Specimen>
      </>
    );
  }
  if (entry.slug === "type") {
    return (
      <Specimen name={first.name} note={first.note} fill>
        <div className="flex w-full flex-col gap-4">
          {TYPE.map(([token, use]) => (
            <div key={token} className="flex items-baseline gap-6">
              <Mono className="w-20 shrink-0 text-meta text-muted-foreground">text-{token}</Mono>
              <span className={`text-${token}`}>The quick brown fox jumps over the lazy dog</span>
              <span className="ml-auto text-caption text-muted-foreground">{use}</span>
            </div>
          ))}
        </div>
      </Specimen>
    );
  }
  if (entry.slug === "spacing") {
    return (
      <Specimen name={first.name} note={first.note} fill>
        <div className="flex w-full flex-col gap-3">
          {SPACING.map(([cls, px, use]) => (
            <div key={cls} className="flex items-center gap-6">
              <Mono className="w-16 shrink-0 text-meta text-muted-foreground">{cls}</Mono>
              <span className="h-4 bg-primary/40" style={{ width: `${px}px` }} />
              <span className="w-8 text-caption text-muted-foreground">{px}</span>
              <span className="text-caption text-muted-foreground">{use}</span>
            </div>
          ))}
        </div>
      </Specimen>
    );
  }
  if (entry.slug === "radius") {
    return (
      <Specimen name={first.name} note={first.note} fill>
        <div className="flex w-full flex-wrap items-end gap-6">
          {[["sm", "4", "chips, badges, kbd"], ["md", "6", "buttons, inputs, rows"], ["lg", "8", "cards, popovers, drawers"], ["xl", "12", "dialogs only"], ["full", "", "avatars, dots"]].map(([k, px, use]) => (
            <div key={k} className="flex flex-col items-start gap-1.5">
              <span className={`size-12 border border-border bg-card rounded-${k}`} />
              <Mono className="text-meta">rounded-{k}</Mono>
              <span className="text-caption text-muted-foreground">{px ? `${px}px, ` : ""}{use}</span>
            </div>
          ))}
        </div>
      </Specimen>
    );
  }
  if (entry.slug === "elevation") {
    return (
      <Specimen name={first.name} note={first.note} fill>
        <div className="flex w-full flex-wrap gap-8 py-4">
          {[["raised", "the shell frame, the chosen tab"], ["overlay", "popover, menu, tooltip, toast"], ["modal", "dialog, drawer, sheet"]].map(([k, use]) => (
            <div key={k} className="flex flex-col items-start gap-2">
              <span className={`flex h-20 w-40 items-center justify-center rounded-lg bg-popover ring-1 ring-foreground/10 shadow-${k}`}>
                <Mono className="text-meta">shadow-{k}</Mono>
              </span>
              <span className="text-caption text-muted-foreground">{use}</span>
            </div>
          ))}
        </div>
      </Specimen>
    );
  }
  if (entry.slug === "motion") {
    return (
      <Specimen name={first.name} note={first.note} fill>
        <div className="flex w-full flex-wrap gap-8">
          {[["State", "", "hover, press, focus: 75ms, the default"], ["Overlay", "duration-100", "popover, menu, dialog fade"], ["Panel", "duration-200", "sheet, drawer, nav slide"]].map(([k, cls, use]) => (
            <div key={k} className="flex flex-col items-start gap-2">
              <Button variant="secondary" className={cls}>
                {k}
              </Button>
              <span className="text-caption text-muted-foreground">{use}</span>
            </div>
          ))}
        </div>
      </Specimen>
    );
  }
  return null;
}
