'use client';

import { scheduleLetter } from '@/lib/domain/scheduleLetter';
import type { ContractSchedule } from '@/lib/domain/types';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface ScheduleCardProps {
  schedule: ContractSchedule;
  index: number;
  onChange: (next: ContractSchedule) => void;
  onRemove: () => void;
}

/**
 * Edits a single attached contract schedule. All inputs are controlled by the
 * parent's `schedule` prop — every edit builds an updated copy and calls
 * `onChange`, so schedule state lives entirely in the ContractEditor.
 */
export default function ScheduleCard({ schedule, index, onChange, onRemove }: ScheduleCardProps) {
  const letter = scheduleLetter(index);

  const setField = <K extends keyof ContractSchedule>(key: K, value: ContractSchedule[K]) => {
    onChange({ ...schedule, [key]: value });
  };

  const editStringItem = (key: 'scopeItems' | 'exclusionItems', itemIndex: number, value: string) => {
    onChange({ ...schedule, [key]: schedule[key].map((v, j) => (j === itemIndex ? value : v)) });
  };
  const addStringItem = (key: 'scopeItems' | 'exclusionItems') => {
    onChange({ ...schedule, [key]: [...schedule[key], ''] });
  };
  const removeStringItem = (key: 'scopeItems' | 'exclusionItems', itemIndex: number) => {
    onChange({ ...schedule, [key]: schedule[key].filter((_, j) => j !== itemIndex) });
  };

  const editMilestone = (mIndex: number, patch: Partial<ContractSchedule['milestones'][number]>) => {
    onChange({
      ...schedule,
      milestones: schedule.milestones.map((m, j) => (j === mIndex ? { ...m, ...patch } : m)),
    });
  };
  const addMilestone = () => {
    onChange({ ...schedule, milestones: [...schedule.milestones, { label: '', scope: '' }] });
  };
  const removeMilestone = (mIndex: number) => {
    onChange({ ...schedule, milestones: schedule.milestones.filter((_, j) => j !== mIndex) });
  };

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <legend className="px-1 text-sm font-medium">Schedule {letter}</legend>
        <Button type="button" variant="ghost" onClick={onRemove} aria-label={`Remove schedule ${letter}`}>
          Remove schedule
        </Button>
      </div>

      <Field>
        <FieldLabel htmlFor={`sch-${index}-title`}>Schedule title</FieldLabel>
        <Input id={`sch-${index}-title`} value={schedule.title} onChange={(e) => setField('title', e.target.value)} />
      </Field>

      <Field>
        <FieldLabel htmlFor={`sch-${index}-overview`}>Overview</FieldLabel>
        <Textarea
          id={`sch-${index}-overview`}
          rows={2}
          value={schedule.overview}
          onChange={(e) => setField('overview', e.target.value)}
        />
      </Field>

      <fieldset className="flex flex-col gap-3 rounded-md border border-border/60 p-3">
        <legend className="px-1 text-sm font-medium">Scope of work</legend>
        {schedule.scopeItems.map((item, i) => (
          <div key={i} className="flex items-end gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor={`sch-${index}-scope-${i}`}>Scope item {i + 1}</FieldLabel>
              <Input
                id={`sch-${index}-scope-${i}`}
                value={item}
                onChange={(e) => editStringItem('scopeItems', i, e.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              onClick={() => removeStringItem('scopeItems', i)}
              aria-label={`Remove scope item ${i + 1}`}
            >
              Remove
            </Button>
          </div>
        ))}
        <div>
          <Button type="button" variant="outline" onClick={() => addStringItem('scopeItems')}>
            Add scope item
          </Button>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-md border border-border/60 p-3">
        <legend className="px-1 text-sm font-medium">Exclusions</legend>
        {schedule.exclusionItems.map((item, i) => (
          <div key={i} className="flex items-end gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor={`sch-${index}-excl-${i}`}>Exclusion item {i + 1}</FieldLabel>
              <Input
                id={`sch-${index}-excl-${i}`}
                value={item}
                onChange={(e) => editStringItem('exclusionItems', i, e.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              onClick={() => removeStringItem('exclusionItems', i)}
              aria-label={`Remove exclusion item ${i + 1}`}
            >
              Remove
            </Button>
          </div>
        ))}
        <div>
          <Button type="button" variant="outline" onClick={() => addStringItem('exclusionItems')}>
            Add exclusion item
          </Button>
        </div>
      </fieldset>

      <Field>
        <FieldLabel htmlFor={`sch-${index}-price`}>Price &amp; payment</FieldLabel>
        <Textarea
          id={`sch-${index}-price`}
          rows={2}
          value={schedule.priceNote}
          onChange={(e) => setField('priceNote', e.target.value)}
        />
      </Field>

      <fieldset className="flex flex-col gap-3 rounded-md border border-border/60 p-3">
        <legend className="px-1 text-sm font-medium">Milestones</legend>
        {schedule.milestones.map((m, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <Field className="flex-1">
              <FieldLabel htmlFor={`sch-${index}-ms-label-${i}`}>Milestone label</FieldLabel>
              <Input
                id={`sch-${index}-ms-label-${i}`}
                value={m.label}
                onChange={(e) => editMilestone(i, { label: e.target.value })}
              />
            </Field>
            <Field className="flex-1">
              <FieldLabel htmlFor={`sch-${index}-ms-scope-${i}`}>Milestone scope</FieldLabel>
              <Input
                id={`sch-${index}-ms-scope-${i}`}
                value={m.scope}
                onChange={(e) => editMilestone(i, { scope: e.target.value })}
              />
            </Field>
            <Button
              type="button"
              variant="ghost"
              onClick={() => removeMilestone(i)}
              aria-label={`Remove milestone ${i + 1}`}
            >
              Remove
            </Button>
          </div>
        ))}
        <div>
          <Button type="button" variant="outline" onClick={addMilestone}>
            Add milestone
          </Button>
        </div>
      </fieldset>

      <Field>
        <FieldLabel htmlFor={`sch-${index}-revisions`}>Revisions</FieldLabel>
        <Textarea
          id={`sch-${index}-revisions`}
          rows={2}
          value={schedule.revisionsNote}
          onChange={(e) => setField('revisionsNote', e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`sch-${index}-disclaimer`}>Disclaimer</FieldLabel>
        <Textarea
          id={`sch-${index}-disclaimer`}
          rows={2}
          value={schedule.disclaimerNote}
          onChange={(e) => setField('disclaimerNote', e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={`sch-${index}-support`}>Support &amp; ownership</FieldLabel>
        <Textarea
          id={`sch-${index}-support`}
          rows={2}
          value={schedule.supportNote}
          onChange={(e) => setField('supportNote', e.target.value)}
        />
      </Field>
    </fieldset>
  );
}
