import { render, screen } from '@testing-library/react';
import { Input } from '../input';
import { Textarea } from '../textarea';

/**
 * Autofill is off unless a field asks for it.
 *
 * The default is the security property, not a styling detail. Left unset, a
 * browser infers a field's meaning from its name and offers the **operator's
 * own** saved profile. Nearly every form in speclr describes somebody else: a
 * client's registered address, an employee's phone, a contact's email. A
 * suggestion there is the wrong person's data one click away from a document
 * that gets issued and then retained for 72 months.
 *
 * So absence of an opinion must not mean "browser decides". These tests exist
 * because that default is invisible at the call sites it protects.
 */
describe('form control autofill defaults', () => {
  it('turns autofill off on an Input by default', () => {
    render(<Input aria-label="Client name" />);
    expect(screen.getByLabelText('Client name')).toHaveAttribute('autocomplete', 'off');
  });

  it('turns autofill off on a Textarea by default', () => {
    render(<Textarea aria-label="Notes" />);
    expect(screen.getByLabelText('Notes')).toHaveAttribute('autocomplete', 'off');
  });

  it('lets a field opt in, which is how the studio settings page works', () => {
    // Qera's own details are the one place the browser's saved profile is the
    // right entity, so those fields pass real tokens.
    render(<Input aria-label="Registered address" autoComplete="street-address" />);
    expect(screen.getByLabelText('Registered address')).toHaveAttribute(
      'autocomplete',
      'street-address',
    );
  });
});
