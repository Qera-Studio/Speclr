/** 0 → 'A', 1 → 'B', …, 25 → 'Z'. Throws outside 0–25. */
export function scheduleLetter(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 25) {
    throw new Error(`scheduleLetter expects an index 0–25, got: ${index}`);
  }
  return String.fromCharCode(65 + index);
}
