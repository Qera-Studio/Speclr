import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamStep from '../TeamStep';
import type { StudioMember } from '@/lib/profile';
import type { ClientRecord } from '@/lib/domain/types';

jest.mock('@/server/actions/clients', () => ({
  saveClientSection: jest.fn(),
}));
const { saveClientSection } = jest.requireMock('@/server/actions/clients') as {
  saveClientSection: jest.Mock;
};

const client: ClientRecord = {
  id: 'c1',
  name: 'Acme',
  companyName: 'Acme Co.',
  address: 'Ghaziabad',
  email: 'a@acme.test',
  phone: '+919876543210',
  gstin: '',
  createdAt: 0,
  updatedAt: 0,
};

const people: StudioMember[] = [
  { id: 'e1', name: 'Shivanshu Pareek', role: 'Director', engagementType: 'employee', departed: false },
  { id: 'e2', name: 'Ria Sharma', role: 'Director', engagementType: 'employee', departed: false },
  { id: 'e3', name: 'Aarav Gupta', role: 'Intern', engagementType: 'intern', departed: false },
  { id: 'e4', name: 'Old Hand', role: 'Designer', engagementType: 'employee', departed: true },
];

const props = { client, onSaved: jest.fn(), submitLabel: 'Commercial terms', kind: 'company' as const };

beforeEach(() => {
  jest.clearAllMocks();
  saveClientSection.mockResolvedValue({ success: true, id: 'c1' });
});

describe('TeamStep', () => {
  /**
   * The two questions are different shapes, and the roles are what say so to a
   * screen reader: one lead, any number of team members.
   */
  it('offers the lead as radios and the team as checkboxes', () => {
    render(<TeamStep {...props} people={people} />);

    // Three assignable people, twice over. The departed one is on neither list.
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.queryByText('Old Hand')).not.toBeInTheDocument();
  });

  it('saves ids, never names', async () => {
    const user = userEvent.setup();
    render(<TeamStep {...props} people={people} />);

    await user.click(screen.getAllByRole('radio')[0]);
    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(screen.getByRole('button', { name: /commercial terms/i }));

    await waitFor(() => expect(saveClientSection).toHaveBeenCalled());
    expect(saveClientSection).toHaveBeenCalledWith('c1', 'team', {
      leadEmployeeId: 'e1',
      teamEmployeeIds: ['e2'],
    });
  });

  /**
   * Both fields are optional, so there has to be a way back to "nobody" once
   * somebody has been picked. A radio group alone has none: clicking the
   * selected radio normally does nothing.
   */
  it('clears the lead when the chosen person is clicked again', async () => {
    const user = userEvent.setup();
    render(<TeamStep {...props} people={people} />);

    await user.click(screen.getAllByRole('radio')[0]);
    expect(screen.getAllByRole('radio')[0]).toBeChecked();

    await user.click(screen.getAllByRole('radio')[0]);
    expect(screen.getAllByRole('radio')[0]).not.toBeChecked();
  });

  /**
   * Somebody who has left still shows where they are *already* assigned.
   * Dropping them would rewrite who worked on a client in order to tidy a list.
   */
  it('keeps a departed member visible where they are already assigned', () => {
    render(
      <TeamStep
        {...props}
        client={{ ...client, leadEmployeeId: 'e4', teamEmployeeIds: ['e4'] }}
        people={people}
      />,
    );

    expect(screen.getAllByText('Old Hand')).toHaveLength(2);
    expect(screen.getAllByText('No longer here')).toHaveLength(2);
    // Still four options per list rather than three: the departed one is added
    // back only because this client already names them.
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  /** A studio with nobody in it says so, and names where people come from. */
  it('explains itself when there is nobody to assign', () => {
    render(<TeamStep {...props} people={[]} />);

    expect(screen.getAllByText(/nobody to assign yet/i)).toHaveLength(2);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});
