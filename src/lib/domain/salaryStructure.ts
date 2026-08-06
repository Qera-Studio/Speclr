/**
 * Annual CTC → a monthly salary structure.
 *
 * The arithmetic behind an Indian pay slip's earnings side, which is otherwise
 * done in someone's head and produces figures like ₹27,083 that nobody can
 * check. Pure; no UI, no framework, integer paise throughout.
 *
 * What it is **not**: a payroll engine. It computes the structure and the one
 * statutory deduction that applies at this size (employee PF). It does not
 * compute TDS — that depends on the individual's regime, declarations and
 * proofs, and a wrong number there is a wrong number on a wage slip.
 *
 * The four components and where each comes from:
 *
 *  - **Basic** — a chosen percentage of gross. The default is 50%, which is not
 *    a convention but the Code on Wages 2019 s.2(y): where the excluded
 *    components exceed half of all remuneration, the excess counts as wages
 *    anyway. Setting Basic at 50% is what makes that proviso a non-event.
 *  - **HRA** — 50% of Basic in a metro, 40% elsewhere. Those are the s.10(13A)
 *    exemption ceilings; structuring above them buys nothing. Only Delhi,
 *    Mumbai, Kolkata and Chennai are metros for this — Ghaziabad is not.
 *  - **Special allowance** — the balancing figure, and *only* that. It is
 *    whatever is left once the named components are subtracted from gross,
 *    which is why it is never a round number.
 *  - **Employee PF** — 12% of Basic, but of at most the ₹15,000 statutory wage
 *    ceiling, which is why almost every Indian pay slip shows exactly ₹1,800.
 */

/** The EPF wage ceiling: contributions are reckoned on at most ₹15,000/month. */
export const PF_WAGE_CEILING_PAISE = 1_500_000;
/** Employee and employer each contribute 12% of PF wages. */
const PF_RATE = 0.12;
/**
 * Gratuity accrues at 15 days' Basic per completed year — 15/26 of a month,
 * spread over 12 months, is 4.81%. Only a cost to the employer, never a
 * deduction, and payable only after five years (Payment of Gratuity Act s.4).
 */
const GRATUITY_RATE = 0.0481;

export interface SalaryStructureInput {
  /** Annual cost to company, in paise. */
  ctcAnnualPaise: number;
  /** Delhi, Mumbai, Kolkata or Chennai. Ghaziabad is not one. */
  metro: boolean;
  /** Basic as a percentage of gross. 50 unless there is a reason. */
  basicPercent: number;
  /** Does the quoted CTC include the employer's 12% PF contribution? */
  includesEmployerPf: boolean;
  /** Does it include the 4.81% gratuity provision? */
  includesGratuity: boolean;
  /**
   * Reckon PF on at most ₹15,000/month. True is the statutory minimum; some
   * employers voluntarily contribute on full Basic, which this turns off.
   */
  capPfAtCeiling: boolean;
  /**
   * Monthly TDS, in paise. Supplied by the caller, never computed — it depends
   * on the regime chosen, declarations and proofs. Zero until it is known, in
   * which case the in-hand figure is the pre-tax one and says so.
   */
  tdsMonthlyPaise?: number;
}

/**
 * Every figure monthly and in paise, and every level adds up exactly:
 *
 *   basic + hra + specialAllowance === gross
 *   gross + employerPf + gratuity  === ctcMonthly
 *   gross − employeePf − tds       === inHand
 *
 * Those three identities are the point. A breakdown whose parts do not sum to
 * the total it claims to break down is worse than no breakdown, because the
 * reader trusts it.
 */
export interface SalaryStructure {
  basicPaise: number;
  hraPaise: number;
  specialAllowancePaise: number;
  grossPaise: number;
  /** The employee's own 12%, withheld from gross. */
  employeePfPaise: number;
  /** Whatever the caller supplied. Never computed here. */
  tdsPaise: number;
  totalDeductionsPaise: number;
  /** Gross less the deductions. Pre-tax when no TDS figure was given. */
  inHandPaise: number;
  /** Employer-side costs, shown so the CTC adds up on screen. */
  employerPfPaise: number;
  gratuityPaise: number;
  /** CTC ÷ 12, exactly — the total the rest of this breaks down. */
  ctcMonthlyPaise: number;
  /** The HRA rate applied, as a percentage — 50 in a metro, 40 elsewhere. */
  hraPercent: number;
}

/** 12% of PF wages, which are Basic capped at the ceiling unless told otherwise. */
function pfOn(basicMonthlyPaise: number, capped: boolean): number {
  const wages = capped ? Math.min(basicMonthlyPaise, PF_WAGE_CEILING_PAISE) : basicMonthlyPaise;
  return Math.round(wages * PF_RATE);
}

/**
 * Gross, backed out of CTC.
 *
 * Circular on its face — employer PF and gratuity are percentages of Basic,
 * Basic is a percentage of gross, and gross is CTC minus those. Solving it is
 * one line of algebra per branch:
 *
 *   CTC = G + 0.12·p·G + 0.0481·p·G   →   G = CTC / (1 + p(0.12 + 0.0481))
 *
 * except that capped PF is a constant, not a percentage, which is a different
 * equation. Both are computed and the consistent one wins: a capped solution is
 * only right if its own Basic really does clear the ceiling.
 */
function grossFromCtc(input: SalaryStructureInput): number {
  const { ctcAnnualPaise: ctc, basicPercent, includesEmployerPf, includesGratuity } = input;
  const p = basicPercent / 100;
  const gratuity = includesGratuity ? GRATUITY_RATE : 0;

  if (!includesEmployerPf) return ctc / (1 + p * gratuity);

  const uncapped = ctc / (1 + p * (PF_RATE + gratuity));
  const ceilingAnnual = PF_WAGE_CEILING_PAISE * 12;
  if (!input.capPfAtCeiling || p * uncapped <= ceilingAnnual) return uncapped;

  // Basic clears the ceiling, so the employer's PF is a flat ₹1,800 × 12.
  return (ctc - ceilingAnnual * PF_RATE) / (1 + p * gratuity);
}

/**
 * The structure a CTC implies.
 *
 * Rounding is where a breakdown normally stops adding up, so it is done in one
 * direction only: each level takes its total from the level above and lets one
 * component absorb the remainder.
 *
 *  - Monthly CTC is `annual ÷ 12`, rounded once. That is the total on screen.
 *  - **Gross is the plug against CTC** — CTC less the employer's own costs —
 *    rather than the solver's own answer, which is off by up to a rupee from
 *    rounding twelfths.
 *  - **The special allowance is the plug against gross**, which is why it is
 *    never a round number on anyone's pay slip.
 *
 * The result: `basic + hra + special === gross` and
 * `gross + employerPf + gratuity === ctcMonthly`, exactly, at every input.
 */
export function computeSalaryStructure(input: SalaryStructureInput): SalaryStructure {
  const ctcMonthly = Math.max(0, Math.round(input.ctcAnnualPaise / 12));
  // The solver's gross, used only to size basic — the printed gross is the plug
  // below, so a rounding rupee lands in the allowance rather than going missing.
  const solvedGross = Math.max(0, Math.round(grossFromCtc(input) / 12));

  const basic = Math.round(solvedGross * (input.basicPercent / 100));
  const hraPercent = input.metro ? 50 : 40;
  const hra = Math.round(basic * (hraPercent / 100));

  const employeePf = pfOn(basic, input.capPfAtCeiling);
  const employerPf = input.includesEmployerPf ? pfOn(basic, input.capPfAtCeiling) : 0;
  const gratuity = input.includesGratuity ? Math.round(basic * GRATUITY_RATE) : 0;

  const gross = ctcMonthly - employerPf - gratuity;
  // Negative only if Basic + HRA exceed gross, which needs a Basic above ~71%
  // — possible, and shown honestly rather than clamped away.
  const special = gross - basic - hra;

  const tds = Math.max(0, Math.round(input.tdsMonthlyPaise ?? 0));
  const totalDeductions = employeePf + tds;

  return {
    basicPaise: basic,
    hraPaise: hra,
    specialAllowancePaise: special,
    grossPaise: gross,
    employeePfPaise: employeePf,
    tdsPaise: tds,
    totalDeductionsPaise: totalDeductions,
    inHandPaise: gross - totalDeductions,
    employerPfPaise: employerPf,
    gratuityPaise: gratuity,
    ctcMonthlyPaise: ctcMonthly,
    hraPercent,
  };
}

/** A sensible starting point: 50% Basic, non-metro, CTC inclusive of both. */
export const DEFAULT_STRUCTURE_INPUT: Omit<SalaryStructureInput, 'ctcAnnualPaise'> = {
  metro: false,
  basicPercent: 50,
  includesEmployerPf: true,
  includesGratuity: true,
  capPfAtCeiling: true,
};
