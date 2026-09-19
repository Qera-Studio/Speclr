import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItemsEditor from '../ItemsEditor';
import { PARTS } from '@/lib/domain/seed/parts';
import type { ContractService } from '@/lib/domain/service';
import { saveServiceSection } from '@/server/actions/services';

jest.mock('@/server/actions/services', () => ({
  saveServiceSection: jest.fn(async () => ({ success: true })),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

/**
 * The items editor: the one place a priced item is added to the catalogue.
 *
 * What it must get right is the boundary. Rupees are typed, paise are posted,
 * a blank rate is *absent* rather than zero, a new item carries a blank id for
 * the server to fill, and an existing item keeps the id a client record may
 * already cite.
 */

const build = PARTS.find((s) => s.code === '06')!;

const withItems: ContractService = {
  ...build,
  items: [
    {
      id: 'I1',
      name: 'GSAP motion system',
      ratePaise: 20_000_00,
      unit: 'fixed',
      archived: false,
    },
    {
      id: 'I2',
      name: 'Mobile app UI',
      ratePaise: 5_000_00,
      unit: 'perUnit',
      unitLabel: 'per screen',
      archived: false,
    },
  ],
  itemSeq: 2,
};

const line = (n: number) => within(screen.getByRole('group', { name: `Item ${n}` }));

beforeEach(() => jest.clearAllMocks());

describe('ItemsEditor', () => {
  it('posts a new item in paise, with a blank id for the server to assign', async () => {
    const user = userEvent.setup();
    render(<ItemsEditor service={build} />);

    await user.click(screen.getByRole('button', { name: 'Add an item' }));
    await user.type(line(1).getByLabelText('Description'), 'Dark/Light theme system');
    await user.type(line(1).getByLabelText(/Rate/), '12000');
    await user.click(screen.getByRole('button', { name: 'Save items' }));

    expect(saveServiceSection).toHaveBeenCalledWith('06', 'items', {
      items: [
        {
          id: '',
          name: 'Dark/Light theme system',
          ratePaise: 12_000_00,
          unit: 'fixed',
          archived: false,
        },
      ],
    });
  });

  /**
   * "Quoted per engagement" is the absence of a rate. Posting zero would print
   * a line the studio gives away.
   */
  it('leaves the rate out when it is blank, rather than posting zero', async () => {
    const user = userEvent.setup();
    render(<ItemsEditor service={build} />);

    await user.click(screen.getByRole('button', { name: 'Add an item' }));
    await user.type(line(1).getByLabelText('Description'), 'Custom API integration');
    await user.click(screen.getByRole('button', { name: 'Save items' }));

    const posted = (saveServiceSection as jest.Mock).mock.calls[0][2].items[0];
    expect(posted.name).toBe('Custom API integration');
    expect('ratePaise' in posted).toBe(false);
  });

  /**
   * The blurb is the one field only a quotation reads. An empty one posts as
   * absent, or the quotation prints an empty paragraph under the name.
   */
  it('posts a blurb when one is written, and leaves it out when it is blank', async () => {
    const user = userEvent.setup();
    render(<ItemsEditor service={build} />);

    await user.click(screen.getByRole('button', { name: 'Add an item' }));
    await user.type(line(1).getByLabelText('Description'), 'Core website setup');
    await user.click(screen.getByRole('button', { name: 'Save items' }));

    expect('blurb' in (saveServiceSection as jest.Mock).mock.calls[0][2].items[0]).toBe(false);

    await user.type(
      line(1).getByLabelText(/Blurb/),
      'Getting the technical foundation ready first.',
    );
    await user.click(screen.getByRole('button', { name: 'Save items' }));

    expect((saveServiceSection as jest.Mock).mock.calls[1][2].items[0].blurb).toBe(
      'Getting the technical foundation ready first.',
    );
  });

  /**
   * A SAC on an item is an **override** of the Service's, so blank has to post
   * as absent: an empty string would be an override that overrides nothing,
   * and the item would carry no classification at all onto an invoice line.
   */
  it('posts a SAC override only when one is typed', async () => {
    const user = userEvent.setup();
    render(<ItemsEditor service={build} />);

    await user.click(screen.getByRole('button', { name: 'Add an item' }));
    await user.type(line(1).getByLabelText('Description'), '3D / Three.js scene');
    await user.click(screen.getByRole('button', { name: 'Save items' }));

    expect('sacCode' in (saveServiceSection as jest.Mock).mock.calls[0][2].items[0]).toBe(false);

    await user.type(line(1).getByLabelText('SAC override'), '998391');
    await user.click(screen.getByRole('button', { name: 'Save items' }));

    expect((saveServiceSection as jest.Mock).mock.calls[1][2].items[0].sacCode).toBe('998391');
  });

  /** The shared rule, not a second copy of it: six digits beginning 99. */
  it('refuses a SAC that is not six digits beginning 99', async () => {
    const user = userEvent.setup();
    render(<ItemsEditor service={build} />);

    await user.click(screen.getByRole('button', { name: 'Add an item' }));
    await user.type(line(1).getByLabelText('Description'), 'Something');
    await user.type(line(1).getByLabelText('SAC override'), '123456');
    await user.click(screen.getByRole('button', { name: 'Save items' }));

    expect(saveServiceSection).not.toHaveBeenCalled();
  });

  it("keeps an existing item's id, and the order the items are in", async () => {
    const user = userEvent.setup();
    render(<ItemsEditor service={withItems} />);

    expect(line(1).getByLabelText('Description')).toHaveValue('GSAP motion system');
    await user.click(screen.getByRole('button', { name: 'Save items' }));

    const posted = (saveServiceSection as jest.Mock).mock.calls[0][2].items;
    expect(posted.map((m: { id: string }) => m.id)).toEqual(['I1', 'I2']);
    expect(posted[1]).toEqual({
      id: 'I2',
      name: 'Mobile app UI',
      ratePaise: 5_000_00,
      unit: 'perUnit',
      unitLabel: 'per screen',
      archived: false,
    });
  });

  /** A unit label means nothing on a fixed or monthly item, so it is not offered. */
  it('asks for a unit label only on a per-unit item', async () => {
    const user = userEvent.setup();
    render(<ItemsEditor service={build} />);

    await user.click(screen.getByRole('button', { name: 'Add an item' }));
    expect(line(1).queryByLabelText('Unit label')).not.toBeInTheDocument();

    await user.click(line(1).getByRole('combobox', { name: 'Unit' }));
    await user.click(await screen.findByRole('option', { name: 'Per unit' }));
    expect(await line(1).findByLabelText('Unit label')).toBeInTheDocument();
  });

  it('removes an item after asking', async () => {
    const user = userEvent.setup();
    render(<ItemsEditor service={withItems} />);

    await user.click(screen.getByRole('button', { name: 'Remove item 1' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Save items' }));

    const posted = (saveServiceSection as jest.Mock).mock.calls[0][2].items;
    expect(posted.map((m: { id: string }) => m.id)).toEqual(['I2']);
  });

  it('refuses to save an item with no description', async () => {
    const user = userEvent.setup();
    render(<ItemsEditor service={build} />);

    await user.click(screen.getByRole('button', { name: 'Add an item' }));
    await user.click(screen.getByRole('button', { name: 'Save items' }));

    expect(saveServiceSection).not.toHaveBeenCalled();
    expect(line(1).getByRole('alert')).toBeInTheDocument();
  });

  it('shows the server’s refusal beside the form', async () => {
    (saveServiceSection as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Item I1 appears twice.',
    });
    const user = userEvent.setup();
    render(<ItemsEditor service={withItems} />);

    await user.click(screen.getByRole('button', { name: 'Save items' }));

    expect(await screen.findByText('Item I1 appears twice.')).toBeInTheDocument();
  });
});
