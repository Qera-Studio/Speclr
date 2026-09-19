import { render, screen, waitFor, within } from '@testing-library/react';
import { selectComboboxOption } from '@/test-utils/combobox';
import userEvent from '@testing-library/user-event';
import ContractFlow from '../ContractFlow';
import { CLIENT_INPUTS, EXCLUSIONS } from '@/lib/domain/contract/seed/libraries';
import { PARTS } from '@/lib/domain/seed/parts';
import type { ClientRecord, ContractDocument } from '@/lib/domain/types';

/**
 * The contract builder, phase by phase.
 *
 * These are `ContractEditor.test.tsx`'s behaviours re-homed: the editor was
 * three stages in local state inside a 384px rail, and this is five phases with
 * the phase in the URL. Test names are kept wherever the behaviour is the same,
 * so the diff reads as a move rather than a rewrite.
 *
 * Three behaviours genuinely changed, and each has its own test saying so:
 * the service form no longer refuses to save an incomplete Part (the guarantee
 * moved to the phase), services seed from the client record, and a phase is a
 * URL rather than a `useState`.
 */

const push = jest.fn();
const replace = jest.fn();
const createDraft = jest.fn();
const updateDraft = jest.fn();
let searchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  usePathname: () => '/client',
  useRouter: () => ({
    push: (u: string) => push(u),
    replace: (...args: unknown[]) => replace(...args),
    refresh: jest.fn(),
  }),
  useSearchParams: () => searchParams,
}));
jest.mock('@/server/actions/documents', () => ({
  createDraft: (...a: unknown[]) => createDraft(...a),
  updateDraft: (...a: unknown[]) => updateDraft(...a),
  finalizeDocument: jest.fn(),
  deleteDraftAction: jest.fn(),
}));
jest.mock('@/server/actions/clients', () => ({
  addClientService: jest.fn().mockResolvedValue({ success: true, id: 'c1' }),
}));

const clients = [
  {
    id: 'c1',
    name: 'Acme Co.',
    companyName: 'Acme Private Limited',
    address: 'x',
    email: 'a@b.com',
    phone: '9',
    gstin: '',
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'c2',
    name: 'Borden Ltd.',
    companyName: 'Borden Private Limited',
    address: 'y',
    email: 'b@b.com',
    phone: '8',
    gstin: '',
    createdAt: 0,
    updatedAt: 0,
  },
] as ClientRecord[];

/** A client whose record already carries an engaged service, for the seed. */
const engagedClient = {
  ...clients[0],
  id: 'c3',
  name: 'Engaged Co.',
  commercial: { services: [{ code: '05' }], termMonths: 12 },
} as ClientRecord;

function renderFlow(
  props: Partial<React.ComponentProps<typeof ContractFlow>> = {},
  phase = 'client',
) {
  searchParams = new URLSearchParams(phase ? `phase=${phase}` : '');
  return render(
    <ContractFlow
      clients={[...clients, engagedClient]}
      services={PARTS}
      exclusions={EXCLUSIONS}
      clientInputs={CLIENT_INPUTS}
      title="New contract"
      {...props}
    />,
  );
}

type User = ReturnType<typeof userEvent.setup>;

/** A draft that is already saved, which is what unlocks phases 2 to 5. */
const savedDoc = (contract: Record<string, unknown> = {}): ContractDocument =>
  ({
    id: 'con-1',
    type: 'CON',
    status: 'draft',
    clientId: 'c1',
    clientSnapshot: { name: 'Acme Co.', address: 'x', email: '', phone: '' },
    issueDate: '2026-06-10',
    lineItems: [],
    gstRatePercent: 0,
    contract: { parts: [], blanks: {}, library: {}, ...contract },
    createdAt: 0,
    updatedAt: 0,
  }) as ContractDocument;

/**
 * A button in the phase row, scoped to the nav.
 *
 * Unscoped, `/Services/` also matches the heading on the phase itself, which
 * is a collision between the chrome and the content rather than anything being
 * wrong.
 */
const phaseButton = (name: RegExp) =>
  within(screen.getByRole('navigation', { name: 'Steps' })).getByRole('button', { name });

/**
 * The forward button in the pinned footer, which is what a phase's gate
 * actually controls.
 *
 * The row above is navigation and stays clickable once the draft exists, the
 * same way onboarding lets you jump back to a finished step. What a gate
 * decides is whether the flow will carry you *on*.
 */
const advanceButton = () =>
  within(screen.getByRole('navigation', { name: 'Steps' }).parentElement!.parentElement!)
    .getAllByRole('button')
    .find((b) => /^(Services|Scope|Terms|Preview)$/.test(b.textContent ?? ''))!;

const autosaved = () =>
  waitFor(
    () => expect(createDraft.mock.calls.length + updateDraft.mock.calls.length).toBeGreaterThan(0),
    { timeout: 3000 },
  );

/**
 * The payload of the most recent write, whichever action made it.
 *
 * Ordered by Jest's own invocation counter, not by mock: the first write is a
 * create and every one after it an update, and which of them a given edit lands
 * in depends on how long the clicks before it took.
 */
const lastWritePayload = () =>
  [
    ...createDraft.mock.calls.map((call, i) => ({
      order: createDraft.mock.invocationCallOrder[i],
      payload: call[2],
    })),
    ...updateDraft.mock.calls.map((call, i) => ({
      order: updateDraft.mock.invocationCallOrder[i],
      payload: call[2],
    })),
  ]
    .sort((a, b) => a.order - b.order)
    .at(-1)?.payload;

beforeEach(() => {
  jest.clearAllMocks();
  createDraft.mockResolvedValue({ success: true, id: 'new-con' });
  updateDraft.mockResolvedValue({ success: true });
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: jest.fn(() => 'blob:x'),
  });
});

describe('the phase row', () => {
  it('opens on the client phase and names all five', () => {
    renderFlow();

    for (const short of ['Client', 'Services', 'Scope', 'Terms', 'Preview']) {
      expect(phaseButton(new RegExp(short))).toBeInTheDocument();
    }
    expect(phaseButton(/Client/)).toHaveAttribute(
      'aria-current',
      'step',
    );
  });

  /**
   * Every phase after the first needs the draft to exist, exactly as onboarding
   * locks every step until identity creates the client row.
   */
  it('locks every phase until the draft exists', () => {
    renderFlow();

    for (const short of ['Services', 'Scope', 'Terms', 'Preview']) {
      expect(phaseButton(new RegExp(short))).toBeDisabled();
    }
  });

  /**
   * Opening a saved contract resumes where it was left, not at the beginning.
   *
   * The documents list links to a draft with no `?phase=` at all, and
   * `stepIndex` answers 0 for an absent key, so every half-built contract used
   * to open on *Client* — the one phase that was answered before the draft
   * existed. Onboarding already resumes this way for clients; this is the same
   * helper on the contract's own phases.
   *
   * The three cases are the three shapes the answer takes: a gap in the middle,
   * no gap at all, and nothing filled.
   */
  describe('resuming a saved contract', () => {
    it('opens on the first phase with something still to do', () => {
      // Client and Services are answered; Scope is not, because a seeded Part
      // has not been acknowledged.
      renderFlow(
        { doc: savedDoc({ parts: [PARTS.find((s) => s.code === '05')!] }) },
        '',
      );

      expect(phaseButton(/Scope/)).toHaveAttribute('aria-current', 'step');
    });

    /**
     * A contract with no gaps opens on its last phase, which is where it is
     * read and issued. `resumeStep` falls back to the final step rather than to
     * nothing, and for this flow that is exactly right: Preview is never
     * "complete" (`phases.ts`), so it is the natural resting place.
     *
     * Asserted by what the preview *is* rather than by the phase row, because
     * that phase deliberately has no row: it runs the shell with its chrome off,
     * so `phaseButton` has no navigation to search. The finalize actions are the
     * thing only this phase renders.
     */
    it('opens on the preview when every phase is answered', () => {
      renderFlow(
        {
          doc: savedDoc({
            parts: [PARTS.find((s) => s.code === '05')!],
            blanks: filledBlanksFor('05'),
            reviewed: ['05'],
          }),
        },
        '',
      );

      expect(screen.getByRole('button', { name: 'Finalize' })).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Steps' })).not.toBeInTheDocument();
    });

    /** A new contract has no draft to read, so it starts at the start. */
    it('starts a new contract on the client phase', () => {
      renderFlow({}, '');

      expect(phaseButton(/Client/)).toHaveAttribute('aria-current', 'step');
    });

    /**
     * An explicit phase in the URL wins over the resume.
     *
     * It is an answer, whether typed, bookmarked or arrived at with the back
     * button, and overriding it would make the phase row's own links unusable
     * on a contract whose earlier phases are full: every click would bounce
     * back to the first gap.
     */
    it('honours an explicit phase over the resume', () => {
      renderFlow(
        { doc: savedDoc({ parts: [PARTS.find((s) => s.code === '05')!] }) },
        'client',
      );

      expect(phaseButton(/Client/)).toHaveAttribute('aria-current', 'step');
    });
  });

  it('unlocks them once there is a document', () => {
    renderFlow({ doc: savedDoc() });

    expect(phaseButton(/Services/)).toBeEnabled();
  });

  /**
   * The row is off on the preview, on request (18 September 2026).
   *
   * That phase is a document rather than a step of a form, and a progress track
   * across the top of one is a band of wizard framing something that is not a
   * wizard. The phases before it keep the row: they *are* forms, and the row
   * is how you jump between them.
   */
  it('shows no phase row on the preview', () => {
    renderFlow({ doc: savedDoc() }, 'preview');

    expect(screen.queryByRole('navigation', { name: 'Steps' })).not.toBeInTheDocument();
  });

  it('keeps the row on every phase that is a form', () => {
    renderFlow({ doc: savedDoc() }, 'terms');

    expect(screen.getByRole('navigation', { name: 'Steps' })).toBeInTheDocument();
  });

  /** The phase is a URL, so a refresh comes back to it. */
  it('opens on the phase named in the URL', () => {
    renderFlow({ doc: savedDoc() }, 'terms');

    expect(phaseButton(/Terms/)).toHaveAttribute('aria-current', 'step');
  });

  it('writes the next phase to the URL rather than to state', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: savedDoc() }, 'services');

    await u.click(phaseButton(/Terms/));

    expect(replace).toHaveBeenCalledWith('/client/docs/con-1?phase=terms', {
      scroll: false,
    });
  });
});

describe('phase 1, the client', () => {
  it('asks for the client, the dates and the term', () => {
    renderFlow();

    expect(screen.getByLabelText(/^client$/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Agreement date')).toBeInTheDocument();
    expect(document.getElementById('con-effective-date')).toBeInTheDocument();
    expect(document.getElementById('con-term-months')).toBeInTheDocument();
  });

  it('cannot move on until a client is chosen', () => {
    renderFlow();

    expect(advanceButton()).toBeDisabled();
  });

  /** `createDraft` refuses without a client, so that is the first savable moment. */
  it('starts a draft as soon as a client is chosen', async () => {
    const u = userEvent.setup();
    renderFlow();

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await autosaved();

    expect(createDraft).toHaveBeenCalledTimes(1);
    expect(createDraft).toHaveBeenCalledWith('CON', 'c1', expect.anything());
  });

  /**
   * The id of the draft just created is read from a ref, not from state closed
   * over when the write was queued — otherwise a second change arriving before
   * the first render lands would create a second contract.
   */
  it('does not start a second draft when it is edited again', async () => {
    const u = userEvent.setup();
    renderFlow();

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await autosaved();

    await u.type(document.getElementById('con-term-months')!, '6');
    await waitFor(() => expect(updateDraft).toHaveBeenCalled(), { timeout: 3000 });

    expect(createDraft).toHaveBeenCalledTimes(1);
  });

  /**
   * Autosave compares the payload by value, so re-picking the client already on
   * the contract is not an edit.
   */
  it('writes nothing when a change leaves the contract identical', async () => {
    const u = userEvent.setup();
    renderFlow();

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await autosaved();

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await new Promise((r) => setTimeout(r, 1500));

    expect(updateDraft).not.toHaveBeenCalled();
  });

  it('takes digits only in the term', async () => {
    const u = userEvent.setup();
    renderFlow();

    await u.type(document.getElementById('con-term-months')!, '1a2');

    expect(document.getElementById('con-term-months')).toHaveValue('12');
  });
});

describe('phase 2, the services', () => {
  /**
   * The rule this whole flow exists for: onboarding already recorded what the
   * client engaged, so the contract starts from it rather than from a blank
   * catalogue (`PRINCIPLES.md` rule 3).
   */
  it('seeds the services from the client record', async () => {
    const u = userEvent.setup();
    renderFlow();

    await selectComboboxOption(u, /^client$/i, 'Engaged Co.');
    await autosaved();

    await waitFor(() =>
      expect(lastWritePayload()).toMatchObject({
        contract: { parts: [expect.objectContaining({ code: '05' })] },
      }),
    );
  });

  it('brings the term across with them', async () => {
    const u = userEvent.setup();
    renderFlow();

    await selectComboboxOption(u, /^client$/i, 'Engaged Co.');
    await autosaved();

    await waitFor(() =>
      expect(lastWritePayload()).toMatchObject({ contract: { termMonths: 12 } }),
    );
  });

  /**
   * The `DocumentEditor` guard: a contract that is already written is somebody's
   * work, and changing the client on it must not throw that away.
   */
  it('seeds nothing over a contract that has already been written', async () => {
    const u = userEvent.setup();
    const doc = savedDoc({ parts: [PARTS.find((s) => s.code === '01')!] });
    renderFlow({ doc });

    await selectComboboxOption(u, /^client$/i, 'Engaged Co.');
    await new Promise((r) => setTimeout(r, 1500));

    const payload = lastWritePayload() as { contract: { parts: { code: string }[] } };
    expect(payload.contract.parts.map((p) => p.code)).toEqual(['01']);
  });

  /** The ledger of what was chosen is the Scope phase's, since the split. */
  it('lists what the contract covers', () => {
    renderFlow({ doc: savedDoc({ parts: [PARTS.find((s) => s.code === '05')!] }) }, 'scope');

    expect(screen.getAllByText(/Shopify storefront/).length).toBeGreaterThan(0);
  });

  it('removes a service from the list', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: savedDoc({ parts: [PARTS.find((s) => s.code === '05')!] }) }, 'scope');

    await u.click(screen.getByRole('button', { name: /^Remove / }));

    // Nothing left to scope, so it names the phase that fixes that rather than
    // restating that the list is empty.
    expect(screen.getByText(/Pick them on the Services step/)).toBeInTheDocument();
  });

  /** And the four tiles are what stands on Services either way. */
  it('offers the four Schedules whether or not the contract has services', () => {
    renderFlow({ doc: savedDoc({ parts: [PARTS.find((s) => s.code === '05')!] }) }, 'services');

    for (const schedule of ['Setup', 'Build', 'Retainer', 'Audit']) {
      expect(screen.getByRole('button', { name: new RegExp(schedule) })).toBeInTheDocument();
    }
  });

  /**
   * The empty state's two clicks: a Schedule, then a service.
   *
   * The tiles used to jump into the full catalogue, so choosing a Schedule
   * cost a change of surface to answer a question the phase could answer in
   * place. The rows are title-only because at this point the only decision is
   * which of these to put on the contract.
   */
  it('lists a Schedule’s services under its tile, and adds one', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: savedDoc() }, 'services');

    // Closed to begin with: the tiles are the only thing on offer.
    const setup = screen.getByRole('button', { name: /Setup/ });
    expect(setup).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('button', { name: /^Add Domain and DNS/ }),
    ).not.toBeInTheDocument();

    await u.click(setup);
    expect(setup).toHaveAttribute('aria-expanded', 'true');

    const row = screen.getByRole('button', { name: /^Add Domain and DNS/ });
    await u.click(row);

    // Adding opens the service's own sheet, which is `onAddService`'s existing
    // behaviour and the same for a service picked from the full catalogue:
    // what it covers is the next question, so the flow asks it rather than
    // leaving a Part on the list for somebody to come back to.
    expect(await screen.findByRole('dialog', { name: 'Domain and DNS' })).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: 'Cancel' }));

    // And the browse stays open. Picking used to end it: the Part landed, the
    // list vanished and the reader was returned to the ledger, so adding three
    // services meant finding the way back in three times.
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Setup/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Add Analytics and tracking/ })).toBeInTheDocument();
  });

  /**
   * A picked row says so where it stands, rather than by the screen changing
   * underneath it: the blue fill and the tick are what let a reader survey
   * which of a Schedule's services are already on the contract.
   *
   * The name changes with it, because colour is never the only signal.
   */
  it('marks a service that is already on the contract', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: savedDoc() }, 'services');

    await u.click(screen.getByRole('button', { name: /Setup/ }));
    await u.click(screen.getByRole('button', { name: /^Add Domain and DNS/ }));
    await u.click(screen.getByRole('button', { name: 'Cancel' }));

    const picked = await screen.findByRole('button', {
      name: /^On this contract\. Remove Domain and DNS/,
    });
    expect(picked.className).toMatch(/bg-primary/);
    // Its neighbours are untouched and still offer to be added.
    expect(
      screen.getByRole('button', { name: /^Add Analytics and tracking/ }),
    ).toBeInTheDocument();
  });

  /**
   * There is no second route to the catalogue on this phase, and this test is
   * here because the button that was one had to be removed three times.
   *
   * The four tiles are the way in. A standing "Add a service" control above
   * them was defended twice on the grounds that it alone searched across
   * Schedules; that is not worth a permanent control on a screen whose whole
   * job is the four tiles, and the decision is the user's rather than mine.
   * Asserted in all three states, because the last version of it was hidden
   * during a browse and looked gone.
   */
  it('offers no catalogue button beside the Schedules', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: savedDoc() }, 'services');

    expect(screen.queryByRole('button', { name: 'Add a service' })).not.toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /Setup/ }));
    expect(screen.queryByRole('button', { name: 'Add a service' })).not.toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /Setup/ }));
    expect(screen.queryByRole('button', { name: 'Add a service' })).not.toBeInTheDocument();
  });

  /**
   * And the ledger is not on this phase at all, which is the split.
   *
   * The two shared a screen for part of 18 September 2026 and were in each
   * other's way: the tiles moved as rows landed under them, and the rows were
   * a commentary on a list nobody had finished reading.
   */
  it('leaves the scope ledger to its own phase', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: savedDoc() }, 'services');

    await u.click(screen.getByRole('button', { name: /Setup/ }));
    await u.click(screen.getByRole('button', { name: /^Add Domain and DNS/ }));
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // The Part is on the contract (the row says so), and no summarised row,
    // tick or "Nothing to change" has appeared beside the tiles.
    expect(
      screen.getByRole('button', { name: /^On this contract\. Remove Domain and DNS/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Open Domain and DNS/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nothing to change' })).not.toBeInTheDocument();
  });

  /**
   * A service picked by mistake comes off the way it went on.
   *
   * Cancel on the sheet does not undo the add and should not: the Part lands
   * on the click, and Cancel means "leave this scope as it is". So without the
   * toggle a wrong pick had nowhere to go but the ledger, one surface away.
   */
  it('takes a service back off the contract when its row is clicked again', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: savedDoc() }, 'services');

    await u.click(screen.getByRole('button', { name: /Setup/ }));
    await u.click(screen.getByRole('button', { name: /^Add Domain and DNS/ }));
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await u.click(
      await screen.findByRole('button', { name: /^On this contract\. Remove Domain and DNS/ }),
    );

    // Back to an offer, and no sheet opened on the way: removing is not an
    // edit of the scope it removes.
    expect(screen.getByRole('button', { name: /^Add Domain and DNS/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /** A second click closes it, so the tile is never a one-way door. */
  it('closes the list when its own tile is clicked again', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: savedDoc() }, 'services');

    const setup = screen.getByRole('button', { name: /Setup/ });
    await u.click(setup);
    expect(screen.getByRole('button', { name: /^Add Domain and DNS/ })).toBeInTheDocument();

    await u.click(setup);

    expect(setup).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('button', { name: /^Add Domain and DNS/ }),
    ).not.toBeInTheDocument();
  });

  /** One Schedule at a time: opening another replaces the list. */
  it('shows one Schedule’s services at a time', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: savedDoc() }, 'services');

    await u.click(screen.getByRole('button', { name: /Setup/ }));
    expect(screen.getByRole('button', { name: /^Add Domain and DNS/ })).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /Build/ }));

    expect(
      screen.queryByRole('button', { name: /^Add Domain and DNS/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Setup/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  /*
    The three tests that stood here drove `ServiceCatalog` through "Add a
    service": its per-Schedule headings, its search box, and both routes
    standing together on an empty contract. That button and the branch behind
    it are gone, so the surface they covered is gone with them.

    `ServiceCatalog` is still rendered by `/client/services` and is covered
    there (`libraryPages.test.tsx`). What is no longer true, and what these
    tests were really asserting, is that this phase reaches it.
  */

  /** The record is a separate thing from the contract, so telling it is a separate act. */
  it('offers to add a service to the client record as well', async () => {
    renderFlow(
      {
        clients: [engagedClient],
        doc: {
          ...savedDoc({ parts: [PARTS.find((s) => s.code === '01')!] }),
          clientId: 'c3',
        },
      },
      'scope',
    );

    // An icon now, so the name carries its object rather than sitting as four
    // words of chrome on every row.
    const add = screen.getByRole('button', { name: /^Also add .+ to .+'s record$/ });
    expect(add).toBeInTheDocument();

    // And all three chrome icons share one gapless parent. This is the only
    // state that renders the full set: the browser fixture's client already
    // has both its services on record, so the user-plus never appears there
    // and the geometry check could not see this case at all.
    const open = screen.getByRole('button', { name: /^Open / });
    const remove = screen.getByRole('button', { name: /^Remove / });
    expect(add.parentElement).toBe(open.parentElement);
    expect(open.parentElement).toBe(remove.parentElement);
    expect(add.parentElement?.className).not.toMatch(/\bgap-/);
  });

  it('says so instead when the record already has it', () => {
    renderFlow(
      {
        clients: [engagedClient],
        doc: {
          ...savedDoc({ parts: [PARTS.find((s) => s.code === '05')!] }),
          clientId: 'c3',
        },
      },
      'scope',
    );

    expect(screen.getByLabelText(/^Already on .+'s record$/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Also add .+ to .+'s record$/ }),
    ).not.toBeInTheDocument();
  });
});

describe('phase 3, the scope ledger', () => {
  /**
   * Service 17 is deliberate: it is the only seeded Service with a blank
   * outside its fee, and the fee belongs to the next phase. Measured, because
   * it is the difference between a row that says "2 to fill" and one that says
   * "nothing missing" — and 21 of the 22 Services say the latter the moment
   * they are added, which is exactly why the acknowledgement exists.
   */
  const withPart = () => savedDoc({ parts: [PARTS.find((s) => s.code === '17')!] });

  it('lists a row per service with what is left to fill', () => {
    renderFlow({ doc: withPart() }, 'scope');

    expect(screen.getAllByText(/Paid social management/).length).toBeGreaterThan(0);
    expect(screen.getByText(/\d+ to fill/)).toBeInTheDocument();
  });

  it('cannot move on while a service is unfilled', () => {
    renderFlow({ doc: withPart() }, 'scope');

    expect(advanceButton()).toBeDisabled();
  });

  it('opens the service in a drawer rather than a modal dialog', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: withPart() }, 'scope');

    await u.click(screen.getByRole('button', { name: /^Open / }));

    expect(screen.getByRole('dialog')).toHaveAttribute('data-slot', 'sheet-content');
  });

  it('shows the Service on its own, with its figures and its exclusions', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: withPart() }, 'scope');

    await u.click(screen.getByRole('button', { name: /^Open / }));
    const sheet = screen.getByRole('dialog');

    expect(within(sheet).getByRole('heading', { name: /Paid social management/ })).toBeInTheDocument();
    expect(within(sheet).getByText('What is not included')).toBeInTheDocument();
    expect(within(sheet).getByText('What the Client provides')).toBeInTheDocument();
  });

  /**
   * **The fee is on this sheet, and this is the test that says so.**
   *
   * It was filtered out here on the grounds that it belonged to "the phase
   * that decides what things cost", and no phase rendered it: `ScopePhase`
   * passed it to Terms, `summary.ts` excluded it, and `ContractFlow` dropped
   * every `part.` scope from the terms form. So the Terms gate required a
   * figure that could not be typed anywhere in the flow and its button could
   * never enable.
   *
   * The sheet is the right home because it is the one surface both routes
   * reach: picking a service opens it, and a service seeded from the client
   * record or a quotation is opened from the ledger's pencil. A field on the
   * picker alone would miss every seeded service, which is the case that
   * passes through no chooser at all.
   */
  it('puts the fee on the service sheet, where both routes reach it', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: withPart() }, 'scope');

    await u.click(screen.getByRole('button', { name: /^Open / }));
    const sheet = screen.getByRole('dialog');

    // By the blank's own key, which is what the gate counts and what the sheet
    // commits: a label match alone can find a heading and prove nothing.
    const fee = sheet.querySelector<HTMLInputElement>('input[id^="part."][id*=".fee#"]');
    expect(fee).not.toBeNull();
    // Empty on arrival, which is what the gate is waiting for.
    expect(fee!.value.trim()).toBe('');
  });

  /**
   * **The behaviour that changed.** The dialog refused to commit a Part while
   * any figure was empty, which made "complete or not at all" true by
   * construction. Seeded Parts never pass through that button, so the guarantee
   * moved to the phase and the form saves what is in front of it.
   */
  it('saves a Part that is still incomplete, and the phase is what refuses', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: withPart() }, 'scope');

    await u.click(screen.getByRole('button', { name: /^Open / }));
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();

    await u.click(save);

    // Saved, and still counted as unfilled on the row behind it.
    //
    // `waitFor`, because Save commits and *then* closes: the panel leaves on
    // its own exit animation, so asserting on the frame of the click races it.
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/\d+ to fill/)).toBeInTheDocument();
    expect(advanceButton()).toBeDisabled();
  });

  it('says how many fields are still empty while it is open', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: withPart() }, 'scope');

    await u.click(screen.getByRole('button', { name: /^Open / }));

    expect(screen.getByRole('status')).toHaveTextContent(/\d+ fields? still empty/);
  });

  it('adds nothing when the drawer is cancelled', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: withPart() }, 'scope');

    await u.click(screen.getByRole('button', { name: /^Open / }));
    await u.click(screen.getByRole('button', { name: 'Cancel' }));

    // See the Save case above: the panel leaves on its own exit animation.
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  /**
   * The half no derivation can supply: a Part whose blanks are all filled reads
   * as done without anybody having opened it, which is what a seeded Part looks
   * like.
   */
  it('still asks for a confirmation once nothing is missing', () => {
    const doc = savedDoc({ parts: [PARTS.find((s) => s.code === '05')!] });
    renderFlow({ doc }, 'scope');

    expect(screen.getByText('Nothing missing, not yet confirmed')).toBeInTheDocument();
    expect(advanceButton()).toBeDisabled();
  });

  it('lets the phase through once every row is confirmed', async () => {
    const u = userEvent.setup();
    const doc = savedDoc({ parts: [PARTS.find((s) => s.code === '05')!] });
    renderFlow({ doc }, 'scope');

    await u.click(screen.getByRole('button', { name: 'Nothing to change' }));

    // A done row carries no status line at all: the tick is the whole
    // statement, and "Ready" underneath it was the same fact said twice.
    // What must go is the *outstanding* wording, not merely the word "Ready".
    expect(screen.queryByText('Nothing missing, not yet confirmed')).not.toBeInTheDocument();
    expect(screen.queryByText(/to fill$/)).not.toBeInTheDocument();
    expect(screen.queryByText('Ready')).not.toBeInTheDocument();
    // And the button that asked for the acknowledgement has done its job.
    expect(screen.queryByRole('button', { name: 'Nothing to change' })).not.toBeInTheDocument();
    expect(advanceButton()).toBeEnabled();
  });

  /**
   * Offered only where it is the whole remaining job: a button that could tick
   * a row while it is still short would be a way past the guard rather than
   * through it.
   */
  it('does not offer the confirmation while figures are missing', () => {
    renderFlow({ doc: withPart() }, 'scope');

    expect(
      screen.queryByRole('button', { name: 'Nothing to change' }),
    ).not.toBeInTheDocument();
  });

  it('orders Parts canonically, not in the order they were added', () => {
    const doc = savedDoc({
      parts: [PARTS.find((s) => s.code === '05')!, PARTS.find((s) => s.code === '01')!],
    });
    renderFlow({ doc }, 'scope');

    // Added 05 first, 01 second; the ledger prints them in the order the
    // document assembles them, which puts 01 first.
    //
    // By accessible name, not `textContent`: the control is an icon, so the
    // name is what `aria-label` carries and the element has no text at all.
    const names = screen
      .getAllByRole('button', { name: /^Open / })
      .map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['Open Domain and DNS', 'Open Shopify storefront']);
  });
});

describe('phase 4, the terms', () => {
  const doc = () =>
    savedDoc({
      parts: [PARTS.find((s) => s.code === '05')!],
      blanks: filledBlanksFor('05'),
      reviewed: ['05'],
    });

  it('puts the standing figures on the page', () => {
    renderFlow({ doc: doc() }, 'terms');

    expect(screen.getByRole('heading', { name: /Agreement & schedule terms/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Payment period')).toBeInTheDocument();
  });

  it('groups the figures by the document they come from', () => {
    renderFlow({ doc: doc() }, 'terms');

    expect(screen.getByRole('heading', { name: /Schedule/ })).toBeInTheDocument();
  });

  /**
   * The dividers went, and the measurement is the reason: thirteen figures sat
   * in seven sections, two of which spent a heading, a separator and a whole
   * row on a single input. Every label already names its own clause.
   */
  it('lays the figures out in one grid rather than a section each', () => {
    const { container } = renderFlow({ doc: doc() }, 'terms');

    expect(container.querySelectorAll('[data-slot="field-separator"]')).toHaveLength(0);
    expect(screen.getByLabelText('Confidentiality term')).toBeInTheDocument();
    expect(screen.getByLabelText('Force majeure limit')).toBeInTheDocument();
  });

  /**
   * The rate is a `percent` blank, so it sanitises on the way in exactly as a
   * Part's figures do. Not every standing figure is numeric — "Payment period"
   * is `text` and takes "30 days" — so this asserts against one that is.
   */
  it('validates a standing figure the same way a Part figure is validated', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: doc() }, 'terms');

    // Cleared first: the fixture fills every blank, and sanitising appends to
    // whatever is already in the box.
    const field = screen.getByLabelText('Interest rate');
    await u.clear(field);
    await u.type(field, '18abc');

    expect(field).toHaveValue('18%');
  });
});

describe('phase 5, the preview', () => {
  const doc = () =>
    savedDoc({
      parts: [PARTS.find((s) => s.code === '05')!],
      blanks: filledBlanksFor('05'),
      reviewed: ['05'],
    });

  /*
    The editing rail is off, on request (18 September 2026), and these four
    tests are commented out with it rather than deleted.

    They are what the rail was: a table of contents whose cards went back to the
    phase that owns each figure, plus the two things that belong to no phase and
    were edited here — the cover text and the clauses. `PreviewPhase` still
    holds all of it and `ContractFlow` still passes `onGoToPhase`, so turning
    the rail back on is uncommenting the `FieldGroup` there and these four here.

    What it costs while it is off is stated plainly: the masthead, the cover
    intro, the parties preamble and the clause bodies have no editor anywhere in
    the app. Nothing else was lost, because every other card was navigation and
    the phases are reachable from the floating footer's back arrow.
  */
  // it('summarises the contract rather than holding its fields', () => {
  //   renderFlow({ doc: doc() }, 'preview');
  //
  //   // "Services" is also a phase in the row above, so the rail's own cards are
  //   // matched by the things only they say.
  //   expect(screen.getByText('Fees & standing terms')).toBeInTheDocument();
  //   expect(screen.getByText('Clauses')).toBeInTheDocument();
  //   expect(screen.getByText('Cover')).toBeInTheDocument();
  //   expect(screen.getByText(/on this contract/)).toBeInTheDocument();
  // });
  //
  // /** Every card is a way back to the phase that owns it. */
  // it('sends you back to the phase that owns each figure', async () => {
  //   const u = userEvent.setup();
  //   renderFlow({ doc: doc() }, 'preview');
  //
  //   await u.click(screen.getByRole('button', { name: /Fees & standing terms/ }));
  //
  //   expect(replace).toHaveBeenCalledWith('/client/docs/con-1?phase=terms', {
  //     scroll: false,
  //   });
  // });
  //
  // it('unfolds the cover in the rail', async () => {
  //   const u = userEvent.setup();
  //   renderFlow({ doc: doc() }, 'preview');
  //
  //   await u.click(screen.getByRole('button', { name: /Cover/ }));
  //
  //   expect(screen.getByLabelText('Masthead')).toBeInTheDocument();
  // });
  //
  // it('opens the clauses in a dialog', async () => {
  //   const u = userEvent.setup();
  //   renderFlow({ doc: doc() }, 'preview');
  //
  //   await u.click(screen.getByRole('button', { name: /Clauses/ }));
  //
  //   expect(screen.getByRole('dialog')).toBeInTheDocument();
  // });

  /** And with it off, nothing renders the rail's fields. */
  it('holds no editing rail', () => {
    renderFlow({ doc: doc() }, 'preview');

    expect(screen.queryByLabelText('Masthead')).not.toBeInTheDocument();
    expect(screen.queryByText('Fees & standing terms')).not.toBeInTheDocument();
  });

  it('names both document actions, icon and all', () => {
    renderFlow({ doc: doc() }, 'preview');

    expect(screen.getByRole('button', { name: 'Finalize' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete draft' })).toBeInTheDocument();
  });

  /**
   * A refused finalize says why, on the phase that asked for it.
   *
   * **This was silent for as long as the phase has had no rail.**
   * `finalizeDocument` answers a refusal in a sentence — an unfilled blank, a
   * place of supply that disagrees with the client, a PO number the client
   * requires — and `onFinalize` stored every one of them in `serverError`. The
   * app's only reader of that value is `SaveError`, which lives in the editing
   * rail, and this phase turns the rail off. So the button disabled itself for
   * a second, came back, and the contract did not issue, with nothing on screen
   * saying so.
   *
   * Asserted through the role rather than the text, because "it is announced"
   * is the half that matters: a reason drawn where a screen reader never
   * reaches it is the same bug one step smaller.
   */
  it('says why when the server refuses to finalize', async () => {
    const u = userEvent.setup();
    const { finalizeDocument } = jest.requireMock('@/server/actions/documents');
    finalizeDocument.mockResolvedValue({
      success: false,
      error: 'Fill every blank before issuing this contract.',
    });
    updateDraft.mockResolvedValue({ success: true });
    renderFlow({ doc: doc() }, 'preview');

    await u.click(screen.getByRole('button', { name: 'Finalize' }));
    await u.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finalize' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Fill every blank before issuing this contract.',
    );
    // And it did not pretend to succeed.
    expect(push).not.toHaveBeenCalled();
  });

  /**
   * Finalizing draws a spinner while it runs.
   *
   * It claims a document number and renders a PDF, so the wait is real and was
   * previously expressed only as the button going dead: indistinguishable from
   * the button being unavailable, which is what it looked like.
   *
   * `aria-busy` is the assertion because that is what `Button`'s `pending`
   * sets alongside the glyph, and it is the half a screen reader gets.
   */
  it('shows the finalize button working while it runs', async () => {
    const u = userEvent.setup();
    const { finalizeDocument } = jest.requireMock('@/server/actions/documents');
    // Never settles, so the pending state is something to assert on.
    finalizeDocument.mockReturnValue(new Promise(() => {}));
    updateDraft.mockResolvedValue({ success: true });
    renderFlow({ doc: doc() }, 'preview');

    const trigger = screen.getByRole('button', { name: 'Finalize' });
    expect(trigger).not.toHaveAttribute('aria-busy');

    await u.click(trigger);
    await u.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Finalize' }),
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Finalize' })).toHaveAttribute(
        'aria-busy',
        'true',
      ),
    );

    /*
      And only that one.

      Both buttons read a single `isSubmitting` boolean once, so clicking
      Finalize set the bin spinning too: the bar claimed to be issuing the
      document and deleting it at the same time. Delete is still *disabled*
      throughout, which is right — neither action should be reachable while the
      other runs — but it is not the one working.
    */
    const remove = screen.getByRole('button', { name: 'Delete draft' });
    expect(remove).not.toHaveAttribute('aria-busy');
    expect(remove).toBeDisabled();
  });

  /**
   * The two actions float over the document rather than sitting on a bar.
   *
   * The bar is gone with the rest of the shell's chrome, so the tell is that
   * the pair is no longer in the shell's footer slot: they are in a container
   * of their own, positioned, with the phase around it.
   */
  it('floats the actions rather than pinning them to a footer', () => {
    renderFlow({ doc: doc() }, 'preview');

    // The bar holds the buttons; the box around it is what positions it.
    const bar = screen.getByRole('button', { name: 'Finalize' }).parentElement!;
    expect(bar.parentElement!.className).toMatch(/absolute|fixed/);

    // And it is not in the shell's footer slot, which is where it used to be.
    expect(screen.queryByRole('navigation', { name: 'Steps' })).not.toBeInTheDocument();
  });

  /**
   * The back arrow comes with them.
   *
   * It is the only way off this phase that is not Finalize, now that the step
   * row and the rail's cards are both gone: without it a contract whose preview
   * shows a wrong figure has nowhere to go, since Finalize refuses on an
   * unfilled blank and is irreversible when it does not.
   */
  it('keeps a way back to the phase before it', async () => {
    const u = userEvent.setup();
    renderFlow({ doc: doc() }, 'preview');

    await u.click(screen.getByRole('button', { name: /^Back to/ }));

    expect(replace).toHaveBeenCalledWith('/client/docs/con-1?phase=terms', {
      scroll: false,
    });
  });
});

describe('the clause library', () => {
  it('copies the library onto a new draft the first time it is written', async () => {
    const u = userEvent.setup();
    const clauseLibrary = [{ number: 1, heading: 'Stored clause', body: ['Stored body.'] }];
    renderFlow({ clauseLibrary });

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await autosaved();

    expect(lastWritePayload()).toMatchObject({ content: { clauses: clauseLibrary } });
  });

  it('leaves an existing document’s own clauses alone', async () => {
    const u = userEvent.setup();
    const own = [{ number: 1, heading: 'The document’s own', body: ['Its body.'] }];
    const doc = { ...savedDoc(), content: { clauses: own } } as never;
    renderFlow({ doc });

    await u.type(document.getElementById('con-term-months')!, '6');
    await autosaved();

    expect(lastWritePayload()).toMatchObject({ content: { clauses: own } });
  });

  it('stores no clause override when there is no library to copy', async () => {
    const u = userEvent.setup();
    renderFlow();

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await autosaved();

    expect((lastWritePayload() as { content: Record<string, unknown> }).content).toEqual({});
  });
});

/**
 * Every blank a Part owns, filled, so a test can stand at the state the scope
 * phase is about. Built from the same enumeration the app reads rather than a
 * hand-written list, or it would drift the first time a Service's text changed.
 */
function filledBlanksFor(code: string): Record<string, string> {
  const {
    contractScopes,
  } = jest.requireActual<typeof import('@/lib/domain/contract/completeness')>(
    '@/lib/domain/contract/completeness',
  );
  const { blanksOf } = jest.requireActual<typeof import('@/lib/domain/contract/blanks')>(
    '@/lib/domain/contract/blanks',
  );
  const part = PARTS.find((s) => s.code === code)!;
  return Object.fromEntries(
    contractScopes({ parts: [part], blanks: {} })
      .flatMap((s) => blanksOf(s.parsed))
      .map((b) => [b.key, '5']),
  );
}
