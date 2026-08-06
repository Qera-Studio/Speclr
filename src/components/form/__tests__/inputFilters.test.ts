import type { UseFormRegisterReturn } from 'react-hook-form';
import { numericField, uppercaseField } from '../inputFilters';

/**
 * The rule this enforces is that the *stored* value is clean, not merely the
 * displayed one — so these assert on what reaches react-hook-form's `onChange`,
 * which is what ends up in the payload.
 */

function registration(seen: string[]) {
  return {
    name: 'field',
    onChange: (e: unknown) => {
      seen.push((e as { target: { value: string } }).target.value);
      return Promise.resolve(true);
    },
    onBlur: () => Promise.resolve(true),
    ref: () => {},
  } as unknown as UseFormRegisterReturn;
}

function harness(mode?: 'integer' | 'money') {
  const seen: string[] = [];
  const field = numericField(registration(seen), mode);
  const type = (value: string) => {
    const event = { target: { value } } as React.ChangeEvent<HTMLInputElement>;
    field.onChange(event);
    return event.target.value;
  };
  return { field, type, seen };
}

describe('numericField — integer', () => {
  it('strips letters and punctuation', () => {
    const { type } = harness();
    expect(type('3a0')).toBe('30');
    expect(type('30 days')).toBe('30');
    expect(type('-5')).toBe('5');
    expect(type('3.5')).toBe('35');
  });

  it('passes digits through untouched', () => {
    expect(harness().type('101234567890')).toBe('101234567890');
  });

  it('lets a field be cleared', () => {
    expect(harness().type('')).toBe('');
  });

  it('hands the sanitised value to the form, not the raw one', () => {
    const { type, seen } = harness();
    type('2b8');
    expect(seen).toEqual(['28']);
  });

  it('hints a numeric keypad', () => {
    expect(harness().field.inputMode).toBe('numeric');
  });
});

describe('numericField — money', () => {
  it('keeps one decimal point and at most two places', () => {
    const { type } = harness('money');
    expect(type('1500.5')).toBe('1500.5');
    expect(type('1500.567')).toBe('1500.56');
    expect(type('1.2.3')).toBe('1.23');
  });

  it('strips currency symbols, grouping and signs', () => {
    const { type } = harness('money');
    expect(type('₹1,500')).toBe('1500');
    expect(type('-500')).toBe('500');
    expect(type('abc')).toBe('');
  });

  /** A decimal point has to survive being typed, before its digits exist. */
  it('leaves a half-typed decimal alone', () => {
    expect(harness('money').type('12.')).toBe('12.');
  });

  it('hints a decimal keypad', () => {
    expect(harness('money').field.inputMode).toBe('decimal');
  });
});

/**
 * A PAN and a PF number have one canonical written form, and they print on a
 * statutory wage slip. Lower case is not a variant of them.
 */
describe('uppercaseField', () => {
  function upperHarness() {
    const seen: string[] = [];
    const field = uppercaseField(registration(seen));
    const type = (value: string) => {
      const event = { target: { value } } as React.ChangeEvent<HTMLInputElement>;
      field.onChange(event);
      return event.target.value;
    };
    return { field, type, seen };
  }

  it('upper-cases as it is typed', () => {
    expect(upperHarness().type('abcpr1234f')).toBe('ABCPR1234F');
  });

  /** PANs get copied out of PDFs and SMSes with spaces in them. */
  it('drops spaces anywhere in the value', () => {
    const { type } = upperHarness();
    expect(type(' abcpr 1234f ')).toBe('ABCPR1234F');
    expect(type('PY BOM 172264')).toBe('PYBOM172264');
  });

  it('hands the canonical value to the form, not the typed one', () => {
    const { type, seen } = upperHarness();
    type('abcpr1234f');
    expect(seen).toEqual(['ABCPR1234F']);
  });

  it('lets a field be cleared', () => {
    expect(upperHarness().type('')).toBe('');
  });
});
