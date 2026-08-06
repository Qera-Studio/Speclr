import {
  defaultLetterContent,
  exitMasthead,
  HR_FOOTER,
  payslipTerms,
  slipEarningsSeed,
  stipendTerms,
} from '../hrContent';

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

/**
 * The pay slip's clauses. A pay slip is issued *under* a contract of
 * employment, so it must never carry the stipend slip's denial of one, and the
 * word "internship" must never appear on a document issued to an employee.
 *
 * This mirrors the intern-exit assertion above: the same class of wording bug,
 * caught the same way.
 */
describe('payslipTerms', () => {
  const flat = (terms: ReturnType<typeof payslipTerms>) =>
    [...terms.left, ...terms.right]
      .flatMap((t) => [t.title, t.body])
      .join(' ')
      .toLowerCase();

  it('never uses internship or stipend wording', () => {
    const all = flat(payslipTerms(''));
    expect(all).not.toMatch(/internship/);
    expect(all).not.toMatch(/stipend/);
  });

  it('never denies the employment relationship the slip is issued under', () => {
    const all = flat(payslipTerms(''));
    expect(all).not.toMatch(/creates no employer/);
    expect(all).not.toMatch(/does not constitute salary/);
  });

  it('asserts only lawful deductions were made, and names the wage register', () => {
    const all = flat(payslipTerms(''));
    expect(all).toMatch(/deductions authorised by law/);
    expect(all).toMatch(/wage register/);
  });

  /** The specifics vary per employee, so the note is folded in, not fixed. */
  it('folds the deductions note into the deductions clause', () => {
    const all = flat(payslipTerms('TDS deducted under section 192.'));
    expect(all).toMatch(/tds deducted under section 192\./);
  });

  it('splits into the two columns the slip prints', () => {
    const terms = payslipTerms('');
    expect(terms.left).toHaveLength(2);
    expect(terms.right).toHaveLength(3);
  });

  /** The stipend slip's own wording is untouched by any of this. */
  it('leaves the stipend slip terms alone', () => {
    const intern = flat(stipendTerms(''));
    expect(intern).toMatch(/creates no employer/);
    expect(intern).toMatch(/internship/);
  });
});

/**
 * What a slip arrives filled in with. The stipend's single line and the pay
 * slip's three are not a formatting choice — see the note on the function.
 */
describe('slipEarningsSeed', () => {
  const MONTHLY = 50_000_00; // ₹50,000 a month, in paise

  it('gives a stipend one undifferentiated line', () => {
    expect(slipEarningsSeed('STP', MONTHLY)).toEqual([
      { description: 'Internship Stipend', ratePaise: MONTHLY },
    ]);
  });

  /**
   * A "house rent allowance" inside a stipend would imply a salary, which is
   * the exact thing the stipend slip's first term exists to deny.
   */
  it('never invents a salary structure inside a stipend', () => {
    const words = slipEarningsSeed('STP', MONTHLY).map((e) => e.description).join(' ');
    expect(words).not.toMatch(/basic|allowance|rent/i);
  });

  it('itemises wages as basic, HRA and the balance', () => {
    expect(slipEarningsSeed('PAY', MONTHLY).map((e) => e.description)).toEqual([
      'Basic salary',
      'House rent allowance',
      'Special allowance',
    ]);
  });

  /**
   * The property that makes replacing one line with three safe: the employee is
   * paid exactly what they were paid before.
   */
  it('sums to exactly the pay it was given', () => {
    for (const monthly of [50_000_00, 33_333_33, 1_00_000_01, 15_000_00, 1]) {
      const total = slipEarningsSeed('PAY', monthly).reduce((sum, e) => sum + e.ratePaise, 0);
      expect(total).toBe(monthly);
    }
  });

  it('splits at the studio defaults — half basic, non-metro HRA', () => {
    const [basic, hra, special] = slipEarningsSeed('PAY', MONTHLY);
    expect(basic.ratePaise).toBe(25_000_00);
    expect(hra.ratePaise).toBe(10_000_00); // 40% of basic, Ghaziabad being non-metro
    expect(special.ratePaise).toBe(15_000_00);
  });
});
