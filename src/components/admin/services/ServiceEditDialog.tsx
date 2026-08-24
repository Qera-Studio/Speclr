'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { FieldRow } from '@/components/ui/field-row';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { InfoTip } from '@/components/form/FieldInfo';
import { SacField } from '@/components/form/fields';
import { numericField } from '@/components/form/inputFilters';
import { sacSchema } from '@/lib/domain/fields';
import { multilineSchema, textSchema } from '@/lib/domain/text';
import { paiseToRupees, rupeesToPaise } from '@/lib/domain/money';
import { SCHEDULES, type ScheduleKey } from '@/lib/domain/contract/schedules';
import { rateUnitOf, type ContractService } from '@/lib/domain/service';
import { createService, updateServiceDetails } from '@/server/actions/services';

/**
 * The five fields of a Service that are worth editing without opening the spec.
 *
 * Rupees here, paise the moment it leaves. The pattern is `EmployeeForm`'s: the
 * string is what a person types, `rupeesToPaise` is the single place it becomes
 * a number, and nothing downstream of this component ever sees a float.
 */
const formSchema = z.object({
  name: textSchema(200, { required: 'A service name is required.' }),
  scheduleKey: z.enum(['build', 'retainer', 'setup', 'audit']),
  overview: multilineSchema(4000),
  sacCode: sacSchema(),
  rateRupees: z
    .string()
    .refine(
      (v) => v.trim() === '' || /^\d+(\.\d{1,2})?$/.test(v.trim()),
      'Enter an amount like 45000 or 45000.50.',
    ),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * One Service, edited — or a new one added.
 *
 * **Scope is deliberately five fields, not the whole record.** A Service also
 * carries its inclusions, its limits, its exclusions and its client inputs, and
 * those are contract source material that wants the full spec in front of you;
 * what this is for is the pass where a name reads wrong, a price moves, or a
 * classification is filled in. The Server Action loads the stored row and
 * overwrites exactly these five, so nothing the dialog does not render can be
 * blanked by a form that did not know about it.
 *
 * **Editing here cannot reach a contract already written.** A Part is copied
 * onto the contract when the Service is ticked and frozen at finalize, the same
 * guarantee the clause library relies on (CONTEXT.md §5c).
 *
 * Mounted only while open and keyed on the Service, so it always opens from
 * what the catalogue currently holds rather than from the last thing typed.
 *
 * **Adding is the same five fields, and the code is not one of them.** A code
 * is the primary key and is cited by every contract that used it, so the server
 * assigns it; there is nothing here for a person to get wrong. Everything else a
 * Service carries starts empty and is filled from the spec.
 */
export default function ServiceEditDialog({
  service,
  scheduleKey,
  onClose,
}: {
  /** Absent means this is a new Service. */
  service?: ContractService;
  /** Which column the add card was clicked in. Ignored when editing. */
  scheduleKey?: ScheduleKey;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      name: service?.name ?? '',
      scheduleKey: service?.scheduleKey ?? scheduleKey ?? SCHEDULES[0].key,
      // One paragraph per line. `overview` is an array because the sheet prints
      // each as its own paragraph; a textarea is how a person edits a short
      // list of paragraphs without a list editor being built for three of them.
      overview: service?.overview.join('\n') ?? '',
      sacCode: service?.sacCode ?? '',
      rateRupees: service?.ratePaise === undefined ? '' : paiseToRupees(service.ratePaise),
    },
  });

  // The unit is derived from the Schedule, not stored, so it follows the
  // dropdown as soon as it changes rather than after a save.
  const activeSchedule = watch('scheduleKey');

  const submit = handleSubmit((values) =>
    startTransition(async () => {
      const rate = values.rateRupees.trim();
      const payload = {
        name: values.name,
        scheduleKey: values.scheduleKey,
        overview: values.overview
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        sacCode: values.sacCode,
        ratePaise: rate === '' ? null : rupeesToPaise(rate),
      };
      const result = service
        ? await updateServiceDetails({ ...payload, code: service.code })
        : await createService(payload);

      if (!result.success) {
        // On the name, because it is the first field and the one a message can
        // be read next to. A dialog-level banner would be a second error
        // surface for the same failure.
        setError('name', { message: result.error ?? 'Failed to save.' });
        return;
      }
      router.refresh();
      onClose();
    }),
  );

  return (
    <Dialog
      open
      // Same reasoning as `ServiceDialog`: the buttons and the ✕ are the ways
      // out. Esc still works; a stray click outside is how unsaved edits get
      // thrown away by accident.
      disablePointerDismissal
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {service ? (
              <>
                <span className="mr-2 text-muted-foreground tabular-nums">{service.code}</span>
                Edit service
              </>
            ) : (
              'Add service'
            )}
          </DialogTitle>
          <DialogDescription>
            {service
              ? 'Changes reach the next contract. Anything already drafted or signed keeps its own copy.'
              : 'Its code is assigned on save. Scope, limits and exclusions are filled in from the spec.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {/* 35/65 rather than an even split: a Section is one of four short
              words, a Title is a sentence fragment. The explicit columns also
              override `FieldRow`'s container query, which needs a
              `field-group` container this dialog does not have. */}
          <FieldRow className="grid-cols-[35fr_65fr]">
            <Field>
              <FieldLabel htmlFor="service-schedule">Section</FieldLabel>
              <Controller
                control={control}
                name="scheduleKey"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                    <SelectTrigger id="service-schedule" size="form" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULES.map((schedule) => (
                        <SelectItem key={schedule.key} value={schedule.key}>
                          {schedule.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.scheduleKey]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="service-name">Title</FieldLabel>
              <Input id="service-name" size="form" {...register('name')} />
              <FieldError errors={[errors.name]} />
            </Field>
          </FieldRow>

          <Field>
            <div className="flex items-center gap-1.5">
              <FieldLabel htmlFor="service-overview">Description</FieldLabel>
              <InfoTip
                label="What the description is for"
                info="Two or three sentences: what this is and what the Client ends up with. It prints at the head of the Part. One paragraph per line."
              />
            </div>
            <Textarea id="service-overview" rows={4} {...register('overview')} />
            <FieldError errors={[errors.overview]} />
          </Field>

          <FieldRow className="grid-cols-2">
            <Field>
              <div className="flex items-center gap-1.5">
                <FieldLabel htmlFor="service-rate">Rate</FieldLabel>
                <InfoTip
                  label="About the rate"
                  info="The list price this work is quoted from, in rupees. It is not the contract's Fee: that is negotiated per engagement and still filled in on the contract. Leave it empty for work quoted case by case."
                />
              </div>
              <Input
                id="service-rate"
                size="form"
                placeholder={`₹, ${rateUnitOf(activeSchedule)}`}
                {...numericField(register('rateRupees'), 'money')}
              />
              <FieldError errors={[errors.rateRupees]} />
            </Field>

            <SacField control={control} name="sacCode" id="service-sac" />
          </FieldRow>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : service ? 'Save' : 'Add service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
