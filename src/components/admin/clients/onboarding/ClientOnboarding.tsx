"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContractService } from "@/lib/domain/contract/service";
import type { ClientRecord } from "@/lib/domain/types";
import { ONBOARDING_STEPS, stepIndex } from "./steps";
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

  const active = stepIndex(searchParams.get("step"));
  const step = ONBOARDING_STEPS[active];

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

  const goTo = useCallback(
    (index: number, id = client?.id) => {
      const key = ONBOARDING_STEPS[index]?.key;
      if (!key) return;
      setForward(index >= active);
      const base = id ? `/client/clients/${id}` : "/client/clients/new";
      router.replace(`${base}?step=${key}`, { scroll: false });
    },
    [active, client?.id, router],
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
      if (created || active < ONBOARDING_STEPS.length - 1) {
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
    [active, client, goTo, router],
  );

  /**
   * What the submit button says: where it goes, not what it does. Every step,
   * including the first — "Create client" named the mechanism, and the arrow
   * beside it was already promising a destination the word didn't give. Only
   * the last step has nowhere to go, so only it says what it does.
   */
  const submitLabel = useMemo(() => {
    const next = ONBOARDING_STEPS[active + 1];
    return next ? next.short : "Finish";
  }, [active]);

  const previous = active > 0 ? ONBOARDING_STEPS[active - 1] : undefined;

  const stepProps = useMemo(
    () => ({ client, onSaved, submitLabel }),
    [client, onSaved, submitLabel],
  );

  return (
    // One centred column: the step row, the step heading and the fields all
    // share the form's width, so nothing hangs off the left of the page.
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {/*
        The step row is the whole progress indicator now. The bar, the
        "Step 3 of 7" label and the "2/7 complete" counter all said the same
        thing the row was already showing, three more times — and the page
        heading repeated the step heading directly below it. The h1 stays for
        assistive tech, which does need a page name.
      */}
      <header className="relative flex flex-col items-center gap-2">
        <h1 className="sr-only">
          {initialClient ? initialClient.name : "Add a client"}
        </h1>
        <StepNav
          active={active}
          client={client}
          finishing={finishing}
          onSelect={(index) => goTo(index)}
        />
        {/* Back is an arrow up here rather than a word below the form: it is a
            return, not an alternative to submitting, and putting the two side
            by side at the bottom invited clicking the wrong one. Absolute, so
            it costs the page no height and leaves the row centred on the
            column rather than on whatever is left over beside it. */}
        {previous && !finishing ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-0 right-0"
            aria-label={`Back to ${previous.title}`}
            onClick={() => goTo(active - 1)}
          >
            <ArrowLeft aria-hidden />
          </Button>
        ) : null}
      </header>

      {/*
        No step heading: the row above already names the step, and repeating it
        as an h2 with a description under it said the same thing twice and cost
        the fold. `aria-label` keeps the section named for assistive tech, which
        does still need to know what it is standing in.
      */}
      <section className="min-w-0" aria-label={step.title}>
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
          )}
        >
          {step.key === "identity" ? <IdentityStep {...stepProps} /> : null}
          {step.key === "tax" ? <TaxStep {...stepProps} /> : null}
          {step.key === "contacts" ? <ContactsStep {...stepProps} /> : null}
          {step.key === "commercial" ? <CommercialStep {...stepProps} /> : null}
          {step.key === "services" ? (
            <ServicesStep {...stepProps} services={services} />
          ) : null}
          {step.key === "attachments" ? (
            <AttachmentsStep {...stepProps} />
          ) : null}
          {step.key === "access" ? <AccessStep {...stepProps} /> : null}
        </div>
        )}
      </section>
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
  active,
  client,
  finishing,
  onSelect,
}: {
  active: number;
  client: ClientRecord | null;
  /** Every step reads as done, ticking left to right. See `FinishPanel`. */
  finishing: boolean;
  onSelect: (index: number) => void;
}) {
  return (
    // The list is the flex item, not the nav: it sizes to its content and
    // centres while the steps fit, then fills the width and scrolls when they
    // don't. Centring the scroll container itself would put the first step out
    // of reach past its left edge.
    <nav
      aria-label="Onboarding steps"
      className="flex w-full min-w-0 justify-center pb-10"
    >
      <ol className="scrollbar-none -mx-1 flex max-w-full items-center gap-3 overflow-x-auto px-1">
        {ONBOARDING_STEPS.map((step, index) => {
          const complete = finishing || (client ? step.isComplete(client) : false);
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
