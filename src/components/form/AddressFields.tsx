"use client";

import { useEffect, useRef, useState } from "react";
import {
  useController,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { FieldRow } from "@/components/ui/field-row";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { FieldSpinner } from "@/components/ui/spinner";
import { useMinimumDuration } from "@/lib/useMinimumDuration";
import FieldInfo from "./FieldInfo";
import { formatPostcode, isLookupPostcode } from "@/lib/domain/address";
import { COUNTRIES_BY_CONTINENT, COUNTRY_SEED } from "@/lib/domain/countries";

/**
 * The structured address block, shared by the client and employee forms.
 *
 * Typing a postcode fills in city and state, in India and in the ~60 countries
 * the world upstream covers. That lookup is strictly an enhancement: it is
 * debounced, it aborts when superseded, it fails silently, and it never
 * overwrites something already typed. Every field stays editable by hand, so a
 * slow or down third party can't stop anyone saving, which is also what makes
 * partial country coverage acceptable rather than a half-built feature.
 */

/**
 * Exported because the identity step renders the country field itself, above
 * the rest of the form. One list, so the hoisted control and the inline one can
 * never offer different countries.
 */
export const COUNTRY_OPTIONS = COUNTRY_SEED.map((c) => ({
  value: c.iso2,
  label: `${c.flag} ${c.name}`,
}));

/**
 * The same list, under continent headings.
 *
 * Two hundred and forty-three rows is far past the point where a flat list is
 * scanned rather than read, and a continent is how somebody actually holds the
 * world in their head: you know a client is in Europe before you remember
 * whether the list calls it "Netherlands" or "The Netherlands". Search still
 * runs across the whole list, so typing is never slower than it was.
 *
 * Built from the seed, not from `phone.ts`'s list: an address needs no dial
 * code, and going through the phone list would silently drop any country
 * libphonenumber has no metadata for. `COUNTRY_SEED` is the only place a
 * country is declared, so a continent with nothing in it simply does not
 * appear.
 */
export const COUNTRY_GROUPS = COUNTRIES_BY_CONTINENT.map((g) => ({
  label: g.continent,
  items: g.countries.map((c) => ({ value: c.iso2, label: `${c.flag} ${c.name}` })),
}));

const DEBOUNCE_MS = 400;

const LOCK_HINT =
  "City and state filled from this postcode. Change it to edit them.";

/**
 * India calls it a pincode and it is always six digits, so that field can say
 * so and refuse everything else. Everywhere else the shape is the country's own
 * business: 'EH1 1YZ' is a postcode and stripping it to '11' is how a Scottish
 * client became unable to type their address.
 *
 * The other two words change with it, and that is the whole answer to
 * districts, counties, prefectures and the rest: **the same three lines, named
 * in the reader's words.** A UK address has a locality, a post town and a
 * region, which is `line2`, `city` and `state` exactly. Adding a field per
 * country would be a jurisdiction pack (`PRINCIPLES.md` rule 5) and a column
 * per country on a record that already holds the value.
 */
const addressWords = (country: string) =>
  country === "IN"
    ? {
        postcode: "Pincode",
        placeholder: "000000",
        inputMode: "numeric" as const,
        digitsOnly: true,
        city: "City",
        state: "State",
      }
    : {
        postcode: "Postcode",
        placeholder: "Postcode",
        inputMode: "text" as const,
        digitsOnly: false,
        city: "Town / city",
        state: "Region / county",
      };

interface AddressFieldsProps<T extends FieldValues> {
  control: Control<T>;
  /** Field-name prefix, so both forms can nest this under `addressParts`. */
  name: Path<T>;
  /** Prefix for input ids, keeping them unique when two forms share a page. */
  idPrefix: string;
  size?: "default" | "form";
  /**
   * The country is rendered somewhere else on this form, so leave the slot out.
   *
   * Set by the identity step, which lifts it to the top of the page. The
   * country decides which legal forms the entity type offers, and entity type
   * is asked two rows *above* the address, so a country sitting down here means
   * the filter above it only works for someone who already knew to scroll down
   * and set it first.
   *
   * Only the field moves. The controller still writes `${name}.country`, the
   * postcode lookup still reads it, and a second address on the same form (the
   * billing one) keeps its own country inline, where nothing depends on it.
   */
  hideCountry?: boolean;
}

/**
 * `autoComplete="off"` on every field here, and it is a correctness choice
 * rather than a missing feature.
 *
 * The browser's saved profile is **the operator's own** address. This component
 * is only ever used for a *third party* — a client or an employee — so every
 * suggestion it could offer is the wrong entity, one click from putting Qera's
 * registered address on a client record that then prints as the recipient on an
 * invoice. Autofill belongs where the data is the operator's, which here means
 * the studio settings page and nowhere else.
 *
 * The pincode lookup is this form's autofill, and it fills from the postal
 * database rather than from whoever last used the browser.
 */
const NO_PROFILE_AUTOFILL = "off";

export default function AddressFields<T extends FieldValues>({
  control,
  name,
  idPrefix,
  size = "form",
  hideCountry = false,
}: AddressFieldsProps<T>) {
  const line1 = useController({ control, name: `${name}.line1` as Path<T> });
  const line2 = useController({ control, name: `${name}.line2` as Path<T> });
  const city = useController({ control, name: `${name}.city` as Path<T> });
  const state = useController({ control, name: `${name}.state` as Path<T> });
  const pincode = useController({
    control,
    name: `${name}.pincode` as Path<T>,
  });
  const country = useController({
    control,
    name: `${name}.country` as Path<T>,
  });

  const [lookingUp, setLookingUp] = useState(false);
  // Held for half a second: a cached pincode returns fast enough that a bare
  // spinner would flicker and the fields would appear to fill themselves.
  const busy = useMinimumDuration(lookingUp);
  /**
   * Which fields the postal lookup filled in. Those go read-only, so a typo
   * can't leave a client's city and pincode disagreeing.
   *
   * Read-only rather than disabled: a disabled input is skipped on submit and
   * is skipped by screen readers. And the lock is always escapable — editing or
   * clearing the pincode clears these flags (see the effect below), so a wrong
   * district from India Post is never something you're stuck with.
   */
  const [autofilled, setAutofilled] = useState({ city: false, state: false });
  const locked = autofilled.city || autofilled.state;
  /**
   * The localities a postcode covers when it covers several, straight from the
   * lookup.
   *
   * This is the answer to "is the app broken, or does this code really have no
   * town?" — a question an empty box cannot answer, and one that matters
   * because plenty of countries file addresses by a region and a suburb with no
   * town between them. AU 2155 is four suburbs; the region is known and filled,
   * and the four are offered here rather than guessed at.
   */
  const [options, setOptions] = useState<string[]>([]);

  const pincodeValue = String(pincode.field.value ?? "");
  const countryValue = String(country.field.value ?? "IN");
  const words = addressWords(countryValue);

  // Read the latest city/state inside the effect without making them
  // dependencies — otherwise typing a city would restart the lookup.
  const latest = useRef({ city: "", state: "" });
  latest.current = {
    city: String(city.field.value ?? ""),
    state: String(state.field.value ?? ""),
  };
  /**
   * What the last lookup wrote, so it can be taken back. A field still holding
   * exactly that is ours; the moment someone edits it, it stops matching and
   * becomes theirs, and nothing here touches it again.
   *
   * Without this, a *corrected* pincode never took effect: after the first
   * lookup city and state are non-empty, and "only fill what is empty" then
   * declines every subsequent answer — leaving a Chennai pincode sitting next
   * to Ghaziabad, which is precisely the disagreement this record exists to
   * prevent.
   */
  const filled = useRef({ city: "", state: "" });
  const setCity = city.field.onChange;
  const setState = state.field.onChange;

  useEffect(() => {
    // A new postcode (or a new country) invalidates whatever the last one
    // filled in. Unlock first, then look up again.
    setAutofilled({ city: false, state: false });
    setOptions([]);

    /**
     * And take the old answer off the screen, rather than leaving it there
     * until a new one arrives.
     *
     * It is derived from the postcode, so the moment the postcode changes it
     * is either right by luck or wrong: a Paisley postcode edited into a Perth
     * one kept saying Paisley, and a city that disagrees with the code beside
     * it is the one thing this field must never show. Blank says "not known
     * yet", which is true, and is a state the operator can act on.
     *
     * Only what this lookup wrote. A hand-typed city is theirs, and survives.
     * `latest` is corrected here too rather than waiting for the next render,
     * so the check below sees what is actually in the field.
     */
    const drop = (current: string, mine: string) =>
      mine && current === mine ? "" : current;
    const cleared = {
      city: drop(latest.current.city, filled.current.city),
      state: drop(latest.current.state, filled.current.state),
    };
    if (cleared.city !== latest.current.city) setCity("");
    if (cleared.state !== latest.current.state) setState("");
    latest.current = cleared;
    filled.current = { city: "", state: "" };

    if (!isLookupPostcode(pincodeValue, countryValue)) {
      setLookingUp(false);
      return;
    }

    const controller = new AbortController();
    setLookingUp(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/pincode/${encodeURIComponent(pincodeValue.trim())}?country=${countryValue}`,
          { signal: controller.signal },
        );
        const data: unknown = await response.json();
        if (controller.signal.aborted) return;

        const result = data as {
          ok?: boolean;
          city?: string;
          state?: string;
          options?: string[];
        };
        if (!result?.ok) return;

        // Offered only while the field is still empty. A city already typed is
        // the answer, and a list under it would read as a correction.
        const offering = Boolean(result.options?.length) && !latest.current.city.trim();
        if (offering) setOptions(result.options!);

        // Fill what is empty. Our own previous answer already went above, so
        // anything still in the field was typed by someone who meant it, and a
        // postal database does not get to overrule them.
        //
        // Where the code covers several localities the first one is filled in
        // rather than left blank, and the field becomes a picker holding the
        // rest. A blank box on a required part of a printed address is worse
        // than a visible default sitting next to its own alternatives.
        const ours = (current: string) => !current.trim();
        const cityAnswer = result.city || (offering ? result.options![0] : undefined);
        const filledCity = Boolean(cityAnswer) && ours(latest.current.city);
        const filledState = Boolean(result.state) && ours(latest.current.state);
        if (filledCity) setCity(cityAnswer);
        if (filledState) setState(result.state);
        if (filledCity || filledState) {
          filled.current = {
            city: filledCity ? cityAnswer! : "",
            state: filledState ? result.state! : "",
          };
          setAutofilled({ city: filledCity, state: filledState });
        }
      } catch {
        // Aborted, offline, or upstream down — all no-ops by design.
      } finally {
        if (!controller.signal.aborted) setLookingUp(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pincodeValue, countryValue, setCity, setState]);

  return (
    <>
      <FieldRow>
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-line1`}>Building / flat</FieldLabel>
          <Input
            id={`${idPrefix}-line1`}
            size={size}
            autoComplete={NO_PROFILE_AUTOFILL}
            {...line1.field}
            value={String(line1.field.value ?? "")}
          />
          <FieldError errors={[line1.fieldState.error]} />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-line2`}>Street / area</FieldLabel>
          <Input
            id={`${idPrefix}-line2`}
            size={size}
            autoComplete={NO_PROFILE_AUTOFILL}
            {...line2.field}
            value={String(line2.field.value ?? "")}
          />
          <FieldError errors={[line2.fieldState.error]} />
        </Field>
      </FieldRow>

      {/*
        Four short values on one line. A pincode, a state and a city are each a
        few characters wide, and giving them half a row apiece bought nothing
        but scroll.

        Country first, because it decides what the three after it mean.
        "Pincode" is India's word for a postal code and the lookup behind it is
        India Post; both are a branch off this field, not a default the country
        is appended to. Asking for the country last reads as an afterthought on
        a record that is meant to hold clients outside India.

        Unless `hideCountry` says the form asks for it earlier still, which is
        the same argument carried one step further up the page.
      */}
      <FieldRow columns={hideCountry ? 3 : 4}>
        {hideCountry ? null : (
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-country`}>Country</FieldLabel>
            <Combobox
              id={`${idPrefix}-country`}
              size={size}
              groups={COUNTRY_GROUPS}
              value={countryValue}
              onValueChange={country.field.onChange}
              placeholder="Select…"
            />
            <FieldError errors={[country.fieldState.error]} />
          </Field>
        )}

        <Field>
          {/* The lock is also announced through the live region below — a
              tooltip is not read out, and this is news when it happens. */}
          <FieldInfo
            htmlFor={`${idPrefix}-pincode`}
            label={words.postcode}
            info={locked ? LOCK_HINT : undefined}
            infoLabel="Why are city and state locked?"
          />
          <div className="relative">
            <Input
              id={`${idPrefix}-pincode`}
              size={size}
              placeholder={words.placeholder}
              inputMode={words.inputMode}
              autoComplete={NO_PROFILE_AUTOFILL}
              aria-describedby={`${idPrefix}-pincode-hint`}
              className={busy ? "pr-8" : undefined}
              {...pincode.field}
              value={pincodeValue}
              // A Controller field, so it cannot use `numericField`. Same
              // sanitise-on-change rule, applied by hand, and only where the
              // format is actually digits.
              // Sanitised on the way in, as everywhere else. `formatPostcode`
              // only rewrites a *finished* code, so the space appears on the
              // last keystroke rather than mid-word under the cursor.
              onChange={(event) =>
                pincode.field.onChange(
                  words.digitsOnly
                    ? event.target.value.replace(/\D/g, "")
                    : formatPostcode(event.target.value, countryValue),
                )
              }
            />
            <FieldSpinner show={busy} />
          </div>
          <span
            id={`${idPrefix}-pincode-hint`}
            className="sr-only"
            role="status"
          >
            {options.length
              ? `This postcode covers ${options.length} localities. The first is filled in; choose another if it is wrong.`
              : locked
                ? LOCK_HINT
                : lookingUp
                  ? "Looking up city and state…"
                  : ""}
          </span>
          <FieldError errors={[pincode.fieldState.error]} />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-city`}>{words.city}</FieldLabel>
          {/*
            A code covering several localities gets a picker rather than a box,
            because the answer is one of a known few and typing it is a chance
            to spell a suburb wrong. The first is already filled in by the
            lookup, so the address is complete before anyone touches this; the
            dropdown is how they disagree with it.

            It reverts to a plain input the moment the postcode changes, since
            `options` is cleared at the top of every lookup.
          */}
          {options.length ? (
            <Combobox
              id={`${idPrefix}-city`}
              size={size}
              className={autofilled.city ? "animate-fill-flash" : undefined}
              options={options.map((option) => ({
                value: option,
                label: option,
              }))}
              value={String(city.field.value ?? "")}
              onValueChange={(value) => {
                setCity(value);
                latest.current = { ...latest.current, city: value };
                filled.current = { ...filled.current, city: value };
              }}
            />
          ) : (
          <Input
            id={`${idPrefix}-city`}
            size={size}
            autoComplete={NO_PROFILE_AUTOFILL}
            // Locked, but not greyed: a muted value reads as placeholder text,
            // and this one is real data the record will be saved with. The
            // lock is said in the tooltip and the live region instead.
            //
            // The flash is the visible half of the same news. A value that
            // appears in a box nobody is looking at is a value nobody checks,
            // and this one came from a third party that can be wrong. It needs
            // no state of its own: the effect clears `autofilled` before every
            // lookup, so the class is genuinely removed and re-added on each
            // answer, which is what makes a *corrected* pincode flash again.
            className={autofilled.city ? "animate-fill-flash" : undefined}
            readOnly={autofilled.city}
            aria-readonly={autofilled.city || undefined}
            {...city.field}
            value={String(city.field.value ?? "")}
          />
          )}
          {/*
            Says which of the two states the field is in, so a filled-in suburb
            is never mistaken for the only one the code names. The count is the
            data that produced it rather than reassurance about it.
          */}
          {options.length ? (
            <p className="mt-1 text-xs text-muted-foreground">
              This postcode covers {options.length} localities. The first is
              filled in; choose another if it is wrong.
            </p>
          ) : null}
          <FieldError errors={[city.fieldState.error]} />
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-state`}>{words.state}</FieldLabel>
          <Input
            id={`${idPrefix}-state`}
            size={size}
            autoComplete={NO_PROFILE_AUTOFILL}
            className={autofilled.state ? "animate-fill-flash" : undefined}
            readOnly={autofilled.state}
            aria-readonly={autofilled.state || undefined}
            {...state.field}
            value={String(state.field.value ?? "")}
          />
          <FieldError errors={[state.fieldState.error]} />
        </Field>
      </FieldRow>
    </>
  );
}
