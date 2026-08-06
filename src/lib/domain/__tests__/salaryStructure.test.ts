import {
  computeSalaryStructure,
  splitGrossMonthly,
  DEFAULT_STRUCTURE_INPUT,
  PF_WAGE_CEILING_PAISE,
  type SalaryStructureInput,
} from '../salaryStructure';

const L = 100_000; // one lakh rupees, in paise

function structure(ctcLakhs: number, overrides: Partial<SalaryStructureInput> = {}) {
  return computeSalaryStructure({
    ...DEFAULT_STRUCTURE_INPUT,
    ctcAnnualPaise: ctcLakhs * L * 100,
    ...overrides,
  });
}

/**
 * The three identities the whole breakdown rests on. A breakdown whose parts do
 * not sum to the total it claims to break down is worse than no breakdown,
 * because the reader trusts it — so these are asserted exactly, at every level,
 * across the range and across every option.
 */
function assertAddsUp(s: ReturnType<typeof structure>) {
  expect(s.basicPaise + s.hraPaise + s.specialAllowancePaise).toBe(s.grossPaise);
  expect(s.grossPaise + s.employerPfPaise + s.gratuityPaise).toBe(s.ctcMonthlyPaise);
  expect(s.grossPaise - s.totalDeductionsPaise).toBe(s.inHandPaise);
  expect(s.employeePfPaise + s.tdsPaise).toBe(s.totalDeductionsPaise);
}

describe('every level adds up exactly', () => {
  it.each([3, 6, 8.5, 12, 24, 50, 0.5])('holds at ₹%s lakh CTC', (lakhs) => {
    assertAddsUp(structure(lakhs));
  });

  it('holds at every basic percentage', () => {
    for (let p = 30; p <= 70; p += 5) assertAddsUp(structure(12, { basicPercent: p }));
  });

  /** Including the odd CTCs where twelfths do not divide cleanly. */
  it('holds where the annual figure does not divide by 12', () => {
    for (const ctc of [850_001, 999_999, 1_000_007]) {
      assertAddsUp(structure(0, { ctcAnnualPaise: ctc * 100 }));
    }
  });

  it('holds with every combination of the employer-cost switches', () => {
    for (const pf of [true, false]) {
      for (const gratuity of [true, false]) {
        for (const cap of [true, false]) {
          assertAddsUp(
            structure(12, {
              includesEmployerPf: pf,
              includesGratuity: gratuity,
              capPfAtCeiling: cap,
              tdsMonthlyPaise: 500_000,
            }),
          );
        }
      }
    }
  });
});

/** The total the breakdown breaks down is the one that was quoted. */
describe('monthly CTC', () => {
  it('is the quoted annual figure divided by twelve', () => {
    expect(structure(0, { ctcAnnualPaise: 850_000 * 100 }).ctcMonthlyPaise).toBe(
      Math.round((850_000 * 100) / 12),
    );
  });
});

/** Every figure lands on whole paise — no floats reach a document. */
it('produces integer paise throughout', () => {
  const s = structure(8.5);
  for (const value of [
    s.basicPaise,
    s.hraPaise,
    s.specialAllowancePaise,
    s.grossPaise,
    s.employeePfPaise,
    s.employerPfPaise,
    s.gratuityPaise,
  ]) {
    expect(Number.isInteger(value)).toBe(true);
  }
});

describe('the components', () => {
  it('sets basic at the chosen share of gross', () => {
    const s = structure(12, { basicPercent: 50 });
    expect(s.basicPaise).toBe(Math.round(s.grossPaise * 0.5));
  });

  /**
   * s.10(13A): 50% of basic in Delhi, Mumbai, Kolkata or Chennai; 40%
   * everywhere else, Ghaziabad included.
   */
  it('pays HRA at 40% of basic outside a metro, 50% inside', () => {
    expect(structure(12, { metro: false }).hraPercent).toBe(40);
    expect(structure(12, { metro: true }).hraPercent).toBe(50);

    const nonMetro = structure(12, { metro: false });
    expect(nonMetro.hraPaise).toBe(Math.round(nonMetro.basicPaise * 0.4));
  });

  /** The plug, and the reason it is never round. */
  it('makes the special allowance the balancing figure', () => {
    const s = structure(12);
    expect(s.specialAllowancePaise).toBe(s.grossPaise - s.basicPaise - s.hraPaise);
  });

  /**
   * A basic above ~71% leaves nothing for the plug. Shown as a negative rather
   * than clamped: a structure that does not fit is a structure to change, not
   * one to quietly round away.
   */
  it('reports a negative plug rather than hiding an impossible structure', () => {
    expect(structure(12, { basicPercent: 80, metro: true }).specialAllowancePaise).toBeLessThan(0);
  });
});

/**
 * The ₹1,800 on almost every Indian pay slip. Contributions are reckoned on PF
 * wages, which are Basic capped at ₹15,000/month.
 */
describe('employee provident fund', () => {
  it('is exactly ₹1,800 for anyone whose basic clears the ceiling', () => {
    const s = structure(12);
    expect(s.basicPaise).toBeGreaterThan(PF_WAGE_CEILING_PAISE);
    expect(s.employeePfPaise).toBe(180_000);
  });

  it('is 12% of basic below the ceiling', () => {
    const s = structure(3);
    expect(s.basicPaise).toBeLessThan(PF_WAGE_CEILING_PAISE);
    expect(s.employeePfPaise).toBe(Math.round(s.basicPaise * 0.12));
  });

  it('follows full basic when the cap is waived', () => {
    const s = structure(12, { capPfAtCeiling: false });
    expect(s.employeePfPaise).toBe(Math.round(s.basicPaise * 0.12));
    expect(s.employeePfPaise).toBeGreaterThan(180_000);
  });

  it('comes out of gross to give the in-hand figure', () => {
    const s = structure(12);
    expect(s.inHandPaise).toBe(s.grossPaise - s.employeePfPaise);
  });
});

/**
 * TDS is taken, never computed: it depends on the regime chosen, declarations
 * and proofs, and a guess here would become a wrong figure on a wage slip.
 * Given one, the in-hand figure is real; without one it is the pre-tax number.
 */
describe('tax', () => {
  it('deducts a TDS figure it is given', () => {
    const s = structure(12, { tdsMonthlyPaise: 750_000 });
    expect(s.tdsPaise).toBe(750_000);
    expect(s.totalDeductionsPaise).toBe(s.employeePfPaise + 750_000);
    expect(s.inHandPaise).toBe(s.grossPaise - s.employeePfPaise - 750_000);
  });

  it('computes none of its own', () => {
    expect(structure(12).tdsPaise).toBe(0);
    expect(structure(50).tdsPaise).toBe(0);
  });

  /** A negative "deduction" would be a payment. Refused, not honoured. */
  it('refuses a negative TDS', () => {
    expect(structure(12, { tdsMonthlyPaise: -500_000 }).tdsPaise).toBe(0);
  });
});

/**
 * The circular part: employer PF and gratuity are percentages of Basic, Basic
 * is a percentage of gross, and gross is CTC less those. Whatever the solver
 * does, the pieces have to add back up to the CTC that was quoted.
 */
describe('the structure reconstitutes the CTC it came from', () => {
  it.each([3, 6, 8.5, 12, 24, 50])('exactly at ₹%s lakh', (lakhs) => {
    const s = structure(lakhs);
    expect(s.grossPaise + s.employerPfPaise + s.gratuityPaise).toBe(
      Math.round((lakhs * L * 100) / 12),
    );
  });

  it('makes gross the whole of it when the CTC excludes the employer costs', () => {
    const s = structure(12, { includesEmployerPf: false, includesGratuity: false });
    expect(s.grossPaise).toBe(Math.round((12 * L * 100) / 12));
    expect(s.employerPfPaise).toBe(0);
    expect(s.gratuityPaise).toBe(0);
  });

  /**
   * The branch that exists because capped PF is a constant, not a percentage.
   * A low CTC keeps Basic under the ceiling and takes the other equation — and
   * the split has to stay sane, not merely add up: gross must be the bulk of
   * the CTC, which a wrong branch would break.
   */
  it('splits sensibly on both sides of the PF ceiling', () => {
    const low = structure(3);
    const high = structure(24);
    expect(low.basicPaise).toBeLessThan(PF_WAGE_CEILING_PAISE);
    expect(high.basicPaise).toBeGreaterThan(PF_WAGE_CEILING_PAISE);
    for (const s of [low, high]) {
      expect(s.grossPaise).toBeGreaterThan(s.ctcMonthlyPaise * 0.9);
      expect(s.grossPaise).toBeLessThan(s.ctcMonthlyPaise);
    }
  });
});

/** Gratuity is 15 days' basic a year — an employer cost, never a deduction. */
it('provisions gratuity at 4.81% of basic and deducts nothing for it', () => {
  const s = structure(12);
  expect(s.gratuityPaise).toBe(Math.round(s.basicPaise * 0.0481));
  expect(s.totalDeductionsPaise).toBe(s.employeePfPaise);
});

it('holds every figure at zero for a zero CTC', () => {
  const s = structure(0);
  expect(s.ctcMonthlyPaise).toBe(0);
  expect(s.grossPaise).toBe(0);
  expect(s.inHandPaise).toBe(0);
});

/**
 * The simpler half, and the one a pay slip actually seeds itself from: no CTC
 * to unpick, so no circularity. The only property that matters on a wage slip
 * is that the earnings column adds up to what was paid.
 */
describe('splitGrossMonthly', () => {
  it('always sums to exactly the gross it was given', () => {
    for (const gross of [50_000_00, 33_333_33, 1, 0, 12_345_67, 2_50_000_00]) {
      const s = splitGrossMonthly(gross);
      expect(s.basicPaise + s.hraPaise + s.specialAllowancePaise).toBe(gross);
    }
  });

  it('sums exactly at every basic percentage too', () => {
    for (let p = 0; p <= 100; p += 5) {
      const s = splitGrossMonthly(33_333_33, { basicPercent: p });
      expect(s.basicPaise + s.hraPaise + s.specialAllowancePaise).toBe(33_333_33);
    }
  });

  it('defaults to half basic and non-metro HRA', () => {
    const s = splitGrossMonthly(50_000_00);
    expect(s.basicPaise).toBe(25_000_00);
    expect(s.hraPercent).toBe(40);
    expect(s.hraPaise).toBe(10_000_00);
    expect(s.specialAllowancePaise).toBe(15_000_00);
  });

  it('pays HRA at half of basic in a metro', () => {
    const s = splitGrossMonthly(50_000_00, { metro: true });
    expect(s.hraPercent).toBe(50);
    expect(s.hraPaise).toBe(12_500_00);
    expect(s.specialAllowancePaise).toBe(12_500_00);
  });

  /** A basic above ~71% leaves nothing to balance with. Shown, not clamped. */
  it('reports a negative balance rather than hiding an impossible split', () => {
    expect(splitGrossMonthly(50_000_00, { basicPercent: 90 }).specialAllowancePaise).toBeLessThan(0);
  });

  /** One implementation, so the calculator and the slip cannot disagree. */
  it('agrees with the calculator on the same gross', () => {
    const full = structure(12);
    const split = splitGrossMonthly(full.grossPaise, { basicPercent: 50, metro: false });
    expect(split.hraPercent).toBe(full.hraPercent);
    // Basic differs by at most the rupee the CTC solver parks in the allowance.
    expect(Math.abs(split.basicPaise - full.basicPaise)).toBeLessThan(100);
  });
});
