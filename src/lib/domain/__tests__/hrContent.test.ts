import { defaultLetterContent, exitMasthead, HR_FOOTER } from '../hrContent';

function baseArgs() {
  return {
    role: 'Operations management Intern',
    payText: '₹ 2,500.00',
    startDate: '10th June 2026',
    endDate: '10th July 2026',
    pronoun: { subject: 'he', object: 'him', possessive: 'his' },
  };
}

describe('defaultLetterContent — offer', () => {
  it('intern offer has body paragraphs and mentions a stipend', () => {
    const c = defaultLetterContent('OFR', 'intern', {
      ...baseArgs(),
      payText: '₹ 1,000.00 per month',
      pronoun: { subject: 'you', object: 'you', possessive: 'your' },
    });
    expect(c.masthead).toMatch(/offer letter/i);
    expect(c.bodyParagraphs.length).toBeGreaterThan(2);
    expect(c.bodyParagraphs.join(' ')).toMatch(/stipend/i);
  });

  it('employee offer uses remuneration/employment wording, not stipend', () => {
    const c = defaultLetterContent('OFR', 'employee', baseArgs());
    const all = c.bodyParagraphs.join(' ').toLowerCase();
    expect(all).toMatch(/employment|remuneration/);
    expect(all).not.toMatch(/internship/);
  });
});

describe('defaultLetterContent — experience', () => {
  it('has a responsibilities and a conduct bullet section', () => {
    const c = defaultLetterContent('EXP', 'intern', baseArgs());
    const headings = c.bulletSections.map((s) => s.heading.toLowerCase());
    expect(headings.some((h) => /responsib/.test(h))).toBe(true);
    expect(headings.some((h) => /conduct/.test(h))).toBe(true);
    expect(c.subheading).toMatch(/whomsoever/i);
  });
});

describe('defaultLetterContent — exit (auto-switching)', () => {
  it('is "Internship Completion" for interns, "Relieving" for employees', () => {
    expect(defaultLetterContent('EXIT', 'intern', baseArgs()).masthead).toMatch(/completion/i);
    expect(defaultLetterContent('EXIT', 'employee', baseArgs()).masthead).toMatch(/relieving/i);
  });

  it('intern exit wording never says "salary" or "relieved from the services"', () => {
    const c = defaultLetterContent('EXIT', 'intern', baseArgs());
    const all = [c.masthead, c.subheading ?? '', ...c.bodyParagraphs, ...c.bulletSections.flatMap((s) => [s.heading, ...s.items])]
      .join(' ')
      .toLowerCase();
    expect(all).not.toMatch(/salary/);
    expect(all).not.toMatch(/relieved from the services/);
    expect(all).not.toMatch(/resignation/);
  });

  it('employee exit uses proper relieving language', () => {
    const c = defaultLetterContent('EXIT', 'employee', baseArgs());
    const all = c.bodyParagraphs.join(' ').toLowerCase();
    expect(all).toMatch(/relieved from the services/);
  });

  /**
   * "Therein" points at the resignation letter named in the paragraph above it.
   * An intern never resigns, so on an internship completion letter the word
   * would refer to a document that does not exist.
   */
  it('confirms acceptance of the resignation terms on the employee exit only', () => {
    const employee = defaultLetterContent('EXIT', 'employee', baseArgs());
    const intern = defaultLetterContent('EXIT', 'intern', baseArgs());

    expect(employee.bodyParagraphs).toContain(
      'We confirm acceptance on the terms and conditions stipulated therein.',
    );
    expect(intern.bodyParagraphs.join(' ')).not.toMatch(/stipulated therein/);
  });
});

describe('exitMasthead', () => {
  it('maps engagement type to the correct masthead', () => {
    expect(exitMasthead('intern')).toBe('INTERNSHIP COMPLETION LETTER');
    expect(exitMasthead('employee')).toBe('RELIEVING LETTER');
  });
});

describe('HR_FOOTER', () => {
  it('carries the CIN and admin query email', () => {
    expect(HR_FOOTER.cin).toMatch(/^U\d/);
    expect(HR_FOOTER.queryEmail).toBe('admin@qera.studio');
  });
});
