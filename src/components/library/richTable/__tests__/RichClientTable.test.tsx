import { render, screen, within } from '@testing-library/react';
import RichClientTable from '../RichClientTable';
import { RICH_CLIENT_ROWS, type RichClientRow } from '../rows';

/**
 * The rich client table. jsdom measures every box as zero, so whether it fits
 * without sideways scroll is a browser question; what is here is what a reader
 * and a screen reader are told.
 */

const rowOf = (name: string) => screen.getByRole('row', { name: new RegExp(name) });

describe('RichClientTable', () => {
  it('names the columns', () => {
    render(<RichClientTable rows={RICH_CLIENT_ROWS} />);
    for (const name of ['Client', 'Industry', 'Location', 'Contact', 'Value', 'Owner']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
    }
  });

  it('says "Individual" where a person has no legal name, and the legal name otherwise', () => {
    render(<RichClientTable rows={RICH_CLIENT_ROWS} />);
    expect(within(rowOf('Meera Iyer')).getByText('Individual')).toBeInTheDocument();
    expect(within(rowOf('Clayora')).getByText('Clayora Private Limited')).toBeInTheDocument();
  });

  it('puts the start month under the figure', () => {
    render(<RichClientTable rows={RICH_CLIENT_ROWS} />);
    const figure = within(rowOf('Clayora')).getByText('1,84,000.00');
    // Same text column as the figure: the line under it, not under the chip.
    expect(figure.closest('.flex-col')).toHaveTextContent(/Since /);
  });

  it('puts the phone in the copy button, not on the line', () => {
    render(<RichClientTable rows={RICH_CLIENT_ROWS} />);
    expect(
      within(rowOf('Clayora')).getByRole('button', { name: /Copy phone/ }),
    ).toBeInTheDocument();
  });

  it('dates a client by the month they arrived', () => {
    render(<RichClientTable rows={RICH_CLIENT_ROWS} />);
    expect(within(rowOf('Meera Iyer')).getByText(/^Since /)).toBeInTheDocument();
  });

  it('puts the flag inside the location cell, named for screen readers', () => {
    render(<RichClientTable rows={RICH_CLIENT_ROWS} />);
    expect(screen.queryByRole('columnheader', { name: 'Country flag' })).not.toBeInTheDocument();
    const row = rowOf('Northwind');
    // The chip is an image named for its country; the line beside it says it
    // again in text.
    expect(within(row).getByRole('img', { name: 'United Kingdom' })).toBeInTheDocument();
    expect(within(row).getByText('United Kingdom')).toBeInTheDocument();
  });

  it('gives every row its menu at the right end', () => {
    render(
      <RichClientTable
        rows={RICH_CLIENT_ROWS.slice(0, 2)}
        actions={(row) => <button type="button">More actions for {row.name}</button>}
      />,
    );
    expect(
      within(rowOf('Clayora')).getByRole('button', { name: 'More actions for Clayora' }),
    ).toBeInTheDocument();
  });

  it('shows the checkbox and the row menu at rest, not only on hover', () => {
    render(
      <RichClientTable
        rows={RICH_CLIENT_ROWS.slice(0, 1)}
        actions={(row) => <button type="button">More actions for {row.name}</button>}
      />,
    );
    const row = rowOf('Clayora');
    expect(within(row).getByRole('checkbox', { name: 'Select row' })).not.toHaveClass('opacity-0');
    const menu = within(row).getByRole('button', { name: 'More actions for Clayora' });
    expect(menu.parentElement).not.toHaveClass('opacity-0');
  });

  it('opens a row only when it has somewhere to go', () => {
    const { unmount } = render(<RichClientTable rows={RICH_CLIENT_ROWS} />);
    expect(screen.queryByRole('link', { name: /Clayora/ })).not.toBeInTheDocument();
    unmount();
    render(<RichClientTable rows={[{ ...RICH_CLIENT_ROWS[0]!, href: '/client/clients/c1' }]} />);
    expect(screen.getByRole('link', { name: /Clayora/ })).toHaveAttribute('href', '/client/clients/c1');
  });

  it('draws a client with almost nothing filled in without inventing values', () => {
    const bare: RichClientRow = {
      id: 'x',
      name: 'Bare Co',
      entityType: 'pvt_ltd',
      country: 'IN',
      currency: 'INR',
      addedAt: '2026-10-01',
      team: [],
    };
    render(<RichClientTable rows={[bare]} />);
    const row = rowOf('Bare Co');
    expect(within(row).getByText('Since Oct 2026')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /Copy phone/ })).not.toBeInTheDocument();
  });
});
