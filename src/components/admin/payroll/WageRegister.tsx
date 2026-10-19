'use client';

import Link from 'next/link';
import { Download } from 'lucide-react';
import { DateValue, PageHeader } from '@/components/patterns/Page';
import RecordTable from '@/components/patterns/RecordTable';
import { Mono } from '@/components/patterns/Mono';
import { EmptyState } from '@/components/ui/empty';
import { buttonVariants } from '@/components/ui/button';
import { formatDisplayMonth } from '@/lib/domain/dates';
import { formatMoney } from '@/lib/domain/money';
import { NIL } from '@/lib/utils';
import type { WageRegisterRow } from '@/lib/domain/wageRegister';

/**
 * One month of the wage register, read off the issued pay slips
 * (`domain/wageRegister.ts`). Read-only: a correction is a new pay slip, never
 * an edit here, because the slip is the record and this is a view of it.
 */
export default function WageRegister({
  months,
  month,
  rows,
}: {
  months: string[];
  month: string | null;
  rows: WageRegisterRow[];
}) {
  return (
    <>
      <PageHeader
        title="Wage register"
        description="Every issued pay slip, by month. To correct a row, issue a new pay slip."
      >
        {month && rows.length > 0 ? (
          <a
            href={`/api/wage-register?month=${month}`}
            className={buttonVariants({ variant: 'secondary' })}
            download
          >
            <Download aria-hidden="true" />
            Download CSV
          </a>
        ) : null}
      </PageHeader>

      {months.length === 0 ? (
        <EmptyState
          preset="none-yet"
          noun="pay slip"
          description="The register fills itself as pay slips are issued."
        />
      ) : (
        <>
          <nav aria-label="Months" className="flex flex-wrap gap-2">
            {months.map((m) => (
              <Link
                key={m}
                href={`/admin/wage-register?month=${m}`}
                aria-current={m === month ? 'page' : undefined}
                className={buttonVariants({ variant: m === month ? 'primary' : 'secondary', size: 'sm' })}
              >
                {formatDisplayMonth(m)}
              </Link>
            ))}
          </nav>
          <RecordTable
            rows={rows}
            id={(r) => r.number}
            noun="pay slip"
            caption={`Wage register for ${month ? formatDisplayMonth(month) : ''}`}
            rowLabel={(r) => r.name}
            columns={[
              {
                key: 'employee',
                label: 'Employee',
                cell: (r) => (
                  <>
                    {r.name}
                    {r.employeeCode ? (
                      <div className="text-meta text-muted-foreground">
                        <Mono>{r.employeeCode}</Mono>
                      </div>
                    ) : null}
                  </>
                ),
              },
              { key: 'designation', label: 'Designation', cell: (r) => r.designation },
              {
                key: 'rate',
                label: 'Rate',
                right: true,
                cell: (r) => <Mono>{r.ratePaise === undefined ? NIL : formatMoney(r.ratePaise, r.currency)}</Mono>,
              },
              {
                key: 'days',
                label: 'Days paid',
                right: true,
                cell: (r) => (
                  <Mono>
                    {r.daysPaid ?? NIL}
                    {r.lopDays ? ` (${r.lopDays} LOP)` : ''}
                  </Mono>
                ),
              },
              { key: 'gross', label: 'Gross', right: true, cell: (r) => <Mono>{formatMoney(r.grossPaise, r.currency)}</Mono> },
              {
                key: 'deductions',
                label: 'Deductions',
                cell: (r) =>
                  r.deductions.length === 0 ? (
                    NIL
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {r.deductions.map((d) => (
                        <li key={d.description} className="text-meta">
                          {d.description}: <Mono>{formatMoney(d.paise, r.currency)}</Mono>
                        </li>
                      ))}
                    </ul>
                  ),
              },
              { key: 'net', label: 'Net', right: true, cell: (r) => <Mono>{formatMoney(r.netPaise, r.currency)}</Mono> },
              { key: 'paid', label: 'Paid', cell: (r) => <DateValue value={r.paidOn} /> },
              { key: 'slip', label: 'Slip', cell: (r) => <Mono>{r.number}</Mono> },
            ]}
          />
        </>
      )}
    </>
  );
}
