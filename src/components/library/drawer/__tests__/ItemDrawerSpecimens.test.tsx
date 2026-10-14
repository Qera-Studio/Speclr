import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ItemDrawerSpecimens } from '../ItemDrawerSpecimens';
import { entryOf } from '../../catalogue';

/**
 * The drawer experiment: the services page's item drawer, over seeded rows held
 * in state. What matters is that it is live and that it writes nowhere, which
 * is why no server action is mocked: importing one would fail this file.
 */

const entry = entryOf('item-drawer');

it('opens a seeded item in the drawer and saves an edit into the table', async () => {
  const user = userEvent.setup();
  render(<ItemDrawerSpecimens entry={entry} />);

  await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);
  const drawer = await screen.findByRole('dialog');
  expect(within(drawer).getByText('1 of 52')).toBeInTheDocument();

  const name = within(drawer).getByLabelText('Name');
  await user.clear(name);
  await user.type(name, 'Kickoff workshop');
  await user.click(within(drawer).getByRole('button', { name: 'Save item' }));

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('Kickoff workshop')).toBeInTheDocument();
});

it('pages to the next item without closing', async () => {
  const user = userEvent.setup();
  render(<ItemDrawerSpecimens entry={entry} />);

  await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);
  const drawer = await screen.findByRole('dialog');
  await user.click(within(drawer).getByRole('button', { name: 'Next' }));

  expect(within(drawer).getByText('2 of 52')).toBeInTheDocument();
});
