"use client";

import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * The date and time at the right-hand end of the header.
 *
 * **It renders nothing on the server, and that is the whole design.** The
 * server's clock is UTC on Vercel and the reader's is not, so a time rendered
 * there and again on the client is a guaranteed hydration mismatch: React would
 * either warn and patch it up or, on a bad day, keep the server's answer and
 * show a reader in Ghaziabad a time five and a half hours behind their own
 * wall. Mounting empty and filling in on the client is the honest version of
 * "this value only exists in the browser". The cost is one frame with no clock,
 * on a decoration, which is the right thing to trade.
 *
 * `Intl` rather than the `dates` helpers deliberately. Those format *documents*,
 * where §7 fixes an ordinal '10th June 2026' and nothing may drift from it.
 * This is chrome: it wants a weekday and a padded day, which no helper there
 * produces, and inventing one would put a second date format in the domain
 * layer that no document is allowed to use.
 *
 * **Two controls, not one.** The date half swaps the long and short forms; the
 * time half swaps the 12- and 24-hour clocks. They look like one run of text
 * and are two buttons, because one button cannot carry two actions and a
 * modifier-click is not discoverable.
 *
 * **The hover card opens only over the date half, and only in the short form.**
 * Hovering the long form would open a card repeating the line already under the
 * cursor, which is the one thing a popup must never do. So the card is what the
 * short form trades away access to, and the click is what trades it back
 * permanently. It carries no time, because the time is beside it either way.
 */

/** 'Monday, 01 August 2026' — the long form's date half. */
function formatLongDate(now: Date): string {
  // The weekday is formatted separately and the comma written by hand, because
  // `en-GB` does not put one there ('Saturday 01 August 2026') and the exact
  // punctuation is the specified format rather than the locale's preference.
  const weekday = now.toLocaleDateString("en-GB", { weekday: "long" });
  const date = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return `${weekday}, ${date}`;
}

/** '28/05/26' — the short form's date half. */
function formatShortDate(now: Date): string {
  return now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/** '13:42' or '01:42 pm', both forms. */
function formatTime(now: Date, hour12: boolean): string {
  return now
    .toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12,
    })
    // `en-GB` writes 'pm'; lower case is what the rest of this bar uses, and
    // `toLocaleTimeString` is the one place a stray capital could creep in.
    .toLowerCase();
}

/**
 * Which form the reader last chose, so a page move does not reset it.
 *
 * `localStorage`, unlike the client-onboarding drafts in `lib/draft.ts` which
 * are deliberately `sessionStorage`: this is a display preference, not a third
 * party's PAN, so there is nothing here that must die with the tab.
 */
const FORM_KEY = "speclr_clock_long";

/** Likewise for 12-hour vs 24-hour. Default 24, which is what §7's siblings use. */
const HOUR12_KEY = "speclr_clock_hour12";

export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  const [long, setLong] = useState(true);
  const [hour12, setHour12] = useState(false);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    setNow(new Date());
    try {
      setLong(window.localStorage.getItem(FORM_KEY) !== "0");
      setHour12(window.localStorage.getItem(HOUR12_KEY) === "1");
    } catch {
      // A browser set to block site data throws on the accessor itself. The
      // default form is a fine answer.
    }
    // Ticked to the top of the minute rather than every 60s from mount, or a
    // clock mounted at :59.9 sits a whole minute behind for its whole life.
    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(
      () => {
        setNow(new Date());
        interval = setInterval(() => setNow(new Date()), 60_000);
      },
      60_000 - (Date.now() % 60_000),
    );
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  /** Remember a choice, shrugging if the browser blocks site data. */
  const remember = (key: string, value: boolean) => {
    try {
      window.localStorage.setItem(key, value ? "1" : "0");
    } catch {
      // See above. The preference simply does not persist.
    }
  };

  const chooseForm = (next: boolean) => {
    setLong(next);
    // Swapping to the long form under an open card would leave the card
    // repeating the line beneath it until the pointer left.
    setHover(false);
    remember(FORM_KEY, next);
  };

  const chooseHour12 = (next: boolean) => {
    setHour12(next);
    remember(HOUR12_KEY, next);
  };

  // Nothing at all until the effect has run: see the hydration note above. An
  // empty span rather than null so the header's `gap` does not reflow when the
  // value lands.
  if (!now) return <span className="hidden shrink-0 sm:inline" />;

  // Each half needs a name that says what pressing it *does* rather than
  // repeating what it shows. `aria-pressed` would be wrong on either: neither
  // is a thing being switched on, they are two-way swaps.
  //
  // No `title` on either. It draws the browser's own grey chip, which cannot be
  // styled, ignores the 4px popup gap and appeared *on top of* the card. The
  // `aria-label` carries this to a screen reader without painting anything.
  const dateLabel = long
    ? "Show the short date"
    : "Show the full date";
  const timeLabel = hour12
    ? "Show the 24-hour clock"
    : "Show the 12-hour clock";

  // The two halves are separate buttons because they now do separate things,
  // and one button cannot have two actions. The visual pair is the wrapper's
  // `gap-2`; the reader gets two named controls, tabbable in order.
  const half =
    "cursor-pointer rounded-md transition-colors hover:text-sidebar-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

  return (
    // Controlled `open`, driven by hover rather than by the trigger's own
    // click, because the click already means something else here. `Popover`
    // rather than `Tooltip`: a tooltip is an inverted dark chip with an arrow,
    // and what was asked for is a card.
    <Popover open={!long && hover} onOpenChange={setHover}>
      <span
        className={cn(
          "hidden shrink-0 items-center text-xs whitespace-nowrap tabular-nums sm:inline-flex",
          // The header's two weights, the same pair `ProfileSwitcher` uses:
          // resting on the muted ramp, stepping to the rail's own ink under
          // the pointer rather than lighting up a fill.
          "text-muted-foreground",
          // A wider gap between the date and the time than a single space, in
          // both forms: they are two readings rather than one string, and now
          // two controls besides.
          "gap-2",
        )}
      >
        {/* Only the date half triggers the card, because the card is the long
            *date* and says nothing about the time. */}
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={dateLabel}
              onClick={() => chooseForm(!long)}
              onPointerEnter={() => setHover(true)}
              onPointerLeave={() => setHover(false)}
              onFocus={() => setHover(true)}
              onBlur={() => setHover(false)}
              className={half}
            >
              {long ? formatLongDate(now) : formatShortDate(now)}
            </button>
          }
        />
        <button
          type="button"
          aria-label={timeLabel}
          onClick={() => chooseHour12(!hour12)}
          className={half}
        >
          {formatTime(now, hour12)}
        </button>
      </span>
      <PopoverContent
        side="bottom"
        align="end"
        // Not focus-trapped and not dismissable in the usual way: this card is
        // a reading, not a menu, and the pointer leaving is what closes it.
        // Without this, opening it would pull focus off whatever the reader was
        // on for a card they never clicked.
        initialFocus={false}
        className="px-3 py-2 text-xs whitespace-nowrap text-foreground"
      >
        {/* The date alone. The short form abbreviates the *date* and prints the
            time in full beside it, so the time is already on screen and a card
            repeating it would be the same redundancy the long form is gated
            against. */}
        {formatLongDate(now)}
      </PopoverContent>
    </Popover>
  );
}
