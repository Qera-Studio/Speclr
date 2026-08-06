import { render, screen } from '@testing-library/react';
import { Mail } from 'lucide-react';
import ColumnLabel from '../ColumnLabel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

describe('ColumnLabel', () => {
  it('shows the column name', () => {
    render(<ColumnLabel icon={Mail}>Email</ColumnLabel>);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  /**
   * The icon restates the column name sitting right beside it, so announcing it
   * would make a screen reader say the column twice. A column header's
   * accessible name must stay exactly its label — the sortable headers are
   * found by that name, and so is anyone navigating the table by column.
   */
  it('leaves the header accessible name as the label alone', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <ColumnLabel icon={Mail}>Email</ColumnLabel>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>a@b.com</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const header = screen.getByRole('columnheader', { name: 'Email' });
    expect(header.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
