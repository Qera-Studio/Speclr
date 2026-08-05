import { formatDisplayDate, isISODate } from '@/lib/domain/dates';
import { AGREEMENT_PREAMBLE, CONTRACT_INTRO, MSA_SECTIONS } from '@/lib/domain/msaBoilerplate';
import { scheduleLetter } from '@/lib/domain/scheduleLetter';
import { studioOf } from '@/lib/domain/studio';
import type { ContractDocument } from '@/lib/domain/types';
import { A4_PADDING } from './frame';

/** Cover page styling shared by the print flow and the preview's dedicated
 * cover-page frame — the black, full-bleed contract cover. */
export const COVER_CLASSNAME =
  'flex flex-col min-h-[900px] bg-black text-white box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]';

/** Qera mark from public/assets/landing/navbarLogo.svg, inlined; inherits currentColor. */
function QeraMark() {
  return (
    <svg
      viewBox="0 0 171 173"
      className="w-[20px] h-[20px] shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0.863281 166.353C-0.286575 167.52 -0.286499 169.395 0.863281 170.562L1.88281 171.598C3.05795 172.791 4.98206 172.791 6.15723 171.598L7.24414 170.494H5.37891C3.72235 170.494 2.37904 169.151 2.37891 167.494V164.813L0.863281 166.353ZM5.37988 25.5391C3.72302 25.5391 2.37891 26.8822 2.37891 28.5391V164.813L34.2188 132.481C35.394 131.288 37.3181 131.289 38.4932 132.482L39.5137 133.518C40.6635 134.685 40.6634 136.56 39.5137 137.728L7.24414 170.494H142.513C144.169 170.494 145.513 169.151 145.513 167.494V145.518C145.513 145.408 145.422 145.32 145.312 145.325C145.207 145.33 145.125 145.421 145.13 145.526L145.138 145.709L145.12 145.346C145.12 145.34 145.114 145.335 145.108 145.335C145.1 145.335 145.087 145.336 145.071 145.337C145.039 145.338 144.99 145.34 144.927 145.343C144.798 145.348 144.607 145.356 144.356 145.364C143.855 145.381 143.114 145.403 142.163 145.421C140.26 145.456 137.509 145.477 134.125 145.416C127.355 145.294 118.049 144.848 107.909 143.551C97.7678 142.254 86.7989 140.106 76.6982 136.586C66.5946 133.064 57.382 128.176 50.7295 121.412C44.0762 114.647 39.2658 105.311 35.7988 95.083C32.3329 84.8586 30.2172 73.7672 28.9375 63.5176C27.658 53.2694 27.2153 43.8701 27.0928 37.0332C27.0315 33.6155 27.05 30.8378 27.084 28.916C27.101 27.9557 27.1221 27.2085 27.1387 26.7021C27.1469 26.4493 27.1541 26.2555 27.1592 26.126C27.1617 26.0616 27.1636 26.0121 27.165 25.9795C27.1657 25.9638 27.1666 25.9514 27.167 25.9434C27.1671 25.9419 27.1671 25.9404 27.1671 25.9389C27.167 25.9367 27.1674 25.9345 27.1681 25.9323C27.1687 25.9306 27.169 25.9287 27.1691 25.9269L27.1709 25.8848C27.1791 25.6962 27.0276 25.5391 26.8389 25.5391H5.37988ZM30.8516 0C28.9878 0.00026386 27.4766 1.51121 27.4766 3.375V21.6992C27.4766 23.4305 28.7874 24.8809 30.5098 25.0566L129.54 35.1483C132.366 35.4363 134.603 37.6664 134.899 40.4914L145.541 141.933C145.721 143.65 147.171 144.955 148.898 144.955H166.865C168.729 144.955 170.24 143.444 170.24 141.58V72.9375C170.24 72.0637 169.901 71.2238 169.295 70.5947L135.002 35.0391L134.995 35.0332L134.989 35.0273L98.873 0.920898C98.2467 0.329739 97.4179 9.72251e-05 96.5566 0H30.8516Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
  const displayDate = isISODate(doc.issueDate) ? formatDisplayDate(doc.issueDate) : '—';
  const signatureStatement =
    MSA_SECTIONS.find((s) => s.number === 24)?.body[0] ??
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
        {CONTRACT_INTRO}
      </p>
    </div>
  );

  const parties = (
    <div key="parties" aria-label="Parties">
      <p className="text-black text-[13px] font-medium mb-[40px]">{AGREEMENT_PREAMBLE}</p>
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
  const clauses = MSA_SECTIONS.map((s) => (
    <section key={`msa-${s.number}`} className="[break-inside:avoid] mb-[32px]">
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
