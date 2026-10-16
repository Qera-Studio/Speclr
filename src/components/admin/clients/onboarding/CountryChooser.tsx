"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchCountries } from "@/lib/domain/countries";
import type { ClientKind } from "@/lib/domain/entityType";
import CountryRow from "./CountryRow";

/**
 * What kind of client, and where are they based? Both, on one page, before the
 * first field.
 *
 * These were two screens and are now one, on request. They belong together:
 * neither is stored, both ride in the URL until step 1 saves, and both exist to
 * decide what the rest of the flow asks for. Splitting them made the shorter
 * question its own page, which is a click and a page transition to answer
 * something with two options.
 *
 * **The country is the most load-bearing answer in onboarding.** Nearly
 * everything the rest of the flow offers is filtered by it: which legal forms
 * the entity type lists, which tax registrations exist, whether a W-8BEN-E or
 * reverse charge is asked about, which documents are requested, what the
 * postcode field is even called. The kind decides one thing, which entity types
 * are offered, but it decides it first, so it is at the top.
 *
 * **Neither answer is stored here.** Both ride in the URL until step 1 saves,
 * at which point `entityType` and `addressParts.country` are on the record and
 * every later reader derives from those (`PRINCIPLES.md` rule 3: a column for
 * either would be a second place for a record to say what it is, and a second
 * place for it to disagree). This page only seeds them.
 *
 * Neither is asked again on step 1. From here on both answers sit in the row
 * above the step tracker (`ClientAxes`), where they can be changed on any
 * step: before the first save that rewrites the URL, after it the record.
 *
 * **Choosing does not advance, for either answer.** Two hundred and forty-three
 * targets a click apart is a page where the wrong one gets hit, and a wrong
 * click that also changes the page is a wrong click nobody notices. Now that
 * the kind shares the page it follows the same rule: it no longer advances on
 * its own, because doing so would take the page away before the country below
 * it had been answered.
 */
export default function CountryChooser({
  onContinue,
  onBack,
}: {
  onContinue: (kind: ClientKind, iso2: string) => void;
  /** Out of the flow entirely. Nothing has been written yet, so nothing unwinds. */
  onBack: () => void;
}) {
  const [kind, setKind] = useState<ClientKind | null>(null);
  const [query, setQuery] = useState("");
  /**
   * Held here rather than in the URL, because a URL that changed on every click
   * would be a history entry per country looked at. It reaches the URL once, on
   * Continue, which is the moment the answer is actually given.
   */
  const [value, setValue] = useState<string | null>(null);

  // Filtered live, on the name and on the code. The filter itself lives with
  // the list, because the row above the step tracker searches it too.
  const groups = useMemo(() => searchCountries(query), [query]);

  const matches = groups.reduce((n, g) => n + g.countries.length, 0);

  // `m-auto` rather than `justify-center` on the parent: the shell owns that
  // column and every other step fills it from the top.
  return (
    <div className="m-auto flex w-full min-h-0 max-w-4xl flex-col gap-5">
      <div className="shrink-0 text-center">
        <h2 className="mb-1 text-lg font-medium">Who are you adding?</h2>
        <p className="text-sm text-muted-foreground">
          The type and the country decide what they are asked for. Both can be
          changed later, on the client’s identity step.
        </p>
      </div>

      {/*
        The kind, at the top, because it is the first decision and the smaller
        one. Two cards rather than a select: there are exactly two answers and
        the difference between them wants a sentence each, which a dropdown has
        nowhere to put.
      */}
      <ul className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <li>
          <KindCard
            icon={<User aria-hidden className="size-7" />}
            title="An individual"
            line="A freelancer, consultant or sole proprietor."
            selected={kind === "individual"}
            onClick={() => setKind("individual")}
          />
        </li>
        <li>
          <KindCard
            icon={<Building2 aria-hidden className="size-7" />}
            title="A company"
            line="A private limited, LLP, partnership or trust."
            selected={kind === "company"}
            onClick={() => setKind("company")}
          />
        </li>
      </ul>

      {/*
        A rule between the two questions, because they are two questions. The
        heading alone was carrying that on its own and the cards above ran
        straight into the list below, which read as one long page rather than
        as "answer this, then this".

        The heading sits *on* the rule rather than under it, so the divider
        does not need a gap of its own: `items-center` plus a line either side
        is the same trick the continent headings use one band down.
      */}
      <div className="flex shrink-0 items-center gap-3">
        <span aria-hidden className="h-px flex-1 bg-border" />
        <h3 className="text-sm font-medium">Where are they based?</h3>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>

      {/* Pinned above the list, because it is how the list is used. */}
      <div className="relative w-full max-w-[300px] shrink-0 self-center">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          autoFocus
          size="form"
          className="pl-9"
          placeholder="Search countries"
          aria-label="Search countries"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/*
        The only band that scrolls, and it is **four** country rows tall.

        The arithmetic has to include the heading, which is the part the first
        version got wrong: the continent heading is sticky *inside* this band,
        so it is always showing and always taking its share. Sized for six rows
        of list, five showed.

        **Measured in a browser rather than derived from the classes**, which
        is the second thing that went wrong: computing it from `py-2` and
        `text-sm` gave 12.25rem and produced three rows, because a row's *pitch*
        is not its height and the heading's block is not its line box. The
        numbers, from `/preview/client-chooser`: the heading occupies 41px
        before the list starts, a row is 36px tall and rows repeat every 40px.

        Four rows fully inside the band is therefore 41 + 3 × 40 + 36 = 197px.
        `e2e/client-chooser.spec.ts` counts them, so this stays honest when the
        type sizes move.

        Fixed rather than `flex-1`, or the list would grow with the viewport and
        the page would stop being one glance.
      */}
      <div className="h-[197px] overflow-y-auto pr-1">
        {groups.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No country matches “{query.trim()}”.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.continent} className="mb-6 last:mb-0">
              {/*
                Sticky, so the heading you are reading under stays named while
                you scroll a continent that is fifty rows long. `bg-background`
                rather than transparent, or the rows scroll through the words.
              */}
              <h3 className="sticky top-0 z-10 mb-2 border-b border-border bg-background pt-1 pb-2 text-sm font-medium text-foreground">
                {group.continent}
              </h3>
              <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {group.countries.map((country) => (
                  <li key={country.iso2}>
                    <CountryRow
                      flag={country.flag}
                      name={country.name}
                      selected={country.iso2 === value}
                      onClick={() => setValue(country.iso2)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>

      {/*
        The count is announced but not shown: a visible number under a search
        box is one more thing to read on a page whose whole answer is already
        visible, and a screen reader has no other way to tell that typing
        narrowed anything.
      */}
      <p role="status" aria-live="polite" className="sr-only">
        {query.trim() ? `${matches} countries match.` : ""}
      </p>

      {/*
        Back sits beside Continue rather than at the corner: this is a two-screen
        question and the second screen is the only place the first can be
        answered again. Ghost, so it does not compete with the answer.
      */}
      <div className="relative flex shrink-0 items-center justify-center gap-3 mt-8">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute left-0"
          aria-label="Back to the clients list"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden />
        </Button>
        {/*
          Disabled until *both* are answered, and the label says which is
          missing rather than leaving a dead button to be puzzled over. A
          disabled control with no explanation is the commonest form of a form
          that cannot be finished for reasons it will not state.
        */}
        <Button
          type="button"
          size="lg"
          disabled={!kind || !value}
          onClick={() => kind && value && onContinue(kind, value)}
          className="group/tray hover:bg-primary"
        >
          Continue
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
      <p aria-live="polite" className="-mt-1 shrink-0 text-center text-xs text-muted-foreground">
        {!kind && !value
          ? "Choose a type and a country."
          : !kind
            ? "Choose a type above."
            : !value
              ? "Choose a country."
              : ""}
      </p>
    </div>
  );
}

/**
 * One of the two type cards.
 *
 * A real `<button>` with `aria-pressed`, matching `CountryRow` below rather
 * than inventing a second selection idiom on the same page: both are one
 * control that is on or off, and a radiogroup would owe a roving tabindex for
 * nothing a reader could use.
 */
function KindCard({
  icon,
  title,
  line,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  line: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      // `items-center`, not `items-start`, now that the icon is tall enough to
      // span both lines: aligned to the top it would hang off the first line
      // and the card would read as a paragraph with a bullet. `gap-4` so the
      // glyph and the words are two things beside each other rather than one
      // crowded block.
      className={`flex w-full cursor-pointer items-center gap-4 rounded-lg border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected
          ? "border-primary bg-accent"
          : "border-border hover:bg-accent/50"
      }`}
    >
      <span
        className={`shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{line}</span>
      </span>
      {selected ? <Check aria-hidden className="size-4 shrink-0 text-primary" /> : null}
    </button>
  );
}
