import { useFieldArray, useForm } from 'react-hook-form';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LineItemsEditor from '../LineItemsEditor';
import { emptyLineItem, type EditorFormValues } from '../useDocumentForm';

function Harness({
  count = 2,
  lockNames = false,
}: {
  count?: number;
  lockNames?: boolean;
}) {
  const form = useForm<EditorFormValues>({
    defaultValues: {
      lineItems: Array.from({ length: count }, (_, i) => ({
        ...emptyLineItem(),
        description: `Item ${i + 1}`,
        rate: '1000',
        // A SAC is what marks a row as a Service's rather than the operator's,
        // which is the thing `lockNames` acts on.
        sacCode: lockNames ? '998314' : '',
      })),
    } as EditorFormValues,
  });
  const fieldArray = useFieldArray({ control: form.control, name: 'lineItems' });
  return (
    <LineItemsEditor
      control={form.control}
      register={form.register}
      fieldArray={fieldArray}
      showSac
      lockNames={lockNames}
    />
  );
}

/** Rows arrive locked where a Service owns them, so those need opening first. */
async function unlockRow(user: ReturnType<typeof userEvent.setup>, n: number) {
  await user.click(screen.getByRole('button', { name: `Unlock line item ${n}` }));
}

/** One per row, and only where the row has something worth locking. */
function rowLocks() {
  return screen.queryAllByRole('button', { name: /^(un)?lock line item \d$/i });
}

/** Every row, locked or not — one description input each, open or hidden. */
function rowCount() {
  return screen.getAllByRole('button', { name: /^remove line item \d$/i }).length;
}

async function confirmRemoval(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: /^remove$/i }));
}

describe('LineItemsEditor', () => {
  it('asks before removing a line item', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));

    // Money on a document — removal is confirmed, never a single stray click.
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });

  it('removes the item once confirmed', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));
    await confirmRemoval(user);

    expect(rowCount()).toBe(1);
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('keeps the item when the user cancels', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(rowCount()).toBe(2);
  });

  it('will not let the last line item be removed', async () => {
    const user = userEvent.setup();
    render(<Harness count={1} />);

    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));

    // An invoice with no line items has nothing to bill for.
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(rowCount()).toBe(1);
  });

  it('adds a line item', async () => {
    const user = userEvent.setup();
    render(<Harness count={1} />);

    await user.click(screen.getByRole('button', { name: /add line item/i }));

    expect(screen.getAllByLabelText(/^description$/i)).toHaveLength(2);
    expect(screen.getByText('Untitled item')).toBeInTheDocument();
  });

  /**
   * The lock protects a description that came from a Service. A row with no
   * Service behind it — every row on a slip, and every custom invoice line —
   * has nothing to protect, so a padlock over it would be a control whose only
   * purpose is to be turned off again.
   */
  it('gives an unowned row no lock at all, and leaves it open', () => {
    render(<Harness count={2} />);

    expect(rowLocks()).toHaveLength(0);
    expect(screen.getAllByLabelText(/^description$/i)).toHaveLength(2);
  });
});

describe('LineItemsEditor locking', () => {
  it('starts every seeded item locked', () => {
    render(<Harness lockNames />);

    // The fields are the point of the editor; if they render while locked, the
    // lock is decorative and the rail is still buried.
    expect(screen.queryByLabelText(/^rate/i)).not.toBeInTheDocument();
    expect(rowLocks()).toHaveLength(2);
  });

  it('summarises the item so it can be checked without unlocking', () => {
    render(<Harness count={1} lockNames />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Unlock line item 1' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('opens the fields on unlock', async () => {
    const user = userEvent.setup();
    render(<Harness count={1} lockNames />);

    await unlockRow(user, 1);

    expect(screen.getByLabelText(/^rate/i)).toHaveValue('1000');
    expect(
      screen.getByRole('button', { name: 'Lock line item 1' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  /** A locked empty row would read "Untitled item" with nowhere to type. */
  it('opens a newly added item', async () => {
    const user = userEvent.setup();
    render(<Harness count={1} lockNames />);

    await user.click(screen.getByRole('button', { name: /add line item/i }));

    expect(screen.getByLabelText(/^description$/i)).toHaveValue('');
  });

  /**
   * Lock state is keyed by index, so removing a row has to shift the map down.
   * Without that, deleting an open row leaves its neighbour wrongly unlocked.
   */
  it("does not hand a removed row's unlocked state to its neighbour", async () => {
    const user = userEvent.setup();
    render(<Harness count={2} lockNames />);

    await unlockRow(user, 1);
    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));
    await confirmRemoval(user);

    expect(
      screen.getByRole('button', { name: 'Unlock line item 1' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByLabelText(/^rate/i)).not.toBeInTheDocument();
  });
});

/**
 * `lockNames` is what stops an invoice line drifting from the Service it was
 * priced against. It has to hold on a *seeded* row and let go on a custom one,
 * or the operator can never bill anything the catalogue does not name.
 */
describe('LineItemsEditor lockNames', () => {
  it("keeps a seeded row's description and SAC read-only", async () => {
    const user = userEvent.setup();
    render(<Harness count={1} lockNames />);

    await unlockRow(user, 1);

    expect(screen.queryByLabelText(/^description$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^sac$/i)).not.toBeInTheDocument();
    // The two figures that genuinely vary are still there.
    expect(screen.getByLabelText(/^rate/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^qty$/i)).toBeInTheDocument();
  });

  it('opens everything on a custom line, and gives it no lock', async () => {
    const user = userEvent.setup();
    render(<Harness count={1} lockNames />);

    await user.click(screen.getByRole('button', { name: /add line item/i }));

    expect(screen.getByLabelText(/^description$/i)).toHaveValue('');
    expect(screen.getByLabelText(/^sac$/i)).toBeInTheDocument();
    // Row 1 is the Service's and still locks; row 2 is the operator's.
    expect(rowLocks()).toHaveLength(1);
  });
});
