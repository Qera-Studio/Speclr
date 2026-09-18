import { render, screen } from '@testing-library/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table';
import { TableCard } from '@/components/admin/Page';

/**
 * The table primitives' own decisions, as opposed to `RecordTable`'s.
 *
 * Only the ones that are load-bearing and silent: a colour or a `scope` is a
 * single word that nobody notices going missing, and both of these have a
 * reason that is not obvious from reading the class list.
 */
describe('TableHeader', () => {
  /**
   * `bg-sidebar`, not `bg-background`. The header band of a table matches the
   * header band of the page and the margin the card floats in, so the card
   * reads as data held inside the chrome rather than as a box whose first row
   * happens to be bold. Before this the header and the rows were the same
   * fill and a hairline carried the whole distinction.
   *
   * Opaque either way, which is what `sticky` requires: rows scroll under it,
   * and a translucent header shows them through as they pass.
   */
  it('sits on the shell ground, opaquely, so rows can scroll under it', () => {
    render(
      <Table>
        <TableHeader data-testid="head">
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Row</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const head = screen.getByTestId('head');
    expect(head).toHaveClass('bg-sidebar');
    expect(head).not.toHaveClass('bg-background');
    expect(head).toHaveClass('sticky');
  });

  /**
   * Every `<TableHead>` in this app is a column heading. Without `scope` a
   * screen reader guesses which cells a heading governs, from the table's
   * shape, which is the thing a heading exists to remove the need for.
   */
  it('names every heading as a column heading', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );

    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('scope', 'col');
  });
});

/**
 * The card's two bands of furniture, which carry the same fill as the shell's
 * own ground so the data reads as held between them (`docs/design.md` §2.3).
 *
 * The footer was left plain when the header was first tinted, on the argument
 * that sinking the pager would make it harder to find. Seeing it decided the
 * other way: the pager is a control with its own hover and focus states, and
 * the asymmetry read as an unfinished card rather than as a decision.
 */
describe('TableCard', () => {
  const footer = () => screen.getByText('2 documents').parentElement!;

  function renderCard() {
    render(
      <TableCard count="2 documents" pagination={<span>Page 1 / 2</span>}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableCard>,
    );
  }

  it('sits its footer on the shell ground, like the header', () => {
    renderCard();
    expect(footer()).toHaveClass('bg-sidebar');
  });

  /**
   * The footer's right edge is 8px, not the 36px its left keeps.
   *
   * Asymmetric on purpose. The left holds the row count, which is prose and
   * wants to line up with the first column's text. The right holds the pager,
   * which is a row of ghost icon buttons: those carry their own padding inside
   * their hit target, so the *glyph* sits well inside whatever the box says,
   * and 36px on top of that pushed the last arrow visibly off the card's
   * corner. Padding to a control is not padding to a letterform.
   */
  it('brings the pager in to the card edge', () => {
    renderCard();
    expect(footer()).toHaveClass('pr-2');
    expect(footer()).not.toHaveClass('px-9');
  });
});
