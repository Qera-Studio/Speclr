import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaxStep from '../TaxStep';
import type { ClientRecord } from '@/lib/domain/types';

/**
 * Tax & registration.
 *
 * The case that matters most is the GSTIN state cross-check. A GSTIN's first
 * two digits *are* the place of supply, so agreeing them with the address once,
 * here, is what makes deriving place of supply per document trustworthy — and
 * a place of supply typed from memory is what produced a wrong invoice.
 */

const saveClientSection = jest.fn();
const setClientEntityType = jest.fn();

jest.mock('@/server/actions/clients', () => ({
  saveClientSection: (...a: unknown[]) => saveClientSection(...a),
  setClientEntityType: (...a: unknown[]) => setClientEntityType(...a),
}));

const onSaved = jest.fn();

const indianClient = {
  id: 'c1',
  name: 'Clayora',
  companyName: 'Clayora Private Limited',
  address: 'C-204, Ghaziabad',
  addressParts: {
    line1: 'C-204',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    pincode: '201017',
    country: 'IN',
  },
  email: 'a@clayora.test',
  phone: '+919876543210',
  entityType: 'pvt_ltd',
  createdAt: 0,
  updatedAt: 0,
} as ClientRecord;

const foreignClient = {
  ...indianClient,
  id: 'c2',
  addressParts: { ...indianClient.addressParts!, state: 'Dubai', country: 'AE' },
  entityType: 'free_zone',
} as ClientRecord;

beforeEach(() => {
  jest.clearAllMocks();
  // `useFormDraft` keeps what was typed but not saved in sessionStorage, keyed
  // on the client and the step. Both are the same in every test here, so
  // without this a test that does not submit hands its half-filled form to the
  // next one — which is exactly how a PAN typed in one case turned up in
  // another asserting the field was empty.
  sessionStorage.clear();
  saveClientSection.mockResolvedValue({ success: true, id: 'c1' });
  setClientEntityType.mockResolvedValue({ success: true, id: 'c1' });
});

describe('the India branch', () => {
  it('accepts a GSTIN whose state matches the address', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText('GSTIN'), '09AABCQ2864Q1ZQ');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(saveClientSection).toHaveBeenCalledWith(
      'c1',
      'tax',
      expect.objectContaining({ gstin: '09AABCQ2864Q1ZQ' }),
    );
  });

  it('refuses a GSTIN registered in a different state from the address', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    // A valid Tamil Nadu GSTIN on a client whose address says Uttar Pradesh.
    await user.type(screen.getByLabelText('GSTIN'), '33AABCQ2864Q1ZZ');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(
      await screen.findByText(/registered in Tamil Nadu, but the address says Uttar Pradesh/i),
    ).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('catches a mistyped character the shape alone would accept', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText('GSTIN'), '09AACBQ2864Q1ZQ');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(await screen.findByText(/check character/i)).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('refuses an individual’s PAN on a Private Limited', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText(/^pan$/i), 'AABPQ2864Q');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(await screen.findByText(/an individual, not a company/i)).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('asks for the section, rate and TAN once TDS is switched on', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.click(screen.getByRole('switch', { name: /tds/i }));
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(await screen.findByText(/which section do they deduct under/i)).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  /**
   * Both switches moved onto their section headings, and a `<legend>` is not a
   * `<label>`. Without an `aria-label` of their own they would announce as an
   * unnamed switch, which is the whole failure this asserts against.
   */
  it('names both section switches for assistive tech', () => {
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    expect(screen.getByRole('switch', { name: /gst registered/i })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /tds/i })).toBeInTheDocument();
  });

  /**
   * TAN sits with PAN and CIN now rather than behind the TDS switch: a company
   * either holds one or it does not. The switch still decides whether it is
   * *required*, which the test above covers.
   */
  it('offers TAN whether or not TDS is switched on', () => {
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);
    expect(screen.getByLabelText('TAN')).toBeInTheDocument();
  });

  /**
   * The disagreement blocks the save either way; this is about the way out.
   *
   * The entity type is a step-1 field, so before this the only route was back,
   * re-submit the identity form, forward again — for one column, on the step
   * where the certificate of incorporation is in hand. The CIN is the better
   * source, and it is still offered rather than applied: a type derived from
   * the CIN would agree with the CIN by construction and take the PAN's
   * holder-type check down with it.
   */
  it('offers the entity type the CIN states, and applies it only when accepted', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText(/^cin/i), 'L62099UP2026PLC254312');

    const accept = await screen.findByRole('button', {
      name: /change to public limited company/i,
    });
    expect(setClientEntityType).not.toHaveBeenCalled();

    await user.click(accept);
    expect(setClientEntityType).toHaveBeenCalledWith('c1', 'public_ltd');

    // And the form re-validates against the new type, so the refusal and the
    // offer both clear without the field being touched again.
    expect(screen.queryByRole('button', { name: /change to/i })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/belongs to a public limited company, not a private limited/i),
    ).not.toBeInTheDocument();
  });

  it('offers nothing when the CIN and the record agree', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText(/^cin/i), 'U62099UP2026PTC254312');
    await user.tab();

    expect(screen.queryByRole('button', { name: /change to/i })).not.toBeInTheDocument();
  });

  /**
   * `FTC` is a real MCA triple with no row in `ENTITY_TYPES`. The mismatch is
   * still reported, but nothing is offered — a CIN this app cannot place must
   * not overwrite a type a person chose.
   */
  it('reports a triple it cannot place without offering a replacement', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText(/^cin/i), 'U62099UP2026FTC254312');
    await user.tab();

    expect(await screen.findByText(/subsidiary of a foreign company/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /change to/i })).not.toBeInTheDocument();
  });

  it('refuses a public company’s CIN on a Private Limited', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText(/^cin/i), 'U62099UP2026PLC254312');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    // Matched on the error's own wording, not "public limited company" alone:
    // the offer beside it names the same two types, and a loose query cannot
    // tell the refusal from the way out of it.
    expect(
      await screen.findByText(/belongs to a public limited company, not a private limited/i),
    ).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('drops the empty fields rather than storing blank strings', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    // No GSTIN, or the PAN would be filled from it.
    await user.click(screen.getByRole('switch', { name: /gst registered/i }));
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    const payload = saveClientSection.mock.calls[0][2];
    expect(payload).not.toHaveProperty('pan');
    expect(payload).not.toHaveProperty('cin');
    expect(payload).not.toHaveProperty('tan');
  });

  /**
   * `PRINCIPLES.md` rule 3 at field scale. A GSTIN carries the holder's PAN at
   * characters 3–12, so asking the operator to retype it is asking for the one
   * transposition that makes the two disagree.
   */
  it('fills the PAN from the GSTIN that contains it', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText('GSTIN'), '09AABCQ2864Q1ZQ');

    expect(await screen.findByDisplayValue('AABCQ2864Q')).toBe(screen.getByLabelText(/^pan$/i));
  });

  /**
   * The GSTIN wins, and the field stops being typeable.
   *
   * This used to leave a typed PAN alone and report the disagreement. That was
   * the right call while the PAN was a field; it is the wrong one now the PAN
   * is read out of the GSTIN, because there is no version of "these two
   * disagree" where the ten characters inside a GSTIN that passes mod-36 are
   * the wrong half. Fix the GSTIN, or there is nothing to fix.
   */
  it('takes the PAN over from a passing GSTIN, and locks it', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    const pan = screen.getByLabelText(/^pan$/i);
    await user.type(pan, 'AAACQ2864Q');
    await user.type(screen.getByLabelText('GSTIN'), '09AABCQ2864Q1ZQ');

    await waitFor(() => expect(pan).toHaveValue('AABCQ2864Q'));
    expect(pan).toHaveAttribute('readonly');

    // And it is released again the moment the GSTIN stops holding one.
    await user.clear(screen.getByLabelText('GSTIN'));
    await waitFor(() => expect(pan).not.toHaveAttribute('readonly'));
  });

  it('does not fill from a GSTIN whose check character fails', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText('GSTIN'), '09AABCQ2864Q1ZX');

    // The embedded PAN of a mistyped GSTIN is a mistyped PAN.
    expect(screen.getByLabelText(/^pan$/i)).toHaveValue('');
  });

  it('shows no foreign registration fields', () => {
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);
    expect(screen.queryByLabelText(/registration type/i)).not.toBeInTheDocument();
  });
});

describe('the foreign branch', () => {
  it('offers a typed registration instead of a GSTIN', () => {
    render(<TaxStep client={foreignClient} onSaved={onSaved} submitLabel="Contacts" />);

    expect(screen.queryByLabelText(/gstin/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/registration type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^number$/i)).toBeInTheDocument();
  });

  it('states plainly that nothing is computed from it', () => {
    render(<TaxStep client={foreignClient} onSaved={onSaved} submitLabel="Contacts" />);
    expect(screen.getByText(/zero-rated export of services under an LUT/i)).toBeInTheDocument();
  });

  it('rejects a TRN that fails its own format', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={foreignClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText(/^number$/i), '12345');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(await screen.findByText(/Expected TRN/i)).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  it('accepts a valid TRN', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={foreignClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText(/^number$/i), '100123456700003');
    await user.click(screen.getByRole('button', { name: /contacts/i }));

    expect(saveClientSection).toHaveBeenCalledWith(
      'c2',
      'tax',
      expect.objectContaining({ taxIdType: 'AE_TRN', taxId: '100123456700003' }),
    );
  });
});

/**
 * Validation on the way through, rather than one page of red at submit.
 *
 * This step is where the app knows more than the operator: a GSTIN carries a
 * mod-36 check character and its state prefix is cross-checked against the
 * address. Holding that back until submit wastes it.
 */
describe('checking as you go', () => {
  it('reports a bad GSTIN when the field is left, without submitting', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    // A well-formed Tamil Nadu GSTIN, so the only thing wrong with it is the
    // state — the cross-check, caught before the button rather than at it.
    await user.type(screen.getByLabelText('GSTIN'), '33AABCQ2864Q1ZZ');
    await user.tab();

    expect(
      await screen.findByText(/registered in Tamil Nadu, but the address says Uttar Pradesh/i),
    ).toBeInTheDocument();
    expect(saveClientSection).not.toHaveBeenCalled();
  });

  // Scoped to the one field, not the whole form: entering a GSTIN now fills and
  // ticks the PAN as well, and a form-wide query cannot tell the two apart.
  const tick = (label: string | RegExp) =>
    screen.getByLabelText(label).parentElement!.querySelector('.lucide-check');

  /**
   * The tick shows its working. What makes this an assurance rather than a mark
   * is that the reader can check it: "Uttar Pradesh" against the letterhead the
   * GSTIN was copied from, and the PAN against the one below it. Decoded from
   * the characters, never fetched — see `taxIds/decode.ts`.
   */
  it('reads back what a valid GSTIN says', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    await user.type(screen.getByLabelText('GSTIN'), '09AABCQ2864Q1ZQ');
    await user.tab();

    expect(await screen.findByText('Uttar Pradesh')).toBeInTheDocument();
    // And the PAN it filled reads back its own holder kind. Not "Private
    // Limited": the 4th character cannot tell a private company from a public
    // one, and saying so would be echoing the entity type, not decoding.
    expect(screen.getByText('Company')).toBeInTheDocument();
  });

  it('reads back nothing while the value does not hold up', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    // Checksum fails, so the state it names is the state of a number nobody
    // holds. Better silent than confidently wrong.
    await user.type(screen.getByLabelText('GSTIN'), '09AABCQ2864Q1ZX');
    await user.tab();

    expect(screen.queryByText(/Uttar Pradesh/)).not.toBeInTheDocument();
  });

  it('ticks a GSTIN that passes, without waiting for the field to be left', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    const gstin = screen.getByLabelText('GSTIN');

    // Fourteen characters in, the value cannot pass, so there is nothing to
    // confirm. This is what makes an in-focus tick safe: every prefix of a
    // GSTIN fails its own format check, so the mark cannot flicker on the way.
    await user.type(gstin, '09AABCQ2864Q1Z');
    expect(tick('GSTIN')).toBeNull();

    await user.type(gstin, 'Q');
    await waitFor(() => expect(tick('GSTIN')).not.toBeNull());
    expect(gstin).toHaveFocus();
  });

  /**
   * The regression that put this whole block under scrutiny.
   *
   * Under `mode: 'onBlur'` the displayed verdict lagged the value by one blur.
   * So a field already visited once kept its tick while something wrong was
   * pasted into it, and only owned up when the field was left. A tick that can
   * be wrong is worse than no tick, because it is read as an answer.
   */
  it('drops the tick the moment a good value is edited into a bad one', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    const tan = screen.getByLabelText('TAN');
    await user.type(tan, 'DELQ12345F');
    await user.tab();
    expect(tick('TAN')).not.toBeNull();

    // Still focused, nothing blurred: the tick must go now, not at blur.
    await user.click(tan);
    await user.clear(tan);
    await user.type(tan, 'NOPE');
    expect(tick('TAN')).toBeNull();
  });

  it('clears the error while the correction is still being typed', async () => {
    const user = userEvent.setup();
    render(<TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />);

    const tan = screen.getByLabelText('TAN');
    await user.type(tan, 'NOPE');
    await user.tab();
    expect(await screen.findByText(/Expected a TAN/i)).toBeInTheDocument();

    await user.clear(tan);
    await user.type(tan, 'DELQ12345F');
    expect(screen.queryByText(/Expected a TAN/i)).not.toBeInTheDocument();
  });

  it('does not tick a GSTIN that fails', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <TaxStep client={indianClient} onSaved={onSaved} submitLabel="Contacts" />,
    );

    await user.type(screen.getByLabelText('GSTIN'), '09AABCQ2864Q1ZX');
    await user.tab();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(tick('GSTIN')).toBeNull();
  });
});
