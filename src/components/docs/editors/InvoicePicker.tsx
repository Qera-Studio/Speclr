'use client';

import { useEffect, useState } from 'react';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { listInvoicesForClient } from '@/server/actions/documents';
import { formatDisplayDate } from '@/lib/domain/dates';
import { formatINR } from '@/lib/domain/money';
import type { InvoiceOption } from '@/lib/domain/types';

/**
 * Picks the invoice a receipt settles, from that client's finalized invoices,
 * newest first.
 *
 * Choosing one hands the whole invoice back so the editor can autofill from it.
 * The list is empty until a client is chosen — a receipt belongs to a client,
 * and offering another client's invoices would be a mis-link waiting to happen.
 */
interface InvoicePickerProps {
  id: string;
  clientId: string;
  value: string;
  onSelect: (invoice: InvoiceOption | null) => void;
  size?: 'default' | 'form';
}

export default function InvoicePicker({
  id,
  clientId,
  value,
  onSelect,
  size = 'form',
}: InvoicePickerProps) {
  const [invoices, setInvoices] = useState<InvoiceOption[]>([]);

  useEffect(() => {
    if (!clientId) {
      setInvoices([]);
      return;
    }
    let active = true;
    void listInvoicesForClient(clientId).then((rows) => {
      if (active) setInvoices(rows);
    });
    return () => {
      active = false;
    };
  }, [clientId]);

  const options: ComboboxOption[] = invoices.map((invoice) => ({
    value: invoice.id,
    label: invoice.number,
    hint: `${formatDisplayDate(invoice.issueDate)} · ${formatINR(invoice.totalPaise)}`,
  }));

  return (
    <Combobox
      id={id}
      size={size}
      options={options}
      value={value}
      onValueChange={(next) => onSelect(invoices.find((i) => i.id === next) ?? null)}
      placeholder={clientId ? 'Select an invoice…' : 'Select a client first'}
      emptyMessage={clientId ? 'No finalized invoices for this client.' : 'Select a client first.'}
      disabled={!clientId}
    />
  );
}
