import { render, screen, within } from '@testing-library/react';
import ContractSheet from '../ContractSheet';
import { contractDoc } from '@/lib/domain/contract/__tests__/fixture';

describe('ContractSheet', () => {
  it('renders the cover with the agreement title and the client', () => {
    render(<ContractSheet doc={contractDoc()} />);
    expect(screen.getByText('Master Service Agreement')).toBeInTheDocument();
    expect(screen.getAllByText('Clayora Private Limited').length).toBeGreaterThan(0);
  });

  /** The legal name, not the short reference used in lists (CONTEXT.md §5a). */
  it('prints the legal entity name rather than the short one', () => {
    render(<ContractSheet doc={contractDoc()} />);
    expect(screen.queryByText('Clayora')).not.toBeInTheDocument();
  });

  it('renders the Master Agreement clauses', () => {
    render(<ContractSheet doc={contractDoc()} />);
    expect(screen.getByText('1. Definitions and Interpretation')).toBeInTheDocument();
    expect(screen.getByText('27. Governing Law and Jurisdiction')).toBeInTheDocument();
  });

  it('renders a Schedule cover with only the Parts it includes', () => {
    render(<ContractSheet doc={contractDoc({ codes: ['05'] })} />);
    const schedule = screen.getByLabelText('Schedule A');
    expect(within(schedule).getByText('Build')).toBeInTheDocument();
    expect(within(schedule).getByText('Part A-1')).toBeInTheDocument();
    expect(within(schedule).getByText('Shopify storefront')).toBeInTheDocument();
  });

  it('renders no Schedule at all when nothing is ticked', () => {
    render(<ContractSheet doc={contractDoc({ codes: [] })} />);
    expect(screen.queryByLabelText('Schedule A')).not.toBeInTheDocument();
  });

  it('letters Schedule clauses with the letter this contract assigned', () => {
    render(<ContractSheet doc={contractDoc({ codes: ['05'] })} />);
    expect(screen.getByText('A2. Fees and Payment')).toBeInTheDocument();
  });

  it('renders a Part with its own sections', () => {
    render(<ContractSheet doc={contractDoc({ codes: ['05'] })} />);
    const part = screen.getByLabelText('Part A-1');
    expect(within(part).getByText('What is included')).toBeInTheDocument();
    expect(within(part).getByText('Limits')).toBeInTheDocument();
    expect(within(part).getByText('What is not included')).toBeInTheDocument();
    expect(within(part).getByText('What the Client provides')).toBeInTheDocument();
  });

  /**
   * The exclusion text comes from the contract's own frozen copy. Printing the
   * bare id would mean the live library had moved on underneath an issued
   * agreement.
   */
  it('prints exclusion lines as text, never as ids', () => {
    render(<ContractSheet doc={contractDoc({ codes: ['05'] })} />);
    const part = screen.getByLabelText('Part A-1');
    expect(within(part).getByText('Copywriting of any kind')).toBeInTheDocument();
    expect(within(part).queryByText('E01')).not.toBeInTheDocument();
  });

  it('prints a drafted default where a blank has not been touched', () => {
    render(<ContractSheet doc={contractDoc({ codes: ['05'] })} />);
    // Part 05's Limits table: 'Products uploaded' is drafted [50].
    expect(screen.getAllByText('50').length).toBeGreaterThan(0);
  });

  it('prints a filled blank as ordinary text', () => {
    const doc = contractDoc({ codes: ['05'], blanks: { 'part.05.limits#1': '120' } });
    render(<ContractSheet doc={doc} />);
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  /**
   * The failure content §1 exists to prevent: a blank must never print as empty
   * space, which reads as finished text.
   */
  it('marks an unfilled blank rather than printing nothing', () => {
    render(<ContractSheet doc={contractDoc({ codes: ['05'] })} />);
    // Part 05's Fee row is drafted '[ ]' — nothing to fall back on.
    expect(screen.getAllByText('fill this in').length).toBeGreaterThan(0);
  });

  /**
   * A Retainer Part is delivered per cycle rather than finished once, so
   * "Completion criteria" above "not applicable" would be a heading that lies.
   */
  it('heads a Retainer Part by cycle rather than by completion', () => {
    render(<ContractSheet doc={contractDoc({ codes: ['18'] })} />);
    const part = screen.getByLabelText('Part A-1');
    expect(within(part).getByText('What is included each cycle')).toBeInTheDocument();
    expect(within(part).getByText('How delivery is measured')).toBeInTheDocument();
    expect(within(part).getByText('Fee and cycle')).toBeInTheDocument();
    expect(within(part).queryByText('Completion criteria')).not.toBeInTheDocument();
  });

  it('heads a Build Part by completion and timeline', () => {
    render(<ContractSheet doc={contractDoc({ codes: ['05'] })} />);
    const part = screen.getByLabelText('Part A-1');
    expect(within(part).getByText('Completion criteria')).toBeInTheDocument();
    expect(within(part).getByText('Fee and timeline')).toBeInTheDocument();
  });

  /** Four Schedules, lettered in canonical order with the Parts under each. */
  it('assembles a contract spanning every Schedule', () => {
    render(<ContractSheet doc={contractDoc({ codes: ['21', '17', '01', '11'] })} />);
    expect(screen.getByLabelText('Schedule A')).toBeInTheDocument();
    expect(screen.getByLabelText('Schedule D')).toBeInTheDocument();
    expect(screen.getByLabelText('Part A-1')).toBeInTheDocument();
    expect(screen.getByLabelText('Part D-1')).toBeInTheDocument();
    // Each Schedule's clauses carry its own letter — A is Setup, B is Build.
    expect(screen.getByText('A2. Fee and Payment')).toBeInTheDocument();
    expect(screen.getByText('B2. Fees and Payment')).toBeInTheDocument();
  });

  it('renders both execution blocks from the record', () => {
    render(<ContractSheet doc={contractDoc()} />);
    const execution = screen.getByLabelText('Execution');
    expect(within(execution).getByText('Qera Private Limited')).toBeInTheDocument();
    expect(within(execution).getByText('Clayora Private Limited')).toBeInTheDocument();
  });
});
