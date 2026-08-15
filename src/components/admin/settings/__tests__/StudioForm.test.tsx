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

  /**
   * These two were `z.string().min(1)`, presence and nothing else, while a
   * *client's* GSTIN was held to its mod-36 check character. This is the
   * supplier's own registration, frozen onto every invoice by `studioSnapshot`
   * and retained unaltered for 72 months under CGST s.36, so a mistyped
   * character here is wrong on every document issued until someone notices.
   *
   * Both now run the shared rule from `lib/domain/fields.ts`.
   */
  it('refuses a GSTIN whose check character does not match', async () => {
    const u = userEvent.setup();
    render(<StudioForm studio={STUDIO_INFO} />);

    const gstin = screen.getByLabelText(/^gstin$/i);
    await u.clear(gstin);
    // Structurally perfect, and one character off. A regex accepts this.
    await u.type(gstin, '09AABCQ2864Q1ZA');
    await u.click(screen.getByRole('button', { name: /save settings/i }));

    expect(updateStudioSettings).not.toHaveBeenCalled();
    expect(await screen.findByText(/check character/i)).toBeInTheDocument();
  });

  it('refuses a CIN with an ownership code the MCA does not issue', async () => {
    const u = userEvent.setup();
    render(<StudioForm studio={STUDIO_INFO} />);

    const cin = screen.getByLabelText(/^cin$/i);
    await u.clear(cin);
    await u.type(cin, 'U62099UW2026XXX254312');
    await u.click(screen.getByRole('button', { name: /save settings/i }));

    expect(updateStudioSettings).not.toHaveBeenCalled();
    expect(await screen.findByText(/XXX/)).toBeInTheDocument();
  });

  /**
   * The other half of the above, and the one that would hurt: Qera's own CIN
   * carries the ROC pair `UW`, which no published list explains. A stricter
   * check would lock the studio out of its own settings page.
   */
  it('still saves the studio’s real GSTIN and CIN unchanged', async () => {
    const u = userEvent.setup();
    render(<StudioForm studio={STUDIO_INFO} />);

    await u.click(screen.getByRole('button', { name: /save settings/i }));

    expect(updateStudioSettings).toHaveBeenCalledWith(
      expect.objectContaining({ gstin: STUDIO_INFO.gstin, cin: STUDIO_INFO.cin }),
    );
  });

  it('says issued documents are unaffected once saved', async () => {
    const u = userEvent.setup();
    render(<StudioForm studio={STUDIO_INFO} />);

    await u.click(screen.getByRole('button', { name: /save settings/i }));

    // The one thing the user must be able to trust about this page.
    // Scoped by name: the IFSC field owns a second (usually empty) live region.
    expect(await screen.findByText(/already issued/i)).toHaveAttribute('role', 'status');
  });

  it('shows a server error when the action fails', async () => {
    updateStudioSettings.mockResolvedValue({ success: false, error: 'Failed to save settings.' });
    const u = userEvent.setup();
    render(<StudioForm studio={STUDIO_INFO} />);

    await u.click(screen.getByRole('button', { name: /save settings/i }));

    expect(await screen.findByText('Failed to save settings.')).toBeInTheDocument();
  });
});
