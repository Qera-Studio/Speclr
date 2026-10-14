'use client';

import type { ReactNode } from 'react';
import { Banknote, Building2, MapPin, Tag, UserRound, Users } from 'lucide-react';
import RecordTable, { type RecordColumn } from '@/components/admin/RecordTable';
import { AmountCell } from '@/components/admin/AmountCell';
import { flagOf, RaisedChip } from '@/components/admin/LocationCell';
import { PeopleCell, PersonCell } from '@/components/admin/PersonCell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CopyButton } from '@/components/ui/copy-button';
import { ACCENT_TINTS, accentBadge, accentFor } from '@/lib/accent';
import { countryName } from '@/lib/domain/countries';
import type { DayRates } from '@/lib/domain/currency';
import { formatDisplayDate } from '@/lib/domain/dates';
import { isNaturalPerson } from '@/lib/domain/entityType';
import { industryByKey } from '@/lib/domain/industry';
import { formatPhoneForDisplay } from '@/lib/domain/phone';
import { cn, NIL } from '@/lib/utils';
import type { RichClientRow } from './rows';

/**
 * The rich client table: each cell a stack of two lines, no rules between
 * columns, and no sideways scroll at any width the app supports.
 *
 * **Every column answers one question**, left to right in the order a client
 * list is read: who is it, what do they do, where are they, who do we talk to,
 * what is it worth, and who on our side owns it. Both lines of a cell are about
 * the same subject; a cell never pairs two unrelated facts to save a column.
 *
 * **Two type levels and no third.** Line one is 13px in the foreground colour,
 * line two 12px muted. Only the client's own name is medium weight: it is the
 * row's anchor, and a second bold column would compete with it.
 *
 * **Encodings carry what words would crowd.** The initials tile marks the row,
 * the flag chip says where at a glance, the chip says the trade,
 * the avatar stack says how many. Each carries a screen-reader word, because a
 * shape is not a name.
 *
 * **No sideways scroll**, by percentage widths and `max-w-0` on every cell.
 * Under `table-layout: auto` a cell's content sets its width, so one long
 * legal name would widen the table past its card; `max-w-0` takes the content
 * out of that sum, the percentages divide the card, and the content truncates
 * inside its share. The table shrinks with the window instead of scrolling.
 *
 * Built on `RecordTable`, like every list of records (§2.3), so selection,
 * paging, the card and the row count are the house ones. Its checkboxes and
 * row menu show at rest rather than on hover.
 */
export default function RichClientTable({
  rows,
  rates,
  actions,
}: {
  rows: RichClientRow[];
  /**
   * Today's rates, for the value column's currency toggle. Null or absent and
   * every figure stays in INR, which is the stored answer anyway.
   */
  rates?: DayRates | null;
  /** The row's menu at the right end, as every list of records has. */
  actions?: (row: RichClientRow) => ReactNode;
}) {
  return (
    <RecordTable
      rows={rows}
      id={(row) => row.id}
      noun="client"
      caption="Clients, with who they are, where, who to contact, their value and who owns them"
      rowLabel={(row) => row.name}
      // A row opens its client on the real page. The sample rows in the
      // library carry no `href`, and a row that opens nothing is not a link.
      open={rows.some((row) => row.href) ? (row) => ({ href: row.href }) : undefined}
      controlsVisible
      fixed
      actions={actions}
      columns={columnsFor(rates ?? null)}
    />
  );
}

/**
 * Every cell's box: a 40px column, centred. Fixed so a row with almost nothing
 * in it is as tall as a full one; a table whose rows change height as you
 * scan it reads as a table with something wrong in it.
 */
const CELL_BOX = 'flex h-10 min-w-0 flex-col justify-center';

/** Line one and line two of a cell. */
function Stack({
  primary,
  secondary,
  anchor = false,
  right = false,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  /** The row's own name: the one medium-weight line in the row. */
  anchor?: boolean;
  /** For a money column, so both lines share the right edge. */
  right?: boolean;
}) {
  return (
    <span className={cn(CELL_BOX, right && 'items-end text-right')}>
      <span
        className={cn(
          'block max-w-full truncate text-[0.8125rem]/5 text-foreground',
          anchor && 'font-medium',
        )}
      >
        {primary}
      </span>
      <span className="block max-w-full truncate text-xs/4 text-muted-foreground">
        {secondary ?? NIL}
      </span>
    </span>
  );
}

const nil = <span className="text-muted-foreground">{NIL}</span>;

/**
 * The size of every mark at the start of a cell: the client's initials, the
 * flag and the currency symbol are all 32px, so the three columns that lead
 * with one share a left text edge and a row reads as one height of thing.
 */
const MARK = 'size-8 shrink-0';
const CHIP = cn(MARK, 'h-8 min-w-8 rounded-md');

/** Two letters always: the first of two words, or the first two of one. */
function initialsOf(name: string) {
  const words = name.split(/\s+/).filter((part) => /\p{L}/u.test(part));
  const letters =
    words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : (words[0] ?? '').slice(0, 2);
  return letters.toUpperCase();
}

/**
 * The client's mark: initials on a tint picked from the name, as a rounded
 * tile. One shape for everybody. It used to be round for a person and square
 * for a company, and nobody reading the table could tell that was a signal; a
 * signal nobody reads is decoration that looks like a mistake. Whether a
 * client is a person is said in words instead, on line two where there is no
 * legal name.
 */
function ClientAvatar({ name }: { name: string }) {
  return (
    <Avatar className={cn(MARK, 'rounded-md after:rounded-md')}>
      <AvatarFallback
        className={cn('rounded-md text-[0.6875rem] font-medium', ACCENT_TINTS[accentFor(name)])}
      >
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function ValueCell({ row, rates }: { row: RichClientRow; rates: DayRates | null }) {
  const rate = row.currency === 'INR' ? undefined : rates?.rates[row.currency];
  // "12 Oct 2025" to "Oct 2025": the month the client arrived, through the
  // domain's own formatter rather than a second date format.
  const since = formatDisplayDate(row.addedAt).split(' ').slice(1).join(' ');

  /*
    The chip, then the figure over the start month: the date sits under the
    amount rather than under the chip, because the chip marks both lines. A
    client with no value keeps an empty 32px slot, so its date still starts on
    the same edge as every other row's.
  */
  if (row.valuePaise === undefined) {
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        <span className={MARK} aria-hidden="true" />
        <Stack primary={nil} secondary={`Since ${since}`} />
      </span>
    );
  }
  return (
    <span className={cn(CELL_BOX, 'text-[0.8125rem]/5 tabular-nums')}>
      <AmountCell
        minor={row.valuePaise}
        currency="INR"
        chipClassName={cn(CHIP, 'text-[0.8125rem]')}
        suffix={row.monthly ? '/mo' : undefined}
        below={`Since ${since}`}
        local={
          rate && rates
            ? { currency: row.currency, rate, asOf: rates.asOf, source: rates.source }
            : undefined
        }
      />
    </span>
  );
}

function ContactCell({ row }: { row: RichClientRow }) {
  const person = isNaturalPerson(row.entityType);
  // A person is their own contact, so the name is theirs rather than a gap.
  const contact = row.contactName ?? (person ? row.name : undefined);

  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 flex-1">
        <Stack primary={contact ?? nil} secondary={row.email} />
      </span>
      {/* The phone is acted on (copied, dialled) rather than scanned, so it
          waits for this cell under the pointer, or focus inside it: the
          contact is what it belongs to, not the whole row. The number itself
          is in the button's name and tooltip. */}
      {row.phone ? (
        <CopyButton
          value={row.phone}
          label={`Copy phone ${formatPhoneForDisplay(row.phone)}`}
          className="relative z-10 shrink-0 opacity-0 transition-opacity group-hover/cell:opacity-100 group-focus-within/cell:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        />
      ) : null}
    </span>
  );
}

/**
 * The six columns. Widths are shares of the card, and `max-w-0` is what makes
 * the shares hold (see the note on the component). Contact has none: under
 * `fixed` it takes what the shares, the 40px checkbox and the 44px menu
 * leave, so those two hold their widths, and shares that claim the whole card
 * leave the browser nothing to give it but what it can squeeze, which was
 * 29px with the box jammed against the divider. A function of the rates
 * because the value column's toggle reads them.
 */
function columnsFor(rates: DayRates | null): RecordColumn<RichClientRow>[] {
  return [
    {
      key: 'client',
      label: 'Client',
      icon: Building2,
      width: 'w-[20%]',
      className: 'max-w-0',
      sortable: false,
      cell: (row) => {
        const person = isNaturalPerson(row.entityType);
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <ClientAvatar name={row.name} />
            <Stack
              anchor
              primary={row.name}
              // A person trading under their own name has no legal name to
              // show, so the line says what they are instead of nothing.
              secondary={row.legalName ?? (person ? 'Individual' : undefined)}
            />
          </span>
        );
      },
    },
    {
      key: 'industry',
      label: 'Industry',
      icon: Tag,
      width: 'w-[14%]',
      className: 'max-w-0',
      sortable: false,
      cell: (row) => {
        const industry = industryByKey(row.industry);
        return industry ? (
          <span className={accentBadge(industry.accent, 'max-w-full truncate')}>
            {industry.label}
          </span>
        ) : (
          nil
        );
      },
    },
    {
      key: 'location',
      label: 'Location',
      icon: MapPin,
      width: 'w-[15%]',
      className: 'max-w-0',
      sortable: false,
      /*
        The flag as a 32px chip on the left, the same size as the client's
        initials and the currency chip, and the place beside it: city over
        country. The chip carries the country's name for
        a screen reader; the line beside it says it again for everyone else.
      */
      cell: (row) => {
        const code = (row.country || 'IN').toUpperCase();
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <RaisedChip label={countryName(code)} className={cn(CHIP, 'text-lg')}>
              {flagOf(code) ?? '🏳'}
            </RaisedChip>
            <span className="min-w-0 flex-1">
              <Stack primary={row.city ?? nil} secondary={countryName(code)} />
            </span>
          </span>
        );
      },
    },
    {
      key: 'contact',
      label: 'Contact',
      icon: UserRound,
      // No share: under the fixed layout this is the column that takes what
      // the others and the checkbox and menu columns leave.
      className: 'max-w-0',
      sortable: false,
      cell: (row) => <ContactCell row={row} />,
    },
    {
      key: 'value',
      label: 'Value',
      icon: Banknote,
      width: 'w-[15%]',
      className: 'max-w-0',
      sortable: false,
      cell: (row) => <ValueCell row={row} rates={rates} />,
    },
    {
      key: 'owner',
      label: 'Owner',
      icon: Users,
      width: 'w-[14%]',
      className: 'max-w-0',
      sortable: false,
      cell: (row) => (
        <span className={cn(CELL_BOX, 'gap-0.5 text-[0.8125rem]/5')}>
          <PersonCell name={row.lead} />
          <span className="flex h-4 items-center text-xs/4">
            <PeopleCell names={row.team} size="xs" />
          </span>
        </span>
      ),
    },
  ];
}
