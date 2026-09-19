import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MenuEditor from '../MenuEditor';
import { PARTS } from '@/lib/domain/seed/parts';
import type { ContractService } from '@/lib/domain/service';
import { saveServiceSection } from '@/server/actions/services';

jest.mock('@/server/actions/services', () => ({
  saveServiceSection: jest.fn(async () => ({ success: true })),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

/**
 * The menu editor: the one place a priced line is added to the catalogue.
 *
 * What it must get right is the boundary. Rupees are typed, paise are posted,
 * a blank rate is *absent* rather than zero, a new line carries a blank id for
 * the server to fill, and an existing line keeps the id a client record may
 * already cite.
 */

const build = PARTS.find((s) => s.code === '06')!;

const withMenu: ContractService = {
  ...build,
  menu: [
    { id: 'M1', text: 'GSAP motion system', ratePaise: 20_000_00, unit: 'fixed' },
    { id: 'M2', text: 'Mobile app UI', ratePaise: 5_000_00, unit: 'perUnit', unitLabel: 'per screen' },
  ],
  menuSeq: 2,
};

const line = (n: number) => within(screen.getByRole('group', { name: `Line ${n}` }));

beforeEach(() => jest.clearAllMocks());

describe('MenuEditor', () => {
  it('posts a new line in paise, with a blank id for the server to assign', async () => {
    const user = userEvent.setup();
    render(<MenuEditor service={build} />);

    await user.click(screen.getByRole('button', { name: 'Add a line' }));
    await user.type(line(1).getByLabelText('Description'), 'Dark/Light theme system');
    await user.type(line(1).getByLabelText(/Rate/), '12000');
    await user.click(screen.getByRole('button', { name: 'Save menu' }));

    expect(saveServiceSection).toHaveBeenCalledWith('06', 'menu', {
      menu: [{ id: '', text: 'Dark/Light theme system', ratePaise: 12_000_00, unit: 'fixed' }],
    });
  });

  /**
   * "Quoted per engagement" is the absence of a rate. Posting zero would print
   * a line the studio gives away.
   */
  it('leaves the rate out when it is blank, rather than posting zero', async () => {
    const user = userEvent.setup();
    render(<MenuEditor service={build} />);

    await user.click(screen.getByRole('button', { name: 'Add a line' }));
    await user.type(line(1).getByLabelText('Description'), 'Custom API integration');
    await user.click(screen.getByRole('button', { name: 'Save menu' }));

    const posted = (saveServiceSection as jest.Mock).mock.calls[0][2].menu[0];
    expect(posted.text).toBe('Custom API integration');
    expect('ratePaise' in posted).toBe(false);
  });

  it("keeps an existing line's id, and the order the lines are in", async () => {
    const user = userEvent.setup();
    render(<MenuEditor service={withMenu} />);

    expect(line(1).getByLabelText('Description')).toHaveValue('GSAP motion system');
    await user.click(screen.getByRole('button', { name: 'Save menu' }));

    const posted = (saveServiceSection as jest.Mock).mock.calls[0][2].menu;
    expect(posted.map((m: { id: string }) => m.id)).toEqual(['M1', 'M2']);
    expect(posted[1]).toEqual({
      id: 'M2',
      text: 'Mobile app UI',
      ratePaise: 5_000_00,
      unit: 'perUnit',
      unitLabel: 'per screen',
    });
  });

  /** A unit label means nothing on a fixed or monthly line, so it is not offered. */
  it('asks for a unit label only on a per-unit line', async () => {
    const user = userEvent.setup();
    render(<MenuEditor service={build} />);

    await user.click(screen.getByRole('button', { name: 'Add a line' }));
    expect(line(1).queryByLabelText('Unit label')).not.toBeInTheDocument();

    await user.click(line(1).getByRole('combobox', { name: 'Unit' }));
    await user.click(await screen.findByRole('option', { name: 'Per unit' }));
    expect(await line(1).findByLabelText('Unit label')).toBeInTheDocument();
  });

  it('removes a line after asking', async () => {
    const user = userEvent.setup();
    render(<MenuEditor service={withMenu} />);

    await user.click(screen.getByRole('button', { name: 'Remove line 1' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Save menu' }));

    const posted = (saveServiceSection as jest.Mock).mock.calls[0][2].menu;
    expect(posted.map((m: { id: string }) => m.id)).toEqual(['M2']);
  });

  it('refuses to save a line with no description', async () => {
    const user = userEvent.setup();
    render(<MenuEditor service={build} />);

    await user.click(screen.getByRole('button', { name: 'Add a line' }));
    await user.click(screen.getByRole('button', { name: 'Save menu' }));

    expect(saveServiceSection).not.toHaveBeenCalled();
    expect(line(1).getByRole('alert')).toBeInTheDocument();
  });

  it('shows the server’s refusal beside the form', async () => {
    (saveServiceSection as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Menu line M1 appears twice.',
    });
    const user = userEvent.setup();
    render(<MenuEditor service={withMenu} />);

    await user.click(screen.getByRole('button', { name: 'Save menu' }));

    expect(await screen.findByText('Menu line M1 appears twice.')).toBeInTheDocument();
  });
});
