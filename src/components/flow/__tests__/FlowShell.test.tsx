import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import FlowShell, { FinishPanel, useActionsSlot } from '../FlowShell';
import { StepActionsSlot, StepForm } from '../stepKit';
import type { FlowStep } from '../steps';

/**
 * The frame both flows are built on.
 *
 * `ClientOnboarding` is the regression suite for this file in practice: its
 * twelve test files were untouched by the extraction and stayed green, which
 * is what proves the move changed no behaviour. These tests cover the shell's
 * own contract, including the two things onboarding does not use and the
 * contract builder will: `fill`, and a locked step before there is a record.
 */

interface Draft {
  named: boolean;
}

const STEPS: readonly FlowStep<Draft>[] = [
  { key: 'one', short: 'One', title: 'The first', needsRecord: false, isComplete: (d) => d.named },
  { key: 'two', short: 'Two', title: 'The second', needsRecord: true, isComplete: () => false },
  { key: 'three', short: 'Three', title: 'The third', needsRecord: true, isComplete: () => false },
];

function Harness({
  active = 0,
  record = null,
  finishing = false,
  fill = false,
  chrome = true,
  back,
  onSelect = () => {},
}: {
  active?: number;
  record?: Draft | null;
  finishing?: boolean;
  fill?: boolean;
  chrome?: boolean;
  back?: { label: string; go: () => void };
  onSelect?: (index: number) => void;
}) {
  const [actions, setActions] = useActionsSlot();
  return (
    <FlowShell
      steps={STEPS}
      active={active}
      record={record}
      title="A flow"
      finishing={finishing}
      finishPanel={<FinishPanel heading="All done">The record is ready.</FinishPanel>}
      back={back}
      onSelect={onSelect}
      onActionsSlot={setActions}
      fill={fill}
      chrome={chrome}
    >
      <StepActionsSlot.Provider value={actions}>
        <StepForm
          onSubmit={(e) => e.preventDefault()}
          serverError={null}
          submitting={false}
          submitLabel="Continue"
        >
          <input aria-label="A field" />
        </StepForm>
      </StepActionsSlot.Provider>
    </FlowShell>
  );
}

describe('FlowShell', () => {
  /**
   * Colour is never the only signal for which step you are on: the current one
   * carries `aria-current="step"`, which is also the attribute
   * `design-system.test.ts` bans outside this folder.
   */
  it('marks the current step for assistive tech', () => {
    render(<Harness active={1} record={{ named: true }} />);

    expect(screen.getByRole('button', { name: /Two/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByRole('button', { name: /One/ })).not.toHaveAttribute(
      'aria-current',
    );
  });

  /**
   * A step that needs a saved record is disabled before there is one, which is
   * the honest state: the alternative is a link that fails on arrival.
   */
  it('locks the steps that need a record until there is one', () => {
    render(<Harness />);

    expect(screen.getByRole('button', { name: /One/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Two/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Three/ })).toBeDisabled();
  });

  it('unlocks them once the record exists', () => {
    render(<Harness record={{ named: true }} />);

    expect(screen.getByRole('button', { name: /Two/ })).toBeEnabled();
  });

  /** A completed step says so beyond its colour. */
  it('announces a completed step', () => {
    render(<Harness record={{ named: true }} />);

    expect(screen.getByRole('button', { name: /One \(complete\)/ })).toBeInTheDocument();
  });

  it('walks to the step that was clicked', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(<Harness record={{ named: true }} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /Three/ }));

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  /**
   * The submit button belongs to the step (it holds that step's `submitting`
   * and label) but must sit in the shell's pinned footer, which is what the
   * portal is for. The tell is that it renders *outside* the form element.
   */
  it('portals the step’s submit into the pinned footer', () => {
    render(<Harness />);

    const submit = screen.getByRole('button', { name: 'Continue' });
    expect(submit).toBeInTheDocument();
    expect(submit.closest('form')).toBeNull();
    // And it can still submit the form it left, by id.
    expect(submit).toHaveAttribute('form', 'client-onboarding-step');
  });

  it('calls back when the arrow is pressed', async () => {
    const user = userEvent.setup();
    const go = jest.fn();
    render(<Harness active={1} record={{ named: true }} back={{ label: 'Back to The first', go }} />);

    await user.click(screen.getByRole('button', { name: 'Back to The first' }));

    expect(go).toHaveBeenCalled();
  });

  /**
   * A flow can turn the shell's own furniture off and keep the band.
   *
   * `chrome={false}` drops the step row and the pinned footer, leaving the
   * middle band and nothing else. The contract builder is the caller: its
   * preview phase is a document, and a track across the top of a document plus
   * a footer under it are two bands of wizard around something that is not one.
   *
   * Two things it deliberately does *not* drop. The `h1` stays, because it is
   * the only name a screen reader has for the page, and it is `sr-only`
   * already. And the actions slot stays mounted, so a phase portalling into it
   * is not left holding a node that never arrives; the caller is free to render
   * its actions somewhere else, which is what the floating container does.
   */
  it('drops the step row and the footer when the chrome is off', () => {
    render(<Harness active={1} record={{ named: true }} chrome={false} />);

    expect(screen.queryByRole('navigation', { name: 'Steps' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Two/ })).not.toBeInTheDocument();
    // The page keeps its name.
    expect(screen.getByRole('heading', { name: 'A flow' })).toBeInTheDocument();
  });

  /** The back arrow is part of the footer, so it goes with it. */
  it('drops the back arrow with the footer', () => {
    const go = jest.fn();
    render(
      <Harness
        active={1}
        record={{ named: true }}
        chrome={false}
        back={{ label: 'Back to The first', go }}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Back to The first' })).not.toBeInTheDocument();
  });

  /** And the step still renders, which is the whole point of keeping the band. */
  it('still renders the step', () => {
    render(<Harness active={1} record={{ named: true }} chrome={false} />);

    expect(screen.getByLabelText('A field')).toBeInTheDocument();
  });

  describe('while finishing', () => {
    it('shows the finish panel instead of the step', () => {
      render(<Harness record={{ named: true }} finishing />);

      expect(screen.getByRole('status')).toHaveTextContent('All done');
      expect(screen.queryByLabelText('A field')).not.toBeInTheDocument();
    });

    /** Every step reads as done, ticking left to right. */
    it('reads every step as complete', () => {
      render(<Harness record={{ named: true }} finishing />);

      for (const short of ['One', 'Two', 'Three']) {
        expect(
          screen.getByRole('button', { name: new RegExp(`${short} \\(complete\\)`) }),
        ).toBeDisabled();
      }
    });

    /** The way out goes with the step: there is nothing left to save. */
    it('drops the back arrow and the right action', () => {
      render(
        <Harness
          record={{ named: true }}
          finishing
          back={{ label: 'Back to The first', go: jest.fn() }}
        />,
      );

      expect(
        screen.queryByRole('button', { name: 'Back to The first' }),
      ).not.toBeInTheDocument();
    });
  });

  /**
   * `fill` is what a phase that is its own layout needs: a preview beside a
   * rail, or a ledger of cards, rather than a column of fields. Onboarding
   * never passes it; the contract builder's scope and preview phases do.
   */
  describe('fill', () => {
    const columnOf = (container: HTMLElement) =>
      container.querySelector('section > div')!;

    it('centres a narrow column by default', () => {
      const { container } = render(<Harness />);

      expect(columnOf(container).className).toContain('max-w-6xl');
    });

    it('gives the whole band to a filling phase', () => {
      const { container } = render(<Harness fill />);

      const column = columnOf(container);
      expect(column.className).not.toContain('max-w-6xl');
      expect(column.className).toContain('flex-1');
    });

    /**
     * The fill is on the centred column, never on the scroll box around it:
     * that box is the whole band, so filling it paints the empty track the
     * form floats in and runs to the card's own edges. A `fill` phase draws
     * its own insets and takes neither.
     */
    it('fills the column rather than the band it floats in', () => {
      const { container } = render(<Harness />);

      expect(container.querySelector('section')!.className).not.toContain('bg-card');
      expect(columnOf(container).className).toContain('bg-card');
    });
  });

  /**
   * The step remounts on every move, which is what replays the slide and what
   * makes react-hook-form re-read `defaultValues`. Without it, stepping away
   * and back shows the previous step's values.
   */
  it('remounts the step when the active one changes', async () => {
    const user = userEvent.setup();

    function Stepping() {
      const [active, setActive] = useState(0);
      return (
        <div>
          <button type="button" onClick={() => setActive(1)}>
            Move
          </button>
          <Harness active={active} record={{ named: true }} />
        </div>
      );
    }

    render(<Stepping />);
    await user.type(screen.getByLabelText('A field'), 'typed');
    expect(screen.getByLabelText('A field')).toHaveValue('typed');

    await user.click(screen.getByRole('button', { name: 'Move' }));

    expect(screen.getByLabelText('A field')).toHaveValue('');
  });
});
