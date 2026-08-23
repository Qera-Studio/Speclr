import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GstinField, PanField, TanField } from '../fields';
import { gstinSchema, panSchema, tanSchema } from '@/lib/domain/fields';

/**
 * The identifier inputs, and one regression that mattered more than it looked.
 *
 * A field showed its error only after it had been left or filled, which is
 * right. It also *read* the error only then, which was not: react-hook-form
 * subscribes a component to `errors` when it reads them, so a field that had
 * never read its own error was never re-rendered when one arrived. The result
 * was that once one identifier on a form was wrong, the rest silently stopped
 * reporting, on the step whose whole job is checking numbers.
 */
const schema = z.object({
  gstin: gstinSchema({ required: 'A registered client has a GSTIN.' }),
  pan: panSchema({ holder: [] }),
  tan: tanSchema(),
});

function Harness() {
  const { control } = useForm<z.infer<typeof schema>>({
    mode: 'onTouched',
    resolver: zodResolver(schema),
    defaultValues: { gstin: '', pan: '', tan: '' },
  });
  return (
    <form>
      <GstinField control={control} name="gstin" id="gstin" />
      <PanField control={control} name="pan" id="pan" />
      <TanField control={control} name="tan" id="tan" />
    </form>
  );
}

it('reports a second bad identifier once a first one is already wrong', async () => {
  const user = userEvent.setup();
  render(<Harness />);

  // The first error lands on its own: an empty GSTIN on a registered client.
  await user.click(screen.getByLabelText('GSTIN'));
  await user.tab();
  expect(
    await screen.findByText(/A registered client has a GSTIN/i),
  ).toBeInTheDocument();

  // The one that used to be swallowed.
  await user.type(screen.getByLabelText('TAN'), 'NOPE');
  await user.tab();
  expect(await screen.findByText(/Expected a TAN/i)).toBeInTheDocument();

  // And still the one after that.
  await user.type(screen.getByLabelText('PAN'), 'BADPAN1234');
  expect(await screen.findByText(/Expected a PAN/i)).toBeInTheDocument();
});

it('says nothing about a field nobody has touched', () => {
  render(<Harness />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
