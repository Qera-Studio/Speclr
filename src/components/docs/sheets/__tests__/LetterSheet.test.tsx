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
    // cover + brand + 2 paragraphs + closing (acknowledgement, signatures,
    // registered office and footer travel together as one block)
    expect(blocks).toHaveLength(5);
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

/**
 * The offer letter's chrome. Its date, signatures and identity lines are the
 * parts a reader checks a letter by, so they are asserted rather than left to
 * the eye. Page geometry (36px margins, the closing block sitting at the foot)
 * is layout — jsdom cannot judge it.
 */
describe('offer letter chrome', () => {
  it('carries the issue date on the body page, not under a signature', () => {
    render(<>{letterBlocks(offerDoc)}</>);

    // Cover, body header, footer — and nowhere else. It used to sit over a
    // ruled line in the signature block, where it read as the date signed.
    expect(screen.getAllByText('10 Jun 2026')).toHaveLength(3);
    expect(screen.queryByText('Date:')).not.toBeInTheDocument();
  });

  it('gives both parties a line to sign on, and names the authorised signatory', () => {
    render(<>{letterBlocks(offerDoc)}</>);

    expect(screen.getAllByText('Signature:')).toHaveLength(2);
    expect(screen.getByText('(Authorised Signatory)')).toBeInTheDocument();
    // The letter asks the recipient to confirm agreement, so their name sits
    // under a signature line of their own.
    expect(screen.getAllByText('Riya Sharma').length).toBeGreaterThan(1);
    // The signatory's email was noise on a signature block.
    expect(screen.queryByText('shivanshu@qera.studio')).not.toBeInTheDocument();
  });

  it('prints the registered office and website in the footer', () => {
    render(<>{letterBlocks(offerDoc)}</>);

    const office = screen.getByText(
      'QERA PRIVATE LIMITED. Registered office: C-204, MGI Gharaunda, Raj Nagar Extension, Ghaziabad - 201017, Uttar Pradesh, India',
    );
    // Inside the footer, i.e. below its rule — not floating above it.
    expect(office.closest('footer')).not.toBeNull();
    expect(screen.getByText('www.qera.studio')).toBeInTheDocument();
  });

  /** The body is free text in the editor, so the subject is found by its text. */
  it('sets the subject line apart from the body', () => {
    render(<>{letterBlocks(offerDoc)}</>);

    const subject = screen.getByText(/^Subject: Offer of Internship/);
    expect(subject).toHaveClass('text-[16px]', 'font-semibold');
    expect(
      screen.getByText(/We are pleased to offer you the position/),
    ).toHaveClass('text-[14px]');
  });

  /** Certifying letters were deliberately left alone this round. */
  it('leaves the experience letter on the old signature block', () => {
    render(<>{letterBlocks(experienceDoc)}</>);

    expect(screen.getByText('Date:')).toBeInTheDocument();
    expect(screen.getByText('shivanshu@qera.studio')).toBeInTheDocument();
    expect(screen.queryByText('(Authorised Signatory)')).not.toBeInTheDocument();
  });
});
