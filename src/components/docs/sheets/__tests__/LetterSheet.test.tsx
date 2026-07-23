import { render, screen } from '@testing-library/react';
import LetterSheet from '../LetterSheet';
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
