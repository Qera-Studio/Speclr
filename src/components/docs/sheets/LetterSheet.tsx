import { formatDisplayDate, isISODate } from '@/lib/domain/dates';
import { exitMasthead } from '@/lib/domain/hrContent';
import { studioOf, type StudioInfo } from '@/lib/domain/studio';
import type { LetterDocument } from '@/lib/domain/types';
import { A4_PADDING } from './frame';

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

/** Substitute {name} placeholders in stored body text with the employee's name. */
function fill(text: string, name: string): string {
  return text.replaceAll('{name}', name);
}

function mastheadFor(doc: LetterDocument): string {
  switch (doc.type) {
    case 'OFR':
      return 'COMPANY OFFER LETTER';
    case 'EXP':
      return 'EXPERIENCE LETTER';
    case 'EXIT':
      return exitMasthead(doc.employeeSnapshot.engagementType);
  }
}

/**
 * Reads the studio's CIN and query address from the document's own studio
 * details, not `HR_FOOTER` — the same values, but now editable at /settings and
 * frozen at finalize. `HR_FOOTER` remains the source of the letter *body*
 * boilerplate.
 */
function SharedFooter({ displayDate, studio }: { displayDate: string; studio: StudioInfo }) {
  return (
    <footer className="flex justify-between gap-[16px] flex-wrap mt-auto border-t border-[#d9d9d9] pt-[10px] text-black/70 text-[10px] font-normal">
      <span>Queries: {studio.queryEmailHr}</span>
      <span>CIN: {studio.cin}</span>
      <span>{displayDate}</span>
    </footer>
  );
}

function SignatureBlock({
  employeeName,
  displayDate,
}: {
  employeeName: string;
  displayDate: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-[48px] mt-[48px]">
      <div className="[break-inside:avoid]">
        <p className="text-black/70 text-[12px] font-normal mb-[2px]">Signature:</p>
        <div className="border-b border-black h-[40px] mt-[8px] mb-[8px]" />
        <p className="text-black text-[12px] font-semibold">Shivanshu Pareek</p>
        <p className="text-black/70 text-[11px] font-normal">Co-founder — Qera Studio</p>
        <p className="text-black/70 text-[11px] font-normal">shivanshu@qera.studio</p>
      </div>
      <div className="[break-inside:avoid]">
        <p className="text-black/70 text-[12px] font-normal mb-[2px]">Date:</p>
        <div className="border-b border-black h-[40px] mt-[8px] mb-[8px]" />
        <p className="text-black text-[12px] font-semibold">{displayDate}</p>
        <p className="text-black/70 text-[11px] font-normal">{employeeName}</p>
      </div>
    </div>
  );
}

/**
 * Applied by `DocumentPreview` to the offer letter's pinned first page, so the
 * cover is full-bleed black. Mirrors the contract's `COVER_CLASSNAME`.
 */
export const LETTER_COVER_CLASSNAME =
  'flex flex-col min-h-[900px] bg-black text-white box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]';

/** One bullet section, shared by every letter type. */
function BulletSection({
  section,
  name,
}: {
  section: LetterDocument['bulletSections'][number];
  name: string;
}) {
  return (
    <div className="mb-[24px] [break-inside:avoid]">
      <p className="text-black text-[12px] font-bold mb-[8px]">{fill(section.heading, name)}</p>
      <ul className="m-0 pl-[24px] list-disc">
        {section.items.map((item, ii) => (
          <li key={ii} className="text-black text-[12px] font-normal leading-[1.5] mb-[4px]">
            {fill(item, name)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The letter as a **flat list of atomic blocks** — the same shape
 * `contractBlocks` returns, and for the same reason: `DocumentPreview` measures
 * each block and packs them into A4 pages, breaking only *between* blocks. A
 * monolithic sheet would arrive as a single over-tall block, get one page, and
 * have everything past 1123px clipped by the frame's `overflow-hidden`.
 *
 * For an offer letter, block 0 is the cover and is pinned as its own full-bleed
 * page via `coverFirst` + `LETTER_COVER_CLASSNAME`.
 */
export function letterBlocks(doc: LetterDocument): React.ReactNode[] {
  const displayDate = isISODate(doc.issueDate) ? formatDisplayDate(doc.issueDate) : '—';
  const emp = doc.employeeSnapshot;
  const studio = studioOf(doc);
  const masthead = mastheadFor(doc);

  const paragraphs = doc.bodyParagraphs.map((p, i) => (
    <p
      key={`para-${i}`}
      className="text-black text-[12px] font-normal leading-[1.6] mb-[24px] whitespace-pre-line"
    >
      {fill(p, emp.name)}
    </p>
  ));

  const bullets = doc.bulletSections.map((section, si) => (
    <BulletSection key={`bullet-${si}`} section={section} name={emp.name} />
  ));

  const footer = <SharedFooter key="footer" displayDate={displayDate} studio={studio} />;

  // ── Offer letter — black cover block, then the body flow ─────────────────
  if (doc.type === 'OFR') {
    return [
      <div key="cover" className={`flex flex-col flex-1 min-h-[900px] ${A4_PADDING} box-border`} aria-label="Cover">
        <div className="flex justify-between items-start gap-[24px]">
          <p className="flex items-center gap-[6px] text-white">
            <QeraMark />
            <span className="font-semibold text-[18px] text-white">{studio.brandMark}</span>
          </p>
          <p className="font-semibold text-[12px] text-white text-right">{displayDate}</p>
        </div>
        <h2 className="mt-auto text-[72px] font-bold tracking-[-0.03em] leading-[0.95] uppercase text-white">
          {masthead}
        </h2>
        <div className="flex justify-between gap-[32px] mt-[64px]">
          <div>
            <p className="text-white/60 text-[12px] font-normal">Position:</p>
            <p className="text-white text-[16px] font-medium mt-[2px]">{emp.role}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-[12px] font-normal">Issued to:</p>
            <p className="text-white text-[16px] font-medium mt-[2px]">{emp.name}</p>
          </div>
        </div>
      </div>,

      <div key="brand" className="flex items-center gap-[6px] text-black mb-[40px]">
        <QeraMark />
        <span className="font-semibold text-[16px] text-black">{studio.brandMark}</span>
      </div>,

      ...paragraphs,
      // Offer letters carry no bullet sections today (`offerContent` returns an
      // empty list), but anything added in the editor must still print rather
      // than vanish silently.
      ...bullets,

      <div
        key="acknowledgement"
        className="mt-[40px] pt-[32px] border-t border-[#d9d9d9] [break-inside:avoid]"
      >
        <p className="text-black text-[12px] font-normal leading-[1.6] mb-[24px] whitespace-pre-line">
          I, {emp.name}, confirm that I have read and agreed to the terms mentioned in this letter.
        </p>
        <SignatureBlock employeeName={emp.name} displayDate={displayDate} />
      </div>,

      footer,
    ];
  }

  // ── Experience / exit — a certifying letter, no cover ────────────────────
  return [
    <div key="head" className="flex justify-between items-start gap-[24px] mb-[32px]">
      <div className="flex items-center gap-[6px] text-black">
        <QeraMark />
        <span className="font-semibold text-[16px] text-black">{studio.brandMark}</span>
      </div>
      <p className="text-black text-[12px] font-semibold text-right">{displayDate}</p>
    </div>,

    <div key="to" className="mb-[40px]">
      <p className="text-black/70 text-[12px] font-normal mb-[16px]">To:</p>
      <p className="text-black text-[14px] font-bold">{emp.name}</p>
      <p className="text-black/70 text-[12px] font-normal whitespace-pre-line">{emp.address}</p>
    </div>,

    <div key="masthead" className="[break-inside:avoid]">
      <h2 className="text-black text-[20px] font-bold uppercase text-center tracking-[0.02em]">
        {masthead}
      </h2>
      <p className="text-black text-[13px] font-normal text-center mb-[32px]">
        TO WHOMSOEVER IT MAY CONCERN
      </p>
    </div>,

    ...paragraphs,
    ...bullets,

    <div key="signature" className="mt-[40px] [break-inside:avoid]">
      <p className="text-black text-[12px] font-normal leading-[1.6] mb-[24px] whitespace-pre-line">
        Yours Sincerely,
      </p>
      <SignatureBlock employeeName={emp.name} displayDate={displayDate} />
    </div>,

    footer,
  ];
}

/**
 * The printable HR letter (offer / experience / exit). Pure props → markup;
 * server-renderable. Offer letters get a black cover page; experience/exit are
 * single certifying pages. The exit masthead auto-switches (Internship
 * Completion vs. Relieving) from the employee's engagement type. Every text
 * class sets an explicit colour — the site theme must never bleed in.
 *
 * This renders the section-grouped print flow used by `window.print()` / PDF
 * export. The on-screen preview does **not** go through this component — it
 * feeds the flat `letterBlocks(doc)` list straight into `DocumentPreview`.
 */
export default function LetterSheet({ doc }: { doc: LetterDocument }) {
  const blocks = letterBlocks(doc);
  const masthead = mastheadFor(doc);

  if (doc.type === 'OFR') {
    const [cover, ...body] = blocks;
    return (
      <article
        className="print-sheet bg-white text-black font-sans text-[12px] leading-[1.5]"
        aria-label="Offer letter"
      >
        <section
          className={`[break-before:avoid] min-h-[1123px] ${LETTER_COVER_CLASSNAME}`}
          aria-label="Cover"
        >
          {cover}
        </section>
        <section
          className={`[break-before:page] flex flex-col min-h-[1123px] bg-white text-black font-sans ${A4_PADDING} box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]`}
          aria-label="Offer terms"
        >
          {body}
        </section>
      </article>
    );
  }

  return (
    <article
      className="print-sheet bg-white text-black font-sans text-[12px] leading-[1.5]"
      aria-label={`${masthead} letter`}
    >
      <section
        className={`[break-before:page] flex flex-col min-h-[1123px] bg-white text-black font-sans ${A4_PADDING} box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]`}
        aria-label={masthead}
      >
        {blocks}
      </section>
    </article>
  );
}
