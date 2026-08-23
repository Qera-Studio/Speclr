import { render, screen } from '@testing-library/react';

// `stepKit` imports the Server Action module, which pulls in `next/cache`.
// Nothing here calls it: the frame only renders.
jest.mock('@/server/actions/clients', () => ({ saveClientSection: jest.fn() }));

import { StepForm } from '../stepKit';
import { Input } from '@/components/ui/input';

/**
 * The frame all seven onboarding steps share.
 *
 * Two behaviours live here rather than in any one step, so they are tested
 * here rather than seven times: where the caret lands on arrival, and whether
 * the step says it can be skipped.
 */

function frame(props: Partial<React.ComponentProps<typeof StepForm>> = {}) {
  return (
    <StepForm
      onSubmit={jest.fn()}
      serverError={null}
      submitting={false}
      submitLabel="Tax"
      {...props}
    >
      <label htmlFor="a">First</label>
      <Input id="a" defaultValue="already filled" />
      <label htmlFor="b">Second</label>
      <Input id="b" />
      <label htmlFor="c">Third</label>
      <Input id="c" />
    </StepForm>
  );
}

it('puts the caret in the first field that is empty, not the first field', () => {
  render(frame());
  expect(screen.getByLabelText('Second')).toHaveFocus();
});

it('takes focus from nobody when the step is already filled in', () => {
  render(
    <StepForm onSubmit={jest.fn()} serverError={null} submitting={false} submitLabel="Tax">
      <label htmlFor="a">Only</label>
      <Input id="a" defaultValue="done" />
    </StepForm>,
  );
  expect(document.body).toHaveFocus();
});

it('leaves a read-only field alone: there is nothing to type into it', () => {
  render(
    <StepForm onSubmit={jest.fn()} serverError={null} submitting={false} submitLabel="Tax">
      <label htmlFor="a">Derived</label>
      <Input id="a" readOnly />
      <label htmlFor="b">Yours</label>
      <Input id="b" />
    </StepForm>,
  );
  expect(screen.getByLabelText('Yours')).toHaveFocus();
});

it('says so once when nothing on the step is required', () => {
  render(frame({ allOptional: true }));
  expect(screen.getByText(/Nothing here is required/i)).toBeInTheDocument();
});

it('says nothing of the kind on a step that does require something', () => {
  render(frame());
  expect(screen.queryByText(/Nothing here is required/i)).not.toBeInTheDocument();
});
