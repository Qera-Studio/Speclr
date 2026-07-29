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
      })),
    } as EditorFormValues,
  });
  const fieldArray = useFieldArray({ control: form.control, name: 'lineItems' });
  return <LineItemsEditor register={form.register} fieldArray={fieldArray} />;
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
    expect(screen.getAllByLabelText(/^description$/i)).toHaveLength(2);
  });

  it('removes the item once confirmed', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));
    await confirmRemoval(user);

    expect(screen.getAllByLabelText(/^description$/i)).toHaveLength(1);
    expect(screen.getByLabelText(/^description$/i)).toHaveValue('Item 2');
  });

  it('keeps the item when the user cancels', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));

    expect(screen.getAllByLabelText(/^description$/i)).toHaveLength(2);
  });

  it('will not let the last line item be removed', async () => {
    const user = userEvent.setup();
    render(<Harness count={1} />);

    await user.click(screen.getByRole('button', { name: 'Remove line item 1' }));

    // An invoice with no line items has nothing to bill for.
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/^description$/i)).toHaveLength(1);
  });

  it('adds a line item', async () => {
    const user = userEvent.setup();
    render(<Harness count={1} />);

    await user.click(screen.getByRole('button', { name: /add line item/i }));

    expect(screen.getAllByLabelText(/^description$/i)).toHaveLength(2);
  });
});
