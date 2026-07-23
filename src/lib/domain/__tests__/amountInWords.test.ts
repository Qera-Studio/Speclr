import { amountInWords } from '../amountInWords';

describe('amountInWords', () => {
  it('handles zero', () => {
    expect(amountInWords(0)).toBe('Zero Rupees Only');
  });

  it('handles paise-only amounts', () => {
    expect(amountInWords(50)).toBe('Fifty Paise Only');
  });

  it('uses singular Paisa for one paisa', () => {
    expect(amountInWords(1)).toBe('One Paisa Only');
  });

  it('uses singular Rupee for one rupee', () => {
    expect(amountInWords(100)).toBe('One Rupee Only');
  });

  it('joins rupees and paise with "and"', () => {
    expect(amountInWords(150)).toBe('One Rupee and Fifty Paise Only');
  });

  it('handles hundreds', () => {
    expect(amountInWords(70000)).toBe('Seven Hundred Rupees Only');
  });

  it('hyphenates compound tens', () => {
    expect(amountInWords(4500)).toBe('Forty-Five Rupees Only');
  });

  it('handles thousands', () => {
    expect(amountInWords(354000)).toBe('Three Thousand Five Hundred Forty Rupees Only');
  });

  it('handles the real receipt amount (₹47,735.72)', () => {
    expect(amountInWords(4773572)).toBe(
      'Forty-Seven Thousand Seven Hundred Thirty-Five Rupees and Seventy-Two Paise Only',
    );
  });

  it('handles lakhs', () => {
    expect(amountInWords(12345678)).toBe(
      'One Lakh Twenty-Three Thousand Four Hundred Fifty-Six Rupees and Seventy-Eight Paise Only',
    );
  });

  it('handles crores', () => {
    expect(amountInWords(10000000000)).toBe('Ten Crore Rupees Only');
  });

  it('recurses above 99 crore', () => {
    // 1,23,45,67,890 rupees = 123 crore 45 lakh 67 thousand 890
    expect(amountInWords(1234567889000)).toBe(
      'One Thousand Two Hundred Thirty-Four Crore Fifty-Six Lakh Seventy-Eight Thousand Eight Hundred Ninety Rupees Only',
    );
  });

  it('throws on negative amounts', () => {
    expect(() => amountInWords(-1)).toThrow();
  });

  it('throws on non-integer amounts', () => {
    expect(() => amountInWords(100.5)).toThrow();
    expect(() => amountInWords(NaN)).toThrow();
  });
});
