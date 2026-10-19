"use client";

import { Check } from "lucide-react";

/**
 * One country in a list: flag, name, and a tick when it is the one chosen.
 *
 * A real `<button>`, so Enter, Space and tab order come free. `aria-pressed`
 * rather than a radio: this is one control that is on or off, and a radiogroup
 * would owe a roving tabindex across 243 rows for no gain a reader can use.
 *
 * Its own file because two lists render it: the chooser before step 1, and
 * the country menu in the row above the step tracker on every step after.
 * One row component is what keeps the two lists looking like the same list.
 */
export default function CountryRow({
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
      className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body transition-colors hover:bg-accent focus-ring ${
        selected
          ? "bg-accent font-medium text-foreground"
          : "text-muted-foreground"
      }`}
    >
      <span aria-hidden className="text-lead ">
        {flag}
      </span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {selected ? (
        <Check aria-hidden className="size-4 shrink-0 text-primary" />
      ) : null}
    </button>
  );
}
