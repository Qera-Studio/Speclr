'use client';

import { useState } from 'react';
import { formatINR, rupeesToPaise } from '@/lib/domain/money';
import {
  computeSalaryStructure,
  DEFAULT_STRUCTURE_INPUT,
  PF_WAGE_CEILING_PAISE,
} from '@/lib/domain/salaryStructure';
import { Field, FieldLabel, FieldGroup, FieldSet, FieldLegend } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoTip } from '@/components/form/FieldInfo';

/**
 * Annual CTC in, a monthly salary structure out.
 *
 * The arithmetic lives in `lib/domain/salaryStructure` and is tested there;
 * this is the form and the breakdown. Nothing is saved — it computes a number
 * you then type into a pay slip's earnings, which is deliberate: the slip's
 * line items are the record, and a calculator that wrote to them directly would
 * make a figure look authoritative because a tool produced it.
 *
 * It reads top-down, total first: the cost to company, then what that splits
 * into, then what the gross splits into, then what comes out of it. Every list
 * states each part as a share of the total directly above it, and every list
 * sums to that total exactly — which is what the domain's rounding rules are
 * for. A breakdown whose parts do not add up is worse than none.
 *
 * Everything recomputes on every keystroke. There is no submit, because there
 * is nothing to submit and nothing to get wrong by not pressing it.
 */

/** '94.4%' — a part as a share of the total it belongs to. */
function pct(part: number, whole: number): string {
  if (!whole) return '—';
  return `${((part / whole) * 100).toFixed(1)}%`;
}

/** `formatINR` refuses negatives; an impossible structure is signed, not thrown. */
function money(paise: number): string {
  return paise < 0 ? `−${formatINR(-paise)}` : formatINR(paise);
}

/**
 * One line of a breakdown: what it is, what share of this list's total it is,
 * and how much. Three columns so the percentages and the figures each align
 * down their own edge.
 */
function Row({
  label,
  note,
  paise,
  share,
  total,
  minus,
}: {
  label: string;
  note?: string;
  paise: number;
  /** The total this row is a share of. Omit for a row that *is* the total. */
  share?: number;
  /** Renders as the summing line: ruled off above, and not a share of itself. */
  total?: boolean;
  /** Prefix the amount with a minus — it is coming out, not going in. */
  minus?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-4 ${
        total ? 'mt-1 border-t border-border pt-2 font-medium' : ''
      }`}
    >
      <span className={total ? 'text-sm' : 'text-sm text-muted-foreground'}>
        {label}
        {note ? <span className="ml-1.5 text-xs text-muted-foreground/70">{note}</span> : null}
      </span>
      <span className="w-12 text-right text-xs tabular-nums text-muted-foreground/70">
        {total || share === undefined ? '' : pct(Math.abs(paise), share)}
      </span>
      <span className="text-sm tabular-nums">
        {minus ? '−' : ''}
        {money(paise)}
      </span>
    </div>
  );
}

/** A labelled switch, laid out as one row. */
function Toggle({
  id,
  label,
  info,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  info: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <InfoTip label={`About ${label.toLowerCase()}`} info={info} />
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** One half of the headline pair: a big figure with its annual equivalent. */
function Headline({
  label,
  monthlyPaise,
  note,
  muted,
}: {
  label: string;
  monthlyPaise: number;
  note: string;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span
        className={`text-2xl font-semibold tabular-nums ${muted ? 'text-muted-foreground' : ''}`}
      >
        {money(monthlyPaise)}
        <span className="ml-1 text-sm font-normal text-muted-foreground">/ month</span>
      </span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
  );
}

export default function CtcCalculator() {
  const [ctc, setCtc] = useState('');
  const [tds, setTds] = useState('');
  const [basicPercent, setBasicPercent] = useState('50');
  const [metro, setMetro] = useState(DEFAULT_STRUCTURE_INPUT.metro);
  const [includesEmployerPf, setIncludesEmployerPf] = useState(
    DEFAULT_STRUCTURE_INPUT.includesEmployerPf,
  );
  const [includesGratuity, setIncludesGratuity] = useState(
    DEFAULT_STRUCTURE_INPUT.includesGratuity,
  );
  const [capPfAtCeiling, setCapPfAtCeiling] = useState(DEFAULT_STRUCTURE_INPUT.capPfAtCeiling);

  const ctcPaise = rupeesToPaise(ctc);
  // 100 is the ceiling that leaves the structure meaningful at all; the plug
  // going negative above ~71% is shown rather than prevented.
  const percent = Math.min(100, Math.max(0, Number(basicPercent) || 0));

  const s =
    ctcPaise === null || ctcPaise <= 0
      ? null
      : computeSalaryStructure({
          ctcAnnualPaise: ctcPaise,
          metro,
          basicPercent: percent,
          includesEmployerPf,
          includesGratuity,
          capPfAtCeiling,
          tdsMonthlyPaise: rupeesToPaise(tds) ?? 0,
        });

  const annual = (paise: number) => `${formatINR(paise * 12)} a year`;
  const taxed = s ? s.tdsPaise > 0 : false;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form onSubmit={(e) => e.preventDefault()} noValidate>
        <FieldGroup size="form">
          <Field>
            <FieldLabel htmlFor="ctc">Annual CTC (₹)</FieldLabel>
            <Input
              id="ctc"
              size="form"
              inputMode="decimal"
              placeholder="850000"
              value={ctc}
              // Sanitised on change, like every other amount in the app —
              // `numericField` cannot be spread onto an unregistered input.
              onChange={(e) => setCtc(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </Field>

          <Field>
            <div className="flex items-center gap-1.5">
              <FieldLabel htmlFor="basic-percent">Basic (% of gross)</FieldLabel>
              <InfoTip
                label="About the basic percentage"
                info="50% is the default because the Code on Wages 2019 counts excluded components as wages once they exceed half of all remuneration. Setting basic at 50% makes that a non-event."
              />
            </div>
            <Input
              id="basic-percent"
              size="form"
              inputMode="numeric"
              value={basicPercent}
              onChange={(e) => setBasicPercent(e.target.value.replace(/\D/g, ''))}
            />
          </Field>

          {/*
            Taken, never computed. TDS depends on the regime chosen,
            declarations and proofs — guessing would put a wrong figure on a
            wage slip. Given one, the in-hand figure below becomes the real
            take-home rather than the pre-tax number.
          */}
          <Field>
            <div className="flex items-center gap-1.5">
              <FieldLabel htmlFor="tds">Monthly TDS (₹)</FieldLabel>
              <InfoTip
                label="About TDS"
                info="Not computed here — it depends on the tax regime, declarations and proofs. Enter what your CA or the previous slip says, and the in-hand figure becomes the real take-home."
              />
            </div>
            <Input
              id="tds"
              size="form"
              inputMode="decimal"
              placeholder="0"
              value={tds}
              onChange={(e) => setTds(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </Field>

          <FieldSet>
            <FieldLegend variant="label">Assumptions</FieldLegend>

            <Toggle
              id="metro"
              label="Metro city"
              info="Only Delhi, Mumbai, Kolkata and Chennai count for HRA under s.10(13A) — 50% of basic there, 40% everywhere else. Ghaziabad is not one."
              checked={metro}
              onChange={setMetro}
            />
            <Toggle
              id="includes-pf"
              label="CTC includes employer PF"
              info="Most Indian offers quote a CTC that already contains the employer's 12%. Turn this off if the number you were given is gross pay."
              checked={includesEmployerPf}
              onChange={setIncludesEmployerPf}
            />
            <Toggle
              id="includes-gratuity"
              label="CTC includes gratuity"
              info="The 4.81% provision for gratuity — 15 days' basic per year. An employer cost, never a deduction, and payable only after five years of service."
              checked={includesGratuity}
              onChange={setIncludesGratuity}
            />
            <Toggle
              id="cap-pf"
              label="Cap PF at ₹15,000"
              info="The statutory wage ceiling: contributions are reckoned on at most ₹15,000 a month, which is why almost every Indian pay slip shows exactly ₹1,800. Turn it off to contribute on full basic."
              checked={capPfAtCeiling}
              onChange={setCapPfAtCeiling}
            />
          </FieldSet>
        </FieldGroup>
      </form>

      <div className="flex flex-col gap-4">
        {s ? (
          <>
            {/*
              The two figures anyone actually wants: what it costs the studio,
              and what reaches the employee's account. Everything below explains
              the distance between them.
            */}
            <Card>
              <CardContent className="grid gap-6 py-5 sm:grid-cols-2">
                {/* The annual figure here is the one that was quoted, not the
                    monthly one multiplied back up — twelfths do not divide
                    cleanly, and a headline reading ₹8,49,999.96 against a
                    typed ₹8,50,000 would look like an error rather than
                    rounding. */}
                <Headline
                  label="Cost to company"
                  monthlyPaise={s.ctcMonthlyPaise}
                  note={`${formatINR(ctcPaise ?? 0)} a year`}
                />
                <Headline
                  label={taxed ? 'In hand' : 'In hand, before tax'}
                  monthlyPaise={s.inHandPaise}
                  note={`${pct(s.inHandPaise, s.ctcMonthlyPaise)} of CTC · ${annual(s.inHandPaise)}`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What the CTC is made of</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Row label="Gross salary" paise={s.grossPaise} share={s.ctcMonthlyPaise} />
                {includesEmployerPf ? (
                  <Row
                    label="Provident fund (employer)"
                    note="never reaches the pay slip"
                    paise={s.employerPfPaise}
                    share={s.ctcMonthlyPaise}
                  />
                ) : null}
                {includesGratuity ? (
                  <Row
                    label="Gratuity provision"
                    note="4.81% of basic"
                    paise={s.gratuityPaise}
                    share={s.ctcMonthlyPaise}
                  />
                ) : null}
                <Row label="Cost to company" paise={s.ctcMonthlyPaise} total />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What the gross salary is made of</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Row
                  label="Basic"
                  note={`${percent}% of gross`}
                  paise={s.basicPaise}
                  share={s.grossPaise}
                />
                <Row
                  label="House rent allowance"
                  note={`${s.hraPercent}% of basic`}
                  paise={s.hraPaise}
                  share={s.grossPaise}
                />
                <Row
                  label="Special allowance"
                  note="the balance"
                  paise={s.specialAllowancePaise}
                  share={s.grossPaise}
                />
                <Row label="Gross salary" paise={s.grossPaise} total />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What comes out of it</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Row
                  label="Provident fund (employee)"
                  note={
                    capPfAtCeiling && s.basicPaise > PF_WAGE_CEILING_PAISE
                      ? '12% of the ₹15,000 ceiling'
                      : '12% of basic'
                  }
                  paise={s.employeePfPaise}
                  share={s.grossPaise}
                  minus
                />
                <Row
                  label="TDS"
                  note={taxed ? undefined : 'not computed — enter it on the left'}
                  paise={s.tdsPaise}
                  share={s.grossPaise}
                  minus
                />
                <Row
                  label={`Total deductions — ${pct(s.totalDeductionsPaise, s.grossPaise)} of gross`}
                  paise={s.totalDeductionsPaise}
                  total
                  minus
                />
                <Row
                  label={taxed ? 'In hand' : 'In hand, before tax'}
                  paise={s.inHandPaise}
                  total
                />
                <p className="pt-1 text-xs text-muted-foreground">
                  ESI does not apply above ₹21,000 gross, and Uttar Pradesh
                  levies no professional tax — so provident fund and TDS are the
                  only deductions Qera has to make.
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Enter an annual CTC to see the structure it implies.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
