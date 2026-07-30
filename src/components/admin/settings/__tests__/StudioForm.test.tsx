import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudioForm from '../StudioForm';
import { STUDIO_INFO } from '@/lib/domain/studio';

const updateStudioSettings = jest.fn();
jest.mock('@/server/actions/studio', () => ({
  updateStudioSettings: (...a: unknown[]) => updateStudioSettings(...a),
}));

beforeEach(() => {
  jest.clearAllMocks();
  updateStudioSettings.mockResolvedValue({ success: true });
});

describe('StudioForm', () => {
  it('loads the studio’s current details', () => {
    render(<StudioForm studio={STUDIO_INFO} />);

    expect(screen.getByLabelText(/legal name/i)).toHaveValue(STUDIO_INFO.legalName);
    expect(screen.getByLabelText(/registered address/i)).toHaveValue(STUDIO_INFO.address);
    expect(screen.getByLabelText(/^gstin$/i)).toHaveValue(STUDIO_INFO.gstin);
    expect(screen.getByLabelText(/account number/i)).toHaveValue(STUDIO_INFO.bank.accountNo);
  });

  it('submits an edited address', async () => {
    const u = userEvent.setup();
    render(<StudioForm studio={STUDIO_INFO} />);

    await u.clear(screen.getByLabelText(/registered address/i));
    await u.type(screen.getByLabelText(/registered address/i), 'New office{enter}India');
    await u.click(screen.getByRole('button', { name: /save settings/i }));

    expect(updateStudioSettings).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'New office\nIndia' }),
    );
  });

  it('never submits a state name — only the code', async () => {
    const u = userEvent.setup();
    render(<StudioForm studio={STUDIO_INFO} />);

    await u.click(screen.getByRole('button', { name: /save settings/i }));

    // The name is derived from the code server-side. Sending both would let the
    // two disagree, and the code is what decides CGST+SGST vs IGST.
    const payload = updateStudioSettings.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.stateCode).toBe(STUDIO_INFO.stateCode);
    expect(payload).not.toHaveProperty('stateName');
  });

  it('refuses to save a blank GSTIN', async () => {
    const u = userEvent.setup();
    render(<StudioForm studio={STUDIO_INFO} />);

    await u.clear(screen.getByLabelText(/^gstin$/i));
    await u.click(screen.getByRole('button', { name: /save settings/i }));

    expect(updateStudioSettings).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('says issued documents are unaffected once saved', async () => {
    const u = userEvent.setup();
    render(<StudioForm studio={STUDIO_INFO} />);

    await u.click(screen.getByRole('button', { name: /save settings/i }));

    // The one thing the user must be able to trust about this page.
    expect(await screen.findByRole('status')).toHaveTextContent(/already issued/i);
  });

  it('shows a server error when the action fails', async () => {
    updateStudioSettings.mockResolvedValue({ success: false, error: 'Failed to save settings.' });
    const u = userEvent.setup();
    render(<StudioForm studio={STUDIO_INFO} />);

    await u.click(screen.getByRole('button', { name: /save settings/i }));

    expect(await screen.findByText('Failed to save settings.')).toBeInTheDocument();
  });
});
