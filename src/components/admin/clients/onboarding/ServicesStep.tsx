"use client";

import "@/lib/zod-config";
import { useCallback, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { FieldRow } from "@/components/ui/field-row";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import FieldInfo, { LegendInfo } from "@/components/form/FieldInfo";
import { numericField } from "@/components/form/inputFilters";
import {
  clientCommercialSchema,
  type ClientCommercial,
} from "@/lib/domain/client";
import {
  normalizeRupeeInput,
  paiseToRupees,
  rupeesToPaise,
} from "@/lib/domain/money";
import type { ContractService } from "@/lib/domain/service";
import { SCHEDULES, type ScheduleKey } from "@/lib/domain/contract/schedules";
import { cn } from "@/lib/utils";
import { draftKey, useFormDraft } from "@/lib/draft";
import {
  StepForm,
  asOptionalNumber,
  pruneEmpty,
  useStepSave,
  type StepProps,
} from "./stepKit";

type FormValues = Pick<
  ClientCommercial,
  "startDate" | "termMonths" | "autoRenew" | "noticeDays"
>;

/**
 * Services & term — what was engaged, at what rate, for how long.
 *
 * The agreed rate is deliberately per-client and optional. A service's
 * catalogue rate is what it is normally sold at; what a particular client
 * agreed may differ, and the honest place for that is on the relationship
 * rather than on the service. A blank rate means "the catalogue one", not zero
 * — which is why an untouched service stores no rate at all.
 *
 * Rates are held as **integer paise**, converted at the edge, like every other
 * amount in this system. A float here would drift against the same figure on an
 * invoice, and the two disagreeing is precisely the failure the client record
 * exists to prevent.
 *
 * Writes the `commercial` column, as the previous step does, so it merges onto
 * whatever that step saved rather than replacing it.
 */
export default function ServicesStep({
  client,
  onSaved,
  submitLabel,
  services,
}: StepProps & { services: ContractService[] }) {
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const service of client?.commercial?.services ?? []) {
      initial[service.code] =
        service.ratePaise === undefined ? "" : paiseToRupees(service.ratePaise);
    }
    return initial;
  });
  const [rateError, setRateError] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // Errors land when a field is left, not only at submit. Seven steps of
    // silence followed by one page of red is a worse trade than being told
    // where you are as you go.
    //
    // `onTouched` rather than `onBlur`: first blur, then every keystroke. Under
    // `onBlur` the displayed state lagged the value by a whole blur, so a field
    // already visited kept its tick while wrong and kept its error while being
    // corrected. See the longer note in `TaxStep`.
    mode: "onTouched",
    resolver: zodResolver(
      clientCommercialSchema.pick({
        startDate: true,
        termMonths: true,
        autoRenew: true,
        noticeDays: true,
      }),
    ),
    defaultValues: {
      startDate: client?.commercial?.startDate ?? "",
      termMonths: client?.commercial?.termMonths,
      autoRenew: client?.commercial?.autoRenew ?? false,
      noticeDays: client?.commercial?.noticeDays,
    },
  });

  const [tab, setTab] = useState<ScheduleKey>(SCHEDULES[0].key);

  // Library order, not the order they were ticked: the list below the cards is
  // read back against the catalogue, and a list that reshuffles itself as
  // things are added is one nobody can check.
  const added = services.filter((service) => service.code in selected);

  const toggle = (code: string) =>
    setSelected((current) => {
      if (code in current) {
        const { [code]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [code]: "" };
    });

  // Carry the previous step's half forward by naming it, rather than spreading
  // the whole saved section: a field *this* step cleared arrives as `''`,
  // `pruneEmpty` drops it, and the old value underneath would survive the
  // clearing. Same reasoning as `CommercialStep`.
  const toPayload = useCallback(
    (values: FormValues) => ({
      ...pruneEmpty({ ...client?.commercial, ...values }),
      services: Object.entries(selected).map(([code, rupees]) => {
        const trimmed = rupees.trim();
        return trimmed === ""
          ? { code }
          : { code, ratePaise: rupeesToPaise(trimmed) ?? 0 };
      }),
    }),
    [client?.commercial, selected],
  );

  // Restores what was typed but not saved, so a refresh or a hop to the other
  // profile comes back to the same half-filled form. Cleared on save.
  useFormDraft(draftKey(client?.id, "services"), watch, reset);

  const { serverError, save } = useStepSave<FormValues>(
    client,
    "commercial",
    onSaved,
    toPayload,
    "services",
  );

  const onSubmit = handleSubmit(async (values) => {
    // A rate that will not parse must stop the save rather than round to zero:
    // "no agreed rate" and "agreed at nothing" are different facts.
    const bad = Object.entries(selected).find(
      ([, rupees]) =>
        rupees.trim() !== "" && rupeesToPaise(rupees.trim()) === null,
    );
    if (bad) {
      setRateError(`The agreed rate for service ${bad[0]} is not an amount.`);
      return;
    }
    setRateError(null);
    await save(values);
  });

  return (
    <StepForm
      onSubmit={onSubmit}
      serverError={serverError ?? rateError}
      submitting={isSubmitting}
      submitLabel={submitLabel}
      allOptional
    >
      {/*
        `min-w-0` because a `<fieldset>` carries `min-inline-size: min-content`
        from the UA stylesheet, which nothing else can shrink. Without it the
        scrolling row below widened the whole step past its 768px, taking the
        tabs and the summary list with it.
      */}
      <FieldSet className="min-w-0">
        <LegendInfo
          info="Tick what this client has engaged. Leave a rate blank to bill the catalogue rate — a rate here records what this client agreed instead, which may differ."
          label="About services and agreed rates"
        >
          Services engaged
        </LegendInfo>

        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No services in the library yet — add them at{" "}
            <a href="/client/services" className="underline">
              Services
            </a>
            .
          </p>
        ) : (
          <>
            {/*
              One Schedule at a time, chosen by tab. Which Schedule a service
              belongs to decides how the work is paid for, approved and owned,
              so it is the grouping that matters — but four groups stacked is
              four scrolls of a step that already has seven.
            */}
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as ScheduleKey)}
            >
              <TabsList className="w-full">
                <TabsIndicator />
                {SCHEDULES.map((schedule) => (
                  <TabsTrigger
                    key={schedule.key}
                    value={schedule.key}
                    className="text-xs"
                  >
                    {schedule.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/*
              Two layers on purpose. The square is the service, the same card
              the library shows, sitting on a tray that carries what this
              client agreed for it. The rate belongs to the relationship, not
              to the service, and the tray is that difference made visible.

              The lift is done with tone rather than a shadow: the tray takes
              the darker sidebar grey and the card the plain card surface on
              top of it.

              One row, scrolled rather than wrapped, and snapped so it moves a
              card at a time instead of landing mid-card. Every card is the
              same width, so a long name wraps inside its own square rather
              than setting the size of the row.

              Typing a rate adds the service: nobody types a price for
              something they have not engaged, and making them press the button
              afterwards is a way to lose the number they just typed.
            */}
            {/*
              `items-start` so a tray is only as tall as its own card. Stretched
              to the row's full height they grew into the padding the scrollbar
              sits in, and the bar cut across their bottom edge.
            */}
            <ul className="flex w-full min-w-0 snap-x snap-mandatory items-start gap-2 overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:thin]">
              {services
                .filter((service) => service.scheduleKey === tab)
                .map((service) => {
                  const isOn = service.code in selected;
                  return (
                    <li key={service.code} className="shrink-0 snap-start">
                      <div
                        className={cn(
                          // A tone off the foreground rather than a surface token:
                          // `background` and `card` are both white in light mode, so
                          // a tray painted with either disappears behind its own card.
                          "flex w-44 flex-col gap-1 rounded-xl bg-foreground/15 p-1 transition-colors",
                          isOn && "bg-foreground/15",
                        )}
                      >
                        {/*
                          The square is the button, all of it. The corner mark
                          is a `span`: a real button nested inside a button is
                          invalid markup and a second focus stop for the one
                          action, so it fills in on hover of the *card*, which
                          is what is actually clickable. Same reasoning as the
                          contract page's catalogue.

                          One label, pressed or not, so the button says the same
                          thing whichever state it is in — and so the remove
                          control in the list below is the only
                          "Remove {name}" on the page.
                        */}
                        <button
                          type="button"
                          aria-pressed={isOn}
                          aria-label={`Add ${service.name}`}
                          onClick={() => toggle(service.code)}
                          className="group/service flex aspect-square w-full flex-col justify-between rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/60 focus-visible:border-primary focus-visible:outline-none"
                        >
                          <span className="flex items-start justify-between gap-1">
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {service.code}
                            </span>
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors group-hover/service:border-primary group-hover/service:bg-primary group-hover/service:text-primary-foreground group-focus-visible/service:border-primary group-focus-visible/service:bg-primary group-focus-visible/service:text-primary-foreground group-aria-pressed/service:border-primary group-aria-pressed/service:bg-primary group-aria-pressed/service:text-primary-foreground">
                              {isOn ? (
                                <Check className="size-3" />
                              ) : (
                                // A quarter turn on hover, so the mark answers
                                // the pointer before the click does.
                                <Plus className="size-3 transition-transform group-hover/service:rotate-90" />
                              )}
                            </span>
                          </span>
                          <span className="line-clamp-3 text-sm font-medium">
                            {service.name}
                          </span>
                        </button>

                        <div className="relative">
                          <span
                            aria-hidden
                            className="pointer-events-none absolute inset-y-0 left-1.5 flex items-center text-xs text-muted-foreground"
                          >
                            ₹
                          </span>
                          <Input
                            aria-label={`Agreed rate for ${service.name}`}
                            inputMode="decimal"
                            placeholder="Rate"
                            className="h-7 w-full border-transparent bg-transparent pl-4.5 text-xs shadow-none group-data-[size=form]/field-group:h-7 group-data-[size=form]/field-group:pr-1.5 group-data-[size=form]/field-group:pl-4.5 group-data-[size=form]/field-group:text-xs group-data-[size=form]/field-group:md:text-xs"
                            value={selected[service.code] ?? ""}
                            onChange={(event) =>
                              setSelected((current) => ({
                                ...current,
                                [service.code]: normalizeRupeeInput(
                                  event.target.value,
                                ),
                              }))
                            }
                          />
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>

            {/*
              Everything added, from every Schedule — the tabs hide three
              quarters of the library, and a step that shows only what is on
              screen would let a service ticked under Setup be forgotten while
              Build is open.
            */}
            {added.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing added yet.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {added.map((service) => (
                  <li
                    key={service.code}
                    className="flex items-center gap-3 px-3 py-1.5 text-sm"
                  >
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {service.code}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {service.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {selected[service.code].trim() === ""
                        ? "Catalogue rate"
                        : `₹${selected[service.code]}`}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${service.name}`}
                      onClick={() => toggle(service.code)}
                      className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </FieldSet>

      <FieldSeparator />

      <FieldSet>
        {/* <FieldLegend variant="label">Contract term</FieldLegend> */}

        {/* All four in one row: a term is one fact stated four ways, and a
            row apiece made it read as four unrelated questions. */}
        <FieldRow columns={3}>
          <Field>
            <FieldLabel htmlFor="client-start-date">
              Engagement starts
            </FieldLabel>
            {/*
              `DatePicker`, not the browser's native date input, which ignores
              the theme entirely — the reason the primitive exists, and what
              `design-system.test.ts` now keeps out.
            */}
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <DatePicker
                  id="client-start-date"
                  size="form"
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  placeholder="Pick a start date"
                />
              )}
            />
            <FieldError errors={[errors.startDate]} />
          </Field>

          <Field>
            <FieldInfo
              htmlFor="client-term-months"
              label="Length (months)"
              info="How long the engagement runs from the start date. Blank means open-ended."
              infoLabel="What is the term length?"
            />
            <Input
              id="client-term-months"
              size="form"
              placeholder="12"
              {...numericField(register("termMonths", asOptionalNumber))}
            />
            <FieldError errors={[errors.termMonths]} />
          </Field>

          <Field>
            <FieldInfo
              htmlFor="client-notice-days"
              label="Notice period (days)"
              info="How much notice either side gives to end the engagement. The contract's Schedule carries the binding version; this records what was agreed so the two can be checked against each other."
              infoLabel="What is the notice period for?"
            />
            <Input
              id="client-notice-days"
              size="form"
              placeholder="30"
              {...numericField(register("noticeDays", asOptionalNumber))}
            />
            <FieldError errors={[errors.noticeDays]} />
          </Field>
        </FieldRow>

        {/* Its own row, horizontal and only as wide as it needs: a switch in a
            column of text boxes stretched to the column's width, which reads
            as a fourth field to fill in rather than a yes or no. */}
        <Field orientation="horizontal" className="w-fit">
          <FieldLabel htmlFor="client-auto-renew">
            Renews automatically
          </FieldLabel>
          <Controller
            control={control}
            name="autoRenew"
            render={({ field }) => (
              <Switch
                id="client-auto-renew"
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Field>
      </FieldSet>
    </StepForm>
  );
}
