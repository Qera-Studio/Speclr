import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClauseDrawerSpecimens } from '../ClauseDrawerSpecimens';
import { entryOf } from '../../catalogue';

/**
 * The clause drawer replica, over the seeded clauses held in state. No server
 * action is mocked: the specimen importing one would fail this file, which is
 * the guard that it writes nowhere.
 */

const entry = entryOf('clause-drawer');

it('pages between clauses without closing', async () => {
  const user = userEvent.setup();
  render(<ClauseDrawerSpecimens entry={entry} />);

  await user.click(screen.getByRole('button', { name: 'Edit Definitions and Interpretation' }));
  const drawer = await screen.findByRole('dialog');
  expect(within(drawer).getByText('Clause 1')).toBeInTheDocument();

  await user.click(within(drawer).getByRole('button', { name: 'Next clause' }));
  // The drawer is keyed by clause number, as the real one is, so paging mounts
  // a fresh panel and the old reference is gone.
  expect(within(await screen.findByRole('dialog')).getByText('Clause 2')).toBeInTheDocument();
});

it('saves a heading on the debounce and shows it in the table', async () => {
  jest.useFakeTimers();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  render(<ClauseDrawerSpecimens entry={entry} />);

  await user.click(screen.getByRole('button', { name: 'Edit Definitions and Interpretation' }));
  const drawer = await screen.findByRole('dialog');
  const heading = within(drawer).getByLabelText('Heading');
  await user.clear(heading);
  await user.type(heading, 'Definitions');
  expect(within(drawer).getByRole('status')).toHaveTextContent('Unsaved changes');
  expect(within(drawer).getAllByText('Unsaved changes')).toHaveLength(2);

  act(() => {
    jest.advanceTimersByTime(800);
  });
  expect(within(drawer).getByRole('status')).toHaveTextContent('Saved');
  // The title's badge goes once the write lands; only the status line,
  // which is for screen readers, says "Saved".
  expect(within(drawer).queryByText('Unsaved changes')).not.toBeInTheDocument();
  expect(within(drawer).getAllByText('Saved')).toHaveLength(1);

  await user.click(within(drawer).getByRole('button', { name: 'Back to the clause list' }));
  expect(screen.getByText('Definitions')).toBeInTheDocument();
  jest.useRealTimers();
});

it('adds a paragraph from its button', async () => {
  const user = userEvent.setup();
  render(<ClauseDrawerSpecimens entry={entry} />);

  await user.click(screen.getByRole('button', { name: 'Edit Definitions and Interpretation' }));
  const drawer = await screen.findByRole('dialog');
  const before = within(drawer).getAllByRole('textbox').length;

  await user.click(within(drawer).getByRole('button', { name: 'Point' }));

  expect(within(drawer).getAllByRole('textbox')).toHaveLength(before + 1);
});
