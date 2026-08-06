import { EMPLOYEE_CODE_RE, formatEmployeeCode } from '../employeeCode';

/**
 * The formatting half of employee codes; the atomic claim is in `db/counter.ts`
 * and is the same upsert `claimSerial` uses, tested there.
 */
describe('formatEmployeeCode', () => {
  it('pads to three digits', () => {
    expect(formatEmployeeCode(1)).toBe('QS-EMP-001');
    expect(formatEmployeeCode(42)).toBe('QS-EMP-042');
  });

  it('grows past 999 rather than wrapping', () => {
    expect(formatEmployeeCode(1000)).toBe('QS-EMP-1000');
  });

  /**
   * A serial of 0 or a fraction means the counter returned something impossible.
   * Throwing is the correct response: a wrong employee code is frozen onto every
   * pay slip issued to that person.
   */
  it('refuses a serial that cannot be one', () => {
    expect(() => formatEmployeeCode(0)).toThrow();
    expect(() => formatEmployeeCode(-1)).toThrow();
    expect(() => formatEmployeeCode(1.5)).toThrow();
  });

  it('produces codes its own pattern recognises', () => {
    expect(EMPLOYEE_CODE_RE.test(formatEmployeeCode(7))).toBe(true);
    expect(EMPLOYEE_CODE_RE.test(formatEmployeeCode(1234))).toBe(true);
  });

  /** The hand-typed codes this replaced. They are exactly what it must not match. */
  it('does not recognise a hand-typed code', () => {
    expect(EMPLOYEE_CODE_RE.test('000001')).toBe(false);
    expect(EMPLOYEE_CODE_RE.test('QS-004')).toBe(false);
  });

  /**
   * Deliberately no financial year and no engagement letter. An intern who
   * becomes an employee keeps their code, because it is already frozen onto
   * every slip issued to them.
   */
  it('carries no financial year and no engagement type', () => {
    expect(formatEmployeeCode(1)).not.toMatch(/\d{4}-\d{3}$/);
    expect(formatEmployeeCode(1)).toBe(formatEmployeeCode(1));
  });
});
