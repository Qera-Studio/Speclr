import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IconSpecCard from '../IconSpecCard';
import { ICON_SPECS } from '@/lib/spec/iconSpecData';
import type { SlotState } from '@/lib/spec/types';

const spec = ICON_SPECS.find((s) => s.id === 'favicon-192')!;
const emptySlotState: SlotState = { reviewed: false, passed: null, notes: '' };

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { writable: true, value: jest.fn(() => 'blob:mock') });
  Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: jest.fn() });
});

describe('IconSpecCard', () => {
  it('renders the spec name as a heading', () => {
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />);
    expect(screen.getByRole('heading', { name: spec.name })).toBeInTheDocument();
  });

  it('renders the filename and a priority badge', () => {
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />);
    expect(screen.getByText(spec.filename)).toBeInTheDocument();
    expect(screen.getByText(spec.priority === 'required' ? 'Required' : 'Nice to have')).toBeInTheDocument();
  });

  it('upload control is reachable by keyboard', () => {
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={() => {}} />);
    expect(screen.getByLabelText(/upload file/i)).not.toHaveAttribute('tabindex', '-1');
  });

  it('"mark reviewed" checkbox calls onUpdate when toggled', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={onUpdate} />);
    await user.click(screen.getByRole('checkbox', { name: /mark reviewed/i }));
    expect(onUpdate).toHaveBeenCalledWith({ reviewed: true });
  });

  it('notes textarea calls onUpdate as the user types', async () => {
    const onUpdate = jest.fn();
    const user = userEvent.setup();
    render(<IconSpecCard spec={spec} slotState={emptySlotState} onUpdate={onUpdate} />);
    await user.type(screen.getByLabelText(/notes/i), 'x');
    expect(onUpdate).toHaveBeenCalled();
  });
});
