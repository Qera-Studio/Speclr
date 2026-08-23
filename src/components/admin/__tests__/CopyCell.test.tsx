import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyCell } from '../CopyCell';
import { Table, TableBody, TableRow } from '@/components/ui/table';

function renderCell(ui: React.ReactNode) {
  return render(
    <Table>
      <TableBody>
        <TableRow>{ui}</TableRow>
      </TableBody>
    </Table>,
  );
}

describe('CopyCell', () => {
  it('copies when the value itself is clicked, not only an icon', async () => {
    const user = userEvent.setup();
    renderCell(<CopyCell value="+919876543210" label="Copy phone number" />);

    await user.click(screen.getByRole('button', { name: 'Copy phone number' }));

    // userEvent installs a real clipboard stub — read it back.
    await expect(navigator.clipboard.readText()).resolves.toBe('+919876543210');
    // The flash is what tells the reader it worked.
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('copies the stored value while printing the formatted one', async () => {
    const user = userEvent.setup();
    renderCell(
      <CopyCell value="+919876543210" label="Copy phone number" display="+91 98765 43210" />,
    );

    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy phone number' }));
    await expect(navigator.clipboard.readText()).resolves.toBe('+919876543210');
  });

  it('leaves the printed value alone when it is interactive itself', async () => {
    const user = userEvent.setup();
    renderCell(
      <CopyCell
        value="QS-INV-2627-001"
        label="Copy document number"
        iconOnly
        display={<a href="/docs/1">QS-INV-2627-001</a>}
      />,
    );

    // The link is still a link; the icon beside it is what copies.
    expect(screen.getByRole('link')).toHaveAttribute('href', '/docs/1');
    await user.click(screen.getByRole('button', { name: 'Copy document number' }));
    await expect(navigator.clipboard.readText()).resolves.toBe('QS-INV-2627-001');
  });

  it('prints the nil glyph and offers nothing to copy when there is no value', () => {
    renderCell(<CopyCell value={null} label="Copy email" />);

    expect(screen.getByRole('cell')).toHaveTextContent('-');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
