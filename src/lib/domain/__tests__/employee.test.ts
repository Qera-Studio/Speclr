import { employeeInputSchema, emptyEmployeeInput, pronounSet } from '../employee';

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
