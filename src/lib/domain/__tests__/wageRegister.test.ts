import { registerMonths, wageRegisterCsv, wageRegisterRows } from '../wageRegister';
import type { SlipDocument } from '../types';

const slip = (overrides: Partial<SlipDocument>): SlipDocument =>
  ({
    id: 'p', type: 'PAY', status: 'finalized', number: 'QS-PAY-2627-001', issueDate: '2026-06-30',
    stipendMonth: '2026-06', paymentMethod: 'Bank Transfer', deductionsNote: '', gstRatePercent: 0,
    employeeId: 'e', createdAt: 0, updatedAt: 0, daysPaid: 30, lopDays: 0,
    employeeSnapshot: {
      name: 'Ananya Rao', address: '', email: '', phone: '', role: 'Senior Designer',
      engagementType: 'employee', pronoun: 'she', joiningDate: '2025-04-01',
      bank: { bankName: '', accountNo: '', ifsc: '' }, payroll: { employeeCode: 'QS-EMP-004' },
      payAmountPaise: 6_000_000,
    },
    lineItems: [{ description: 'Basic', ratePaise: 4_000_000, qty: 1 }, { description: 'HRA', ratePaise: 2_000_000, qty: 1 }],
    deductions: [{ description: 'TDS under section 192', ratePaise: 250_000, qty: 1 }],
    ...overrides,
  }) as SlipDocument;

describe('the wage register', () => {
  const slips = [
    slip({}),
    slip({ id: 'q', number: 'QS-PAY-2627-002', employeeSnapshot: { ...slip({}).employeeSnapshot, name: 'Aarav Mehta' } }),
    slip({ id: 'd', status: 'draft', number: undefined }),
    slip({ id: 'm', stipendMonth: '2026-05', number: 'QS-PAY-2627-000' }),
    slip({ id: 's', type: 'STP', number: 'QS-STP-2627-001' }),
  ];

  it('lists issued pay slips only, a month at a time, by name', () => {
    const rows = wageRegisterRows(slips, '2026-06');
    expect(rows.map((r) => r.number)).toEqual(['QS-PAY-2627-002', 'QS-PAY-2627-001']);
    expect(rows[1]).toMatchObject({ ratePaise: 6_000_000, grossPaise: 6_000_000, deductionsPaise: 250_000, netPaise: 5_750_000 });
  });

  it('offers the months that have one, newest first', () => {
    expect(registerMonths(slips)).toEqual(['2026-06', '2026-05']);
  });

  it('writes CSV a spreadsheet sums, and defuses a formula in a name', () => {
    const csv = wageRegisterCsv(
      wageRegisterRows([slip({ employeeSnapshot: { ...slip({}).employeeSnapshot, name: '=HYPERLINK("x")' } })], '2026-06'),
    );
    const [head, row] = csv.trim().split('\n');
    expect(head).toMatch(/^Slip number,Employee,/);
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
    expect(row).toContain(',60000.00,30,0,60000.00,TDS under section 192: 2500.00,2500.00,57500.00,2026-06-30,');
  });
});
