import { formatDisplayDate, isISODate } from '@/lib/domain/dates';
import { contentOf } from '@/lib/domain/docContent';
import { DOC_TYPES } from '@/lib/domain/registry';
import { scheduleLetter } from '@/lib/domain/scheduleLetter';
import { studioOf } from '@/lib/domain/studio';
import type { ContractDocument } from '@/lib/domain/types';
import { A4_PADDING } from './frame';
import QeraMark from "./QeraMark";

/** Cover page styling shared by the print flow and the preview's dedicated
 * cover-page frame — the black, full-bleed contract cover. */
export const COVER_CLASSNAME =
  'flex flex-col min-h-[900px] bg-black text-white box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]';

/** A titled schedule note paragraph. Renders nothing when the note is empty. */
function NoteBlock({ heading, note }: { heading: string; note?: string }) {
  if (!note) return null;
  return (
    <div className="[break-inside:avoid] mb-[32px]">
      <h4 className="text-black text-[13px] font-semibold mb-[8px] pb-[4px] border-b border-[#d9d9d9]">
        {heading}
      </h4>
      <p className="text-black/70 text-[12px] font-normal leading-[1.6] whitespace-pre-line">
        {note}
      </p>
    </div>
  );
}

/**
 * The contract as a flat list of atomic content blocks. Each entry is one
 * indivisible unit (the cover, the parties grid, one MSA clause, one
 * schedule, the signatures). This is the single source of truth the print
 * layout groups into logical `<section>`s below — `DocumentPreview` can
 * rely on each top-level array entry being an atomic, unsplittable block.
 * The cover is always block 0 so it can style the first page black.
 */
export function contractBlocks(doc: ContractDocument): React.ReactNode[] {
  const studio = studioOf(doc);
  // Cover intro, preamble and the 24 MSA clauses come through the content
  // layer now: the shipped boilerplate while untouched, the contract's own
  // frozen copy once finalized. Revising the MSA must not rewrite a contract
  // already signed.
  const text = contentOf(doc, DOC_TYPES.CON);
  const displayDate = isISODate(doc.issueDate) ? formatDisplayDate(doc.issueDate) : '—';
  const signatureStatement =
    text.clauses.find((s) => s.number === 24)?.body[0] ??
    'By signing below, both Parties acknowledge that they have read, understood, and agreed to the terms contained within this Agreement.';

  const cover = (
    <div key="cover" className={`flex flex-col flex-1 min-h-[900px] ${A4_PADDING} box-border`} aria-label="Cover">
      <div className="flex justify-between items-start gap-[24px]">
        <p className="flex items-center gap-[6px] text-white">
          <QeraMark />
          <span className="font-semibold text-[18px] text-white">{studio.brandMark}</span>
        </p>
        <p className="font-semibold text-[12px] text-white text-right">{displayDate}</p>
      </div>
      <h2 className="mt-auto text-[72px] font-bold tracking-[-0.03em] leading-[0.95] uppercase text-white">
        Contract Agreement
      </h2>
      <p className="mt-[40px] max-w-[60ch] text-white/80 text-[12px] font-normal leading-[1.6]">
        {text.intro}
      </p>
    </div>
  );

  const parties = (
    <div key="parties" aria-label="Parties">
      <p className="text-black text-[13px] font-medium mb-[40px]">{text.preamble}</p>
      <div className="grid grid-cols-2 gap-[48px]">
        <div className="border-t-2 border-black pt-[24px]">
          <h3 className="text-black text-[14px] font-bold mb-[2px]">First Party</h3>
          <p className="text-black/80 text-[12px] font-normal mb-[24px]">
            The Studio / Service Provider
          </p>
          <dl className="m-0">
            <div className="flex gap-[16px] py-[3px]">
              <dt className="text-black/80 text-[12px] font-normal min-w-[70px] shrink-0">Name</dt>
              <dd className="m-0 text-black text-[12px] font-medium">{studio.legalName}</dd>
            </div>
            <div className="flex gap-[16px] py-[3px]">
              <dt className="text-black/80 text-[12px] font-normal min-w-[70px] shrink-0">Address</dt>
              <dd className="m-0 text-black text-[12px] font-medium whitespace-pre-line">
                {studio.address}
              </dd>
            </div>
            <div className="flex gap-[16px] py-[3px]">
              <dt className="text-black/80 text-[12px] font-normal min-w-[70px] shrink-0">Email</dt>
              <dd className="m-0 text-black text-[12px] font-medium">{studio.email}</dd>
            </div>
            <div className="flex gap-[16px] py-[3px]">
              <dt className="text-black/80 text-[12px] font-normal min-w-[70px] shrink-0">Number</dt>
              <dd className="m-0 text-black text-[12px] font-medium">{studio.phone}</dd>
            </div>
          </dl>
        </div>
        <div className="border-t-2 border-black pt-[24px]">
          <h3 className="text-black text-[14px] font-bold mb-[2px]">Second Party</h3>
          <p className="text-black/80 text-[12px] font-normal mb-[24px]">The Client</p>
          <dl className="m-0">
            <div className="flex gap-[16px] py-[3px]">
              <dt className="text-black/80 text-[12px] font-normal min-w-[70px] shrink-0">Name</dt>
              {/* Legal name; older snapshots fall back to the short name. */}
              <dd className="m-0 text-black text-[12px] font-medium">
                {doc.clientSnapshot.companyName || doc.clientSnapshot.name || '—'}
              </dd>
            </div>
            <div className="flex gap-[16px] py-[3px]">
              <dt className="text-black/80 text-[12px] font-normal min-w-[70px] shrink-0">Address</dt>
              <dd className="m-0 text-black text-[12px] font-medium whitespace-pre-line">
                {doc.clientSnapshot.address}
              </dd>
            </div>
            <div className="flex gap-[16px] py-[3px]">
              <dt className="text-black/80 text-[12px] font-normal min-w-[70px] shrink-0">Email</dt>
              <dd className="m-0 text-black text-[12px] font-medium">{doc.clientSnapshot.email}</dd>
            </div>
            <div className="flex gap-[16px] py-[3px]">
              <dt className="text-black/80 text-[12px] font-normal min-w-[70px] shrink-0">Number</dt>
              <dd className="m-0 text-black text-[12px] font-medium">{doc.clientSnapshot.phone}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );

  // Each MSA clause is its own atomic block so pagination can only break
  // *between* clauses — a heading never separates from its body.
  const clauses = text.clauses.map((s, ci) => (
    <section key={`msa-${ci}`} className="[break-inside:avoid] mb-[32px]">
      <h3 className="text-black text-[14px] font-bold tracking-[-0.01em] mb-[8px]">
        {s.number}. {s.heading}
      </h3>
      {s.body.map((p, i) => (
        <p key={i} className="text-black/70 text-[11px] font-normal leading-[1.6] mb-[6px]">
          {p}
        </p>
      ))}
    </section>
  ));

  const schedules = doc.schedules.map((sch, i) => (
    <section key={`sch-${i}`} aria-label={`Schedule ${scheduleLetter(i)}`}>
      <p className="text-black/70 text-[11px] font-semibold uppercase tracking-[0.08em] mb-[2px]">
        Schedule {scheduleLetter(i)}
      </p>
      <h3 className="text-black text-[24px] font-bold tracking-[-0.02em] mb-[16px]">{sch.title}</h3>
      {sch.overview ? (
        <p className="text-black/70 text-[12px] font-normal leading-[1.6] mb-[32px]">
          {sch.overview}
        </p>
      ) : null}

      {sch.scopeItems.length > 0 ? (
        <div className="[break-inside:avoid] mb-[32px]">
          <h4 className="text-black text-[13px] font-semibold mb-[8px] pb-[4px] border-b border-[#d9d9d9]">
            Scope of work
          </h4>
          <ul className="m-0 pl-[32px]">
            {sch.scopeItems.map((item, si) => (
              <li key={si} className="text-black/70 text-[12px] font-normal leading-[1.6]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sch.exclusionItems.length > 0 ? (
        <div className="[break-inside:avoid] mb-[32px]">
          <h4 className="text-black text-[13px] font-semibold mb-[8px] pb-[4px] border-b border-[#d9d9d9]">
            Excluded unless separately approved
          </h4>
          <ul className="m-0 pl-[32px]">
            {sch.exclusionItems.map((item, ei) => (
              <li key={ei} className="text-black/70 text-[12px] font-normal leading-[1.6]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {sch.priceNote ? (
        <div className="[break-inside:avoid] mb-[32px]">
          <h4 className="text-black text-[13px] font-semibold mb-[8px] pb-[4px] border-b border-[#d9d9d9]">
            Price &amp; payment
          </h4>
          <p className="text-black text-[12px] font-medium whitespace-pre-line">{sch.priceNote}</p>
        </div>
      ) : null}

      {sch.milestones.length > 0 ? (
        <div className="[break-inside:avoid] mb-[32px]">
          <h4 className="text-black text-[13px] font-semibold mb-[8px] pb-[4px] border-b border-[#d9d9d9]">
            Timelines &amp; milestones
          </h4>
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="text-left text-black text-[11px] font-semibold py-[8px] pr-[8px] pl-0 border-b-2 border-black align-top"
                >
                  Milestone
                </th>
                <th
                  scope="col"
                  className="text-left text-black text-[11px] font-semibold py-[8px] pr-[8px] pl-0 border-b-2 border-black align-top"
                >
                  Scope
                </th>
              </tr>
            </thead>
            <tbody>
              {sch.milestones.map((m, mi) => (
                <tr key={mi}>
                  <th
                    scope="row"
                    className="w-[30%] text-left text-black text-[12px] font-medium py-[8px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top"
                  >
                    {m.label}
                  </th>
                  <td className="w-[70%] text-black/70 text-[12px] font-normal py-[8px] pr-[8px] pl-0 border-b border-[#d9d9d9] align-top before:content-['→_']">
                    {m.scope}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <NoteBlock heading="Revisions" note={sch.revisionsNote} />
      <NoteBlock heading="Disclaimer" note={sch.disclaimerNote} />
      <NoteBlock heading="Support & ownership" note={sch.supportNote} />
    </section>
  ));

  const signatures = (
    <div key="signatures" aria-label="Signatures">
      <h3 className="text-black text-[14px] font-bold tracking-[-0.01em] mb-[8px]">Signatures</h3>
      <p className="text-black/70 text-[11px] font-normal leading-[1.6] mb-[6px]">
        {signatureStatement}
      </p>
      <div className="grid grid-cols-2 gap-[48px] mt-[64px]">
        <div className="[break-inside:avoid]">
          <p className="text-black text-[13px] font-bold mb-[16px]">
            Qera Studio (Service Provider)
          </p>
          <p className="text-black/70 text-[12px] font-normal mb-[2px]">
            Name: {studio.legalName}
          </p>
          <p className="text-black/70 text-[12px] font-normal mb-[2px]">Date: {displayDate}</p>
          <div className="border-b border-black h-[40px] mt-[24px]" />
          <p className="text-black/70 text-[11px] font-normal mt-[6px]">
            Service Provider&apos;s signature
          </p>
        </div>
        <div className="[break-inside:avoid]">
          <p className="text-black text-[13px] font-bold mb-[16px]">Client</p>
          <p className="text-black/70 text-[12px] font-normal mb-[2px]">
            Name: {doc.clientSnapshot.companyName || doc.clientSnapshot.name || '—'}
          </p>
          <p className="text-black/70 text-[12px] font-normal mb-[2px]">Date: {displayDate}</p>
          <div className="border-b border-black h-[40px] mt-[24px]" />
          <p className="text-black/70 text-[11px] font-normal mt-[6px]">Client&apos;s signature</p>
        </div>
      </div>
    </div>
  );

  return [cover, parties, ...clauses, ...schedules, signatures];
}

/**
 * THE contract print artifact. Pure props → markup; server-renderable. A
 * vertical stack of `<section>` page-blocks; the print engine paginates via
 * `break-before: page`. The black cover page is first and omits the leading
 * page-break so there is no blank leading page. Every text class sets an
 * explicit colour — the site theme must never bleed in.
 *
 * Blocks are grouped into logical page sections (cover / parties / terms /
 * one section per schedule / signatures) for print, but each MSA clause and
 * each schedule remains its own atomic block within `contractBlocks` — the
 * on-screen `DocumentPreview` measures and packs that same flat block list.
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
  const scheduleCount = doc.schedules.length;
  const clauses = rest.slice(0, rest.length - scheduleCount - 1);
  const schedules = rest.slice(rest.length - scheduleCount - 1, rest.length - 1);
  const signatures = rest[rest.length - 1];

  return (
    <article
      className="print-sheet bg-white text-black font-sans text-[12px] leading-[1.5]"
      aria-label="Contract agreement"
    >
      <section
        className={`[break-before:avoid] ${COVER_CLASSNAME}`}
        aria-label="Cover"
      >
        {cover}
      </section>
      <section
        className={`[break-before:page] bg-white text-black ${A4_PADDING} box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]`}
        aria-label="Parties"
      >
        {parties}
      </section>
      <section
        className={`[break-before:page] bg-white text-black ${A4_PADDING} box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]`}
        aria-label="Terms and conditions"
      >
        {clauses}
      </section>
      {schedules.map((sch, i) => (
        <section
          key={i}
          className={`[break-before:page] bg-white text-black ${A4_PADDING} box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]`}
        >
          {sch}
        </section>
      ))}
      <section
        className={`[break-before:page] bg-white text-black ${A4_PADDING} box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]`}
        aria-label="Signatures"
      >
        {signatures}
      </section>
    </article>
  );
}
