import { completedSteps, resumeStep, stepIndex, type FlowStep } from '../steps';

/**
 * The generic step helpers, which onboarding's own three now delegate to.
 *
 * Tested here against a record that is not a client, because that is the whole
 * reason they moved: they were concrete inside `onboarding/steps.ts` until the
 * contract builder needed the same three answers about a different record.
 */

interface Draft {
  who: string;
  what: string[];
  priced: boolean;
}

const STEPS: readonly FlowStep<Draft>[] = [
  {
    key: 'who',
    short: 'Who',
    title: 'Who it is for',
    needsRecord: false,
    isComplete: (d) => d.who !== '',
  },
  {
    key: 'what',
    short: 'What',
    title: 'What is in it',
    needsRecord: true,
    isComplete: (d) => d.what.length > 0,
  },
  {
    key: 'price',
    short: 'Price',
    title: 'What it costs',
    needsRecord: true,
    isComplete: (d) => d.priced,
  },
];

const draft = (over: Partial<Draft> = {}): Draft => ({
  who: '',
  what: [],
  priced: false,
  ...over,
});

describe('stepIndex', () => {
  it('finds a step by its slug', () => {
    expect(stepIndex(STEPS, 'what')).toBe(1);
  });

  /**
   * An unknown slug is the first step rather than nothing. That is also how a
   * step this record does not have resolves, which is a real case: onboarding
   * drops Contacts for an individual, so `?step=contacts` arrives for a flow
   * that has no such step.
   */
  it('reads an unknown slug as the first step', () => {
    expect(stepIndex(STEPS, 'nonsense')).toBe(0);
    expect(stepIndex(STEPS, null)).toBe(0);
    expect(stepIndex(STEPS, undefined)).toBe(0);
  });
});

describe('completedSteps', () => {
  it('counts only what the record carries', () => {
    expect(completedSteps(STEPS, draft())).toBe(0);
    expect(completedSteps(STEPS, draft({ who: 'Clayora' }))).toBe(1);
    expect(
      completedSteps(STEPS, draft({ who: 'Clayora', what: ['06'], priced: true })),
    ).toBe(3);
  });

  /**
   * Counted against the steps passed in, never against a fixed list, so a flow
   * that drops a conditional step is never "2 of 3" with a third nobody saw.
   */
  it('counts against the steps it is given', () => {
    const shorter = STEPS.slice(0, 2);
    const record = draft({ who: 'Clayora', what: ['06'], priced: true });

    expect(completedSteps(shorter, record)).toBe(2);
  });
});

describe('resumeStep', () => {
  /**
   * The first gap, not the step after the count. A record can carry the last
   * step and not the second, and the count would send the reader past the hole
   * rather than to it.
   */
  it('opens on the first step with nothing in it', () => {
    expect(resumeStep(STEPS, draft({ who: 'Clayora', priced: true }))).toBe('what');
  });

  it('opens on the last step when there are no gaps', () => {
    const full = draft({ who: 'Clayora', what: ['06'], priced: true });

    expect(resumeStep(STEPS, full)).toBe('price');
  });

  it('opens on the first step when nothing is filled', () => {
    expect(resumeStep(STEPS, draft())).toBe('who');
  });
});
