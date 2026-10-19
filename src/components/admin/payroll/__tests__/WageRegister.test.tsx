import { render, screen, within } from '@testing-library/react';
import WageRegister from '../WageRegister';
import type { WageRegisterRow } from '@/lib/domain/wageRegister';

const row: WageRegisterRow = {
  number: 'QS-PAY-2627-001', name: 'Ananya Rao', employeeCode: 'QS-EMP-004', designation: 'Senior Designer',
  ratePaise: 6_000_000, daysPaid: 30, lopDays: 0, grossPaise: 6_000_000,
  deductions: [{ description: 'TDS under section 192', paise: 250_000 }], deductionsPaise: 250_000,
  netPaise: 5_750_000, paidOn: '2026-06-30', paymentMethod: 'Bank Transfer', currency: 'INR',
};

describe('WageRegister', () => {
  it('lists the month, with each deduction itemised, and offers the CSV', () => {
    render(<WageRegister months={['2026-06', '2026-05']} month="2026-06" rows={[row]} />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Ananya Rao')).toBeInTheDocument();
    expect(within(table).getByText(/TDS under section 192/)).toBeInTheDocument();
    expect(within(table).getByText('QS-PAY-2627-001')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'June 2026' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Download CSV/ })).toHaveAttribute('href', '/api/wage-register?month=2026-06');
  });

  it('says it fills itself before the first pay slip', () => {
    render(<WageRegister months={[]} month={null} rows={[]} />);
    expect(screen.getByText(/fills itself as pay slips are issued/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Download CSV/ })).not.toBeInTheDocument();
  });
});
