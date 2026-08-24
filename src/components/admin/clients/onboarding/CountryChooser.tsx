"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRIES_BY_CONTINENT } from "@/lib/domain/countries";
import { CycleArrowIcon } from "@/components/ui/tray-arrow-icon";

/**
 * Where is this client based? Asked after the kind and before the first field.
 *
 * The country is the most load-bearing answer in onboarding and it was buried
 * two thirds of the way down step 1. Nearly everything the rest of the flow
 * offers is filtered by it: which legal forms the entity type lists, which tax
 * registrations exist, whether a W-8BEN-E or reverse charge is asked about,
 * which documents are requested, what the postcode field is even called. A
 * field that decides five later fields should not sit below three of them.
 *
 * **The answer is never stored here.** It rides in the URL until step 1 saves,
 * at which point it is `addressParts.country` on the record and every later
 * reader derives from that (`PRINCIPLES.md` rule 3, the same reason the kind is
 * not stored either). `addressParts.country` is still where the value lives;
 * this only seeds it.
 *
 * Step 1's own country field renders **only once there is a record**. On the
 * create path it would be this question twice, pre-answered, one screen apart.
 * It cannot go altogether, because an existing client never reaches this page
 * and something has to be able to correct a country entered wrongly.
 *
 * **Choosing does not advance.** Two hundred and forty-three targets a click
 * apart is a page where the wrong one gets hit, and a wrong click that also
 * changes the page is a wrong click nobody notices. The choice and the move are
 * separate, so the selection can be read back before it is committed. That is
 * the opposite call from `KindChooser`, and deliberately: two options are not
 * mis-clicked.
 */
export default function CountryChooser({
  onContinue,
  onBack,
}: {
  onContinue: (iso2: string) => void;
  /** Back to the kind chooser. Nothing has been written yet, so nothing unwinds. */
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  /**
   * Held here rather than in the URL, because a URL that changed on every click
   * would be a history entry per country looked at. It reaches the URL once, on
   * Continue, which is the moment the answer is actually given.
   */
  const [value, setValue] = useState<string | null>(null);

  /**
   * Filtered live, on the name and on the code. The code matters: somebody who
   * knows a client is 'AE' should not have to remember whether this list files
   * them under "United Arab Emirates" or "UAE".
   *
   * A continent that nothing matched does not render, so a search never returns
   * a page of empty headings.
   */
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES_BY_CONTINENT;
    return COUNTRIES_BY_CONTINENT.map((g) => ({
      continent: g.continent,
      countries: g.countries.filter(
        (c) => c.name.toLowerCase().includes(q) || c.iso2.toLowerCase() === q,
      ),
    })).filter((g) => g.countries.length > 0);
  }, [query]);

  const matches = groups.reduce((n, g) => n + g.countries.length, 0);

  // `m-auto` rather than `justify-center` on the parent: the shell owns that
  // column and every other step fills it from the top.
  return (
    <div className="m-auto flex w-full min-h-0 max-w-4xl flex-col gap-5">
      <div className="shrink-0 text-center">
        <h2 className="mb-1 text-lg font-medium">Where are they based?</h2>
        <p className="text-sm text-muted-foreground">
          It decides which registrations and documents they are asked for. You
          can change it later, on the client’s identity step.
        </p>
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
        The only band that scrolls, and it is six country rows tall: a row is
        `py-2` on `text-sm` (2.25rem) and the grid gap is 0.25rem, so
        6 × 2.25 + 5 × 0.25 = 14.75rem. Fixed rather than `flex-1`, or the list
        would grow with the viewport and the page would stop being one glance.
        The continent heading is sticky *inside* this band, so it takes part of
        the six while it is showing.
      */}
      <div className="h-[14.75rem] overflow-y-auto pr-1">
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
          aria-label="Back to the kind of client"
          onClick={onBack}
        >
          <ArrowLeft aria-hidden />
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={!value}
          onClick={() => value && onContinue(value)}
          className="group/tray hover:bg-primary"
        >
          Continue
          <CycleArrowIcon />
        </Button>
      </div>
    </div>
  );
}

/**
 * A real `<button>`, so Enter, Space and tab order come free. `aria-pressed`
 * rather than a radio: this is one control that is on or off, and a radiogroup
 * would owe a roving tabindex across 243 rows for no gain a reader can use.
 */
function CountryRow({
  flag,
  name,
  selected,
  onClick,
}: {
  flag: string;
  name: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        selected
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground"
      }`}
    >
      <span aria-hidden className="text-base leading-none">
        {flag}
      </span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {selected ? (
        <Check aria-hidden className="size-4 shrink-0 text-primary" />
      ) : null}
    </button>
  );
}
