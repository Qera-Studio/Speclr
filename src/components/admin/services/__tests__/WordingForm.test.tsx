import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WordingForm from '../WordingForm';
import { SERVICES } from '@/lib/domain/contract/seed/services';
import { saveServiceSection } from '@/server/actions/services';

jest.mock('@/server/actions/services', () => ({
  saveServiceSection: jest.fn(async () => ({ success: true })),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

/**
 * The wording form: every prose field of a Service, editable in the app.
 *
 * This is what retires the code file as the place a Service's text lives. A
 * list of paragraphs is a textarea with one paragraph per line, the pattern
 * the details dialog already uses for the overview; a Limits or Fee table is
 * a list of label/value rows. What it posts is the wording section and only
 * that, so the menu and the rate cannot be touched from here.
 */

const build = SERVICES.find((s) => s.code === '06')!;
const posted = () => (saveServiceSection as jest.Mock).mock.calls[0][2];

beforeEach(() => jest.clearAllMocks());

describe('WordingForm', () => {
  it('opens with the stored wording, one paragraph per line', () => {
    render(<WordingForm service={build} />);

    expect(screen.getByLabelText('What is included')).toHaveValue(build.included.join('\n'));
    expect(screen.getByLabelText('Completion criteria')).toHaveValue(build.completion.join('\n'));
  });

  it('splits a textarea into paragraphs and drops the blank lines', async () => {
    const user = userEvent.setup();
    render(<WordingForm service={{ ...build, included: [] }} />);

    await user.type(screen.getByLabelText('What is included'), 'One thing{enter}{enter}Another');
    await user.click(screen.getByRole('button', { name: 'Save wording' }));

    expect(posted().included).toEqual(['One thing', 'Another']);
  });

  it('posts a limits row as a label and a value', async () => {
    const user = userEvent.setup();
    render(<WordingForm service={{ ...build, limits: [] }} />);

    await user.click(screen.getByRole('button', { name: 'Add a limit' }));
    const row = within(screen.getByRole('group', { name: 'Limit 1' }));
    await user.type(row.getByLabelText('Label'), 'Page templates');
    // `[[` is how user-event types a literal bracket; `[x]` is a key.
    await user.type(row.getByLabelText('Value'), '[[10]');
    await user.click(screen.getByRole('button', { name: 'Save wording' }));

    expect(posted().limits).toEqual([{ label: 'Page templates', value: '[10]' }]);
  });

  it('posts the fee rows the same way', async () => {
    const user = userEvent.setup();
    render(<WordingForm service={{ ...build, fee: [] }} />);

    await user.click(screen.getByRole('button', { name: 'Add a fee row' }));
    const row = within(screen.getByRole('group', { name: 'Fee row 1' }));
    await user.type(row.getByLabelText('Label'), 'Fee');
    await user.type(row.getByLabelText('Value'), '[[ ]');
    await user.click(screen.getByRole('button', { name: 'Save wording' }));

    expect(posted().fee).toEqual([{ label: 'Fee', value: '[ ]' }]);
  });

  /**
   * The section is exactly the wording fields. Anything commercial (the menu,
   * the rate) or identifying (the name, the schedule) is somebody else's form,
   * and a key that is not posted is a key that cannot be blanked.
   */
  it('posts every wording field and nothing else', async () => {
    const user = userEvent.setup();
    render(<WordingForm service={build} />);

    await user.click(screen.getByRole('button', { name: 'Save wording' }));

    expect(Object.keys(posted()).sort()).toEqual(
      [
        'accountTerms',
        'completion',
        'fee',
        'included',
        'limits',
        'limitsNotes',
        'receives',
        'receivesNotes',
        'thirdPartyCosts',
      ].sort(),
    );
    expect(posted().included).toEqual(build.included);
    expect(posted().fee).toEqual(build.fee);
  });

  it('says that brackets become blanks', () => {
    render(<WordingForm service={build} />);
    expect(screen.getByText(/\[brackets\]/i)).toBeInTheDocument();
  });

  /** A Retainer Part's headings say "each cycle", and the form's should agree. */
  it('uses the same section headings the sheet prints', () => {
    const retainer = SERVICES.find((s) => s.scheduleKey === 'retainer')!;
    render(<WordingForm service={retainer} />);
    expect(screen.getByLabelText('What is included each cycle')).toBeInTheDocument();
    expect(screen.getByLabelText('How delivery is measured')).toBeInTheDocument();
  });
});
