import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContractAcceptancePanel from '../ContractAcceptancePanel';

const record = jest.fn();
const refresh = jest.fn();
jest.mock('@/server/actions/contractAcceptance', () => ({
  recordContractAcceptance: (...a: unknown[]) => record(...a),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('ContractAcceptancePanel', () => {
  it('says it awaits acceptance, and records one from the snapshot signatory', async () => {
    record.mockResolvedValue({ success: true });
    const u = userEvent.setup();
    render(<ContractAcceptancePanel docId="con-1" acceptance={null} signatory={{ name: 'Asha Rao', designation: 'Director' }} />);

    expect(screen.getByText(/Awaiting the client/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Record acceptance' }));
    expect(screen.getByLabelText('Accepted by')).toHaveValue('Asha Rao');
    await u.type(screen.getByLabelText('Evidence'), 'Email of 12 Oct');
    await u.click(screen.getAllByRole('button', { name: 'Record acceptance' }).at(-1)!);

    expect(record).toHaveBeenCalledWith(
      'con-1',
      expect.objectContaining({ method: 'email', acceptedByName: 'Asha Rao', reference: 'Email of 12 Oct' }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('shows who accepted, when and how', () => {
    render(
      <ContractAcceptancePanel
        docId="con-1"
        acceptance={{ documentId: 'con-1', acceptedOn: '2026-10-12', method: 'email', acceptedByName: 'Asha Rao', recordedAt: 0 }}
      />,
    );
    expect(screen.getByText(/Accepted by Asha Rao on 12 Oct 2026, by email/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Correct acceptance' })).toBeInTheDocument();
  });

  it('shows the refusal instead of closing', async () => {
    record.mockResolvedValue({ success: false, error: 'A contract cannot be accepted before it was issued.' });
    const u = userEvent.setup();
    render(<ContractAcceptancePanel docId="con-1" acceptance={null} signatory={{ name: 'Asha Rao' }} />);
    await u.click(screen.getByRole('button', { name: 'Record acceptance' }));
    await u.click(screen.getAllByRole('button', { name: 'Record acceptance' }).at(-1)!);
    expect(await screen.findByRole('alert')).toHaveTextContent('before it was issued');
  });
});
