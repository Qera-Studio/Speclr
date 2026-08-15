import { formatDisplayDate, isISODate } from "@/lib/domain/dates";
import { assemble, withLetter } from "@/lib/domain/contract/assembly";
import {
  blankValue,
  isUnfilled,
  type BlankValues,
} from "@/lib/domain/contract/blanks";
import {
  contractScopes,
  partSectionLabel,
  type BlankScope,
} from "@/lib/domain/contract/completeness";
import { EXECUTION_STATEMENT } from "@/lib/domain/contract/msa";
import { contentOf } from "@/lib/domain/docContent";
import { DOC_TYPES } from "@/lib/domain/registry";
import { studioOf } from "@/lib/domain/studio";
import type { ContractDocument } from "@/lib/domain/types";
import {
  CONTRACT_COLUMN_GAP,
  CONTRACT_COLUMN_WIDTH,
  CONTRACT_COLUMNS,
  CONTRACT_PADDING,
  CONTRACT_PADDING_Y,
} from "./frame";
import QeraMark from "./QeraMark";

/**
 * The full-bleed black page — the cover and the parties page.
 *
 * Passed to the preview and the print renderer as `darkPageClassName`; a block
 * asks for it with `data-page-frame="dark"`.
 */
export const CONTRACT_DARK_PAGE =
  "bg-black text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact]";

/**
 * What the running header and footer cost a page, top and bottom together.
 *
 * Pagination reserves this before packing, so it must match the markup in
 * `contractPageProps` exactly — too small and content is packed underneath the
 * footer, too large and every page runs short. Both rows are `box-border`, so
 * their `h-[…]` is the whole row including its padding.
 */
export const CONTRACT_CHROME_HEIGHT = 20 + 40 + 28;

/**
 * The type scale.
 *
 * Headings run the full 746px measure — they head a section, so they span it.
 * Body is 14px because it is set in a 361px column, which puts it at ~50
 * characters to a line: what a printed agreement has always used.
 */
const PROSE = "text-black text-[14px] font-normal leading-[1.5] mb-[8px]";
const HEADING =
  "text-black text-[24px] font-bold tracking-[0.01em] mb-[12px] uppercase";
const PART_NAME =
  "text-black text-[20px] font-bold tracking-[-0.01em] mb-[8px]";
const SUBHEADING =
  "text-black text-[13px] font-semibold uppercase tracking-[0.04em] mb-[6px] pb-[3px] border-b border-[#d9d9d9]";
/**
 * A clause or Part section opens with one of these: a rule and the air above
 * it, so the eye can tell where one ends and the next begins. Only the *first*
 * block of a section carries it — the paragraphs after it are continuations,
 * and a rule between two paragraphs of one clause would be a lie.
 *
 * At the top of a page it is suppressed (`PageColumns`): there is nothing above
 * to be divided from.
 */
const SECTION = "border-t border-[#000] pt-[12px] mt-[20px]";

/**
 * Everything a page of this contract needs: its margins, its running header and
 * footer, and the height that furniture costs.
 *
 * Spread straight onto `DocumentWorkspace` or `PrintPages`. One bundle rather
 * than five props, because they are only correct together — `chromeHeight` is
 * what pagination reserves for the header and footer below, and the two
 * drifting apart is how content gets packed underneath the footer.
 *
 * The header and footer are functions, so this must be called on the client.
 * Server routes go through `ContractPages`.
 */
export function contractPageProps(doc: ContractDocument) {
  const studio = studioOf(doc);
  const displayDate = isISODate(doc.issueDate)
    ? formatDisplayDate(doc.issueDate)
    : "—";

  return {
    // Bare content blocks: the page frame paints the margins, not the sheet.
    selfPaddedSheet: false,
    pagePadding: CONTRACT_PADDING,
    pagePaddingY: CONTRACT_PADDING_Y,
    darkPageClassName: CONTRACT_DARK_PAGE,
    chromeHeight: CONTRACT_CHROME_HEIGHT,
    columns: CONTRACT_COLUMNS,
    columnWidth: CONTRACT_COLUMN_WIDTH,
    columnGap: CONTRACT_COLUMN_GAP,
    pageHeader: (_page: number, dark: boolean) => (
      <div
        className={`flex h-[20px] shrink-0 items-center justify-between gap-[24px] text-[11px] text-black/60 font-semibold mb-[36px] ${
          dark ? "text-white" : "text-black"
        }`}
      >
        <span className="flex items-center gap-[6px]">
          <QeraMark />
          {studio.brandMark}
        </span>
        <span>{displayDate}</span>
      </div>
    ),
    pageFooter: (page: number, dark: boolean) => (
      <div
        className={`mt-auto flex h-[28px] shrink-0 items-center justify-between gap-[24px] pt-[12px] text-[10px] font-normal ${
          dark ? "text-white/70" : "text-black/60"
        }`}
      >
        <span>Confidential &amp; Proprietary</span>
        {/* The number alone. A total is a promise about a document still being
            edited, and it changes under the reader as blanks are filled. */}
        <span className="tabular-nums">{page + 1}</span>
      </div>
    ),
  };
}

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
  strip = "",
}: {
  scope: BlankScope;
  index: number;
  values: BlankValues;
  letter?: string;
  /**
   * The list marker already printed in its own column, removed from the first
   * segment so it does not appear twice. Stripped after `{L}` substitution,
   * because that is when a Schedule clause's '{L}2.4' becomes the 'A2.4' the
   * marker was matched against.
   */
  strip?: string;
}) {
  const parsed = scope.parsed[index];
  const render = (text: string) => (letter ? withLetter(text, letter) : text);
  const head = (text: string, i: number) =>
    i === 0 && strip ? text.slice(strip.length) : text;

  return (
    <>
      {parsed.segments.map((segment, i) => (
        <span key={i}>
          {head(render(segment), i)}
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
 * The list marker a paragraph opens with: a clause number ('3.1'), a Schedule
 * clause number once its letter is substituted ('A2.4'), a lettered sub-item
 * ('(a)') or a bullet ('- ').
 */
const MARKER = /^(\d+(?:\.\d+)+|[A-Z]\d+(?:\.\d+)+|\([a-z]\)|-)\s+/;

/**
 * A paragraph of a clause or Part section, laid out the way a document lays one
 * out: the number in a column of its own, the text hanging beside it, so a
 * point running to three lines starts every one of them at the same place
 * rather than tucking the second under its own number.
 *
 * Sub-items step in from their parent, and definitions — the '"Deliverables"
 * means …' lines under clause 1.1, which carry no number — step in with them.
 * Markers print semibold: a reader scanning for 8.4 should find it.
 *
 * Falls back to plain text where the section holds no blanks at all, which is
 * most of them. `plain` turns all of this off for the one caller that renders
 * inside an `<li>`, where the list already draws the marker.
 *
 * `column` marks a point that flows in one of the page's two columns rather
 * than across the measure. The width is set here rather than by the page,
 * because pagination measures the un-paginated flow at full page width — a
 * block that will be set in a column has to be measured in one.
 */
function Para({
  scope,
  index,
  text,
  values,
  letter,
  className = PROSE,
  plain = false,
  column = false,
}: {
  scope?: BlankScope;
  index: number;
  text: string;
  values: BlankValues;
  letter?: string;
  className?: string;
  plain?: boolean;
  column?: boolean;
}) {
  const rendered = letter ? withLetter(text, letter) : text;
  const match = plain ? null : rendered.match(MARKER);
  const marker = match?.[1] === "-" ? "•" : match?.[1];
  // '(a) …' hangs off its parent; so does a definition line, which has no
  // marker of its own but belongs to the numbered paragraph above it.
  const sub =
    Boolean(match && /^[(-]/.test(match[1])) ||
    (!plain && !match && rendered.startsWith('"'));

  const body = scope ? (
    <Filled
      scope={scope}
      index={index}
      values={values}
      letter={letter}
      strip={match?.[0] ?? ""}
    />
  ) : (
    rendered.slice(match?.[0].length ?? 0)
  );

  if (plain) {
    return <p className={className}>{body}</p>;
  }

  return (
    <p
      data-span={column ? "column" : undefined}
      style={column ? { width: CONTRACT_COLUMN_WIDTH } : undefined}
      className={`${className} flex gap-[6px]${sub ? " pl-[18px]" : ""}`}
    >
      {marker ? (
        <span className="shrink-0 font-semibold tabular-nums">{marker}</span>
      ) : null}
      <span className="min-w-0 flex-1">{body}</span>
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
    <table className="w-full border-collapse table-fixed mb-[8px]">
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <th
              scope="row"
              className="w-[60%] text-left text-black text-[14px] font-normal leading-[1.5] py-[4px] pr-[8px] pl-0 border-b border-[#e5e5e5] align-top"
            >
              {row.label}
            </th>
            <td className="w-[40%] text-black text-[14px] font-medium leading-[1.5] py-[4px] pr-[8px] pl-0 border-b border-[#e5e5e5] align-top">
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

/**
 * A list spans the full measure — but sets its items in two columns inside it.
 *
 * A bullet is one line whether it is 361px wide or 746px, so a list laid out
 * across the page costs twice the paper of the same list in two columns and
 * leaves half of every line empty. The indent is on the item rather than the
 * list, because padding on a multi-column box leaves the second column's
 * markers hanging in the gutter.
 */
function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="m-0 mb-[4px] [column-gap:24px] [columns:2]">
      {items.map((item, i) => (
        <li
          key={i}
          className="ml-[20px] text-black text-[14px] font-normal leading-[1.5] [break-inside:avoid]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * The contract as a flat list of atomic content blocks — the cover, the parties
 * page, each MSA clause, each Schedule cover, each Schedule clause, each
 * section of each Part, the signatures. Each entry is one indivisible unit,
 * which is what lets the preview and the print renderer measure and pack them
 * into A4 pages without ever splitting a heading from its body.
 *
 * Three blocks claim a page to themselves with `data-page="own"`: the cover and
 * the parties page (both `dark`), and every Schedule cover. Everything else
 * flows.
 */
export function contractBlocks(doc: ContractDocument): React.ReactNode[] {
  const text = contentOf(doc, DOC_TYPES.CON);
  const displayDate = isISODate(doc.issueDate)
    ? formatDisplayDate(doc.issueDate)
    : "—";
  const values = doc.contract.blanks;
  const assembled = assemble(doc.contract.parts);
  const studio = studioOf(doc);
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
      data-page="own"
      data-page-frame="dark"
      aria-label="Cover"
      className="flex flex-1 flex-col justify-center text-left"
    >
      <h2 className="text-[64px] font-bold tracking-[-0.03em] leading-[0.95] uppercase text-white">
        {text.masthead}
      </h2>
      <p className="mx-auto mt-[64px] mr-[200px] text-white/80 text-[14px] font-normal leading-[1.5]">
        {text.intro}
      </p>
    </div>
  );

  /** One party's block, on the black parties page. */
  const party = (
    heading: string,
    role: string,
    fields: { label: string; value: string }[],
  ) => (
    <div className="border-t-1 border-white/30 pt-[16px]">
      <h3 className="text-white text-[16px] font-bold mb-[2px]">{heading}</h3>
      <p className="text-white/70 text-[14px] font-normal mb-[16px]">{role}</p>
      <dl className="m-0">
        {fields.map((f) => (
          <div key={f.label} className="flex gap-[16px] py-[2px]">
            <dt className="text-white/70 text-[14px] font-normal min-w-[80px] shrink-0">
              {f.label}
            </dt>
            <dd className="m-0 text-white text-[14px] font-medium whitespace-pre-line">
              {f.value || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );

  const clientName =
    doc.clientSnapshot.companyName || doc.clientSnapshot.name || "";

  // The two parties are stacked, not set side by side: each block runs to a
  // full address and a two-column grid squeezed both into half a page width.
  const parties = (
    <div
      key="parties"
      data-page="own"
      data-page-frame="dark"
      aria-label="Parties"
      className="flex flex-1 flex-col"
    >
      <p className="text-white text-[14px] font-medium leading-[1.5] mb-[180px] mt-[64px]">
        {text.preamble}
      </p>
      <div className="flex flex-col gap-[32px]">
        {party("First Party", "The Studio / Service Provider", [
          { label: "Name", value: studio.legalName },
          { label: "Address", value: studio.address },
          { label: "Email", value: studio.email },
          { label: "Number", value: studio.phone },
        ])}
        {party("Second Party", "The Client", [
          { label: "Name", value: clientName },
          { label: "Address", value: doc.clientSnapshot.address },
          { label: "Email", value: doc.clientSnapshot.email },
          { label: "Number", value: doc.clientSnapshot.phone },
        ])}
      </div>
    </div>
  );

  /**
   * A clause or a Part section, cut into blocks a page can break between.
   *
   * The heading spans the measure — it heads the section, so it runs its full
   * width — and the points below it flow in the page's two columns. That is how
   * an agreement is set: `1. Definitions and Interpretation` across the page,
   * `1.1`, `1.2`, `1.3` in columns beneath it. Only the heading carries
   * `SECTION`; a rule drawn between two points of one clause would claim a
   * division that is not there.
   *
   * Each point is its own block. A whole clause as one block is what put clause
   * 3 (twenty paragraphs, some 1400px) past the foot of its page: an over-tall
   * block has nowhere to go, so it spills. Points always fit.
   *
   * A section holding one point keeps it with the heading, full width. Two
   * columns of one paragraph is not two columns, and joining them also settles
   * where such a heading may sit: with nothing that can be split off it, it
   * cannot be left alone at the foot of a page.
   */
  const flowSection = (
    key: string,
    head: React.ReactNode,
    paragraphs: string[],
    scope?: BlankScope,
    letter?: string,
    label?: string,
  ): React.ReactNode[] => {
    const para = (paragraph: string, i: number, column: boolean) => (
      <Para
        key={`${key}-p${i}`}
        column={column}
        scope={scope}
        index={i}
        text={paragraph}
        values={values}
        letter={letter}
      />
    );

    if (paragraphs.length <= 1) {
      return [
        <section key={key} aria-label={label} className={SECTION}>
          {head}
          {paragraphs.length > 0 ? para(paragraphs[0], 0, false) : null}
        </section>,
      ];
    }

    return [
      // `data-keep-next`: a heading with its points on the next page is a
      // promise this one does not keep. Pagination moves both together.
      <section
        key={key}
        data-keep-next=""
        aria-label={label}
        className={SECTION}
      >
        {head}
      </section>,
      ...paragraphs.map((paragraph, i) => para(paragraph, i, true)),
    ];
  };

  const clauses = text.clauses.flatMap((clause) =>
    flowSection(
      `msa-${clause.number}`,
      <h3 className={HEADING}>
        {clause.number}. {clause.heading}
      </h3>,
      clause.body,
      scopes.get(`msa.${clause.number}`),
    ),
  );

  /**
   * Both signature blocks are rendered from the record, never typed. The May
   * 2026 document inverted them — the first-party block carried the Client's
   * name — precisely because they were hand-entered (content §2, clause 29).
   *
   * Printed at the end of every Schedule as well as at the end of the
   * Agreement: a Schedule is what the Parties actually negotiate, and it is
   * signed where it ends.
   *
   * Takes a page of its own: a page you sign is conventionally a page of its
   * own, and two parties side by side want the whole of it.
   */
  const signatures = (key: string, heading: string, statement?: string) => (
    <div
      key={key}
      data-page="own"
      aria-label={heading}
      className="flex flex-1 flex-col justify-center"
    >
      <h3 className="text-black text-[28px] font-bold tracking-[-0.01em] mb-[8px] uppercase">
        {heading}
      </h3>
      {statement ? <p className={PROSE}>{statement}</p> : null}
      <div className="grid grid-cols-2 gap-[48px] mt-[32px]">
        {[
          {
            party: studio.legalName,
            name: text.signatoryName,
            designation: text.signatoryTitle,
          },
          {
            /*
              The client's signing authority, from the frozen snapshot. This
              printed two blank rules until the client record had anywhere to
              record who signs — so filling it completes the block rather than
              redesigning it, and a contract signed before the field existed
              still prints the same two rules.
            */
            party: clientName || "—",
            name: doc.clientSnapshot.signatory?.name ?? "",
            designation: doc.clientSnapshot.signatory?.designation ?? "",
          },
        ].map((block, i) => (
          <div key={i} className="[break-inside:avoid]">
            <p className="text-black/70 text-[12px] font-normal mb-[2px]">
              For and on behalf of
            </p>
            <p className="text-black text-[14px] font-bold mb-[12px]">
              {block.party}
            </p>
            <p className="text-black text-[14px] font-normal mb-[2px]">
              Name: {block.name || "________________"}
            </p>
            <p className="text-black text-[14px] font-normal mb-[2px]">
              Designation: {block.designation || "________________"}
            </p>
            <p className="text-black text-[14px] font-normal mb-[2px]">
              Date: {displayDate}
            </p>
            <div className="border-b border-black h-[32px] mt-[16px]" />
            <p className="text-black/70 text-[12px] font-normal mt-[6px]">
              Signature
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  /**
   * A Schedule opens on a page of its own: its letter, its name and its
   * preamble centred, with the list of what is appended to it below.
   *
   * The list names the Parts and does not letter them. The document works its
   * own numbering out from what is in it and that numbering moves as Parts are
   * added and removed; nobody reads a contract by looking up "Part A-1".
   */
  const scheduleCover = (
    letter: string,
    name: string,
    preamble: string,
    partNames: string[],
  ) => (
    <section
      key={`sch-cover-${letter}`}
      data-page="own"
      aria-label={`Schedule ${letter}`}
      className="flex flex-1 flex-col justify-center text-left"
    >
      {/* <p className="text-black/60 text-[12px] font-semibold uppercase tracking-[0.08em]">
        {name}
      </p> */}
      <h3 className="text-black text-[48px] font-bold tracking-[-0.02em] mb-[4px]">
        Schedule {letter}
      </h3>
      <p className="mx-auto mb-[128px] mr-[200px] text-black/80 text-[14px] font-normal leading-[1.5]">
        {preamble}
      </p>
      <h4 className="text-black/60 text-[12px] font-semibold uppercase tracking-[0.08em] mb-[12px]">
        Appended to this Schedule
      </h4>
      <ul className="m-0 flex flex-col gap-[4px]">
        {partNames.map((partName) => (
          <li
            key={partName}
            className="text-black text-[14px] font-medium leading-[1.5]"
          >
            {partName}
          </li>
        ))}
      </ul>
    </section>
  );

  const scheduleBlocks = assembled.flatMap(({ schedule, letter, parts }) => [
    scheduleCover(
      letter,
      schedule.name,
      schedule.preamble,
      parts.map((p) => p.part.name),
    ),
    ...schedule.clauses.flatMap((clause) =>
      flowSection(
        `sch-${letter}-${clause.number}`,
        <h3 className={HEADING}>
          {letter}
          {clause.number}. {clause.heading}
        </h3>,
        clause.body,
        scopes.get(`sch.${schedule.key}.${clause.number}`),
        letter,
      ),
    ),
    /*
      A Part is emitted as one block per section — and a prose section as one
      block per paragraph. A whole Part is many pages tall, and an over-tall
      block can only be given a page of its own, which is how the foot of a
      Part used to be cut off.
    */
    ...parts.flatMap(({ part }) => {
      const at = (section: string) =>
        scopes.get(`part.${part.code}.${section}`);
      // Headings come from `partSectionLabel`, which the editor reads too — a
      // Retainer Part is delivered per cycle and says so.
      const heading = (id: string) => (
        <h4 className={SUBHEADING}>{partSectionLabel(id, part.scheduleKey)}</h4>
      );
      /** A section holding one indivisible thing — a table, a list. */
      const section = (id: string, node: React.ReactNode) => (
        <div key={`part-${part.code}-${id}`} className={SECTION}>
          {heading(id)}
          {node}
        </div>
      );
      /** A section of prose, which breaks between its paragraphs. */
      const prose = (id: string, paragraphs: string[]) =>
        flowSection(`part-${part.code}-${id}`, heading(id), paragraphs, at(id));

      return [
        // The Part's name carries the first line of its overview, so the two
        // can never be split.
        ...flowSection(
          `part-${part.code}`,
          <h3 className={PART_NAME}>{part.name}</h3>,
          part.overview,
          at("overview"),
          undefined,
          part.name,
        ),

        part.included.length > 0
          ? section(
              "included",
              <ul className="m-0 [column-gap:24px] [columns:2]">
                {part.included.map((item, i) => (
                  <li
                    key={i}
                    className="ml-[20px] text-black text-[14px] font-normal leading-[1.5] [break-inside:avoid]"
                  >
                    <Para
                      scope={at("included")}
                      index={i}
                      text={item}
                      values={values}
                      className="inline"
                      plain
                    />
                  </li>
                ))}
              </ul>,
            )
          : null,

        ...(part.accountTerms.length > 0
          ? prose("account", part.accountTerms)
          : []),

        part.limits.length > 0
          ? section(
              "limits",
              <>
                <RowTable
                  scope={at("limits")}
                  rows={part.limits}
                  values={values}
                />
                {part.limitsNotes.map((paragraph, i) => (
                  <Para
                    key={i}
                    scope={at("limitsNotes")}
                    index={i}
                    text={paragraph}
                    values={values}
                  />
                ))}
              </>,
            )
          : null,

        ...(part.completion.length > 0
          ? prose("completion", part.completion)
          : []),

        part.receives.length > 0
          ? section(
              "receives",
              <>
                <Bullets items={part.receives} />
                {part.receivesNotes.map((paragraph, i) => (
                  <Para
                    key={i}
                    scope={at("receivesNotes")}
                    index={i}
                    text={paragraph}
                    values={values}
                  />
                ))}
              </>,
            )
          : null,

        /*
          Exclusions, under the fixed heading from contract-system.md §6. The
          note below it is not decoration: it states that these are excluded
          by default and that anything moved into scope is priced first, which
          is the whole mechanism the library exists to enforce.

          ponytail: this list stays one block, so it cannot break across a page.
          It is set across the full measure like every other list, which is
          roughly half the height it had in a column — comfortable against the
          987px a page leaves. It is whole on purpose: splitting it would mean
          one `<ul>` per bullet, which reads to a screen reader as twenty lists
          of one item instead of one list of twenty. If a Part's exclusions ever
          outgrow a page it takes one of its own and spills visibly rather than
          being cut, and that is the signal to split it.
        */
        part.exclusionIds.length > 0
          ? section(
              "exclusions",
              <>
                <p className="text-black/70 text-[12px] font-normal italic leading-[1.5] mb-[8px]">
                  Excluded by default. Anything moved into scope is priced and
                  written into this Part before work starts.
                </p>
                <Bullets
                  items={part.exclusionIds.map((id) => libraryText(id))}
                />
              </>,
            )
          : null,

        part.clientInputIds.length > 0
          ? section(
              "clientInputs",
              <Bullets
                items={part.clientInputIds.map((id) => libraryText(id))}
              />,
            )
          : null,

        part.thirdPartyCosts
          ? section(
              "costs",
              <Para
                scope={at("costs")}
                index={0}
                text={part.thirdPartyCosts}
                values={values}
              />,
            )
          : null,

        part.fee.length > 0
          ? section(
              "fee",
              <RowTable scope={at("fee")} rows={part.fee} values={values} />,
            )
          : null,
      ].filter(Boolean);
    }),

    signatures(`sch-sign-${letter}`, `Execution — Schedule ${letter}`),
  ]);

  /*
    The Agreement is signed where the Agreement ends — after its last clause,
    before the first Schedule — not at the back of the document behind every
    Schedule's own signatures. What a reader signs there is the Master
    Agreement, and by then they have read all of it.
  */
  return [
    cover,
    parties,
    ...clauses,
    signatures("signatures", "Execution", EXECUTION_STATEMENT),
    ...scheduleBlocks,
  ];
}
