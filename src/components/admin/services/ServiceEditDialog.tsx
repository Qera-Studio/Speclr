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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { InfoTip } from '@/components/patterns/FieldInfo';
import { INK, QUIET } from './quiet';
import RupeeInput from './RupeeInput';
import { SacField } from '@/components/form/fields';
import { numericField, uppercaseField } from '@/components/form/inputFilters';
import { sacSchema } from '@/lib/domain/fields';
import { multilineSchema, textSchema } from '@/lib/domain/text';
import { paiseToRupees, rupeesToPaise } from '@/lib/domain/money';
import { SCHEDULES, type ScheduleKey } from '@/lib/domain/contract/schedules';
import { rateUnitOf, serviceCodeSchema, type ContractService } from '@/lib/domain/service';
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
  blurb: multilineSchema(1000),
  sacCode: sacSchema(),
  rateRupees: z
    .string()
    .refine(
      (v) => v.trim() === '' || /^\d+(\.\d{1,2})?$/.test(v.trim()),
      'Enter an amount like 45000 or 45000.50.',
    ),
  /** Typed when adding; blank assigns the next free number. Read only when adding. */
  code: z.union([z.literal(''), serviceCodeSchema]),
  /** A service code, or `NONE`. Read only when adding. */
  cloneFrom: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

/** A `Select` cannot hold an empty value, so "start from nothing" is this. */
const NONE = 'NONE';

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
 * **Adding asks for a code; editing never changes one.** A code is the primary
 * key and is cited by every contract, client record and invoice line that used
 * it, so renaming one would orphan those. Typed codes are upper-cased as typed
 * and refused by the server if any row, archived included, already holds it;
 * a blank one is assigned the next free number. Everything else a
 * Service carries starts empty, **or is copied from the Service it starts
 * from**: a genuinely new kind of work is usually a near copy of one that
 * exists, and naming it is what makes adding one a two-minute form. The rest
 * is then edited on the new Service's own page.
 */
export default function ServiceEditDialog({
  service,
  scheduleKey,
  startFrom,
  onClose,
}: {
  /** Absent means this is a new Service. */
  service?: ContractService;
  /** Which column the add card was clicked in. Ignored when editing. */
  scheduleKey?: ScheduleKey;
  /** What a new Service may start from. Ignored when editing. */
  startFrom?: ContractService[];
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
      // The sentence the card, the service page and the quotation print. Not
      // `overview`: that is contract wording a sold service takes from its terms.
      blurb: service?.blurb ?? '',
      sacCode: service?.sacCode ?? '',
      rateRupees: service?.ratePaise === undefined ? '' : paiseToRupees(service.ratePaise),
      code: '',
      cloneFrom: NONE,
    },
  });

  // The unit is derived from the Schedule, not stored, so it follows the
  // dropdown as soon as it changes rather than after a save.
  const activeSchedule = watch('scheduleKey');
  const monthly = rateUnitOf(activeSchedule) === 'per month';

  const submit = handleSubmit((values) =>
    startTransition(async () => {
      const rate = values.rateRupees.trim();
      const payload = {
        name: values.name,
        scheduleKey: values.scheduleKey,
        blurb: values.blurb.trim(),
        sacCode: values.sacCode,
        ratePaise: rate === '' ? null : rupeesToPaise(rate),
      };
      const result = service
        ? await updateServiceDetails({ ...payload, code: service.code })
        : await createService({
            ...payload,
            ...(values.code ? { code: values.code } : {}),
            ...(values.cloneFrom === NONE ? {} : { cloneFrom: values.cloneFrom }),
          });

      if (!result.success) {
        // On the name, because it is the first field and the one a message can
        // be read next to. A dialog-level banner would be a second error
        // surface for the same failure.
        // A taken code is said on the code field instead.
        const onCode = !!values.code && !!result.error?.startsWith(values.code);
        setError(onCode ? 'code' : 'name', { message: result.error ?? 'Failed to save.' });
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
      <DialogContent className="gap-6 bg-background p-6 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-section font-normal">
            {service ? 'Edit service' : 'Add service'}
            {service ? (
              <Badge variant="secondary" className="font-normal text-muted-foreground">
                {service.code}
              </Badge>
            ) : null}
          </DialogTitle>
          {service ? (
            <DialogDescription className="text-tab-label">
              Changes reach the next quotation and contract. Anything already sent keeps its own copy.
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {/* Every label quiet, set once here so a shared field (`SacField`)
            cannot come out darker than the ones written in this file. */}
        <form
          onSubmit={submit}
          className="flex flex-col gap-4 **:data-[slot=field-label]:text-muted-foreground"
        >
          {/* Explicit columns override `FieldRow`'s container query, which
              needs a `field-group` this dialog lacks. */}
          <FieldRow className={service ? 'grid-cols-1' : 'grid-cols-[3fr_1fr]'}>
            <Field>
              <FieldLabel htmlFor="service-name">Name</FieldLabel>
              <Input id="service-name" size="form" placeholder="Newsletter design" {...register('name')} />
              <FieldError errors={[errors.name]} />
            </Field>
            {service ? null : (
              <Field>
                <div className="flex items-center gap-1.5">
                  <FieldLabel htmlFor="service-code">Code</FieldLabel>
                  <InfoTip
                    label="About the code"
                    info="Two to six capitals or digits, like WEB or SEO. Contracts and invoices cite it, so it cannot be changed later. Leave it empty for the next number."
                  />
                </div>
                <Input
                  id="service-code"
                  size="form"
                  placeholder="NEWS"
                  maxLength={6}
                  autoComplete="off"
                  {...uppercaseField(register('code'))}
                />
                <FieldError errors={[errors.code]} />
              </Field>
            )}
          </FieldRow>

          <Field>
            <FieldLabel htmlFor="service-overview">Description</FieldLabel>
            <Textarea
              id="service-overview"
              placeholder="What this is and what the client ends up with."
              {...register('blurb')}
            />
            <FieldError errors={[errors.blurb]} />
          </Field>

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
                  <SelectContent size="form">
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

          <FieldRow className="grid-cols-2 gap-x-8 gap-y-4">
            <Field>
              <div className="flex items-center gap-1.5">
                <FieldLabel htmlFor="service-rate">
                  {/* Only a Retainer names its unit: "per month" changes what
                      the number means; "fixed" read as a setting to new users. */}
                  {monthly ? 'List price, per month' : 'List price'}
                </FieldLabel>
                <InfoTip
                  label="About the list price"
                  info="What this work is quoted from. It is not the contract's Fee, which is agreed per engagement. Leave it empty for work quoted case by case."
                />
              </div>
              <RupeeInput
                id="service-rate"
                placeholder="Quoted"
                {...numericField(register('rateRupees'), 'money')}
              />
              <FieldError errors={[errors.rateRupees]} />
            </Field>
            <SacField control={control} name="sacCode" id="service-sac" />
          </FieldRow>

          {/* Adding only: a shortcut most new services skip. */}
          {!service && startFrom && startFrom.length > 0 ? (
            <Field>
              <div className="flex items-center gap-1.5">
                <FieldLabel htmlFor="service-clone">Start from</FieldLabel>
                <InfoTip
                  label="What starting from a service does"
                  info="Copies its items, terms and libraries onto the new service. The fields above replace the copy's own."
                />
              </div>
              <Controller
                control={control}
                name="cloneFrom"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                    <SelectTrigger id="service-clone" size="form" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent size="form">
                      <SelectItem value={NONE}>Nothing, start empty</SelectItem>
                      {startFrom.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          ) : null}

          <DialogFooter className="pt-2">
            <Button type="button" variant="secondary" className={QUIET} onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className={INK} pending={pending}>
              {service ? 'Save service' : 'Add service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
