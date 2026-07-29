import { screen, within } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

type User = ReturnType<typeof userEvent.setup>;

/**
 * Picks an option from a Combobox.
 *
 * The editors used native `<select>` elements, so their tests used
 * `selectOptions`. A combobox is an input plus a popup listbox, which needs
 * open → choose. Every editor test needs the same three lines, so it lives
 * here rather than being re-typed five times.
 */
export async function selectComboboxOption(
  user: User,
  label: RegExp | string,
  optionName: RegExp | string,
): Promise<void> {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole('option', { name: optionName }));
}

/**
 * Picks an option from a shadcn Select (short fixed lists — payment method,
 * engagement type, pronoun). Same open → choose shape, different trigger.
 */
export async function selectOption(
  user: User,
  label: RegExp | string,
  optionName: RegExp | string,
): Promise<void> {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole('option', { name: optionName }));
}

/**
 * Picks a day from a DatePicker, by day-of-month, in whichever month the
 * calendar opens on. Day buttons are named like "Wednesday, July 15th, 2026",
 * so matching the ordinal alone keeps tests independent of the run date.
 */
export async function pickDayOfMonth(
  user: User,
  triggerLabel: RegExp | string,
  day: number,
): Promise<void> {
  await user.click(screen.getByLabelText(triggerLabel));
  const grid = await screen.findByRole('grid');
  const ordinal = ordinalFor(day);
  await user.click(within(grid).getByRole('button', { name: new RegExp(`\\b${day}${ordinal}\\b`) }));
}

function ordinalFor(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  if (day % 10 === 1) return 'st';
  if (day % 10 === 2) return 'nd';
  if (day % 10 === 3) return 'rd';
  return 'th';
}
