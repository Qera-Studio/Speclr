import { formatDisplayDate, isISODate } from "@/lib/domain/dates";
import { contentOf } from "@/lib/domain/docContent";
import { DOC_TYPES } from "@/lib/domain/registry";
import { studioOf, type StudioInfo } from "@/lib/domain/studio";
import type { LetterDocument } from "@/lib/domain/types";
import { LETTER_PADDING, OFFER_COVER_PADDING } from "./frame";

/** Qera mark from public/assets/landing/navbarLogo.svg, inlined; inherits currentColor. */
function QeraMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 171 173"
      className="shrink-0"
      style={{ width: size, height: size }}
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

/** The letter's subject line, wherever the editor has left it in the body. */
const SUBJECT_RE = /^\s*subject\s*:/i;

/** Substitute {name} placeholders in stored body text with the employee's name. */
function fill(text: string, name: string): string {
  return text.replaceAll("{name}", name);
}

/**
 * Reads the studio's CIN and query address from the document's own studio
 * details, not `HR_FOOTER` — the same values, but now editable at /settings and
 * frozen at finalize. `HR_FOOTER` remains the source of the letter *body*
 * boilerplate.
 */
function SharedFooter({
  displayDate,
  studio,
  website,
  registeredOffice,
}: {
  displayDate: string;
  studio: StudioInfo;
  /** Printed between the CIN and the date. Offer letters only, for now. */
  website?: string;
  /** Legal identity line, above the meta row. Offer letters only, for now. */
  registeredOffice?: string;
}) {
  return (
    // One element, not a fragment: the paginator maps its block list onto the
    // page's DOM children one for one, so a block that renders two elements
    // would throw the measured heights out of step with the blocks.
    <footer className="mt-auto border-t border-[#d9d9d9] pt-[10px] text-black/70 text-[10px] font-normal">
      {registeredOffice ? (
        <p className="mb-[6px] text-center text-black/60 text-[9px] font-normal leading-[1.5]">
          {registeredOffice}
        </p>
      ) : null}
      <div className="flex justify-between gap-[16px] flex-wrap">
        <span>Queries: {studio.queryEmailHr}</span>
        <span>CIN: {studio.cin}</span>
        {website ? <span>{website}</span> : null}
        <span>{displayDate}</span>
      </div>
    </footer>
  );
}

/**
 * The brand + date row at the top of a letter's body page. Every letter carries
 * the date here, so a page separated from the rest still says when it was
 * issued — and the offer letter's cover is not the only place it appears.
 */
function BrandHeader({
  studio,
  displayDate,
}: {
  studio: StudioInfo;
  displayDate: string;
}) {
  return (
    <div className="flex justify-between items-center gap-[24px] text-black mb-[40px]">
      <span className="flex items-center gap-[6px]">
        <QeraMark size={14} />
        <span className="font-semibold text-[16px] text-black">
          {studio.brandMark}
        </span>
      </span>
      <span className="text-black text-[12px] font-semibold text-right">
        {displayDate}
      </span>
    </div>
  );
}

/**
 * A letter's signature block: the studio's authorised signatory on the left,
 * and — only when the letter asks to be agreed to — the recipient on the right.
 *
 * No date column. The issue date is in the page header, and repeating it under
 * a signature line invites someone to read it as the date signed.
 *
 * `employeeName` is set only on the offer letter, which asks the recipient to
 * confirm agreement; an acknowledgement with nowhere to sign is not one. The
 * certifying letters (experience, exit) certify rather than ask, so they get the
 * signatory column alone — the grid stays two-column so that column keeps its
 * width and position rather than stretching across the page.
 *
 * The signatory's name, title and qualifier are editable per document, seeded
 * from the defaults in `docContent`.
 */
function LetterSignatureBlock({
  employeeName,
  signatoryName,
  signatoryTitle,
  signatoryQualifier,
}: {
  employeeName?: string;
  signatoryName: string;
  signatoryTitle: string;
  signatoryQualifier: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-[96px] mt-[48px] mb-[24px]">
      <div className="max-w-[250px] [break-inside:avoid]">
        <p className="text-black/70 text-[12px] font-normal mb-[2px]">
          Signature:
        </p>
        <div className="border-b border-black h-[40px] mt-[8px] mb-[8px]" />
        <p className="text-black text-[12px] font-semibold">{signatoryName}</p>
        <p className="text-black/70 text-[11px] font-normal">{signatoryTitle}</p>
        {signatoryQualifier ? (
          <p className="text-black/70 text-[11px] font-normal">
            {signatoryQualifier}
          </p>
        ) : null}
      </div>
      {employeeName ? (
        <div className="max-w-[250px] [break-inside:avoid]">
          <p className="text-black/70 text-[12px] font-normal mb-[2px]">
            Signature:
          </p>
          <div className="border-b border-black h-[40px] mt-[8px] mb-[8px]" />
          <p className="text-black text-[12px] font-semibold">{employeeName}</p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Applied by `DocumentPreview` to the offer letter's pinned first page, so the
 * cover is full-bleed black. Mirrors the contract's `COVER_CLASSNAME`.
 */
export const LETTER_COVER_CLASSNAME =
  "flex flex-col min-h-[900px] bg-black text-white box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]";

/**
 * Runs a section's items together into one paragraph.
 *
 * Each item is normalised to end in sentence punctuation first. The stored
 * lists have two different shapes — the exit letter's assertions already end in
 * a full stop, while the experience letter's responsibilities are unpunctuated
 * fragments — so a plain `join(' ')` would run the latter's words together.
 * Anything typed into the editor later gets the same treatment.
 */
function asProse(items: string[]): string {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (/[.!?]$/.test(item) ? item : `${item}.`))
    .join(" ");
}

/**
 * One listed section, shared by every letter type: a bold heading with its
 * points as flowing prose beneath it, not a bulleted list. Stored as
 * `bulletSections` still — the points remain individually editable; only how
 * they print changed.
 */
function BulletSection({
  section,
  name,
}: {
  section: LetterDocument["bulletSections"][number];
  name: string;
}) {
  return (
    <div className="mb-[24px] [break-inside:avoid]">
      <p className="text-black text-[14px] font-bold mb-[8px]">
        {fill(section.heading, name)}
      </p>
      <p className="text-black text-[14px] font-normal leading-[1.5]">
        {fill(asProse(section.items), name)}
      </p>
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
  const displayDate = isISODate(doc.issueDate)
    ? formatDisplayDate(doc.issueDate)
    : "—";
  const emp = doc.employeeSnapshot;
  const studio = studioOf(doc);
  // Masthead, subject, acknowledgement, the signatory block and the footer
  // identity lines are all editable per document; `contentOf` resolves the
  // defaults for one nobody has touched. The exit letter's masthead still
  // switches on engagement type inside that resolver.
  const text = contentOf(doc, DOC_TYPES[doc.type]);
  const masthead = text.masthead;

  // Every letter reads at 14px — the certifying letters were on 12px until they
  // were brought onto the offer letter's page.
  const bodyClass =
    "text-black text-[14px] font-normal leading-[1.5] mb-[20px] whitespace-pre-line";

  const subjectClass =
    "text-black text-[16px] font-semibold leading-[1.6] mb-[24px] whitespace-pre-line";

  const paragraphs = doc.bodyParagraphs.map((p, i) => (
    <p
      key={`para-${i}`}
      className={
        // Letters written before the subject had a field of its own keep it as
        // the first body paragraph. Matched on the text, not the position: the
        // body is free text and can be reordered. New letters carry
        // `content.subject` and never reach this branch.
        SUBJECT_RE.test(p) ? subjectClass : bodyClass
      }
    >
      {fill(p, emp.name)}
    </p>
  ));

  // The subject as its own field, printed above the body.
  const subject = text.subject.trim() ? (
    <p key="subject" className={subjectClass}>
      {fill(text.subject, emp.name)}
    </p>
  ) : null;

  const bullets = doc.bulletSections.map((section, si) => (
    <BulletSection key={`bullet-${si}`} section={section} name={emp.name} />
  ));

  // The valediction, printed after the listed sections and above the closing
  // rule. Empty on the offer and exit letters, which have no equivalent.
  const closingLine = text.closingLine.trim() ? (
    <p key="closing-line" className={bodyClass}>
      {fill(text.closingLine, emp.name)}
    </p>
  ) : null;

  /**
   * The tail of a letter as **one** block: lead line, signature, registered
   * office and footer, pinned to the foot of the last page (`mt-auto` — the page
   * frame is a flex column). One block, not four, so a page break can never
   * leave the signature lines stranded from the letter's footer.
   *
   * `recipientSigns` is the offer letter only: it asks the reader to confirm
   * agreement, so they get a line of their own. See `LetterSignatureBlock`.
   */
  const closing = (leadLine: string, recipientSigns: boolean) => (
    <div key="closing" className="mt-auto">
      <div className="pt-[32px] border-t border-[#d9d9d9] [break-inside:avoid]">
        <p className={bodyClass}>{fill(leadLine, emp.name)}</p>
        <LetterSignatureBlock
          employeeName={recipientSigns ? emp.name : undefined}
          signatoryName={text.signatoryName}
          signatoryTitle={text.signatoryTitle}
          signatoryQualifier={text.signatoryQualifier}
        />
      </div>
      <SharedFooter
        displayDate={displayDate}
        studio={studio}
        website={text.website}
        registeredOffice={text.registeredOffice}
      />
    </div>
  );

  // ── Offer letter — black cover block, then the body flow ─────────────────
  if (doc.type === "OFR") {
    return [
      // Header, masthead and details spaced evenly over the full page height —
      // `justify-between`, not a capped height with `mt-auto` pushing the
      // masthead down, which bunched all three into the top 700px.
      <div
        key="cover"
        className={`flex flex-col flex-1 justify-between min-h-[100px] ${OFFER_COVER_PADDING} box-border`}
        aria-label="Cover"
      >
        <div className="flex justify-between items-start gap-[24px]">
          <p className="flex items-center gap-[6px] text-white">
            <QeraMark size={14} />
            <span className="font-semibold text-[18px] text-white">
              {studio.brandMark}
            </span>
          </p>
          <p className="font-semibold text-[12px] text-white text-right">
            {displayDate}
          </p>
        </div>
        <h2 className="text-[72px] font-bold tracking-[-0.03em] leading-[0.95] uppercase text-white">
          {masthead}
        </h2>
        <div className="flex justify-between gap-[32px]">
          <div>
            <p className="text-white/60 text-[12px] font-normal">Position:</p>
            <p className="text-white text-[16px] font-medium mt-[2px]">
              {emp.role}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-[12px] font-normal">Issued to:</p>
            <p className="text-white text-[16px] font-medium mt-[2px]">
              {emp.name}
            </p>
          </div>
        </div>
      </div>,

      <BrandHeader key="brand" studio={studio} displayDate={displayDate} />,

      ...(subject ? [subject] : []),
      ...paragraphs,
      // Offer letters carry no bullet sections today (`offerContent` returns an
      // empty list), but anything added in the editor must still print rather
      // than vanish silently.
      ...bullets,
      ...(closingLine ? [closingLine] : []),

      closing(text.acknowledgement, true),
    ];
  }

  // ── Experience / exit — a certifying letter, no cover ────────────────────
  return [
    <BrandHeader key="brand" studio={studio} displayDate={displayDate} />,

    <div key="to" className="mb-[40px]">
      <p className="text-black/80 text-[12px] font-normal mb-[4px]">To:</p>
      <p className="text-black text-[16px] font-semibold">{emp.name}</p>
      <p className="text-black/80 text-[12px] font-normal whitespace-pre-line">
        {emp.address}
      </p>
    </div>,

    <div key="masthead" className="[break-inside:avoid]">
      <h2 className="text-black text-[20px] font-bold uppercase text-center tracking-[0.02em]">
        {masthead}
      </h2>
      <p className="text-black text-[13px] font-normal text-center mb-[32px]">
        {text.subheading}
      </p>
    </div>,

    ...(subject ? [subject] : []),
    ...paragraphs,
    ...bullets,
    ...(closingLine ? [closingLine] : []),

    // A certifying letter is not agreed to, so only the studio signs.
    closing("Yours Sincerely,", false),
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
  const masthead = contentOf(doc, DOC_TYPES[doc.type]).masthead;

  if (doc.type === "OFR") {
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
          className={`[break-before:page] flex flex-col min-h-[1123px] bg-white text-black font-sans ${LETTER_PADDING} box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]`}
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
        className={`[break-before:page] flex flex-col min-h-[1123px] bg-white text-black font-sans ${LETTER_PADDING} box-border [print-color-adjust:exact] [-webkit-print-color-adjust:exact]`}
        aria-label={masthead}
      >
        {blocks}
      </section>
    </article>
  );
}
