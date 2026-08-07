import { render, screen } from '@testing-library/react';
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

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:x') });
});

describe('ContractEditor', () => {
  it('renders the client picker and the service list', () => {
    renderEditor();
    expect(screen.getByLabelText(/^client$/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Shopify storefront/i })).toBeInTheDocument();
  });

  /**
   * A flat, searchable list with the Schedule as a quiet label — the user picks
   * work, and the system routes it (contract-system.md §4).
   */
  it('shows each service with the Schedule it routes to, not as a filter', () => {
    renderEditor();
    expect(screen.getByRole('checkbox', { name: /Shopify storefront.*Build/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/schedule/i)).not.toBeInTheDocument();
  });

  it('filters the service list by search', async () => {
    const u = userEvent.setup();
    renderEditor();
    await u.type(screen.getByLabelText(/search services/i), 'brand');
    expect(screen.getByRole('checkbox', { name: /Brand identity/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Shopify/i })).not.toBeInTheDocument();
  });

  it('opens a Part section once a service is ticked', async () => {
    const u = userEvent.setup();
    renderEditor();
    await u.click(screen.getByRole('checkbox', { name: /Shopify storefront/i }));
    expect(screen.getByRole('button', { name: /Part A-1 — Shopify storefront/ })).toBeInTheDocument();
  });

  /** Ticking Brand identity first must still yield Part A-1 Shopify. */
  it('numbers Parts canonically, not in tick order', async () => {
    const u = userEvent.setup();
    renderEditor();
    await u.click(screen.getByRole('checkbox', { name: /Brand identity/i }));
    await u.click(screen.getByRole('checkbox', { name: /Shopify storefront/i }));
    expect(screen.getByRole('button', { name: /Part A-1 — Shopify storefront/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Part A-2 — Brand identity/ })).toBeInTheDocument();
  });

  it('reports the blanks still to fill', async () => {
    const u = userEvent.setup();
    renderEditor();
    await u.click(screen.getByRole('checkbox', { name: /Shopify storefront/i }));
    // Part 01's Fee row is drafted '[ ]', so at least one is outstanding.
    expect(screen.getByText(/blank(s)? still to fill/i)).toBeInTheDocument();
  });

  it('saves a draft carrying the copied Part and its library lines', async () => {
    createDraft.mockResolvedValue({ success: true, id: 'new-con' });
    const u = userEvent.setup();
    renderEditor();

    await selectComboboxOption(u, /^client$/i, 'Acme Co.');
    await u.click(screen.getByRole('checkbox', { name: /Shopify storefront/i }));
    await u.click(screen.getByRole('button', { name: /save draft/i }));

    expect(createDraft).toHaveBeenCalledWith(
      'CON',
      'c1',
      expect.objectContaining({
        contract: expect.objectContaining({
          parts: [expect.objectContaining({ code: '01' })],
          // The words the Part names, frozen onto the contract at tick time.
          library: expect.objectContaining({ E01: 'Copywriting of any kind' }),
        }),
      }),
    );
    expect(push).toHaveBeenCalledWith('/docs/new-con');
  });
});
