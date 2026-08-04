'use client';

import { useRef } from 'react';
import {
  Calendar,
  CircleDot,
  FileText,
  FilterX,
  IndianRupee,
  ListFilter,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { DatePicker } from '@/components/ui/date-picker';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { groupRupeeInput, normalizeRupeeInput } from '@/lib/domain/money';
import {
  FILTER_FIELDS,
  FILTER_FIELD_LIST,
  type FilterField,
  type FilterRow,
} from '@/lib/domain/documentQuery';

/**
 * The filter builder: one `field / operator / value` pill per condition, added
 * on demand, all inline in a single toolbar row.
 *
 * Pills read as a sentence ("Type is Invoice"), and conditions AND together.
 * **One condition per field** — a field already in play drops out of the
 * Add-filter menu, since a second row for it could only ever narrow to nothing.
 * That is also why the date field carries its own `between` operator rather
 * than relying on two one-sided rows.
 *
 * The field is fixed once a pill exists: you picked it from the Add-filter
 * menu, and changing it would leave an operator that no longer fits. Remove and
 * add instead — one less menu, and no half-valid rows.
 */

const FIELD_ICONS: Record<FilterField, typeof FileText> = {
  type: FileText,
  party: User,
  status: CircleDot,
  date: Calendar,
  total: IndianRupee,
};

export interface FilterOption {
  value: string;
  label: string;
}

export interface DocumentFiltersProps {
  rows: FilterRow[];
  onChange: (rows: FilterRow[]) => void;
  /** Choices for the multi-select fields, built from the documents on screen. */
  options: Record<'type' | 'party' | 'status', FilterOption[]>;
  /** Fields that make no sense for this list (party on nothing, total on letters). */
  hiddenFields?: FilterField[];
  /** Overrides the party field's label: "Client" on client docs, "Employee" on HR. */
  partyLabel?: string;
}

/**
 * A cell inside the pill, separated by a hairline rather than a gap. No height
 * here on purpose — every primitive in the kit is already 28px at its default
 * size, and overriding that is what made the bar taller than its own button.
 */
const SEGMENT = 'rounded-none border-0 border-l border-border px-2.5 font-normal whitespace-nowrap';

/**
 * The rupee input: only what `rupeesToPaise` can parse goes in, and it is shown
 * with Indian grouping so it punctuates like the Total column beside it.
 *
 * Grouping inserts commas, so a plain controlled input would throw the caret to
 * the end on every mid-string edit. The caret is restored by digit offset —
 * count the digits left of it, then find that position again after formatting.
 */
function AmountInput({
  value,
  onValueChange,
  label,
}: {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    const digitsBefore = raw.slice(0, caret).replace(/[^\d.]/g, '').length;

    const next = normalizeRupeeInput(raw);
    onValueChange(next);

    // Applied after React re-renders with the grouped value.
    queueMicrotask(() => {
      const input = ref.current;
      if (!input) return;
      let seen = 0;
      let position = input.value.length;
      for (let i = 0; i < input.value.length; i += 1) {
        if (input.value[i] !== ',') seen += 1;
        if (seen === digitsBefore) {
          position = i + 1;
          break;
        }
      }
      if (digitsBefore === 0) position = 0;
      input.setSelectionRange(position, position);
    });
  };

  return (
    <Input
      ref={ref}
      aria-label={label}
      inputMode="decimal"
      placeholder="0"
      value={groupRupeeInput(value)}
      onChange={onChange}
      className={cn(SEGMENT, 'w-24 rounded-none bg-transparent focus-visible:ring-0')}
    />
  );
}

export default function DocumentFilters({
  rows,
  onChange,
  options,
  hiddenFields = [],
  partyLabel,
}: DocumentFiltersProps) {
  const labelOf = (field: FilterField) =>
    field === 'party' ? (partyLabel ?? FILTER_FIELDS.party.label) : FILTER_FIELDS[field].label;

  // One condition per field. A second "Status is…" row could only ever narrow
  // to nothing (the rows AND), and the date range that used to need two rows
  // now has its own `between` operator.
  const available = FILTER_FIELD_LIST.filter(
    (f) => !hiddenFields.includes(f) && !rows.some((row) => row.field === f),
  );

  // Prepended, so the newest condition lands next to the button you just used
  // and older ones move away to the right. `matchesFilters` ANDs the rows, so
  // their order is presentation only.
  const addRow = (field: FilterField) =>
    onChange([
      // The field itself is the id: one condition per field, so it's unique.
      { id: field, field, operator: FILTER_FIELDS[field].operators[0].value, value: [] },
      ...rows,
    ]);

  const patch = (id: string, next: Partial<FilterRow>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...next } : row)));

  const removeRow = (id: string) => onChange(rows.filter((row) => row.id !== id));

  const toggleValue = (row: FilterRow, value: string) =>
    patch(row.id, {
      value: row.value.includes(value)
        ? row.value.filter((v) => v !== value)
        : [...row.value, value],
    });

  /** Replaces one end of a date range, leaving the other alone. */
  const setDateAt = (row: FilterRow, index: number, value: string) => {
    const next = [row.value[0] ?? '', row.value[1] ?? ''];
    next[index] = value;
    patch(row.id, { value: next });
  };

  /** What the value segment reads when closed. */
  const valueSummary = (row: FilterRow): string => {
    const spec = FILTER_FIELDS[row.field];
    if (spec.kind === 'amount') return row.value[0] ? `₹${row.value[0]}` : 'Any amount';
    if (row.value.length === 0) return 'Select…';
    if (row.value.length === 1) {
      const choices = options[row.field as 'type' | 'party' | 'status'] ?? [];
      return choices.find((o) => o.value === row.value[0])?.label ?? row.value[0];
    }
    return `${row.value.length} selected`;
  };

  const datePicker = (row: FilterRow, index: number, label: string) => (
    <DatePicker
      value={row.value[index] ?? ''}
      onValueChange={(value) => setDateAt(row, index, value)}
      placeholder="Pick a date"
      aria-label={label}
      className={cn(SEGMENT, 'w-auto gap-2 rounded-none bg-transparent text-xs')}
    />
  );

  return (
    <div className="flex items-center gap-2">
      {/* Fixed anchor. Add filter must not drift as conditions pile up — it
          is the one control you go back to, so it stays put. */}
      <ButtonGroup className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                // Every field is already in play — an empty menu would be a
                // click that goes nowhere.
                disabled={available.length === 0}
                className="whitespace-nowrap"
              >
                <ListFilter className="size-3.5" aria-hidden="true" />
                Add filter
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="min-w-max">
            {available.map((field) => {
              const Icon = FIELD_ICONS[field];
              return (
                <DropdownMenuItem
                  key={field}
                  className="whitespace-nowrap"
                  onClick={() => addRow(field)}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {labelOf(field)}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {rows.length > 0 ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Clear all filters"
                  onClick={() => onChange([])}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                />
              }
            >
              <FilterX className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Clear all filters</TooltipContent>
          </Tooltip>
        ) : null}
      </ButtonGroup>

      {/*
        The conditions scroll rather than wrap, so the bar is always exactly
        one row tall and the table never jumps down the page.

        The mask is a plain CSS fade over the last 40px, always on: with few
        enough pills it sits over empty space and is invisible, so there is no
        scroll listener to keep in sync. `scroll-p-10` is what stops a
        keyboard-focused pill from parking underneath that fade.
      */}
      <div
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain scroll-p-10',
          '[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {rows.map((row) => {
          const spec = FILTER_FIELDS[row.field];
          const Icon = FIELD_ICONS[row.field];
          const operator = spec.operators.find((o) => o.value === row.operator) ?? spec.operators[0];
          const name = labelOf(row.field);

          return (
            <div
              key={row.id}
              role="group"
              aria-label={`${name} filter`}
              className="flex h-7 shrink-0 items-center rounded-md border border-border bg-background text-xs whitespace-nowrap"
            >
              <span className="flex items-center gap-1.5 px-2.5 font-medium text-muted-foreground">
                <Icon className="size-3.5" aria-hidden="true" />
                {name}
              </span>

              {spec.operators.length > 1 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`${name} condition`}
                        className={SEGMENT}
                      >
                        {operator.label}
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="start" className="min-w-max">
                    <DropdownMenuRadioGroup
                      value={row.operator}
                      onValueChange={(value) => patch(row.id, { operator: String(value) })}
                    >
                      {spec.operators.map((o) => (
                        <DropdownMenuRadioItem
                          key={o.value}
                          value={o.value}
                          className="whitespace-nowrap"
                        >
                          {o.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className={cn(SEGMENT, 'flex items-center text-muted-foreground')}>
                  {operator.label}
                </span>
              )}

              {spec.kind === 'multi' ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`${name} value`}
                        className={cn(SEGMENT, row.value.length === 0 && 'text-muted-foreground')}
                      >
                        {valueSummary(row)}
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="start" className="max-h-72 min-w-max overflow-y-auto">
                    {(options[row.field as 'type' | 'party' | 'status'] ?? []).map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={row.value.includes(option.value)}
                        className="whitespace-nowrap"
                        onClick={(event) => {
                          // Kept open so several values can be ticked in one visit.
                          event.preventDefault();
                          toggleValue(row, option.value);
                        }}
                      >
                        {option.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : spec.kind === 'date' ? (
                row.operator === 'between' ? (
                  <>
                    {datePicker(row, 0, `${name} from`)}
                    <span className="px-1.5 text-muted-foreground">and</span>
                    {datePicker(row, 1, `${name} to`)}
                  </>
                ) : (
                  datePicker(row, 0, `${name} value`)
                )
              ) : (
                <AmountInput
                  label={`${name} value`}
                  value={row.value[0] ?? ''}
                  onValueChange={(value) => patch(row.id, { value: [value] })}
                />
              )}

              <Button
                type="button"
                variant="ghost"
                aria-label={`Remove ${name} filter`}
                onClick={() => removeRow(row.id)}
                className={cn(SEGMENT, 'px-2 text-muted-foreground hover:text-foreground')}
              >
                <X className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
