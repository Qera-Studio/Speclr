import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LibrariesForm from '../LibrariesForm';
import { PARTS } from '@/lib/domain/seed/parts';
import type { ContractService, LibraryLine } from '@/lib/domain/service';
import { saveServiceSection } from '@/server/actions/services';

jest.mock('@/server/actions/services', () => ({
  saveServiceSection: jest.fn(async () => ({ success: true })),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

/**
 * The libraries form: which exclusion and client-input lines a Service names.
 *
 * Two tick lists over the shared libraries. An archived line the Service still
 * cites stays on the list, or there would be no way to untick it; an archived
 * line it does not cite is not offered, because archived means "leaves new
 * contracts".
 */

const line = (id: string, text: string, archived = false): LibraryLine => ({
  id,
  text,
  category: 'content',
  archived,
});

const exclusions = [
  line('E01', 'Copywriting of any kind'),
  line('E02', 'Photography'),
  line('E03', 'Print production', true),
  line('E04', 'Video editing', true),
];
const clientInputs = [line('I01', 'Brand assets'), line('I02', 'Product photography')];

const service: ContractService = {
  ...PARTS.find((s) => s.code === '06')!,
  exclusionIds: ['E01', 'E03'],
  clientInputIds: ['I02'],
};

const posted = () => (saveServiceSection as jest.Mock).mock.calls[0][2];

beforeEach(() => jest.clearAllMocks());

describe('LibrariesForm', () => {
  it("opens with the service's own lines ticked", () => {
    render(<LibrariesForm service={service} exclusions={exclusions} clientInputs={clientInputs} />);

    expect(screen.getByRole('checkbox', { name: 'Copywriting of any kind' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Photography' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Product photography' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Brand assets' })).not.toBeChecked();
  });

  it('keeps an archived line the service still cites, and hides one it does not', () => {
    render(<LibrariesForm service={service} exclusions={exclusions} clientInputs={clientInputs} />);

    expect(screen.getByRole('checkbox', { name: 'Print production' })).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Video editing' })).not.toBeInTheDocument();
  });

  it('posts the ticked ids, sorted, and nothing else', async () => {
    const user = userEvent.setup();
    render(<LibrariesForm service={service} exclusions={exclusions} clientInputs={clientInputs} />);

    await user.click(screen.getByRole('checkbox', { name: 'Photography' }));
    await user.click(screen.getByRole('checkbox', { name: 'Copywriting of any kind' }));
    await user.click(screen.getByRole('checkbox', { name: 'Brand assets' }));
    await user.click(screen.getByRole('button', { name: 'Save libraries' }));

    expect(saveServiceSection).toHaveBeenCalledWith('06', 'libraries', {
      exclusionIds: ['E02', 'E03'],
      clientInputIds: ['I01', 'I02'],
    });
  });

  it('groups the two lists under their own headings', () => {
    render(<LibrariesForm service={service} exclusions={exclusions} clientInputs={clientInputs} />);

    const excluded = within(screen.getByRole('group', { name: 'What is not included' }));
    expect(excluded.getByRole('checkbox', { name: 'Photography' })).toBeInTheDocument();
    const provides = within(screen.getByRole('group', { name: 'What the Client provides' }));
    expect(provides.getByRole('checkbox', { name: 'Brand assets' })).toBeInTheDocument();
  });
});
