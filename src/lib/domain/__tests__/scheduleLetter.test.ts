import { scheduleLetter } from '../scheduleLetter';

describe('scheduleLetter', () => {
  it('maps 0-based index to A, B, C', () => {
    expect(scheduleLetter(0)).toBe('A');
    expect(scheduleLetter(1)).toBe('B');
    expect(scheduleLetter(25)).toBe('Z');
  });

  it('throws beyond Z (26 schedules is already absurd)', () => {
    expect(() => scheduleLetter(26)).toThrow();
    expect(() => scheduleLetter(-1)).toThrow();
  });
});
