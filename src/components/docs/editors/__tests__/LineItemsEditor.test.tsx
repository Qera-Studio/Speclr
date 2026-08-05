import { useFieldArray, useForm } from 'react-hook-form';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LineItemsEditor from '../LineItemsEditor';
import { emptyLineItem, type EditorFormValues } from '../useDocumentForm';

function Harness({ count = 2 }: { count?: number }) {
  const form = useForm<EditorFormValues>({
    defaultValues: {
      lineItems: Array.from({ length: count }, (_, i) => ({
        ...emptyLineItem(),
        description: `Item ${i + 1}`,
        rate: '1000',
      })),
    } as EditorFormValues,
  });
  const fieldArray = useFieldArray({ control: form.control, name: 'lineItems' });
  return (
    <LineItemsEditor control={form.control} register={form.register} fieldArray={fieldArray} />
  );
}

/** Items start collapsed, so most interactions need the row opened first. */
async function expandRow(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole('button', { name }));
}

async function confirmRemoval(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole('alertdialog');
  await user.click(within(dialog).getByRole('button', { name: /^remove$/i }));
}

describe('LineItemsEditor', () => {
  it('asks before removing a line item', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await expandRow(user, /Item 1/);

    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));

    // Money on a document — removal is confirmed, never a single stray click.
    // (The open dialog makes the rest of the panel inert, so the rows behind it
    // are deliberately not queryable here; the cancel test covers survival.)
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });

  it('removes the item once confirmed', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await expandRow(user, /Item 1/);

    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));
    await confirmRemoval(user);

    const rows = screen.getAllByRole('button', { name: /Item \d/ });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveAccessibleName(expect.stringContaining('Item 2') as unknown as string);
  });

  it('keeps the item when the user cancels', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await expandRow(user, /Item 1/);

    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(screen.getAllByRole('button', { name: /Item \d/ })).toHaveLength(2);
  });

  it('will not let the last line item be removed', async () => {
    const user = userEvent.setup();
    render(<Harness count={1} />);
    await expandRow(user, /Item 1/);

    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));

    // An invoice with no line items has nothing to bill for.
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Item \d/ })).toHaveLength(1);
  });

  it('adds a line item', async () => {
    const user = userEvent.setup();
    render(<Harness count={1} />);

    await user.click(screen.getByRole('button', { name: /add line item/i }));

    expect(screen.getAllByLabelText(/^description$/i)).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Untitled item/ })).toHaveLength(1);
  });
});

describe('LineItemsEditor collapsing', () => {
  it('starts every item collapsed', () => {
    render(<Harness />);

    // The fields are the point of the editor; if they render while collapsed,
    // the collapse is decorative and the rail is still buried.
    expect(screen.queryByLabelText(/^description$/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Item \d/ })).toHaveLength(2);
  });

  it('summarises the item so it can be checked without expanding', () => {
    render(<Harness count={1} />);

    const summary = screen.getByRole('button', { name: /Item 1/ });
    expect(summary).toHaveAccessibleName(expect.stringContaining('₹ 1,000.00') as unknown as string);
    expect(summary).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands the fields on click', async () => {
    const user = userEvent.setup();
    render(<Harness count={1} />);

    await expandRow(user, /Item 1/);

    expect(screen.getByLabelText(/^description$/i)).toHaveValue('Item 1');
    expect(screen.getByRole('button', { name: /Item 1/ })).toHaveAttribute('aria-expanded', 'true');
  });

  /** A collapsed empty row would read "Untitled item" with nowhere to type. */
  it('opens a newly added item', async () => {
    const user = userEvent.setup();
    render(<Harness count={1} />);

    await user.click(screen.getByRole('button', { name: /add line item/i }));

    expect(screen.getByLabelText(/^description$/i)).toHaveValue('');
  });

  /**
   * Open state is keyed by index, so removing a row has to shift the map down.
   * Without that, deleting an open row leaves its neighbour wrongly expanded.
   */
  it('does not hand a removed row\'s open state to its neighbour', async () => {
    const user = userEvent.setup();
    render(<Harness count={2} />);

    await expandRow(user, /Item 1/);
    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));
    await confirmRemoval(user);

    expect(screen.getByRole('button', { name: /Item 2/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByLabelText(/^description$/i)).not.toBeInTheDocument();
  });
});
