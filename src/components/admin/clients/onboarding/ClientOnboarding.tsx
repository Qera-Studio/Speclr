"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContractService } from "@/lib/domain/contract/service";
import { clientKindOf, type ClientKind } from "@/lib/domain/entityType";
import { attachmentSlotsFor } from "@/lib/domain/client";
import type { ClientRecord } from "@/lib/domain/types";
import { onboardingSteps, stepIndex, type OnboardingStep } from "./steps";
import { StepActionsSlot } from "./stepKit";
import KindChooser from "./KindChooser";
import IdentityStep from "./IdentityStep";
import TaxStep from "./TaxStep";
import ContactsStep from "./ContactsStep";
import CommercialStep from "./CommercialStep";
import ServicesStep from "./ServicesStep";
import AttachmentsStep from "./AttachmentsStep";
import AccessStep from "./AccessStep";

/**
 * How long the finish moment holds before the list replaces the page. Long
 * enough for seven staggered ticks (`STAGGER_MS` apiece) plus a read of the
 * line under them, short enough that nobody waits on it.
 */
const STAGGER_MS = 80;
const FINISH_MS = 1400;

/**
 * The client onboarding flow — seven steps against one record.
 *
 * **One form per step, not one spanning all seven.** Each step owns its own
 * schema and its own save, so the first step creates a real row and every step
 * after it is an ordinary update. That is what makes an interrupted onboarding
 * survivable without a draft column, a localStorage cache or a "resume" concept:
 * whatever was saved is simply on the client already.
 *
 * The active step lives in the URL. Onboarding a client is a task people get
 * pulled away from, and a wizard whose back button leaves the flow entirely is
 * a wizard people lose work in.
 *
 * Create mode walks forward; edit mode unlocks every step, because coming back
 * to fix one field should not mean clicking through six.
 */
export default function ClientOnboarding({
  client: initialClient,
  services,
}: {
  client?: ClientRecord | null;
  services: ContractService[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [client, setClient] = useState<ClientRecord | null>(
    initialClient ?? null,
  );

  /**
   * Which of the two flows this is.
   *
   * Derived from the saved entity type once there is a record, so an existing
   * client never sees the chooser and can never disagree with itself. Before
   * the record exists there is nothing to derive from, so the choice rides in
   * the URL — the same place the active step lives, and for the same reason:
   * a refresh or a hop to the other profile must come back to where it was.
   *
   * `null` means "not chosen yet", which is the only state that shows the
   * chooser. Nothing is ever stored (`PRINCIPLES.md` rule 3).
   */
  const kindParam = searchParams.get("kind");
  const kind: ClientKind | null = client
    ? clientKindOf(client.entityType)
    : kindParam === "individual" || kindParam === "company"
      ? kindParam
      : null;

  const steps = useMemo(() => onboardingSteps(kind ?? "company"), [kind]);
  const active = stepIndex(steps, searchParams.get("step"));
  const step = steps[active];

  /**
   * Which way the last move went, so the step slides in from the side it came
   * from. Derived from the click rather than from comparing indexes across
   * renders: the URL is the state, and by the time the new step renders the old
   * index is gone.
   */
  const [forward, setForward] = useState(true);
  /**
   * The last step saved and we are about to leave. Held for a beat so the row
   * can finish ticking. See the panel below for why the wait earns its keep.
   */
  const [finishing, setFinishing] = useState(false);
  /**
   * The footer node the step's submit button is portalled into. State rather
   * than a ref, because a ref set during commit does not re-render, and the
   * step below needs to hear about the node in order to render into it.
   */
  const [actions, setActions] = useState<HTMLElement | null>(null);

  const goTo = useCallback(
    (index: number, id = client?.id) => {
      const key = steps[index]?.key;
      if (!key) return;
      setForward(index >= active);
      const base = id ? `/client/clients/${id}` : "/client/clients/new";
      // The kind rides along only while there is no record to derive it from.
      // Once the row exists its entity type is the answer, and a second copy in
      // the URL is a second thing that can be wrong.
      const carry = !id && kind ? `&kind=${kind}` : "";
      router.replace(`${base}?step=${key}${carry}`, { scroll: false });
    },
    [active, client?.id, kind, router, steps],
  );

  /**
   * A step saved. The updated record is threaded back through state rather than
   * re-fetched: `router.refresh()` would re-render the server component and
   * throw away the step the operator is standing on.
   */
  const onSaved = useCallback(
    (saved: ClientRecord) => {
      const created = !client;
      setClient(saved);
      if (created || active < steps.length - 1) {
        goTo(created ? 1 : active + 1, saved.id);
        return;
      }
      // The last step. Onboarding a client is seven forms and a good ten
      // minutes, and it currently ends by silently swapping the page for a
      // list — the one moment in the flow where something was actually
      // finished, spent. Hold it for a beat, tick the row through, then go.
      setFinishing(true);
      setTimeout(() => router.push("/client/clients"), FINISH_MS);
    },
    [active, client, goTo, router, steps.length],
  );

  /**
   * What the submit button says: where it goes, not what it does. Every step,
   * including the first — "Create client" named the mechanism, and the arrow
   * beside it was already promising a destination the word didn't give. Only
   * the last step has nowhere to go, so only it says what it does.
   */
  const submitLabel = useMemo(() => {
    const next = steps[active + 1];
    return next ? next.short : "Finish";
  }, [active, steps]);

  const previous = active > 0 ? steps[active - 1] : undefined;

  /**
   * Attachments takes the band's full height instead of being as tall as its
   * content, so its list of extra documents scrolls rather than the step.
   * Named here rather than on the step definition because it is a fact about
   * this layout, not about what the step collects.
   *
   * Only while there *is* such a list. A client with two slots and nothing else
   * attached is a row of cards with no growing part under it, and filling the
   * band then pins that row to the top of an otherwise empty screen. Without
   * `fill` the band's own `my-auto` centres it, like every other short step.
   */
  const attachmentSlots = attachmentSlotsFor({
    country: client?.addressParts?.country,
    clientKind: kind ?? "company",
  });
  const fill =
    step.key === "attachments" &&
    (attachmentSlots.length >= 3 ||
      (client?.attachments ?? []).some((a) => !attachmentSlots.includes(a.kind)));

  const stepProps = useMemo(
    () => ({
      client,
      onSaved,
      onRecordChanged: setClient,
      submitLabel,
      // `?? 'company'` never fires here: a null kind renders the chooser
      // instead of a step. It is the type narrowing, not a default.
      kind: kind ?? ("company" as ClientKind),
    }),
    [client, kind, onSaved, submitLabel],
  );

  /**
   * Nothing chosen and nothing saved: ask which kind of client this is before
   * showing a form that would otherwise ask a freelancer for their CIN.
   *
   * Its own early return rather than a branch inside the layout below, because
   * it has no step row, no back button and no submit — the three things that
   * layout exists to pin.
   */
  if (!kind) {
    return (
      <div className="flex h-full min-h-0 flex-col p-1">
        <h1 className="sr-only">Add a client</h1>
        <KindChooser
          onChoose={(chosen) =>
            router.replace(`/client/clients/new?step=${steps[0].key}&kind=${chosen}`, {
              scroll: false,
            })
          }
        />
      </div>
    );
  }

  return (
    /*
      Three bands over the card's full height, and which band a thing is in is
      the whole layout rule: **what belongs to the wizard is pinned, what
      belongs to the step moves.** The row and the button are the same on all
      seven steps and the button is pressed seven times in a row, so neither
      may travel with the fields that slide in and out between them.

      Only the middle band scrolls. `h-full` resolves against the inset's
      scroll area in `AdminShell`, which is therefore never the thing that
      scrolls here.
    */
    <div className="flex h-full min-h-0 flex-col gap-5">
      {/*
        The step row is the whole progress indicator now. The bar, the
        "Step 3 of 7" label and the "2/7 complete" counter all said the same
        thing the row was already showing, three more times — and the page
        heading repeated the step heading directly below it. The h1 stays for
        assistive tech, which does need a page name.

        Full card width, outside the form's column: it is a track across the
        page, and squeezing it into the width of the fields made a progress
        indicator that showed less the further the page was widened.
      */}
      <header className="shrink-0">
        <h1 className="sr-only">
          {initialClient ? initialClient.name : "Add a client"}
        </h1>
        <StepNav
          steps={steps}
          active={active}
          client={client}
          finishing={finishing}
          onSelect={(index) => goTo(index)}
        />
      </header>

      {/*
        No step heading: the row above already names the step, and repeating it
        as an h2 with a description under it said the same thing twice and cost
        the fold. `aria-label` keeps the section named for assistive tech, which
        does still need to know what it is standing in.

        `m-auto` on the inner column is what gives both behaviours from one
        rule: a short step sits in the middle of the card instead of hugging the
        top, and a tall one scrolls from the top once it outgrows the band.

        That needs the band to be a flex *container*, not merely a flex item.
        `flex-1` makes it the latter, and auto margins in block layout resolve
        to zero vertically — which is why the column centred sideways and still
        hugged the top. `flex flex-col` is the whole fix. Auto margins rather
        than `justify-center` deliberately: a centred flex line pushes overflow
        past the scroll container's top edge, out of reach; auto margins
        collapse instead, so a tall step still scrolls from its first field.
      */}
      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
        aria-label={step.title}
      >
        {/* `shrink-0`, or a step taller than the band gets squashed to fit
            rather than scrolling.

            A filling step is the exception and wants the opposite: it takes the
            band's height so that one region inside it can scroll instead of the
            band. See `StepForm`'s `fill`. */}
        <div
          className={cn(
            "w-full max-w-3xl",
            // `mx-auto` either way. Only the *vertical* auto margin is the
            // short-step centring; dropping both put the column against the
            // left edge of the card.
            "mx-auto",
            fill ? "flex min-h-0 flex-1 flex-col" : "my-auto shrink-0",
          )}
        >
          {finishing ? (
            <FinishPanel name={client?.name} />
          ) : (
            /*
          `key` remounts the step on every move. react-hook-form reads
          `defaultValues` on mount only, so without this, stepping from one
          step to another and back would show the previous step's values.

          The remount is also what replays the slide, for free. It comes in
          from the side it is travelling from, so going back looks like going
          back rather than like another new page.
        */
            <div
              key={step.key}
              className={cn(
                "animate-in fade-in duration-300",
                forward ? "slide-in-from-right-6" : "slide-in-from-left-6",
                fill && "flex min-h-0 flex-1 flex-col",
              )}
            >
              <StepActionsSlot.Provider value={actions}>
                {step.key === "identity" ? (
                  <IdentityStep {...stepProps} />
                ) : null}
                {step.key === "tax" ? <TaxStep {...stepProps} /> : null}
                {step.key === "contacts" ? (
                  <ContactsStep {...stepProps} />
                ) : null}
                {step.key === "commercial" ? (
                  <CommercialStep {...stepProps} />
                ) : null}
                {step.key === "services" ? (
                  <ServicesStep {...stepProps} services={services} />
                ) : null}
                {step.key === "attachments" ? (
                  <AttachmentsStep {...stepProps} />
                ) : null}
                {step.key === "access" ? <AccessStep {...stepProps} /> : null}
              </StepActionsSlot.Provider>
            </div>
          )}
        </div>
      </section>

      {/*
        The pinned footer. The submit button is portalled in here by `StepForm`
        (see `StepActionsSlot`), so it keeps the step's own `submitting` and
        label while sitting outside the subtree that slides.

        Back is absolute so the button stays centred on the column rather than
        on whatever space is left beside it. The two ending up in the same band
        is fine where the original objection was not: they are at opposite ends
        of the card, not adjacent.
      */}
      <div className="relative flex shrink-0 items-center justify-center pt-2">
        {previous && !finishing ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute left-0"
            aria-label={`Back to ${previous.title}`}
            onClick={() => goTo(active - 1)}
          >
            <ArrowLeft aria-hidden />
          </Button>
        ) : null}
        <div ref={setActions} className="contents" />
      </div>
    </div>
  );
}

/**
 * The last screen of onboarding, shown for `FINISH_MS` while the row ticks
 * through and then replaced by the clients list.
 *
 * It exists because the flow had no ending. Seven forms, and the seventh save
 * swapped the page for a table with no acknowledgement that anything had been
 * completed — the only genuinely rewarding moment in the task, and it was the
 * one moment given nothing.
 *
 * It says what was achieved rather than congratulating anybody: this record is
 * now what every document for this client derives from, which is the actual
 * payoff and the reason the seven steps were worth filling in. `role="status"`
 * because a screen reader gets no ticking row.
 */
function FinishPanel({ name }: { name?: string }) {
  return (
    <div
      role="status"
      className="animate-in fade-in zoom-in-95 flex flex-col items-center gap-3 py-16 text-center duration-500"
    >
      <span className="animate-in zoom-in-50 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground duration-500">
        <Check className="size-6" aria-hidden />
      </span>
      <p className="text-base font-medium">
        {name ? `${name} is set up` : "Client is set up"}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Invoices, contracts and their place of supply now come from this record.
      </p>
    </div>
  );
}

/**
 * The step row.
 *
 * One horizontal line above the form rather than a column beside it: seven
 * steps stacked down the left took a quarter of the page to say something the
 * progress bar was already saying, and pushed the form into a narrow gutter.
 * Across the top it costs one line and the form gets the width.
 *
 * Real buttons in a real list, so it is keyboard-reachable and announced as
 * what it is. A step that needs a saved record is `disabled` before there is
 * one — the honest state, rather than a link that fails on arrival. The row
 * scrolls rather than wrapping on a narrow window, so a step is never on a
 * second line pretending to be the first.
 *
 * Three states, carried by the square alone rather than by a filled pill: ahead
 * is muted, current is `primary` tinted to a tenth, done is `primary` solid
 * with a tick in place of the number. Colour is never the only signal —
 * `aria-current="step"` marks the current one and a visually-hidden
 * "(complete)" marks the finished ones.
 *
 * This row is also the only place the step is named. There is no heading below
 * it repeating the label and a description under that.
 */
function StepNav({
  steps,
  active,
  client,
  finishing,
  onSelect,
}: {
  /** Six or seven, depending on the kind. See `onboardingSteps`. */
  steps: readonly OnboardingStep[];
  active: number;
  client: ClientRecord | null;
  /** Every step reads as done, ticking left to right. See `FinishPanel`. */
  finishing: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    // Edge to edge across the card. `justify-between` spreads the seven, so the
    // first and last mark the ends of the track and the spacing itself carries
    // how far along the flow is.
    //
    // Each step stays `shrink-0` and the list keeps `overflow-x-auto`, so a
    // narrow window scrolls rather than crushing the labels — and the scroll
    // container is the list itself, never a centred box that would put the
    // first step out of reach past its left edge.
    <nav aria-label="Onboarding steps" className="w-full min-w-0">
      <ol className="scrollbar-none -mx-1 flex items-center justify-between gap-3 overflow-x-auto px-1">
        {steps.map((step, index) => {
          const complete =
            finishing || (client ? step.isComplete(client) : false);
          const locked = step.needsRecord && !client;
          const current = !finishing && index === active;
          const delay = `${index * STAGGER_MS}ms`;
          return (
            <li key={step.key} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(index)}
                disabled={locked || finishing}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  current && "font-medium text-primary/80",
                  !current && complete && "text-foreground",
                  !current && !complete && "text-muted-foreground",
                  !current && !locked && !finishing && "hover:text-foreground",
                  locked && "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  // Staggered only while finishing, so the row reads left to
                  // right once instead of every square landing at once. During
                  // ordinary stepping there is no delay and the single tick
                  // that just turned pops on its own.
                  style={finishing ? { transitionDelay: delay } : undefined}
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-sm text-[11px] tabular-nums transition-colors",
                    complete && "bg-primary text-primary-foreground",
                    // Current is the accent held back rather than the accent
                    // dropped: same blue as done, at a tenth of the fill. The
                    // two states stay distinguishable — one is solid with a
                    // tick, the other a tinted block with its number.
                    !complete &&
                      current &&
                      "bg-primary/10 font-medium text-primary/80",
                    !complete && !current && "bg-muted text-muted-foreground",
                  )}
                >
                  {complete ? (
                    // Mounted fresh the moment the step turns complete, which
                    // is what makes the pop play exactly once, on the square
                    // that earned it, with no state tracking which.
                    <Check
                      className="animate-in zoom-in-50 fill-mode-backwards size-3.5 duration-300"
                      style={finishing ? { animationDelay: delay } : undefined}
                      aria-hidden
                    />
                  ) : (
                    index + 1
                  )}
                </span>
                {step.short}
                {complete ? <span className="sr-only">(complete)</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
