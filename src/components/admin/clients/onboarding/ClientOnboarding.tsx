"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import FlowShell, {
  FinishPanel,
  useActionsSlot,
} from "@/components/flow/FlowShell";
import type { ContractService } from "@/lib/domain/service";
import { clientKindOf, type ClientKind } from "@/lib/domain/entityType";
import type { ClientRecord } from "@/lib/domain/types";
import { COUNTRY_SEED } from "@/lib/domain/countries";
import { onboardingSteps, stepIndex } from "./steps";
import { StepActionsSlot, STEP_FORM_ID } from "./stepKit";
import KindChooser from "./KindChooser";
import CountryChooser from "./CountryChooser";
import IdentityStep from "./IdentityStep";
import TaxStep from "./TaxStep";
import ContactsStep from "./ContactsStep";
import CommercialStep from "./CommercialStep";
import ServicesStep from "./ServicesStep";
import AttachmentsStep from "./AttachmentsStep";
import AccessStep from "./AccessStep";

/**
 * How long the finish moment holds before the list replaces the page. Long
 * enough for seven staggered ticks (`STAGGER_MS` in `FlowShell`, which owns the
 * row that does the ticking) plus a read of the line under them, short enough
 * that nobody waits on it.
 */
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

  /**
   * Where the client is based, chosen on the screen after the kind and before
   * step 1. Same rule as the kind, for the same reason: it rides in the URL
   * only until there is a row, and from then on `addressParts.country` is the
   * answer and nothing else may hold a second copy of it.
   *
   * Validated against the list rather than trusted, because it is a URL
   * parameter that seeds a form field. An unknown code reads as unanswered and
   * shows the chooser, which is the right failure: the country field on step 1
   * is still there and still editable either way.
   */
  const countryParam = (searchParams.get("country") ?? "").toUpperCase();
  const country = client
    ? null
    : COUNTRY_SEED.some((c) => c.iso2 === countryParam)
      ? countryParam
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
  const [actions, setActions] = useActionsSlot();
  /**
   * "Save and close" was the button pressed, so `onSaved` leaves instead of
   * advancing.
   *
   * A ref rather than state: it is set during the click that submits the form
   * and read in the callback that same submit produces, and a state update
   * would not have landed by then. Nothing renders from it.
   */
  const closing = useRef(false);

  const goTo = useCallback(
    (index: number, id = client?.id) => {
      const key = steps[index]?.key;
      if (!key) return;
      setForward(index >= active);
      const base = id ? `/client/clients/${id}` : "/client/clients/new";
      // The kind rides along only while there is no record to derive it from.
      // Once the row exists its entity type is the answer, and a second copy in
      // the URL is a second thing that can be wrong.
      const carry = id
        ? ""
        : `${kind ? `&kind=${kind}` : ""}${country ? `&country=${country}` : ""}`;
      router.replace(`${base}?step=${key}${carry}`, { scroll: false });
    },
    [active, client?.id, country, kind, router, steps],
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
      // "Save and close" pressed. The step has just written its section, so
      // leaving now loses nothing, which is the whole claim the button makes.
      if (closing.current) {
        router.push(`/client/clients`);
        return;
      }
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

  /**
   * Where the back arrow goes, which is not always a step.
   *
   * On step 1 of a client that has not been saved yet, back is the country
   * chooser, and from there the kind chooser. Both were previously
   * unreachable the moment they had been answered once, so an Indian sole
   * proprietor entered as "a company" could not be corrected: proprietorship is
   * a natural-person form and never appears in the company dropdown, and every
   * move in this flow is a `router.replace`, so the browser's back button
   * leaves the wizard rather than stepping through it. An unrecoverable wrong
   * click is worse than the mistake the chooser exists to prevent.
   *
   * Nothing is unwound by going back, because nothing has been written: the
   * kind and the country live only in the URL until step 1 saves. After that
   * the record answers both, and the way to change them is the entity type and
   * the country field on the identity step.
   */
  const back = useMemo(() => {
    if (active > 0) {
      const previous = steps[active - 1];
      return { label: `Back to ${previous.title}`, go: () => goTo(active - 1) };
    }
    if (client || !country) return undefined;
    return {
      label: "Back to the country",
      go: () =>
        router.replace(`/client/clients/new?step=${steps[0].key}&kind=${kind}`, {
          scroll: false,
        }),
    };
  }, [active, client, country, goTo, kind, router, steps]);

  const stepProps = useMemo(
    () => ({
      client,
      onSaved,
      onRecordChanged: setClient,
      submitLabel,
      // `?? 'company'` never fires here: a null kind renders the chooser
      // instead of a step. It is the type narrowing, not a default.
      kind: kind ?? ("company" as ClientKind),
      // Only ever set before the first save; after that the record holds it.
      country: country ?? undefined,
    }),
    [client, country, kind, onSaved, submitLabel],
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

  /**
   * The kind is answered and the country is not: ask it before step 1, for the
   * reason `CountryChooser` gives. Same shape of early return as the chooser
   * above, and for the same reason.
   */
  if (!client && !country) {
    return (
      <div className="flex h-full min-h-0 flex-col p-1">
        <h1 className="sr-only">Add a client</h1>
        <CountryChooser
          onContinue={(chosen) =>
            router.replace(
              `/client/clients/new?step=${steps[0].key}&kind=${kind}&country=${chosen}`,
              { scroll: false },
            )
          }
          // Dropping the kind from the URL is what shows the chooser again;
          // there is no state to unwind, because there is no state.
          onBack={() =>
            router.replace(`/client/clients/new?step=${steps[0].key}`, { scroll: false })
          }
        />
      </div>
    );
  }

  return (
    <FlowShell
      steps={steps}
      active={active}
      record={client}
      title={initialClient ? initialClient.name : "Add a client"}
      finishing={finishing}
      finishPanel={
        <FinishPanel
          heading={client?.name ? `${client.name} is set up` : "Client is set up"}
        >
          Invoices, contracts and their place of supply now come from this
          record.
        </FinishPanel>
      }
      back={back}
      onSelect={(index) => goTo(index)}
      onActionsSlot={setActions}
      slideFrom={forward ? "right" : "left"}
      rightAction={
        /*
          The flow saves a section at a time and always did. Nothing said so,
          so the only visible way out was the browser's back button, which
          looks like abandoning the form — and a wizard people are afraid to
          leave is a wizard they finish in one sitting or not at all.

          A real submit, not a link: it writes this step first, so the claim in
          the label is true even for what was typed in the last thirty seconds.

          Any *other* submit clears the flag, so a failed save-and-close does
          not quietly turn the next ordinary save into an exit. The wrapper is
          `display:contents` and still sees the click: events bubble through
          the tree whatever the box model does with it.
        */
        <span
          className="contents"
          onClickCapture={() => {
            closing.current = false;
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="absolute right-0 text-muted-foreground"
            onClick={() => {
              closing.current = true;
              document.forms.namedItem(STEP_FORM_ID)?.requestSubmit();
            }}
          >
            Save and close
          </Button>
        </span>
      }
    >
      <StepActionsSlot.Provider value={actions}>
        {step.key === "identity" ? <IdentityStep {...stepProps} /> : null}
        {step.key === "tax" ? <TaxStep {...stepProps} /> : null}
        {step.key === "contacts" ? <ContactsStep {...stepProps} /> : null}
        {step.key === "commercial" ? <CommercialStep {...stepProps} /> : null}
        {step.key === "services" ? (
          <ServicesStep {...stepProps} services={services} />
        ) : null}
        {step.key === "attachments" ? <AttachmentsStep {...stepProps} /> : null}
        {step.key === "access" ? <AccessStep {...stepProps} /> : null}
      </StepActionsSlot.Provider>
    </FlowShell>
  );
}

