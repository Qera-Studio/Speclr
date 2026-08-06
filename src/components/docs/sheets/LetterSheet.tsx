import { formatDisplayDate, isISODate } from "@/lib/domain/dates";
import { contentOf } from "@/lib/domain/docContent";
import { DOC_TYPES } from "@/lib/domain/registry";
import { studioOf, type StudioInfo } from "@/lib/domain/studio";
import type { LetterDocument } from "@/lib/domain/types";
import { LETTER_PADDING, OFFER_COVER_PADDING } from "./frame";
import QeraMark from "./QeraMark";

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
