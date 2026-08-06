/**
 * Employee codes — the studio's own reference for a person, printed on their
 * pay slip.
 *
 * Formatting only; the atomic claim lives in `db/counter.ts`, exactly as
 * `docNumber.ts` formats a document number and `counter.ts` claims its serial.
 *
 * Three decisions worth keeping:
 *
 *  - **One series for everybody, not one per engagement type.** An intern who
 *    becomes an employee keeps their code. Encoding the engagement would change
 *    a person's identifier the day they were hired properly — and that code is
 *    frozen onto every slip already issued to them, so the record would stop
 *    agreeing with itself.
 *  - **No financial year in it.** A document number is per FY because GST Rule
 *    46 wants a consecutive series per year; a person is not reissued each
 *    April.
 *  - **Assigned, never typed.** Two employees here already shared the code
 *    "000001", typed by hand months apart, which is precisely the failure a
 *    counter cannot have.
 */

/** formatEmployeeCode(4) → 'QS-EMP-004'. Pads to 3, grows past 999 naturally. */
export function formatEmployeeCode(serial: number): string {
  if (!Number.isInteger(serial) || serial < 1) {
    throw new Error(`formatEmployeeCode expects a positive integer serial, got: ${serial}`);
  }
  return `QS-EMP-${String(serial).padStart(3, '0')}`;
}

/** Matches a generated code. Codes typed before this existed will not. */
export const EMPLOYEE_CODE_RE = /^QS-EMP-\d{3,}$/;
