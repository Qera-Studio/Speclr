import { render, screen } from '@testing-library/react';
import LetterSheet, { letterBlocks } from '../LetterSheet';
import type { LetterDocument, EmployeeSnapshot } from '@/lib/domain/types';

const baseEmployee: EmployeeSnapshot = {
  name: 'Riya Sharma',
  address: 'Sector 12, Noida',
  email: 'riya@example.com',
  phone: '9876543210',
  role: 'Marketing Associate',
  engagementType: 'intern',
  pronoun: 'she',
  joiningDate: '2026-06-10',
  bank: { bankName: 'Kotak Mahindra Bank', accountNo: '1234567890', ifsc: 'KKBK0000677' },
};

const offerDoc = {
  type: 'OFR',
  status: 'finalized',
  issueDate: '2026-06-10',
  employeeId: 'emp-1',
  employeeSnapshot: baseEmployee,
  bodyParagraphs: [
    'Subject: Offer of Internship — Marketing Associate',
    'We are pleased to offer you the position of Marketing Associate at Qera Studio.',
  ],
  bulletSections: [],
  lineItems: [],
  gstRatePercent: 0,
} as unknown as LetterDocument;

const experienceDoc = {
  ...offerDoc,
  type: 'EXP',
  bodyParagraphs: ['This is to certify that {name} interned with Qera Private Limited.'],
} as unknown as LetterDocument;

const exitInternDoc = {
  ...offerDoc,
  type: 'EXIT',
  employeeSnapshot: { ...baseEmployee, engagementType: 'intern', endDate: '2026-09-10' },
  bodyParagraphs: ['This is to certify that {name} has successfully completed her internship.'],
  bulletSections: [{ heading: 'We confirm that:', items: ['All dues settled.'] }],
} as unknown as LetterDocument;

const exitEmployeeDoc = {
  ...exitInternDoc,
  employeeSnapshot: { ...baseEmployee, engagementType: 'employee', endDate: '2026-09-10' },
} as unknown as LetterDocument;

describe('LetterSheet', () => {
  it('renders the offer letter with the employee name and a body paragraph', () => {
    render(<LetterSheet doc={offerDoc} />);
    expect(screen.getAllByText('Riya Sharma').length).toBeGreaterThan(0);
    expect(
      screen.getByText(/We are pleased to offer you the position of Marketing Associate/),
    ).toBeInTheDocument();
  });

  it('shows the Internship Completion Letter title for an intern exit letter', () => {
    render(<LetterSheet doc={exitInternDoc} />);
    expect(screen.getByText('INTERNSHIP COMPLETION LETTER')).toBeInTheDocument();
  });

  it('shows the Relieving Letter title for an employee exit letter', () => {
    render(<LetterSheet doc={exitEmployeeDoc} />);
    expect(screen.getByText('RELIEVING LETTER')).toBeInTheDocument();
  });

  it('renders the experience letter masthead', () => {
    render(<LetterSheet doc={experienceDoc} />);
    expect(screen.getByText('EXPERIENCE LETTER')).toBeInTheDocument();
  });
});

/**
 * The block list feeding `DocumentPreview`.
 *
 * Regression: `LetterSheet` used to return one monolithic `<article>`. The
 * preview treats each child as an atomic block, so a single over-tall block got
 * one page and the frame's `overflow-hidden` clipped everything past 1123px —
 * an offer letter previewed as its cover and nothing else.
 */
describe('letterBlocks', () => {
  it('returns many blocks for an offer letter, not one', () => {
    const blocks = letterBlocks(offerDoc);
    expect(blocks.length).toBeGreaterThan(1);
  });

  it('puts the cover first so it can be pinned as page 1', () => {
    const [cover] = letterBlocks(offerDoc);
    render(<>{cover}</>);
    expect(screen.getByLabelText('Cover')).toBeInTheDocument();
    expect(screen.getByText('COMPANY OFFER LETTER')).toBeInTheDocument();
  });

  it('gives every body paragraph its own block, so pages can break between them', () => {
    const blocks = letterBlocks(offerDoc);
    // cover + brand + 2 paragraphs + acknowledgement + footer
    expect(blocks).toHaveLength(6);
  });

  it('has no cover block for experience/exit letters', () => {
    const [first] = letterBlocks(experienceDoc);
    render(<>{first}</>);
    expect(screen.queryByLabelText('Cover')).not.toBeInTheDocument();
  });

  /** Bullets added to an offer letter must print, not vanish. */
  it('renders bullet sections on an offer letter too', () => {
    const withBullets = {
      ...offerDoc,
      bulletSections: [{ heading: 'Your responsibilities', items: ['Draft campaign copy'] }],
    } as unknown as LetterDocument;

    render(<>{letterBlocks(withBullets)}</>);
    expect(screen.getByText('Your responsibilities')).toBeInTheDocument();
    expect(screen.getByText('Draft campaign copy')).toBeInTheDocument();
  });
});
