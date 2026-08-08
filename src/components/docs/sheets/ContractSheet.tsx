import { formatDisplayDate, isISODate } from '@/lib/domain/dates';
import { assemble, withLetter } from '@/lib/domain/contract/assembly';
import { blankValue, fillText, isUnfilled, type BlankValues } from '@/lib/domain/contract/blanks';
import {
  contractScopes,
  partSectionLabel,
  type BlankScope,
} from '@/lib/domain/contract/completeness';
import { EXECUTION_STATEMENT } from '@/lib/domain/contract/msa';
import { contentOf } from '@/lib/domain/docContent';
import { DOC_TYPES } from '@/lib/domain/registry';
import { studioOf } from '@/lib/domain/studio';
import type { ContractDocument } from '@/lib/domain/types';
import { A4_PADDING } from './frame';
import QeraMark from './QeraMark';

/** Cover page styling shared by the print flow and the preview's dedicated
 * cover-page frame — the black, full-bleed contract cover. */
export const COVER_CLASSNAME =
  'flex flex-col min-h-[900px] bg-black text-white box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]';

const PROSE = 'text-black/70 text-[11px] font-normal leading-[1.6] mb-[6px]';
const HEADING = 'text-black text-[14px] font-bold tracking-[-0.01em] mb-[8px]';
const SUBHEADING =
  'text-black text-[13px] font-semibold mb-[8px] pb-[4px] border-b border-[#d9d9d9]';

/**
 * An unfilled blank, printed as a visible marker rather than as empty space.
 *
 * Deliberately loud, and deliberately not a placeholder that could pass for
 * real text. Content §1 records a contract that went out reading "ZaibQ Stuioh"
 * with inverted signature blocks — silent blanks are how bad contracts ship. It
 * survives to the printed page on purpose: finalize refuses a contract with any
 * of these, so seeing one on paper means someone printed a draft.
 */
function Chip({ label }: { label: string }) {
  return (
    <mark className="bg-[#ffe0e0] text-[#a10000] font-semibold px-[4px] rounded-[2px] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      {label}
    </mark>
  );
}

/**
 * One paragraph with its blanks resolved. Filled blanks print as ordinary text —
 * the reader must not be able to tell which words came from a field.
 */
function Filled({
  scope,
  index,
  values,
  letter,
}: {
  scope: BlankScope;
  index: number;
  values: BlankValues;
  letter?: string;
}) {
  const parsed = scope.parsed[index];
  const render = (text: string) => (letter ? withLetter(text, letter) : text);

  return (
    <>
      {parsed.segments.map((segment, i) => (
        <span key={i}>
          {render(segment)}
          {i < parsed.blanks.length ? (
            isUnfilled(values, parsed.blanks[i]) ? (
              <Chip label="fill this in" />
            ) : (
              blankValue(values, parsed.blanks[i])
            )
          ) : null}
        </span>
      ))}
    </>
  );
}

/**
 * A paragraph of a clause or Part section. Falls back to plain text where the
 * section holds no blanks at all, which is most of them.
 */
function Para({
  scope,
  index,
  text,
  values,
  letter,
  className = PROSE,
}: {
  scope?: BlankScope;
  index: number;
  text: string;
  values: BlankValues;
  letter?: string;
  className?: string;
}) {
  const rendered = letter ? withLetter(text, letter) : text;
  // A lettered sub-item — '(a) …' — is indented so the hierarchy survives.
  const indented = /^\([a-z]\) /.test(rendered) || rendered.startsWith('- ');
  return (
    <p className={`${className}${indented ? ' pl-[24px]' : ''}`}>
      {scope ? (
        <Filled scope={scope} index={index} values={values} letter={letter} />
      ) : (
        rendered
      )}
    </p>
  );
}

/** A two-column table of labelled figures — a Part's Limits or Fee block. */
function RowTable({
  scope,
  rows,
  values,
}: {
  scope?: BlankScope;
  rows: { label: string; value: string }[];
  values: BlankValues;
}) {
  return (
    <table className="w-full border-collapse table-fixed mb-[16px]">
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <th
              scope="row"
              className="w-[60%] text-left text-black/70 text-[11px] font-normal py-[6px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top"
            >
              {row.label}
            </th>
            <td className="w-[40%] text-black text-[11px] font-medium py-[6px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top">
              {scope ? (
                <Filled scope={scope} index={i} values={values} />
              ) : (
                row.value
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="m-0 pl-[24px] mb-[16px]">
      {items.map((item, i) => (
        <li key={i} className="text-black/70 text-[11px] font-normal leading-[1.6]">
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * The contract as a flat list of atomic content blocks — the cover, the parties
 * grid, each MSA clause, each Schedule cover, each Schedule clause, each Part,
 * the signatures. Each top-level entry is one indivisible unit, which is what
 * lets `DocumentPreview` measure and pack them into A4 pages without ever
 * splitting a heading from its body. The cover is always block 0 so the first
 * page can be styled black.
 */
export function contractBlocks(doc: ContractDocument): React.ReactNode[] {
  const studio = studioOf(doc);
  const text = contentOf(doc, DOC_TYPES.CON);
  const displayDate = isISODate(doc.issueDate) ? formatDisplayDate(doc.issueDate) : '—';
  const values = doc.contract.blanks;
  const assembled = assemble(doc.contract.parts);
  /**
   * A library line as this contract prints it — from its own frozen copy, never
   * the live table. Falling back to the bare id would be visible nonsense on the
   * page, which is the right failure: a missing line must not print as nothing.
   */
  const libraryText = (id: string) => doc.contract.library[id] ?? id;

  // One enumeration of every blank-bearing scope, shared with the editor and
  // the finalize guard — see `completeness.ts`. Looked up by scope id here.
  const scopes = new Map(contractScopes(doc.contract).map((s) => [s.scope, s]));

  const cover = (
    <div
      key="cover"
      className={`flex flex-col flex-1 min-h-[900px] ${A4_PADDING} box-border`}
      aria-label="Cover"
    >
      <div className="flex justify-between items-start gap-[24px]">
        <p className="flex items-center gap-[6px] text-white">
          <QeraMark />
          <span className="font-semibold text-[18px] text-white">{studio.brandMark}</span>
        </p>
        <p className="font-semibold text-[12px] text-white text-right">{displayDate}</p>
      </div>
      <h2 className="mt-auto text-[72px] font-bold tracking-[-0.03em] leading-[0.95] uppercase text-white">
        Master Service Agreement
      </h2>
      <p className="mt-[40px] max-w-[60ch] text-white/80 text-[12px] font-normal leading-[1.6]">
        {text.intro}
      </p>
    </div>
  );

  const party = (
    heading: string,
    role: string,
    fields: { label: string; value: string }[],
  ) => (
    <div className="border-t-2 border-black pt-[24px]">
      <h3 className="text-black text-[14px] font-bold mb-[2px]">{heading}</h3>
      <p className="text-black/80 text-[12px] font-normal mb-[24px]">{role}</p>
      <dl className="m-0">
        {fields.map((f) => (
          <div key={f.label} className="flex gap-[16px] py-[3px]">
            <dt className="text-black/80 text-[12px] font-normal min-w-[70px] shrink-0">
              {f.label}
            </dt>
            <dd className="m-0 text-black text-[12px] font-medium whitespace-pre-line">
              {f.value || '—'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );

  const clientName = doc.clientSnapshot.companyName || doc.clientSnapshot.name || '';

  const parties = (
    <div key="parties" aria-label="Parties">
      <p className="text-black text-[13px] font-medium mb-[40px]">{text.preamble}</p>
      <div className="grid grid-cols-2 gap-[48px]">
        {party('First Party', 'The Studio / Service Provider', [
          { label: 'Name', value: studio.legalName },
          { label: 'Address', value: studio.address },
          { label: 'Email', value: studio.email },
          { label: 'Number', value: studio.phone },
        ])}
        {party('Second Party', 'The Client', [
          { label: 'Name', value: clientName },
          { label: 'Address', value: doc.clientSnapshot.address },
          { label: 'Email', value: doc.clientSnapshot.email },
          { label: 'Number', value: doc.clientSnapshot.phone },
        ])}
      </div>
    </div>
  );

  // Each MSA clause is its own atomic block, so pagination can only break
  // *between* clauses — a heading never separates from its body.
  const clauses = text.clauses.map((clause) => {
    const scope = scopes.get(`msa.${clause.number}`);
    return (
      <section key={`msa-${clause.number}`} className="[break-inside:avoid] mb-[24px]">
        <h3 className={HEADING}>
          {clause.number}. {clause.heading}
        </h3>
        {clause.body.map((paragraph, i) => (
          <Para key={i} scope={scope} index={i} text={paragraph} values={values} />
        ))}
      </section>
    );
  });

  /** A Schedule's cover: its letter, name, preamble and its own contents list. */
  const scheduleCover = (
    letter: string,
    name: string,
    preamble: string,
    parts: { label: string; name: string }[],
  ) => (
    <section key={`sch-cover-${letter}`} aria-label={`Schedule ${letter}`}>
      <p className="text-black/70 text-[11px] font-semibold uppercase tracking-[0.08em] mb-[2px]">
        Schedule {letter}
      </p>
      <h3 className="text-black text-[32px] font-bold tracking-[-0.02em] mb-[16px]">{name}</h3>
      <p className="text-black/70 text-[12px] font-normal leading-[1.6] mb-[32px] max-w-[60ch]">
        {preamble}
      </p>
      <h4 className={SUBHEADING}>Parts appended to this Schedule</h4>
      <dl className="m-0">
        {parts.map((p) => (
          <div key={p.label} className="flex gap-[16px] py-[4px]">
            <dt className="text-black text-[12px] font-semibold min-w-[60px] shrink-0">
              {p.label}
            </dt>
            <dd className="m-0 text-black/70 text-[12px] font-normal">{p.name}</dd>
          </div>
        ))}
      </dl>
    </section>
  );

  const scheduleBlocks = assembled.flatMap(({ schedule, letter, parts }) => [
    scheduleCover(
      letter,
      schedule.name,
      schedule.preamble,
      parts.map((p) => ({ label: `Part ${p.label}`, name: p.part.name })),
    ),
    ...schedule.clauses.map((clause) => {
      const scope = scopes.get(`sch.${schedule.key}.${clause.number}`);
      return (
        <section
          key={`sch-${letter}-${clause.number}`}
          className="[break-inside:avoid] mb-[24px]"
        >
          <h3 className={HEADING}>
            {letter}
            {clause.number}. {clause.heading}
          </h3>
          {clause.body.map((paragraph, i) => (
            <Para
              key={i}
              scope={scope}
              index={i}
              text={paragraph}
              values={values}
              letter={letter}
            />
          ))}
        </section>
      );
    }),
    ...parts.map(({ part, label }) => {
      const at = (section: string) => scopes.get(`part.${part.code}.${section}`);
      // Headings come from `partSectionLabel`, which the editor reads too — a
      // Retainer Part is delivered per cycle and says so.
      const section = (id: string, node: React.ReactNode) => (
        <div className="[break-inside:avoid] mb-[24px]">
          <h4 className={SUBHEADING}>{partSectionLabel(id, part.scheduleKey)}</h4>
          {node}
        </div>
      );

      return (
        <section key={`part-${label}`} aria-label={`Part ${label}`}>
          <p className="text-black/70 text-[11px] font-semibold uppercase tracking-[0.08em] mb-[2px]">
            Part {label}
          </p>
          <h3 className="text-black text-[24px] font-bold tracking-[-0.02em] mb-[16px]">
            {part.name}
          </h3>

          {part.overview.map((paragraph, i) => (
            <Para
              key={`ov-${i}`}
              scope={at('overview')}
              index={i}
              text={paragraph}
              values={values}
              className="text-black/70 text-[12px] font-normal leading-[1.6] mb-[8px]"
            />
          ))}

          {part.included.length > 0
            ? section(
                'included',
                <ul className="m-0 pl-[24px]">
                  {part.included.map((item, i) => (
                    <li
                      key={i}
                      className="text-black/70 text-[11px] font-normal leading-[1.6]"
                    >
                      <Para
                        scope={at('included')}
                        index={i}
                        text={item}
                        values={values}
                        className="inline"
                      />
                    </li>
                  ))}
                </ul>,
              )
            : null}

          {part.accountTerms.length > 0
            ? section(
                'account',
                part.accountTerms.map((paragraph, i) => (
                  <Para
                    key={i}
                    scope={at('account')}
                    index={i}
                    text={paragraph}
                    values={values}
                  />
                )),
              )
            : null}

          {part.limits.length > 0
            ? section(
                'limits',
                <>
                  <RowTable scope={at('limits')} rows={part.limits} values={values} />
                  {part.limitsNotes.map((paragraph, i) => (
                    <Para
                      key={i}
                      scope={at('limitsNotes')}
                      index={i}
                      text={paragraph}
                      values={values}
                    />
                  ))}
                </>,
              )
            : null}

          {part.completion.length > 0
            ? section(
                'completion',
                part.completion.map((paragraph, i) => (
                  <Para
                    key={i}
                    scope={at('completion')}
                    index={i}
                    text={paragraph}
                    values={values}
                  />
                )),
              )
            : null}

          {part.receives.length > 0
            ? section(
                'receives',
                <>
                  <Bullets items={part.receives} />
                  {part.receivesNotes.map((paragraph, i) => (
                    <Para
                      key={i}
                      scope={at('receivesNotes')}
                      index={i}
                      text={paragraph}
                      values={values}
                    />
                  ))}
                </>,
              )
            : null}

          {/*
            Exclusions, under the fixed heading from contract-system.md §6. The
            note below it is not decoration: it states that these are excluded
            by default and that anything moved into scope is priced first, which
            is the whole mechanism the library exists to enforce.
          */}
          {part.exclusionIds.length > 0
            ? section(
                'exclusions',
                <>
                  <p className="text-black/60 text-[10px] font-normal italic leading-[1.6] mb-[8px]">
                    Excluded by default. Anything moved into scope is priced and written into
                    this Part before work starts.
                  </p>
                  <Bullets items={part.exclusionIds.map((id) => libraryText(id))} />
                </>,
              )
            : null}

          {part.clientInputIds.length > 0
            ? section(
                'clientInputs',
                <Bullets items={part.clientInputIds.map((id) => libraryText(id))} />,
              )
            : null}

          {part.thirdPartyCosts
            ? section(
                'costs',
                <Para
                  scope={at('costs')}
                  index={0}
                  text={part.thirdPartyCosts}
                  values={values}
                />,
              )
            : null}

          {part.fee.length > 0
            ? section(
                'fee',
                <RowTable scope={at('fee')} rows={part.fee} values={values} />,
              )
            : null}
        </section>
      );
    }),
  ]);

  /**
   * Both signature blocks are rendered from the record, never typed. The May
   * 2026 document inverted them — the first-party block carried the Client's
   * name — precisely because they were hand-entered (content §2, clause 29).
   */
  const signatures = (
    <div key="signatures" aria-label="Execution">
      <h3 className={HEADING}>Execution</h3>
      <p className={PROSE}>{EXECUTION_STATEMENT}</p>
      <div className="grid grid-cols-2 gap-[48px] mt-[48px]">
        {[
          {
            heading: 'For and on behalf of',
            party: studio.legalName,
            name: text.signatoryName,
            designation: text.signatoryTitle,
          },
          {
            heading: 'For and on behalf of',
            party: clientName || '—',
            name: '',
            designation: '',
          },
        ].map((block, i) => (
          <div key={i} className="[break-inside:avoid]">
            <p className="text-black/70 text-[11px] font-normal mb-[2px]">{block.heading}</p>
            <p className="text-black text-[13px] font-bold mb-[16px]">{block.party}</p>
            <p className="text-black/70 text-[12px] font-normal mb-[2px]">
              Name: {block.name || '________________'}
            </p>
            <p className="text-black/70 text-[12px] font-normal mb-[2px]">
              Designation: {block.designation || '________________'}
            </p>
            <p className="text-black/70 text-[12px] font-normal mb-[2px]">Date: {displayDate}</p>
            <div className="border-b border-black h-[40px] mt-[24px]" />
            <p className="text-black/70 text-[11px] font-normal mt-[6px]">Signature</p>
          </div>
        ))}
      </div>
    </div>
  );

  return [cover, parties, ...clauses, ...scheduleBlocks, signatures];
}

/**
 * THE contract print artifact. Pure props → markup; server-renderable. A
 * vertical stack of `<section>` page-blocks; the print engine paginates via
 * `break-before: page`. The black cover page is first and omits the leading
 * page-break so there is no blank leading page. Every text class sets an
 * explicit colour — the site theme must never bleed in.
 *
 * This renders the section-grouped print flow used by `window.print()` / PDF
 * export. The on-screen preview does **not** go through this component — it
 * feeds the flat `contractBlocks(doc)` list straight into `DocumentPreview`,
 * which measures and packs the blocks into pages with the cover pinned as its
 * own full-bleed first page (`COVER_CLASSNAME`).
 */
export default function ContractSheet({ doc }: { doc: ContractDocument }) {
  const blocks = contractBlocks(doc);
  const [cover, parties, ...rest] = blocks;
  const body = rest.slice(0, rest.length - 1);
  const signatures = rest[rest.length - 1];

  const page = `[break-before:page] bg-white text-black ${A4_PADDING} box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]`;

  return (
    <article
      className="print-sheet bg-white text-black font-sans text-[12px] leading-[1.5]"
      aria-label="Master Service Agreement"
    >
      {/*
        The page wrappers carry no labels of their own: every block already
        names itself, and nesting an identical label inside one announces the
        same region twice.
      */}
      <section className={`[break-before:avoid] ${COVER_CLASSNAME}`}>{cover}</section>
      <section className={page}>{parties}</section>
      <section className={page} aria-label="Terms and conditions">
        {body}
      </section>
      <section className={page}>{signatures}</section>
    </article>
  );
}
