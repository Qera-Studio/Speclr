import { render, screen, waitFor, within } from '@testing-library/react';
import { selectComboboxOption } from '@/test-utils/combobox';
import userEvent from '@testing-library/user-event';
import ContractEditor from '../ContractEditor';
import { CLIENT_INPUTS, EXCLUSIONS } from '@/lib/domain/contract/seed/libraries';
import { SERVICES } from '@/lib/domain/contract/seed/services';
import type { ClientRecord } from '@/lib/domain/types';

const push = jest.fn();
const createDraft = jest.fn();
const updateDraft = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (u: string) => push(u), refresh: jest.fn() }),
}));
jest.mock('@/server/actions/documents', () => ({
  createDraft: (...a: unknown[]) => createDraft(...a),
  updateDraft: (...a: unknown[]) => updateDraft(...a),
  finalizeDocument: jest.fn(),
  deleteDraftAction: jest.fn(),
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
] as ClientRecord[];

function renderEditor() {
  return render(
    <ContractEditor
      clients={clients}
      services={SERVICES}
      exclusions={EXCLUSIONS}
      clientInputs={CLIENT_INPUTS}
      title="New contract"
    />,
  );
}

type User = ReturnType<typeof userEvent.setup>;

/** Pick a Service from the catalogue — which opens its dialog, and commits nothing. */
async function openService(u: User, name: RegExp) {
  await u.click(screen.getByRole('button', { name }));
  return screen.getByRole('dialog');
}

/**
 * The whole first stage: pick Shopify, price it, and add it. Every Service is
 * drafted with an empty fee, so the price is not optional.
 */
async function addShopify(u: User) {
  await openService(u, /Shopify storefront/);
  await u.type(screen.getByLabelText('Fee'), '120000');
  await u.click(screen.getByRole('button', { name: 'Add to contract' }));
}

/**
 * The draft writes itself a second after the last change — there is no Save
 * button to click any more. Real timers rather than fake ones: `userEvent`
 * drives its own, and swapping the clock underneath it costs more than the
 * second this waits.
 */
const autosaved = () =>
  waitFor(
    () => expect(createDraft.mock.calls.length + updateDraft.mock.calls.length).toBeGreaterThan(0),
    { timeout: 3000 },
  );

/**
 * The payload of the most recent write, whichever action made it.
 *
 * The first write is a create and every one after it an update, and which of
 * them a given edit lands in depends on how long the clicks before it took —
 * so a test about *what was written* must not care which action wrote it.
 * Ordered by Jest's own invocation counter, not by mock.
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
  ].sort((a, b) => a.order - b.order).at(-1)?.payload;

beforeEach(() => {
  jest.clearAllMocks();
  createDraft.mockResolvedValue({ success: true, id: 'new-con' });
  updateDraft.mockResolvedValue({ success: true });
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:x') });
});

describe('ContractEditor — choosing services', () => {
  it('opens on the services stage with the client picker and the Agreement', () => {
    renderEditor();
    expect(screen.getByLabelText(/^client$/i)).toBeInTheDocument();
    // The preview prints the same words on its cover; the card is the only
    // place they appear on this stage, where the catalogue fills the card.
    expect(screen.getByText('Master Service Agreement')).toBeInTheDocument();
    expect(screen.getByText('Add a service')).toBeInTheDocument();
  });

  /**
   * Every Service at once, under its Schedule — in the order an engagement
   * runs, which is also the order the Schedules print in.
   */
  it('groups the catalogue under one heading per Schedule', () => {
    renderEditor();
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Setup', 'Build', 'Retainer', 'Audit']);
  });

  it('offers Services from every Schedule without a tab in the way', () => {
    renderEditor();
    expect(screen.getByRole('button', { name: /Domain and DNS/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Shopify storefront/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Strategy sprint/ })).toBeInTheDocument();
  });

  it('filters the catalogue by search', async () => {
    const u = userEvent.setup();
    renderEditor();
    await u.type(screen.getByLabelText(/search services/i), 'brand');
    expect(screen.getByRole('button', { name: /Brand identity/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Shopify/ })).not.toBeInTheDocument();
  });

  it('cannot move on until something is added', async () => {
    const u = userEvent.setup();
    renderEditor();
    expect(screen.getByRole('button', { name: /agreement terms/i })).toBeDisabled();
    await addShopify(u);
    expect(screen.getByRole('button', { name: /agreement terms/i })).toBeEnabled();
  });
});

describe('ContractEditor — the service dialog', () => {
  it('shows the Service on its own, with its figures and its exclusions', async () => {
    const u = userEvent.setup();
    renderEditor();
    const dialog = await openService(u, /Shopify storefront/);

    expect(within(dialog).getByRole('heading', { name: /Shopify storefront/ })).toBeInTheDocument();
    // Part 05's Limits table drafts 'Page templates customised' as [8].
    expect(within(dialog).getByLabelText('Templates customised')).toHaveValue('8');
    expect(
      within(dialog).getByRole('checkbox', { name: /copywriting of any kind/i }),
    ).toBeChecked();
  });

  /**
   * The three figures in Part 01's "What is included" were once three inputs
   * all labelled "What is included", then three whole sentences. Now each is
   * named in two or three words, with the sentence behind the ⓘ.
   */
  it('labels a figure in prose in two or three words', async () => {
    const u = userEvent.setup();
    renderEditor();
    const dialog = await openService(u, /Domain and DNS/);
    // Every one of these figures is also a Limits row, so scope to the section.
    const included = within(dialog).getByRole('region', { name: 'What is included' });

    expect(within(included).getByLabelText('Domains registered')).toHaveValue('1');
    expect(within(included).getByLabelText('Names checked')).toHaveValue('5');
    expect(within(included).getByLabelText('Redirected domains')).toHaveValue('2');
  });

  it('explains what a figure governs behind its info button', async () => {
    const u = userEvent.setup();
    renderEditor();
    const dialog = await openService(u, /Shopify storefront/);

    await u.hover(within(dialog).getByRole('button', { name: 'About Revision rounds' }));
    expect(
      await screen.findByText(/before further work is billed as Additional Work/i),
    ).toBeInTheDocument();
  });

  /** The fee is drafted empty on purpose, and prints as the contract's price. */
  it('will not add a Part while a figure is empty', async () => {
    const u = userEvent.setup();
    renderEditor();
    await openService(u, /Shopify storefront/);

    expect(screen.getByRole('button', { name: 'Add to contract' })).toBeDisabled();
    expect(screen.getByText(/1 field still empty/)).toBeInTheDocument();

    await u.type(screen.getByLabelText('Fee'), '120000');
    expect(screen.getByRole('button', { name: 'Add to contract' })).toBeEnabled();
  });

  it('types a fee as rupees, and refuses anything else', async () => {
    const u = userEvent.setup();
    renderEditor();
    await openService(u, /Shopify storefront/);

    await u.type(screen.getByLabelText('Fee'), '120000');
    expect(screen.getByLabelText('Fee')).toHaveValue('₹1,20,000');

    const limits = within(screen.getByRole('dialog')).getByRole('region', { name: 'Limits' });
    await u.type(within(limits).getByLabelText('Products uploaded'), 'abc');
    expect(within(limits).getByLabelText('Products uploaded')).toHaveValue('50');
  });

  /** Nothing joins the contract until the button. */
  it('adds nothing when the dialog is cancelled', async () => {
    const u = userEvent.setup();
    renderEditor();
    await openService(u, /Shopify storefront/);
    await u.type(screen.getByLabelText('Fee'), '120000');
    await u.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Add a service')).toBeInTheDocument();
  });

  it('adds the Part on Add to contract', async () => {
    const u = userEvent.setup();
    renderEditor();
    await addShopify(u);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove shopify storefront/i })).toBeInTheDocument();
    expect(screen.queryByText('Add a service')).not.toBeInTheDocument();
  });

  it('reopens a Part card with what was filled in', async () => {
    const u = userEvent.setup();
    renderEditor();
    await openService(u, /Shopify storefront/);
    await u.type(screen.getByLabelText('Fee'), '120000');
    const limitsOf = () =>
      within(screen.getByRole('dialog')).getByRole('region', { name: 'Limits' });
    const products = within(limitsOf()).getByLabelText('Products uploaded');
    await u.clear(products);
    await u.type(products, '120');
    await u.click(screen.getByRole('button', { name: 'Add to contract' }));

    // The rail card carries the name and nothing else — no Part letter, no Schedule.
    await u.click(screen.getAllByRole('button', { name: 'Shopify storefront' })[0]);
    expect(within(limitsOf()).getByLabelText('Products uploaded')).toHaveValue('120');
    expect(screen.getByLabelText('Fee')).toHaveValue('₹1,20,000');
    // An edit offers to save rather than to add again.
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('removes a Part from its card', async () => {
    const u = userEvent.setup();
    renderEditor();
    await addShopify(u);
    await u.click(screen.getByRole('button', { name: /remove shopify storefront/i }));
    expect(screen.getByText('Add a service')).toBeInTheDocument();
  });

  /** Adding Brand identity (09) first must still put Shopify (05) ahead of it. */
  it('orders Parts canonically, not in the order they were added', async () => {
    const u = userEvent.setup();
    renderEditor();
    await openService(u, /Brand identity/);
    await u.type(screen.getByLabelText('Fee'), '80000');
    await u.click(screen.getByRole('button', { name: 'Add to contract' }));
    await addShopify(u);

    expect(screen.getAllByRole('button', { name: /^Remove / }).map((b) => b.textContent)).toEqual([
      'Remove Shopify storefront',
      'Remove Brand identity',
    ]);
  });
});

describe('ContractEditor — the terms stage', () => {
  async function toTerms(u: User) {
    await addShopify(u);
    await u.click(screen.getByRole('button', { name: /agreement terms/i }));
  }

  it('puts the standing figures in the card, not the rail', async () => {
    const u = userEvent.setup();
    renderEditor();
    await toTerms(u);

    expect(
      screen.getByRole('heading', { name: /agreement & schedule terms/i }),
    ).toBeInTheDocument();
    // Master Agreement clause 8.3, named rather than quoted.
    expect(screen.getByLabelText('Payment period')).toHaveValue('7 days');
    // The catalogue belongs to the first stage.
    expect(screen.queryByLabelText(/search services/i)).not.toBeInTheDocument();
  });

  it('groups the figures by the document they come from', async () => {
    const u = userEvent.setup();
    renderEditor();
    await toTerms(u);

    const groups = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    // The Agreement's figures lead and carry no group heading — the page title
    // is already its name. Each Schedule after it is labelled.
    expect(groups[0]).toBe('Fees, Invoicing and Payment');
    expect(groups).toContain('Schedule A — Build');
    expect(groups).not.toContain('Master Agreement');
  });

  it('validates a standing figure the same way a Part figure is validated', async () => {
    const u = userEvent.setup();
    renderEditor();
    await toTerms(u);

    const rate = screen.getByLabelText('Interest rate');
    await u.clear(rate);
    await u.type(rate, '2');
    expect(rate).toHaveValue('2%');
  });

  it('goes back to the services stage', async () => {
    const u = userEvent.setup();
    renderEditor();
    await toTerms(u);
    await u.click(screen.getByRole('button', { name: /^services$/i }));
    expect(screen.getByLabelText(/search services/i)).toBeInTheDocument();
  });
});

describe('ContractEditor — the preview stage', () => {
  async function toPreview(u: User) {
    await addShopify(u);
    await u.click(screen.getByRole('button', { name: /agreement terms/i }));
    await u.click(screen.getByRole('button', { name: /^preview$/i }));
  }

  it('summarises the contract rather than holding its fields', async () => {
    const u = userEvent.setup();
    renderEditor();
    await toPreview(u);

    expect(screen.getByRole('button', { name: /Acme Co\.|No client selected/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Clauses/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cover/ })).toBeInTheDocument();
    // Nothing is expanded, so no field of theirs is on screen yet.
    expect(screen.queryByLabelText('Masthead')).not.toBeInTheDocument();
  });

  it('unfolds the client and the cover in the rail', async () => {
    const u = userEvent.setup();
    renderEditor();
    await toPreview(u);

    await u.click(screen.getByRole('button', { name: /Cover/ }));
    expect(screen.getByLabelText('Masthead')).toBeInTheDocument();

    await u.click(screen.getByRole('button', { name: /No client selected/ }));
    expect(screen.getByLabelText(/^client$/i)).toBeInTheDocument();
  });

  it('opens the clauses in a dialog', async () => {
    const u = userEvent.setup();
    renderEditor();
    await toPreview(u);

    await u.click(screen.getByRole('button', { name: /Clauses/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /** Thirty figures have a page; the card says so rather than pretending. */
  it('sends you back to the terms page to edit the standing figures', async () => {
    const u = userEvent.setup();
    renderEditor();
    await toPreview(u);

    await u.click(screen.getByRole('button', { name: /Agreement & schedule terms/ }));
    await u.click(screen.getByRole('button', { name: /go to the terms/i }));
    expect(screen.getByLabelText('Payment period')).toBeInTheDocument();
  });

  /**
   * The two consequential actions live in the rail's pinned footer, and one of
   * them is now a bare trash glyph. A control with no accessible name is a
   * control a screen reader cannot offer.
   */
  it('names both document actions, icon and all', async () => {
    const u = userEvent.setup();
    renderEditor();

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await toPreview(u);
    await autosaved();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^finalize$/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /delete draft/i })).toBeInTheDocument();
  });

  it('reports nothing outstanding once a Part is priced', async () => {
    const u = userEvent.setup();
    renderEditor();
    await toPreview(u);
    expect(screen.queryByText(/blank(s)? still to fill/i)).not.toBeInTheDocument();
  });

  it('writes the copied Part and its library lines without being asked', async () => {
    const u = userEvent.setup();
    renderEditor();

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await toPreview(u);

    await waitFor(
      () =>
        expect(lastWritePayload()).toMatchObject({
          contract: {
            parts: [expect.objectContaining({ code: '05' })],
            // The words the Part names, frozen on when it was added.
            library: expect.objectContaining({ E01: 'Copywriting of any kind' }),
          },
        }),
      { timeout: 3000 },
    );
  });
});

describe('ContractEditor — not losing the draft', () => {
  /** `createDraft` refuses without a client, so that is the first savable moment. */
  it('starts a draft as soon as a client is chosen', async () => {
    const u = userEvent.setup();
    renderEditor();
    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await autosaved();

    expect(createDraft).toHaveBeenCalledTimes(1);
    expect(createDraft).toHaveBeenCalledWith('CON', 'c1', expect.anything());
    // Swapped in place — a navigation would remount and lose the contract.
    expect(window.location.pathname).toBe('/docs/new-con');
  });

  /**
   * The id of the draft just created is read from a ref, not from state closed
   * over when the write was queued — otherwise a second change arriving before
   * the first render lands would create a second contract.
   */
  it('does not start a second draft when it is edited again', async () => {
    const u = userEvent.setup();
    renderEditor();
    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await autosaved();

    await addShopify(u);
    await waitFor(() => expect(updateDraft).toHaveBeenCalled(), { timeout: 3000 });

    expect(createDraft).toHaveBeenCalledTimes(1);
    expect(updateDraft).toHaveBeenCalledWith('new-con', 'c1', expect.anything());
  });

  /**
   * Autosave compares the payload by value, so re-picking the client already on
   * the contract is not an edit. This replaced a hand-set `dirty` flag that
   * fired on the act of choosing rather than on anything changing.
   */
  it('writes nothing when a change leaves the contract identical', async () => {
    const u = userEvent.setup();
    renderEditor();
    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await autosaved();

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await new Promise((r) => setTimeout(r, 1500));

    expect(updateDraft).not.toHaveBeenCalled();
  });

  it('asks before an in-app link throws unsaved edits away', async () => {
    const u = userEvent.setup();
    render(
      <>
        <a href="/clients">Clients</a>
        <ContractEditor
          clients={clients}
          services={SERVICES}
          exclusions={EXCLUSIONS}
          clientInputs={CLIENT_INPUTS}
          title="New contract"
        />
      </>,
    );

    await addShopify(u);
    await u.click(screen.getByRole('link', { name: 'Clients' }));

    expect(screen.getByRole('alertdialog')).toHaveTextContent(/unsaved changes/i);
  });

  it('lets a clean draft leave without asking', async () => {
    const u = userEvent.setup();
    render(
      <>
        <a href="/clients">Clients</a>
        <ContractEditor
          clients={clients}
          services={SERVICES}
          exclusions={EXCLUSIONS}
          clientInputs={CLIENT_INPUTS}
          title="New contract"
        />
      </>,
    );

    await u.click(screen.getByRole('link', { name: 'Clients' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
