import { render, screen } from '@testing-library/react';
import { quotationBlocks } from '../QuotationSheet';
import type { QuotationDocument } from '@/lib/domain/types';

const baseDoc = {
  id: 'qtn-1',
  type: 'QTN',
  status: 'draft',
  issueDate: '2026-08-27',
  gstRatePercent: 0,
  recipientName: 'Clayora Private Limited',
  attentionName: 'Priya Shah',
  offerLine: 'We are pleased to submit our offer for the above mentioned project.',
  subjectLine: 'Website + social media retainer',
  validUntil: '2026-09-27',
  gstCountry: 'IN',
  lineItems: [
    { description: 'Web design', ratePaise: 1_500_000, qty: 1, section: 'Website(s)' },
    { description: 'Hosting', ratePaise: 287_000, qty: 1, section: 'Website(s)', recurring: true },
    { description: 'Content Creation', ratePaise: 1_535_000, qty: 1, section: 'Social Media' },
  ],
  milestones: [
    { label: 'Advance', percent: 50 },
    { label: 'On delivery', percent: 50 },
  ],
  termsNote: 'Valid for 30 days.',
  createdAt: 0,
  updatedAt: 0,
} as unknown as QuotationDocument;

describe('quotationBlocks', () => {
  it('renders a fixed cover page, with no per-document data on it', () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    const cover = screen.getByLabelText('Cover');
    expect(cover).toHaveTextContent('Service');
    expect(cover).toHaveTextContent('Quotation');
    expect(cover).not.toHaveTextContent('Clayora Private Limited');
  });

  it('renders the recipient, sections, subtotals and grand total in the details/pricing blocks', () => {
    render(<>{quotationBlocks(baseDoc)}</>);

    const recipient = screen.getByText('Clayora Private Limited');
    expect(recipient).toHaveClass('text-[16px]');
    expect(screen.getByText(/Kind Attention: Priya Shah/)).toBeInTheDocument();
    expect(screen.getByText(baseDoc.offerLine!)).toBeInTheDocument();
    expect(screen.getByText('Website(s)')).toBeInTheDocument();
    expect(screen.getByText('Social Media')).toBeInTheDocument();
    expect(screen.getByText('Web design')).toBeInTheDocument();
    // The recurring line is separated into its own "Recurring" block.
    expect(screen.getByText('Recurring')).toBeInTheDocument();
    expect(screen.getByText(/2,870\.00/)).toBeInTheDocument();
  });

  it('shows an estimated GST line for an Indian recipient, with a disclaimer', () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    expect(screen.getByText(/Est\. GST \(18%\)/)).toBeInTheDocument();
    expect(screen.getByText(/not a tax invoice/i)).toBeInTheDocument();
  });

  it('shows no GST line for an international recipient', () => {
    render(<>{quotationBlocks({ ...baseDoc, gstCountry: 'INTL' })}</>);
    expect(screen.queryByText(/Est\. GST/)).not.toBeInTheDocument();
  });

  it('renders the payment milestone schedule when present', () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    expect(screen.getByText('Payment schedule')).toBeInTheDocument();
    expect(screen.getByText('Advance')).toBeInTheDocument();
  });

  it('omits the milestone block entirely when there are none', () => {
    render(<>{quotationBlocks({ ...baseDoc, milestones: undefined })}</>);
    expect(screen.queryByText('Payment schedule')).not.toBeInTheDocument();
  });

  it('prints the recipient as an em dash placeholder when blank, never empty', () => {
    render(<>{quotationBlocks({ ...baseDoc, recipientName: undefined })}</>);
    // "Prepared for" label still renders, with a placeholder rather than nothing.
    expect(screen.getByText('Prepared for')).toBeInTheDocument();
  });

  it('renders a fixed closing page with links and legal lines, and no per-document data', () => {
    render(<>{quotationBlocks(baseDoc)}</>);
    expect(screen.getByLabelText("Let's collaborate")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'www.qera.studio' })).toHaveAttribute(
      'href',
      'https://www.qera.studio',
    );
    expect(screen.getByRole('link', { name: 'hello@qera.studio' })).toHaveAttribute(
      'href',
      'mailto:hello@qera.studio',
    );
    expect(screen.getByRole('link', { name: '@qera.studio' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/qera.studio',
    );
    expect(screen.getByText('© Qera Studio. All rights reserved')).toBeInTheDocument();
    expect(screen.getByText(/CIN:/)).toBeInTheDocument();
  });

  it('draws no corner marks anywhere on the sheet', () => {
    const { container } = render(<>{quotationBlocks(baseDoc)}</>);
    const glyphs = Array.from(container.querySelectorAll('[aria-hidden="true"]')).filter(
      (el) => el.textContent?.trim() === '+',
    );
    expect(glyphs).toHaveLength(0);
  });
});
