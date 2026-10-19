'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INK, QUIET } from '@/components/admin/services/quiet';
import { recordContractAcceptance } from '@/server/actions/contractAcceptance';
import {
  ACCEPTANCE_METHOD_LABELS,
  ACCEPTANCE_METHODS,
  type AcceptanceMethod,
  type ContractAcceptance,
} from '@/lib/domain/contract/acceptance';
import { formatDisplayDate, todayISO } from '@/lib/domain/dates';

/**
 * Whether the client has accepted this issued contract, and the way to record
 * it. The contract stays exactly as issued; the acceptance is its own record
 * (`domain/contract/acceptance.ts`), because most clients agree by email and
 * never sign the PDF (19 October 2026). Not printed: it sits above the sheet.
 */
export default function ContractAcceptancePanel({
  docId,
  acceptance,
  signatory,
}: {
  docId: string;
  acceptance: ContractAcceptance | null;
  /** The client's signatory from the frozen snapshot, to start the form from. */
  signatory?: { name?: string; designation?: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedOn, setAcceptedOn] = useState(acceptance?.acceptedOn ?? todayISO());
  const [method, setMethod] = useState<AcceptanceMethod>(acceptance?.method ?? 'email');
  const [name, setName] = useState(acceptance?.acceptedByName ?? signatory?.name ?? '');
  const [designation, setDesignation] = useState(
    acceptance?.acceptedByDesignation ?? signatory?.designation ?? '',
  );
  const [reference, setReference] = useState(acceptance?.reference ?? '');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await recordContractAcceptance(docId, {
      acceptedOn,
      method,
      acceptedByName: name,
      acceptedByDesignation: designation || undefined,
      reference: reference || undefined,
    });
    setPending(false);
    if (!result.success) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    setOpen(false);
    toast('Acceptance recorded');
    router.refresh();
  };

  return (
    <section
      data-print-hidden
      aria-label="Client acceptance"
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-4"
    >
      <p className="flex items-center gap-2">
        {acceptance ? (
          <>
            <CircleCheck aria-hidden="true" className="size-4 text-success" />
            <span>
              Accepted by {acceptance.acceptedByName}
              {acceptance.acceptedByDesignation ? ` (${acceptance.acceptedByDesignation})` : ''} on{' '}
              {formatDisplayDate(acceptance.acceptedOn)},{' '}
              {ACCEPTANCE_METHOD_LABELS[acceptance.method].toLowerCase()}.
              {acceptance.reference ? (
                <span className="text-muted-foreground"> {acceptance.reference}</span>
              ) : null}
            </span>
          </>
        ) : (
          <>
            <Clock aria-hidden="true" className="size-4 text-muted-foreground" />
            <span>Awaiting the client&apos;s acceptance.</span>
          </>
        )}
      </p>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {acceptance ? 'Correct acceptance' : 'Record acceptance'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-6 bg-background p-6">
          <DialogHeader>
            <DialogTitle className="text-section font-normal">Record acceptance</DialogTitle>
            <DialogDescription className="text-tab-label">
              The contract takes effect on this date. Keep the email or signed copy it points to.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Field>
              <FieldLabel htmlFor="acceptance-date">Accepted on</FieldLabel>
              <DatePicker id="acceptance-date" size="form" value={acceptedOn} onValueChange={setAcceptedOn} />
            </Field>
            <Field>
              <FieldLabel htmlFor="acceptance-method">How</FieldLabel>
              <Select value={method} onValueChange={(v) => setMethod(v as AcceptanceMethod)}>
                <SelectTrigger id="acceptance-method" size="form" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent size="form">
                  {ACCEPTANCE_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {ACCEPTANCE_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="acceptance-name">Accepted by</FieldLabel>
              <Input id="acceptance-name" size="form" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="acceptance-designation">Designation</FieldLabel>
              <Input
                id="acceptance-designation"
                size="form"
                placeholder="Director"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="acceptance-reference">Evidence</FieldLabel>
              <Input
                id="acceptance-reference"
                size="form"
                placeholder="Email from asha@clayora.com, 12 Oct 2026"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </Field>
            {error ? <FieldError errors={[{ message: error }]} /> : null}
            <DialogFooter className="pt-2">
              <Button type="button" variant="secondary" className={QUIET} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className={INK} pending={pending}>
                Record acceptance
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
