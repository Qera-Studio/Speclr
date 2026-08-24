import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectTrigger } from '@/components/ui/select';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { TOOLTIP_DELAY_MS } from '@/components/ui/tooltip';

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
  it('renders Input at the compact 32px size by default', () => {
    render(<Input aria-label="compact" />);
    const input = screen.getByLabelText('compact');

    // Match whole classes — `file:h-6` styles the file-picker button, not the
    // control, so a bare substring check would give a false positive.
    const classes = input.className.split(/\s+/);
    expect(classes).toContain('h-8');
    expect(classes).not.toContain('h-9.5');
    expect(input).toHaveAttribute('data-size', 'default');
  });

  it('renders Textarea at the compact size by default', () => {
    render(<Textarea aria-label="compact area" />);
    const area = screen.getByLabelText('compact area');

    expect(area.className).toContain('min-h-16');
    expect(area).toHaveAttribute('data-size', 'default');
  });

  it('opts Input into the roomy 38px size only when asked', () => {
    render(<Input aria-label="roomy" size="form" />);
    const input = screen.getByLabelText('roomy');

    const classes = input.className.split(/\s+/);
    expect(classes).toContain('h-9.5');
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

  /**
   * The inheritance rule. Shared field components (AddressFields, PhoneField,
   * IfscField, LineItemsEditor) render plain `<Input/>` and know nothing about
   * the form containing them — which is why one admin form used to show 28px
   * and 36px controls side by side. Inside a `size="form"` group the compact
   * variant resolves to the roomy scale, so those files need no changes and
   * cannot drift again.
   *
   * jsdom resolves no Tailwind, so this asserts the class is *declared*.
   */
  it('scales a compact control up inside a form-sized FieldGroup', () => {
    render(
      <FieldGroup size="form">
        <Field>
          <FieldLabel htmlFor="z">Label</FieldLabel>
          <Input id="z" />
        </Field>
      </FieldGroup>,
    );

    const classes = screen.getByLabelText('Label').className.split(/\s+/);
    expect(classes).toContain('group-data-[size=form]/field-group:h-9.5');
    // The standalone default is untouched — only the inherited value differs.
    expect(classes).toContain('h-8');
  });

  /**
   * The floor, and it is a rule rather than a preference: 28px reads as an
   * unfinished control, and the wording drawer is thirty of them stacked. Every
   * compact typed-into control declares the same 32, so an input, the select
   * beside it and the date trigger under it cannot come out three heights.
   *
   * jsdom resolves no Tailwind, so this asserts the class is *declared* — which
   * is the whole failure mode anyway: somebody edits one variant string.
   */
  it('holds every compact control to the same 32px floor', () => {
    const { container } = render(
      <>
        <Input aria-label="i" />
        <Combobox options={[]} value="" onValueChange={() => {}} aria-label="c" />
        <DatePicker value="" onValueChange={() => {}} />
        <Select>
          <SelectTrigger aria-label="s" />
        </Select>
      </>,
    );

    const slots = ['input', 'combobox', 'date-picker-trigger', 'select-trigger'];
    for (const slot of slots) {
      const el = container.querySelector(`[data-slot="${slot}"]`);
      expect(el).not.toBeNull();
      // `file:h-6` sizes the file-picker button inside the control, not the
      // control, and it is the one height here that is allowed to be smaller.
      const declared = el!.className.split(/\s+/).filter((c) => !c.includes('file:'));
      expect(declared.some((c) => c.endsWith('h-8'))).toBe(true);
      expect(declared.some((c) => c.endsWith('h-7') || c.endsWith('h-6'))).toBe(false);
    }
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

describe('Button sizing', () => {
  /**
   * `Button` was the only kit primitive without a `form` size, so a button set
   * beside a `size="form"` Input/Combobox/DatePicker came out 8px shorter. The
   * pairing is what this guards.
   */
  it('matches the roomy control height on size="form"', () => {
    render(<Button size="form">Add schedule</Button>);
    const classes = screen.getByRole('button').className.split(/\s+/);
    expect(classes).toContain('h-9.5');
  });

  it('still defaults to the compact height', () => {
    render(<Button>Compact</Button>);
    const classes = screen.getByRole('button').className.split(/\s+/);
    expect(classes).toContain('h-7');
    expect(classes).not.toContain('h-9.5');
  });
});

describe('tooltip timing', () => {
  /**
   * Tooltips wait before opening, app-wide. With no delay, sweeping the cursor
   * across a row of icon buttons fires a trail of popups. `Tooltip` carries its
   * own Provider, so this default is the only switch — a caller passing their
   * own would be the regression.
   */
  it('defaults to a 200ms delay', () => {
    expect(TOOLTIP_DELAY_MS).toBe(200);
  });
});

describe('Switch theming', () => {
  /**
   * Tripwire. jsdom resolves no Tailwind, so nothing behavioural can catch a
   * switch that looks off while it is on — which is what happened in dark mode
   * when only the light checked colour was declared.
   */
  it('declares its checked colour for dark mode too', () => {
    render(<Switch aria-label="on" defaultChecked />);
    const classes = screen.getByRole('switch').className.split(/\s+/);
    expect(classes).toContain('data-checked:bg-primary');
    expect(classes).toContain('dark:data-checked:bg-primary');
  });
});
