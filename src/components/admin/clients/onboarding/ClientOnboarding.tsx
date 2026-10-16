"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import FlowShell, {
  FinishPanel,
  useActionsSlot,
} from "@/components/flow/FlowShell";
import type { ContractService } from "@/lib/domain/service";
import type { StudioMember } from "@/lib/profile";
import { clientKindOf, type ClientKind } from "@/lib/domain/entityType";
import type { ClientRecord } from "@/lib/domain/types";
import { COUNTRY_SEED } from "@/lib/domain/countries";
import {
  composeAddress,
  emptyAddressParts,
  isEmptyAddressParts,
} from "@/lib/domain/address";
import { setClientCountry } from "@/server/actions/clients";
import { toast } from "sonner";
import { onboardingSteps, stepIndex } from "./steps";
import { StepActionsSlot, STEP_FORM_ID } from "./stepKit";
import CountryChooser from "./CountryChooser";
import ClientAxes from "./ClientAxes";
import IdentityStep from "./IdentityStep";
import TaxStep from "./TaxStep";
import ContactsStep from "./ContactsStep";
import TeamStep from "./TeamStep";
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
  people,
}: {
  client?: ClientRecord | null;
  services: ContractService[];
  /**
   * Everyone in the studio, for the Lead & team step.
   *
   * Already narrowed to `StudioMember` by `lib/profile.ts` before it reaches
   * this component, which is the point of that type: an `EmployeeRecord` is a
   * payroll record, and nothing on the client side should be holding one.
   */
  people: StudioMember[];
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
   *
   * **On a saved record the URL may still carry one, as a pending change.**
   * The row above the step tracker offers the other kind there too, and the
   * kind is derived from the entity type, so "make this a company" can only
   * mean "go and pick a company form". The row sends the operator to the
   * identity step with `?kind=` set, this reads it ahead of the derivation,
   * and the identity step narrows its list to that kind. It is transient by
   * construction: `goTo` never carries the parameter once there is an id, so
   * the next move, including the save that makes the record agree, drops
   * it. The record stays the only place the answer is kept.
   */
  const kindParam = searchParams.get("kind");
  const urlKind: ClientKind | null =
    kindParam === "individual" || kindParam === "company" ? kindParam : null;
  const kind: ClientKind | null = client
    ? (urlKind ?? clientKindOf(client.entityType))
    : urlKind;

  /**
   * Where the client is based, chosen on the screen after the kind and before
   * step 1. Same rule as the kind, for the same reason: it rides in the URL
   * only until there is a row, and from then on `addressParts.country` is the
   * answer and nothing else may hold a second copy of it.
   *
   * Validated against the list rather than trusted, because it is a URL
   * parameter that seeds a form field. An unknown code reads as unanswered and
   * shows the chooser, which is the right failure.
   */
  const countryParam = (searchParams.get("country") ?? "").toUpperCase();
  const country = client
    ? null
    : COUNTRY_SEED.some((c) => c.iso2 === countryParam)
      ? countryParam
      : null;
  /**
   * What the row above the step tracker shows and edits: the record's country
   * once there is a record, the URL's before. A row with no parts is an
   * address typed before they existed, and `composeAddress` reads a blank
   * country as India, so the row says the same.
   */
  const shownCountry = client
    ? client.addressParts?.country || emptyAddressParts.country
    : country;

  const steps = useMemo(() => onboardingSteps(kind ?? "company"), [kind]);
  const active = stepIndex(steps, searchParams.get("step"));
  const step = steps[active];

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
   * The row above the step tracker changed the kind.
   *
   * Always to the identity step, because that is where the entity type lives
   * and the kind is nothing but a reading of it. Before the first save the
   * URL is the answer and is simply rewritten, as the chooser does; after it
   * the parameter is the pending intent described on `kind` above, and the
   * id is what stops `goTo` carrying it any further than this one move.
   */
  const changeKind = (next: ClientKind) => {
    if (next === kind) return;
    const first = onboardingSteps(next)[0].key;
    if (client) {
      router.replace(`/client/clients/${client.id}?step=${first}&kind=${next}`, {
        scroll: false,
      });
      return;
    }
    router.replace(
      `/client/clients/new?step=${first}&kind=${next}${country ? `&country=${country}` : ""}`,
      { scroll: false },
    );
  };

  /**
   * The row above the step tracker changed the country.
   *
   * Before the first save it rides in the URL and this rewrites it in place,
   * on whatever step is open. After it the record is the answer, so this is
   * a save: `setClientCountry` writes `addressParts.country` and recomposes
   * `address` on the server, and the same two are merged here so the step
   * on screen re-derives from the new country without a round trip. The
   * merge follows the server's rule for the printed line (a row with no
   * parts keeps its hand-typed address), so the two cannot disagree.
   */
  const changeCountry = async (iso2: string) => {
    if (iso2 === shownCountry) return;
    if (!client) {
      router.replace(
        `/client/clients/new?step=${step.key}${kind ? `&kind=${kind}` : ""}&country=${iso2}`,
        { scroll: false },
      );
      return;
    }
    const result = await setClientCountry(client.id, iso2);
    if (!result.success) {
      toast.error(result.error ?? "The country could not be changed.");
      return;
    }
    const addressParts = { ...emptyAddressParts, ...client.addressParts, country: iso2 };
    setClient({
      ...client,
      addressParts,
      address: isEmptyAddressParts(addressParts) ? client.address : composeAddress(addressParts),
      updatedAt: Date.now(),
    });
  };

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
   * On step 1 of a client that has not been saved yet, back is the chooser.
   * It was previously unreachable the moment it had been answered once, so an
   * Indian sole proprietor entered as "a company" could not be corrected:
   * proprietorship is a natural-person form and never appears in the company
   * dropdown, and every move in this flow is a `router.replace`, so the
   * browser's back button leaves the wizard rather than stepping through it.
   * An unrecoverable wrong click is worse than the mistake the chooser exists
   * to prevent.
   *
   * Nothing is unwound by going back, because nothing has been written: the
   * kind and the country live only in the URL until step 1 saves. After that
   * the record answers both, and the way to change them is the row above the
   * step tracker, on any step.
   *
   * Dropping *both* parameters is what shows the chooser again, now that it
   * asks both. Dropping only one would return to a page with half an answer
   * already filled in and no way to see which half.
   */
  const back = useMemo(() => {
    if (active > 0) {
      const previous = steps[active - 1];
      return { label: `Back to ${previous.title}`, go: () => goTo(active - 1) };
    }
    if (client || !country) return undefined;
    return {
      label: "Back to the type and country",
      go: () =>
        router.replace(`/client/clients/new?step=${steps[0].key}`, {
          scroll: false,
        }),
    };
  }, [active, client, country, goTo, router, steps]);

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
   * Nothing saved, and the kind or the country unanswered: ask both before
   * showing a form that would otherwise ask a freelancer for their CIN and
   * offer an Indian client a US corporation.
   *
   * One screen for the two, on request. Its own early return rather than a
   * branch inside the layout below, because it has no step row, no back button
   * and no submit: the three things that layout exists to pin.
   */
  if (!client && (!kind || !country)) {
    return (
      <div className="flex h-full min-h-0 flex-col p-1">
        <h1 className="sr-only">Add a client</h1>
        <CountryChooser
          onContinue={(chosenKind, chosenCountry) =>
            router.replace(
              `/client/clients/new?step=${steps[0].key}&kind=${chosenKind}&country=${chosenCountry}`,
              { scroll: false },
            )
          }
          // Out of the flow. There is no earlier screen to go back to now that
          // the two questions share one, and nothing to unwind either way:
          // neither answer has been written anywhere.
          onBack={() => router.push('/client/clients')}
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
      lead={
        <ClientAxes
          // Neither `?? ` fires here: a null kind or country with no record
          // renders the chooser above instead, and a record always derives
          // both. They are the type narrowing, not defaults.
          kind={kind ?? ("company" as ClientKind)}
          country={shownCountry ?? emptyAddressParts.country}
          onKindChange={changeKind}
          onCountryChange={changeCountry}
        />
      }
      onSelect={(index) => goTo(index)}
      onActionsSlot={setActions}
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
            size="md"
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
        {step.key === "team" ? <TeamStep {...stepProps} people={people} /> : null}
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

