import { render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';

/**
 * Tripwire tests.
 *
 * `Input`, `Textarea` and `Field` are imported across the whole app — tables,
 * the sidebar, the admin chrome. The compact `default` size is what keeps those
 * surfaces dense. If someone ever makes `form` the default variant "for
 * convenience", every one of those surfaces inflates at once and nobody
 * notices until it ships. These tests fail loudly if that happens.
 */
describe('control sizing defaults', () => {
  it('renders Input at the compact 28px size by default', () => {
    render(<Input aria-label="compact" />);
    const input = screen.getByLabelText('compact');

    // Match whole classes — `file:h-7` styles the file-picker button, not the
    // control, so a bare substring check would give a false positive.
    const classes = input.className.split(/\s+/);
    expect(classes).toContain('h-7');
    expect(classes).not.toContain('h-9');
    expect(input).toHaveAttribute('data-size', 'default');
  });

  it('renders Textarea at the compact size by default', () => {
    render(<Textarea aria-label="compact area" />);
    const area = screen.getByLabelText('compact area');

    expect(area.className).toContain('min-h-16');
    expect(area).toHaveAttribute('data-size', 'default');
  });

  it('opts Input into the roomy 36px size only when asked', () => {
    render(<Input aria-label="roomy" size="form" />);
    const input = screen.getByLabelText('roomy');

    const classes = input.className.split(/\s+/);
    expect(classes).toContain('h-9');
    expect(classes).not.toContain('h-7');
    expect(input).toHaveAttribute('data-size', 'form');
  });

  it('keeps the compact scale on FieldGroup by default', () => {
    const { container } = render(
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="x">Label</FieldLabel>
          <Input id="x" />
        </Field>
      </FieldGroup>,
    );

    expect(container.querySelector('[data-slot="field-group"]')).toHaveAttribute(
      'data-size',
      'default',
    );
  });

  it('marks the group as form-sized so descendants can scale their text', () => {
    const { container } = render(
      <FieldGroup size="form">
        <Field>
          <FieldLabel htmlFor="y">Label</FieldLabel>
          <Input id="y" size="form" />
        </Field>
      </FieldGroup>,
    );

    expect(container.querySelector('[data-slot="field-group"]')).toHaveAttribute(
      'data-size',
      'form',
    );
  });
});
