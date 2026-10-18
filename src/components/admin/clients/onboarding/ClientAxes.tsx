"use client";

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { COUNTRY_SEED, countryName, searchCountries } from "@/lib/domain/countries";
import type { ClientKind } from "@/lib/domain/entityType";
import CountryRow from "./CountryRow";

/**
 * The two answers every step is filled in under, kept in view above the step
 * row: `Individual · India`.
 *
 * These are the chooser's two questions, shown again once answered. They
 * decide most of what the flow asks for (which legal forms, which tax
 * registrations, what a postcode is called, which documents are requested),
 * so they belong somewhere visible on every step rather than on step 1 only,
 * and somewhere changeable, because a client entered under the wrong country
 * has to be fixable without abandoning the record. This row replaced the
 * country field that used to sit at the head of the identity step.
 *
 * **It stores nothing and owns nothing.** It is a view of the two facts and a
 * pair of controls that write to wherever they already live: the URL before
 * the first save, the record after it. Both go through the callbacks, so the
 * shell decides which of those it is (`PRINCIPLES.md` rule 3, and the reason
 * there is no `client_kind` or `country` column).
 *
 * **Subtle at rest, full-strength under the pointer, and never below the
 * contrast floor.** The brief asked for low opacity. Opacity on text is the
 * one way to make a label fail WCAG 1.4.3 without any token changing, and the
 * contrast suite would not see it, so the resting state is the muted token
 * (measured at 4.5:1 on this background in `contrast.test.ts`) and hover,
 * focus and an open menu step up to the foreground. Same read, no failure.
 *
 * A menu for the kind, since there are two answers, and a popover with a
 * search for the country, since there are 243. The country list is the
 * chooser's own row and filter, so the two lists cannot drift apart.
 */
export default function ClientAxes({
  kind,
  country,
  onKindChange,
  onCountryChange,
}: {
  kind: ClientKind;
  /** ISO 3166-1 alpha-2, always one the seed knows. */
  country: string;
  onKindChange: (kind: ClientKind) => void;
  onCountryChange: (iso2: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);

  const groups = useMemo(() => searchCountries(query), [query]);
  const flag = COUNTRY_SEED.find((c) => c.iso2 === country)?.flag;

  return (
    <div className="flex items-center gap-1.5 text-meta text-muted-foreground">
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button" className={TRIGGER} />}>
          <span className="sr-only">Type: </span>
          {KIND_LABEL[kind]}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuRadioGroup
            value={kind}
            onValueChange={(value) => onKindChange(value as ClientKind)}
          >
            <DropdownMenuRadioItem value="individual">An individual</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="company">A company</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <span aria-hidden>·</span>

      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // A closed menu forgets its search: reopening to a stale filter
          // reads as a list that lost most of its countries.
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger render={<button type="button" className={TRIGGER} />}>
          <span className="sr-only">Country: </span>
          {flag ? <span aria-hidden>{flag}</span> : null}
          {countryName(country)}
        </PopoverTrigger>
        <PopoverContent align="center" initialFocus={search} className="w-72 p-2">
          <div className="relative mb-2">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              ref={search}
              type="search"
              className="pl-8"
              placeholder="Search countries"
              aria-label="Search countries"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {groups.length === 0 ? (
              <p className="py-6 text-center text-body text-muted-foreground">
                No country matches “{query.trim()}”.
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.continent} className="mb-3 last:mb-0">
                  <h3 className="sticky top-0 z-10 mb-1 border-b border-border bg-popover pt-0.5 pb-1 text-meta font-medium text-foreground">
                    {group.continent}
                  </h3>
                  <ul>
                    {group.countries.map((c) => (
                      <li key={c.iso2}>
                        <CountryRow
                          flag={c.flag}
                          name={c.name}
                          selected={c.iso2 === country}
                          onClick={() => {
                            setOpen(false);
                            setQuery("");
                            if (c.iso2 !== country) onCountryChange(c.iso2);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const KIND_LABEL: Record<ClientKind, string> = {
  individual: "Individual",
  company: "Company",
};

/**
 * Text that behaves like a control. Resting on the row's muted colour, and
 * stepping to the foreground on hover, on keyboard focus and while its menu
 * is open (`data-popup-open` is what Base UI puts on an open trigger), so the
 * one being used is the one that reads at full strength.
 */
const TRIGGER =
  "inline-flex cursor-pointer items-center gap-1 rounded-sm px-1 py-0.5 transition-colors hover:text-foreground focus-visible:text-foreground focus-ring data-popup-open:text-foreground";
