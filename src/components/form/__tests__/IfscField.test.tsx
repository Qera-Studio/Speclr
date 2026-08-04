import { useForm } from 'react-hook-form';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/input';
import IfscField from '../IfscField';

interface Values {
  bankName: string;
  branch: string;
  ifsc: string;
}

function Harness({ bankName = '', branch = '' }: { bankName?: string; branch?: string }) {
  const { control, register, setValue } = useForm<Values>({
    defaultValues: { bankName, branch, ifsc: '' },
  });
  return (
    <>
      <label htmlFor="t-bank">Bank name</label>
      <Input id="t-bank" {...register('bankName')} />
      <label htmlFor="t-branch">Branch</label>
      <Input id="t-branch" {...register('branch')} />
      <IfscField
        control={control}
        name="ifsc"
        bankNameField="bankName"
        branchField="branch"
        setValue={setValue}
        id="t-ifsc"
      />
    </>
  );
}

const originalFetch = global.fetch;

function mockLookup(body: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({ ok, json: async () => body });
}

/** Waits past the lookup debounce; see the note in AddressFields.test.tsx. */
async function settleDebounce() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 600));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('IfscField', () => {
  it('uppercases and strips punctuation as you type', async () => {
    mockLookup({ ok: false });
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/ifsc/i), 'kkbk-0000 677');

    expect(screen.getByLabelText(/ifsc/i)).toHaveValue('KKBK0000677');
  });

  it('will not accept more than an IFSC worth of characters', async () => {
    mockLookup({ ok: false });
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/ifsc/i), 'KKBK0000677EXTRA');

    expect(screen.getByLabelText(/ifsc/i)).toHaveValue('KKBK0000677');
  });

  it('fills the bank name and branch for a complete IFSC', async () => {
    mockLookup({ ok: true, bank: 'Kotak Mahindra Bank', branch: 'Ghaziabad' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/ifsc/i), 'KKBK0000677');
    await settleDebounce();

    expect(screen.getByLabelText(/bank name/i)).toHaveValue('Kotak Mahindra Bank');
    expect(screen.getByLabelText(/^branch$/i)).toHaveValue('Ghaziabad');
  });

  it('never looks up an incomplete IFSC', async () => {
    mockLookup({ ok: true, bank: 'Kotak Mahindra Bank' });
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/ifsc/i), 'KKBK00');
    await settleDebounce();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('leaves a bank name and branch that were typed by hand alone', async () => {
    mockLookup({ ok: true, bank: 'Kotak Mahindra Bank', branch: 'Ghaziabad' });
    const user = userEvent.setup();
    render(<Harness bankName="Kotak (Noida)" branch="Sector 62" />);

    await user.type(screen.getByLabelText(/ifsc/i), 'KKBK0000677');
    await settleDebounce();

    expect(screen.getByLabelText(/bank name/i)).toHaveValue('Kotak (Noida)');
    expect(screen.getByLabelText(/^branch$/i)).toHaveValue('Sector 62');
  });

  it('stays silent and keeps the field usable when the lookup fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText(/ifsc/i), 'KKBK0000677');
    await settleDebounce();

    expect(screen.getByLabelText(/ifsc/i)).toHaveValue('KKBK0000677');
    expect(screen.getByLabelText(/bank name/i)).toHaveValue('');
  });
});
