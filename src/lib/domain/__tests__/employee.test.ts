import {
  employeeInputSchema,
  emptyEmployeeInput,
  panHolderTypeError,
  panSurnameMismatch,
  pronounSet,
} from '../employee';

const valid = {
  name: 'Abhyudit Kumar Das',
  address: '445, Vivekananda Nagar, Ghaziabad, UP - 201001',
  email: 'abhyudit@example.com',
  phone: '+91 90000 00000',
  role: 'Operations management Intern',
  engagementType: 'intern',
  pronoun: 'he',
  joiningDate: '2026-06-10',
  endDate: '2026-07-10',
  payAmountPaise: 100000,
  bank: { bankName: 'ICICI', accountNo: '038501531346', ifsc: 'ICIC0000385', upiId: 'x@okicici' },
};

describe('employeeInputSchema', () => {
  it('accepts a valid employee', () => {
    expect(employeeInputSchema.safeParse(valid).success).toBe(true);
  });
  it('requires name and role', () => {
    expect(employeeInputSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
    expect(employeeInputSchema.safeParse({ ...valid, role: '' }).success).toBe(false);
  });
  it('rejects an unknown engagement type', () => {
    expect(employeeInputSchema.safeParse({ ...valid, engagementType: 'contractor' }).success).toBe(false);
  });
  it('rejects an unknown pronoun', () => {
    expect(employeeInputSchema.safeParse({ ...valid, pronoun: 'xe' }).success).toBe(false);
  });
  it('allows endDate to be omitted', () => {
    const { endDate, ...rest } = valid;
    expect(employeeInputSchema.safeParse(rest).success).toBe(true);
  });

  /**
   * Payroll identifiers print on a statutory wage slip, so a malformed PAN is
   * never a legacy quirk the way a legacy phone number is — it is simply wrong.
   * Everything else here is free text an employer assigns, and every field must
   * stay omittable: an intern has none of them.
   */
  describe('payroll identifiers', () => {
    it('accepts an employee with no payroll group at all', () => {
      expect(employeeInputSchema.safeParse(valid).success).toBe(true);
    });

    it('accepts a full set of identifiers', () => {
      const payroll = {
        employeeCode: 'QS-004',
        pan: 'ABCPR1234F',
        uan: '101234567890',
        pfNumber: 'UPGZB0012345000',
        esicNumber: '1234567890',
      };
      expect(employeeInputSchema.safeParse({ ...valid, payroll }).success).toBe(true);
    });

    it('rejects a malformed PAN', () => {
      const bad = { ...valid, payroll: { pan: 'ABCD1234F' } };
      expect(employeeInputSchema.safeParse(bad).success).toBe(false);
    });

    it('accepts a blank PAN, so a record stays saveable before it is known', () => {
      expect(employeeInputSchema.safeParse({ ...valid, payroll: { pan: '' } }).success).toBe(true);
    });
  });
});

describe('pronounSet', () => {
  it('resolves he/him/his', () => {
    expect(pronounSet('he')).toEqual({ subject: 'he', object: 'him', possessive: 'his' });
  });
  it('resolves she/her/her', () => {
    expect(pronounSet('she')).toEqual({ subject: 'she', object: 'her', possessive: 'her' });
  });
  it('resolves they/them/their', () => {
    expect(pronounSet('they')).toEqual({ subject: 'they', object: 'them', possessive: 'their' });
  });
});

describe('emptyEmployeeInput', () => {
  it('produces a blank shape defaulting to intern/he', () => {
    const e = emptyEmployeeInput('2026-07-22');
    expect(e.name).toBe('');
    expect(e.engagementType).toBe('intern');
    expect(e.pronoun).toBe('he');
    expect(e.joiningDate).toBe('2026-07-22');
  });
});

/**
 * A PAN is not opaque: its 4th character says what kind of holder it belongs
 * to, and its 5th is the surname's initial. That structure is the whole reason
 * we can catch a real mistyping without calling the Income Tax Department.
 */
describe('panHolderTypeError', () => {
  it('accepts an individual PAN', () => {
    expect(panHolderTypeError('ABCPR1234F')).toBeNull();
  });

  it('names the wrong holder type, so the message says what went wrong', () => {
    expect(panHolderTypeError('ABCCR1234F')).toMatch(/a company/);
    expect(panHolderTypeError('ABCHR1234F')).toMatch(/Hindu Undivided Family/);
    expect(panHolderTypeError('ABCFR1234F')).toMatch(/firm or LLP/);
    expect(panHolderTypeError('ABCTR1234F')).toMatch(/a trust/);
  });

  it('rejects a character that is not a holder type at all', () => {
    expect(panHolderTypeError('ABCZR1234F')).toBe('This is not a recognisable PAN.');
  });

  it('is case-insensitive', () => {
    expect(panHolderTypeError('abcpr1234f')).toBeNull();
  });
});

describe('panSurnameMismatch', () => {
  it('is quiet when the 5th letter matches the surname', () => {
    expect(panSurnameMismatch('ABCPR1234F', 'Ananya Rao')).toBe(false);
    expect(panSurnameMismatch('abcpr1234f', 'ananya rao')).toBe(false);
  });

  it('flags a letter that does not match', () => {
    expect(panSurnameMismatch('ABCPR1234F', 'Ananya Sharma')).toBe(true);
  });

  /**
   * And this is why it must never block. Real PANs mismatch honestly — the
   * Income Tax Department's record of which name is the surname does not always
   * agree with how someone writes it, so a hard failure here would refuse a
   * perfectly valid PAN. Flagging it is the most this may ever do.
   */
  it('flags a legitimate mismatch too, which is why it only hints', () => {
    expect(panSurnameMismatch('ABCPS1234F', 'Ananya Rao')).toBe(true);
  });

  /**
   * A single-word name has no surname to compare against, and guessing which
   * half of a name is the surname is exactly the judgement this must not make.
   */
  it('says nothing about a single-word name', () => {
    expect(panSurnameMismatch('ABCPR1234F', 'Ananya')).toBe(false);
    expect(panSurnameMismatch('ABCPR1234F', '')).toBe(false);
  });
});
