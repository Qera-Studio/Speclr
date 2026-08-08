import { render, screen, within } from '@testing-library/react';
import { selectComboboxOption } from '@/test-utils/combobox';
import userEvent from '@testing-library/user-event';
import ContractEditor from '../ContractEditor';
import { CLIENT_INPUTS, EXCLUSIONS } from '@/lib/domain/contract/seed/libraries';
import { SERVICES } from '@/lib/domain/contract/seed/services';
import type { ClientRecord } from '@/lib/domain/types';

const push = jest.fn();
const createDraft = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (u: string) => push(u), refresh: jest.fn() }),
}));
jest.mock('@/server/actions/documents', () => ({
  createDraft: (...a: unknown[]) => createDraft(...a),
  updateDraft: jest.fn(),
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

/** Shopify (05) is Build work, and Setup is the tab that opens. */
const openBuild = (u: User) => u.click(screen.getByRole('tab', { name: 'Build' }));

/** Pick a Service from the list — which opens its dialog, and commits nothing. */
async function openService(u: User, name: RegExp) {
  await openBuild(u);
  await u.click(screen.getByRole('button', { name }));
  return screen.getByRole('dialog');
}

/** The whole first screen: pick Shopify and add it to the contract. */
async function addShopify(u: User) {
  await openService(u, /Shopify storefront/);
  await u.click(screen.getByRole('button', { name: 'Add to contract' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:x') });
});

describe('ContractEditor — choosing services', () => {
  it('opens on the services screen with the client picker and the Agreement', () => {
    renderEditor();
    expect(screen.getByLabelText(/^client$/i)).toBeInTheDocument();
    // The preview prints the same words on its cover, so anchor on the card.
    expect(screen.getByText(/clauses · always included/)).toBeInTheDocument();
    expect(screen.getByText(/no services yet/i)).toBeInTheDocument();
  });

  /**
   * A tab per Schedule, in the order an engagement runs — which is also the
   * order the Schedules print in and the codes are numbered in.
   */
  it('offers one tab per Schedule, in engagement order', () => {
    renderEditor();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Setup',
      'Build',
      'Retainer',
      'Audit',
    ]);
  });

  it('lists a service only under its own Schedule', async () => {
    const u = userEvent.setup();
    renderEditor();
    expect(screen.queryByRole('button', { name: /Shopify storefront/ })).not.toBeInTheDocument();
    await openBuild(u);
    expect(screen.getByRole('button', { name: /Shopify storefront/ })).toBeInTheDocument();
  });

  it('filters the service list by search', async () => {
    const u = userEvent.setup();
    renderEditor();
    await openBuild(u);
    await u.type(screen.getByLabelText(/search services/i), 'brand');
    expect(screen.getByRole('button', { name: /Brand identity/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Shopify/ })).not.toBeInTheDocument();
  });

  it('cannot move to the contract details until something is added', async () => {
    const u = userEvent.setup();
    renderEditor();
    expect(screen.getByRole('button', { name: /contract details/i })).toBeDisabled();
    await addShopify(u);
    expect(screen.getByRole('button', { name: /contract details/i })).toBeEnabled();
  });
});

describe('ContractEditor — the service dialog', () => {
  it('shows the Service on its own, with its figures and its exclusions', async () => {
    const u = userEvent.setup();
    renderEditor();
    const dialog = await openService(u, /Shopify storefront/);

    expect(within(dialog).getByRole('heading', { name: /Shopify storefront/ })).toBeInTheDocument();
    // Part 05's Limits table drafts 'Products uploaded' as [50].
    expect(within(dialog).getByLabelText('Products uploaded')).toHaveValue('50');
    expect(
      within(dialog).getByRole('checkbox', { name: /copywriting of any kind/i }),
    ).toBeChecked();
  });

  /** Nothing joins the contract until the button. */
  it('adds nothing when the dialog is cancelled', async () => {
    const u = userEvent.setup();
    renderEditor();
    await openService(u, /Shopify storefront/);
    await u.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/no services yet/i)).toBeInTheDocument();
  });

  it('adds the Part on Add to contract', async () => {
    const u = userEvent.setup();
    renderEditor();
    await addShopify(u);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Part A-1 Shopify storefront/ })).toBeInTheDocument();
    expect(screen.queryByText(/no services yet/i)).not.toBeInTheDocument();
  });

  it('reopens a Part card with what was filled in', async () => {
    const u = userEvent.setup();
    renderEditor();
    await openService(u, /Shopify storefront/);
    const products = screen.getByLabelText('Products uploaded');
    await u.clear(products);
    await u.type(products, '120');
    await u.click(screen.getByRole('button', { name: 'Add to contract' }));

    await u.click(screen.getByRole('button', { name: /Part A-1 Shopify storefront/ }));
    expect(screen.getByLabelText('Products uploaded')).toHaveValue('120');
    // An edit offers to save rather than to add again.
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('removes a Part from its card', async () => {
    const u = userEvent.setup();
    renderEditor();
    await addShopify(u);
    await u.click(screen.getByRole('button', { name: /remove shopify storefront/i }));
    expect(screen.getByText(/no services yet/i)).toBeInTheDocument();
  });

  /** Adding Brand identity (09) first must still yield Part A-1 Shopify (05). */
  it('numbers Parts canonically, not in the order they were added', async () => {
    const u = userEvent.setup();
    renderEditor();
    await openService(u, /Brand identity/);
    await u.click(screen.getByRole('button', { name: 'Add to contract' }));
    await addShopify(u);

    expect(screen.getByRole('button', { name: /Part A-1 Shopify storefront/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Part A-2 Brand identity/ })).toBeInTheDocument();
  });
});

describe('ContractEditor — contract details', () => {
  async function toDetails(u: User) {
    await addShopify(u);
    await u.click(screen.getByRole('button', { name: /contract details/i }));
  }

  it('holds what belongs to the contract rather than to a Part', async () => {
    const u = userEvent.setup();
    renderEditor();
    await toDetails(u);

    expect(screen.getByRole('button', { name: /agreement & schedule terms/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clauses/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
    // The picker belongs to the first screen.
    expect(screen.queryByLabelText(/search services/i)).not.toBeInTheDocument();
  });

  it('reports the blanks still to fill', async () => {
    const u = userEvent.setup();
    renderEditor();
    await toDetails(u);
    // Part 05's Fee row is drafted '[ ]', so at least one is outstanding.
    expect(screen.getByText(/blank(s)? still to fill/i)).toBeInTheDocument();
  });

  it('goes back to the services screen', async () => {
    const u = userEvent.setup();
    renderEditor();
    await toDetails(u);
    await u.click(screen.getByRole('button', { name: /^services$/i }));
    expect(screen.getByLabelText(/search services/i)).toBeInTheDocument();
  });

  it('saves a draft carrying the copied Part and its library lines', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-con' });
    const u = userEvent.setup();
    renderEditor();

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await toDetails(u);
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'CON',
      'c1',
      expect.objectContaining({
        contract: expect.objectContaining({
          parts: [expect.objectContaining({ code: '05' })],
          // The words the Part names, frozen onto the contract when it was added.
          library: expect.objectContaining({ E01: 'Copywriting of any kind' }),
        }),
      }),
    );
    expect(push).toHaveBeenCalledWith('/docs/new-con');
  });
});
