/**
 * Copying a Service onto a contract, and seeding a contract from a client.
 *
 * **The copy is the rule this file exists to hold.** A contract takes its own
 * copy of a Service the moment it is picked, with the text of every library
 * line it names, and from then on the contract owns its words: editing the
 * catalogue afterwards cannot change an open draft, and because blank keys are
 * derived from the text, cannot move its fields either (`CONTEXT.md` §5c).
 *
 * Lifted out of `ContractEditor.commitPart` when a second caller appeared. The
 * seed is that caller: picking a client fills the contract from what onboarding
 * already recorded, instead of asking the operator to pick the same services a
 * second time (`PRINCIPLES.md` rule 3, the invoice's precedent at §5i).
 */

import { sanitiseBlank, type BlankValues } from './blanks';
import { feeBlankOf } from './listing';
import type { ContractService, LibraryLine } from '../service';
import type { ClientRecord, ContractData } from '../types';

/**
 * A Service copied onto a contract, plus the library text it drags along.
 *
 * A Part carries ids; the words live in the shared libraries, which are meant
 * to grow and be reworded. Without the map an issued contract would resolve its
 * "not included" list against a table that has moved on, which is the same
 * compliance bug as reading live studio details (`CONTEXT.md` §5).
 *
 * **`agreed` narrows the items to what this client bought.** A Service is a
 * container: `WEB` carries 52 items and `SOC` 32, and copying all of them onto
 * a contract would print a Deliverables list promising work nobody agreed to
 * and nobody is being paid for. That is a scope commitment, not a cosmetic
 * excess, which is why the narrowing happens here at copy time rather than in
 * the sheet: the contract owns its words from the moment it takes them, and a
 * list filtered only at render would still be *stored* as the whole catalogue.
 *
 * Passing no `agreed` copies the Service whole, which is what the services
 * phase does when somebody adds a Part by hand: they are choosing the Service,
 * and the scope phase is where its items get narrowed.
 */
export function copyPart(
  service: ContractService,
  exclusions: LibraryLine[],
  clientInputs: LibraryLine[],
  agreed?: { id: string }[],
  frames: ContractService[] = [],
): { part: ContractService; library: Record<string, string> } {
  const part = { ...service, ...frameOf(service, frames) };

  // `undefined` and `[]` are different answers, so this tests for the array
  // rather than its length: a client engaged on the Service as one line agreed
  // to no particular items, and a contract for them names the Service and
  // leaves the deliverables to the Part's own prose.
  if (agreed) {
    const wanted = new Set(agreed.map((item) => item.id));
    part.items = (service.items ?? []).filter(
      (item) => wanted.has(item.id) && !item.archived,
    );
  }

  const library: Record<string, string> = {};
  for (const line of [...exclusions, ...clientInputs]) {
    if (part.exclusionIds.includes(line.id) || part.clientInputIds.includes(line.id)) {
      library[line.id] = line.text;
    }
  }
  return { part, library };
}

/**
 * The legal sections a sold Service takes from the Parts it names.
 *
 * **This is the seam `docs/service-catalogue.md` §2 describes, finally read.**
 * A Service is what is *sold* and carries priced items; a Part is the legal
 * frame, with the fee blanks, scope, limits, completion criteria and handover.
 * A Service names its frames through `partCodes` and deliberately does not
 * restate them, because a Shopify build and a Webflow build need identical
 * terms and only the scope differs.
 *
 * Nothing read `partCodes`. It was on the type, in the Zod schema and asserted
 * by two seed tests, while `copyPart` put the *Service* on the contract as
 * though it were the Part — and all sixteen sales Services carry every one of
 * these sections empty. So a contract for `SOC` had no fee rows, no scope, no
 * completion criteria and no handover: `contractScopes` found nothing to fill,
 * three phases were vacuously complete, the sheet printed two bare headings,
 * and `contractComplete` returned zero unfilled, which is what let a contract
 * with no terms in it reach finalize.
 *
 * **The sold Service wins on identity, the frame wins on law.** `code`, `name`,
 * `items` and `sacCode` stay the Service's: it is what the client bought and
 * what the Deliverables list prints. Everything below is the frame's and is
 * replaced wholesale rather than merged field by field, because half a Part's
 * prose married to half another's is not a frame anybody reviewed.
 *
 * **Several frames concatenate** (`SOC` names 15, 16 and 17: content
 * production, community, paid social). Each section is joined in `partCodes`
 * order, which is the order the catalogue states them in. The fee rows
 * concatenate too, so a Service spanning three frames asks for each one's fee
 * rather than collapsing three negotiations into one blank.
 *
 * **A Service naming no frame is returned untouched**, which is what the 22
 * legacy Parts are: they carry their own sections and name nobody. That is also
 * what makes this safe to apply unconditionally — an existing contract's stored
 * Parts are never re-copied, and a legacy row passes through unchanged.
 */
function frameOf(
  service: ContractService,
  frames: ContractService[],
): Partial<ContractService> {
  const codes = service.partCodes ?? [];
  if (codes.length === 0) return {};

  const byCode = new Map(frames.map((f) => [f.code, f]));
  // An unknown code is skipped rather than throwing, the same rule
  // `seedFromClient` follows: a Part archived or renamed since the catalogue
  // was written should not make the Service unusable.
  const named = codes.map((code) => byCode.get(code)).filter((f) => f !== undefined);
  if (named.length === 0) return {};

  const all = <T,>(pick: (f: ContractService) => T[] | undefined): T[] =>
    named.flatMap((f) => pick(f) ?? []);

  return {
    overview: all((f) => f.overview),
    included: all((f) => f.included),
    accountTerms: all((f) => f.accountTerms),
    limits: all((f) => f.limits),
    limitsNotes: all((f) => f.limitsNotes),
    completion: all((f) => f.completion),
    receives: all((f) => f.receives),
    receivesNotes: all((f) => f.receivesNotes),
    fee: all((f) => f.fee),
    // Ids into the two shared libraries, de-duplicated: three frames commonly
    // name the same exclusion, and the contract should carry it once.
    exclusionIds: [...new Set(all((f) => f.exclusionIds))],
    clientInputIds: [...new Set(all((f) => f.clientInputIds))],
    // A single string rather than a list, so it joins rather than concatenates.
    // Middot-separated, which is the format the field already documents.
    thirdPartyCosts: named
      .map((f) => f.thirdPartyCosts)
      .filter((cost) => cost && cost.trim().length > 0)
      .join(' · '),
  };
}

/**
 * Add or replace a Part on a contract, keeping its blanks and library.
 *
 * Replacing rather than appending when the code is already there is what makes
 * editing a Part the same operation as adding one.
 */
export function withPart(
  contract: ContractData,
  part: ContractService,
  library: Record<string, string>,
  blanks: BlankValues = {},
): ContractData {
  return {
    ...contract,
    parts: contract.parts.some((p) => p.code === part.code)
      ? contract.parts.map((p) => (p.code === part.code ? part : p))
      : [...contract.parts, part],
    blanks: { ...contract.blanks, ...blanks },
    library: { ...contract.library, ...library },
  };
}

/**
 * The Parts a client's record implies, copied and ready to configure.
 *
 * **Every engaged service, not only the retainers.** That is the one place this
 * deliberately differs from the invoice, which seeds retainers alone
 * (`CONTEXT.md` §5i): an invoice bills what recurs every month, and a contract
 * scopes the whole engagement including the one-off build. A service the client
 * is engaged for and the contract does not mention is the gap this seed exists
 * to close.
 *
 * An unknown code is skipped rather than failing, the same rule
 * `DocumentEditor` follows: a service archived since onboarding should not make
 * the client unusable.
 *
 * **The source is a client today and will be a lead tomorrow.** Nothing here
 * reads anything but `commercial`, so the day leads arrive this takes a lead
 * instead and nothing else in the flow changes.
 */
export function seedFromClient(
  client: ClientRecord,
  services: ContractService[],
  exclusions: LibraryLine[],
  clientInputs: LibraryLine[],
  frames: ContractService[] = [],
): Pick<ContractData, 'parts' | 'library' | 'blanks'> & {
  termMonths?: number;
  effectiveDate?: string;
} {
  const byCode = new Map(services.map((s) => [s.code, s]));
  const parts: ContractService[] = [];
  const library: Record<string, string> = {};
  const blanks: BlankValues = {};

  for (const engaged of client.commercial?.services ?? []) {
    const service = byCode.get(engaged.code);
    if (!service) continue;
    // What onboarding recorded this client buying, so the contract's
    // Deliverables list is their engagement rather than the whole catalogue.
    const copied = copyPart(service, exclusions, clientInputs, engaged.items, frames);
    parts.push(copied.part);
    Object.assign(library, copied.library);
    Object.assign(blanks, feeBlanks(copied.part, engaged.ratePaise));
  }

  return {
    parts,
    library,
    blanks,
    termMonths: client.commercial?.termMonths,
    effectiveDate: client.commercial?.startDate || undefined,
  };
}

/**
 * The agreed rate, written into the Part's first fee blank.
 *
 * **Derived rather than retyped, which is the whole point.** Onboarding already
 * recorded what this client pays for this service (`commercial.services[]`),
 * the invoice and the quotation have read it since `CONTEXT.md` §5i through
 * `engagedLines`, and the contract was the last document still asking for the
 * same figure a second time (`PRINCIPLES.md` rule 3). A client engaged at
 * ₹45,000 whose contract's Fee blank is empty is one fact stored twice, with
 * the copy that prints being the blank one.
 *
 * **The first fee row only, and never a row already filled.** A Part's `fee`
 * rows are a fee, a payment split, a timeline and a support window; only the
 * first is the money the record knows. The rest stay blanks for the phase that
 * owns them, which is why this seeds rather than completing the section: Terms
 * still has something to ask, and `partsFilled` still refuses until it is
 * answered.
 *
 * **Absent, not zero, when there is no agreed rate.** A blank rate on the
 * record means the catalogue's list price or "quoted per engagement"
 * (`engagedLines`), and zero is a real rate meaning the work is given away.
 * Writing 0 into a contract's Fee would be asserting a gift.
 */
function feeBlanks(part: ContractService, ratePaise?: number): BlankValues {
  if (ratePaise === undefined || !Number.isInteger(ratePaise) || ratePaise < 0) return {};

  // The blank `feeBlankOf` names is the one the documents list reads the fee
  // back out of (`listing.ts`), so seeding and reading cannot disagree about
  // which row is the money.
  const target = feeBlankOf(part);
  if (!target) return {};

  // `sanitiseBlank`, not `formatINR`: this has to be byte-identical to what the
  // operator typing the same figure would store, or the seeded contract and the
  // hand-filled one print differently. The input keeps no paise and groups on
  // the Indian system, which `formatINR`'s '₹ 45,000.00' does not match.
  return { [target.key]: sanitiseBlank('money', String(Math.round(ratePaise / 100))) };
}

/**
 * Whether a contract is untouched enough to be seeded over.
 *
 * The `DocumentEditor.tsx` guard, copied rather than the live data flow: a
 * contract that already has Parts or typed blanks is somebody's work, and
 * changing the client on it must not throw that away.
 */
export function seedable(contract: ContractData): boolean {
  return contract.parts.length === 0 && Object.keys(contract.blanks).length === 0;
}
