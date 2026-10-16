'use client';

import {
  Archive,
  Banknote,
  Building2,
  CalendarClock,
  CalendarDays,
  CircleDashed,
  Clock,
  Contact,
  History,
  IdCard,
  Mail,
  Package,
  Paperclip,
  ReceiptText,
  Repeat,
  ScrollText,
  Shapes,
  MapPin,
  Phone,
  Tag,
  UserRound,
  Users,
} from 'lucide-react';
import { completedSteps, onboardingStepsFor, resumeStep } from './onboarding/steps';
import RecordTable, { type RecordColumn, type RecordTableProps } from '@/components/patterns/RecordTable';
import { arrangeColumns } from '@/components/patterns/ColumnsMenu';
import { DateValue } from '@/components/patterns/Page';
import { AmountCell } from '@/components/patterns/AmountCell';
import { CopyValue } from '@/components/patterns/CopyCell';
import { LocationCell } from '@/components/patterns/LocationCell';
import { PeopleCell, PersonCell } from '@/components/patterns/PersonCell';
import { ClientRowMenu } from './ClientRowMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { accentBadge } from '@/lib/accent';
import { currencyForCountry, type DayRates } from '@/lib/domain/currency';
import { allEngagedLines, engagedTotalPaise } from '@/lib/domain/engagedLines';
import { industryByKey } from '@/lib/domain/industry';
import { formatPhoneForDisplay } from '@/lib/domain/phone';
import type { ContractService } from '@/lib/domain/service';
import type { ClientRecord } from '@/lib/domain/types';
import type { StudioMember } from '@/lib/profile';
import { NIL } from '@/lib/utils';
import { clientContact, ENGAGEMENT_TYPE_INFO } from '@/lib/domain/client';
import { entityTypeLabel } from '@/lib/domain/entityType';
import type { ClientSortColumn, ClientSortState } from './clientQuery';

/** `circle-dot-dashed` from Lucide, minus its centre dot. */
const DASHED_RING = [
  'M10.1 2.18a9.93 9.93 0 0 1 3.8 0',
  'M17.6 3.71a9.95 9.95 0 0 1 2.69 2.7',
  'M21.82 10.1a9.93 9.93 0 0 1 0 3.8',
  'M20.29 17.6a9.95 9.95 0 0 1-2.7 2.69',
  'M13.9 21.82a9.94 9.94 0 0 1-3.8 0',
  'M6.4 20.29a9.95 9.95 0 0 1-2.69-2.7',
  'M2.18 13.9a9.93 9.93 0 0 1 0-3.8',
  'M3.71 6.4a9.95 9.95 0 0 1 2.7-2.69',
];

/**
 * How far through onboarding a client is, as a ring.
 *
 * A ring rather than "3 of 7" because this column is scanned, not read: the
 * question at a glance is "which of these are unfinished", and an arc answers
 * it without the eye stopping to parse two numbers per row. The figures are
 * still there, in the tooltip and in the accessible name, for the moment the
 * question becomes "how much is left".
 *
 * Nothing started draws as a dashed track and no arc at all. A zero-length arc
 * is indistinguishable from a rendering failure, and a dashed ring reads as
 * "not begun" rather than "begun and empty".
 *
 * The denominator moves (a client who is one person has six steps, not seven,
 * because they *are* the contact, `CONTEXT.md` §5d-i), which is why the
 * tooltip prints the total rather than just the count done.
 */
export function OnboardingRing({ done, total }: { done: number; total: number }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const swept = total > 0 ? (done / total) * circumference : 0;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="inline-flex" role="img" aria-label={`Onboarding: ${done} of ${total}`}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {done === 0 ? (
                // Lucide's `circle-dot-dashed`, without the centre dot: the dot
                // is that icon's "something is here", and nothing is.
                DASHED_RING.map((d) => (
                  <path key={d} d={d} className="stroke-muted-foreground/50" />
                ))
              ) : (
                <>
                  <circle cx="12" cy="12" r={radius} className="stroke-border" />
                  <circle
                    cx="12"
                    cy="12"
                    r={radius}
                    className="stroke-primary"
                    strokeDasharray={`${swept} ${circumference}`}
                    transform="rotate(-90 12 12)"
                  />
                </>
              )}
            </svg>
          </span>
        }
      />
      <TooltipContent>
        Onboarding: {done} of {total}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Every column's key, heading and icon, in order. One list, because the
 * Properties menu offers exactly these and a heading spelled twice is a
 * heading that drifts. Name is the one that cannot be hidden: it is what says
 * which row you are on.
 */
const COLUMN = {
  name: { key: 'name', label: 'Name', icon: Building2 },
  email: { key: 'email', label: 'Email', icon: Mail },
  phone: { key: 'phone', label: 'Phone', icon: Phone },
  country: { key: 'country', label: 'Location', icon: MapPin },
  amount: { key: 'amount', label: 'Amount', icon: Banknote },
  industry: { key: 'industry', label: 'Industry', icon: Tag },
  lead: { key: 'lead', label: 'Lead', icon: UserRound },
  team: { key: 'team', label: 'Team', icon: Users },
  added: { key: 'added', label: 'Added', icon: CalendarDays },
  onboarding: { key: 'onboarding', label: 'Status', icon: CircleDashed },
  // Off until somebody ticks them: the ten above are what the list is for,
  // these are what it can also answer.
  legalName: { key: 'legalName', label: 'Legal name', icon: ScrollText, defaultHidden: true },
  entityType: { key: 'entityType', label: 'Entity type', icon: Shapes, defaultHidden: true },
  contact: { key: 'contact', label: 'Contact person', icon: Contact, defaultHidden: true },
  gstin: { key: 'gstin', label: 'GSTIN', icon: ReceiptText, defaultHidden: true },
  pan: { key: 'pan', label: 'PAN', icon: IdCard, defaultHidden: true },
  engagement: { key: 'engagement', label: 'Engagement', icon: Repeat, defaultHidden: true },
  terms: { key: 'terms', label: 'Payment terms', icon: Clock, defaultHidden: true },
  services: { key: 'services', label: 'Services', icon: Package, defaultHidden: true },
  startDate: { key: 'startDate', label: 'Start date', icon: CalendarClock, defaultHidden: true },
  updated: { key: 'updated', label: 'Last edited', icon: History, defaultHidden: true },
  files: { key: 'files', label: 'Files', icon: Paperclip, defaultHidden: true },
} as const;

export type ClientColumnKey = keyof typeof COLUMN;

export const CLIENT_COLUMNS = Object.values(COLUMN).map(
  ({ key, label, icon, ...rest }) => ({
    key,
    label,
    icon,
    locked: key === 'name',
    defaultHidden: 'defaultHidden' in rest,
  }),
);

/** The columns a reader who has never opened Properties sees. */
export const DEFAULT_CLIENT_COLUMNS = CLIENT_COLUMNS.filter((c) => !c.defaultHidden).map(
  (c) => c.key,
);

/** `COLUMN[key]` without the flag, which is the menu's business, not the table's. */
const col = (key: keyof typeof COLUMN) => ({
  key: COLUMN[key].key,
  label: COLUMN[key].label,
  icon: COLUMN[key].icon,
});

/**
 * The clients list.
 *
 * Wide enough to scroll, and built for it. The name is frozen at the left and
 * the actions at the right, so a row can be identified and acted on at any
 * scroll position. Hairline column dividers at half the row rule's weight,
 * because a row that is no longer one glance needs them, and two rules of
 * equal weight turn a table into a grid the eye cannot follow across.
 * Fixed column widths (`fixed`, no drag handles), which put the table on
 * `table-layout: fixed` and so make every cell clip rather than widen. Which
 * columns show is the reader's, through the Properties menu (`hidden`). And one three-dot menu in place of
 * three icon buttons (`ClientRowMenu`). What the frozen columns cost is the
 * sticky header: a horizontally scrolling container is the scrollport for
 * both axes, so the column names no longer follow the page down.
 * `RecordTable`'s `resizable` note records that trade, and it holds for
 * `fixed` the same way.
 *
 * **Four columns read the record, and one of them reads it through the
 * catalogue.** Industry is `client.industry`, drawn with `accentBadge`. Lead
 * and team are employee ids on the record (§5d-i: ids, never names), resolved
 * against the studio's people, who arrive already narrowed to `StudioMember`
 * across the profile seam; somebody who has left still resolves, because the
 * client they worked on is history rather than a list to tidy. Amount is what
 * the engagement adds up to: every engaged service and item at its agreed
 * rate, or the catalogue's list price where none was agreed, through the same
 * cascade the invoice seeds from (`engagedLines.ts`), so this figure and the
 * next invoice cannot disagree. The rates are typed in rupees, so the figure
 * is INR; a foreign client's row shows it in their own currency at that day's
 * market rate, and the chip toggles back to INR (`AmountCell`). An Indian
 * client has no toggle, and a day the rate could not be fetched has none
 * either: the INR figure is the stored answer and is always on the page. The
 * rate is a reading convenience from `server/rates.ts` and reaches no
 * document. A line quoted per engagement is left out rather than counted as
 * zero, and a record with nothing priced prints no figure rather than ₹0. It
 * is the agreed price on the record, not what has been billed.
 *
 * Nothing here is sortable yet: `sortClients` orders by what it knows, and
 * these are not on its list.
 */
export default function ClientsTable({
  clients,
  people = [],
  catalogue = [],
  rates,
  onDelete,
  onArchive,
  archived = false,
  sort,
  onSortChange,
  paging,
  onBulkDelete,
  hidden = [],
  order = [],
}: {
  clients: ClientRecord[];
  /** Everyone at the studio, past and present, for the lead and team columns. */
  people?: StudioMember[];
  /** The services, for an engaged item's list price where no rate was agreed. */
  catalogue?: ContractService[];
  /** Today's rates out of INR, or null when they could not be fetched. */
  rates?: DayRates | null;
  onDelete: (client: ClientRecord) => void;
  onArchive: (client: ClientRecord, archived: boolean) => void;
  /** Showing the offboarded list, which changes the empty copy and the action. */
  archived?: boolean;
  /**
   * Sorting and paging are the manager's, because the manager is what filters
   * the list, and `sortClients` knows things the rendered text does not (a
   * blank country reads as India). The ten-row rule is unchanged; what moves
   * is who slices.
   */
  sort?: ClientSortState | null;
  onSortChange?: (column: ClientSortColumn) => void;
  paging?: RecordTableProps<ClientRecord>['paging'];
  /** Bulk delete, opt-in. Offering it is what shows the checkbox column. */
  onBulkDelete?: (clients: ClientRecord[]) => Promise<void>;
  /** Columns the reader has switched off. Name is never among them. */
  hidden?: readonly string[];
  /** The reader's column order from the Properties panel, reconciled there. */
  order?: readonly string[];
}) {
  const drawn = arrangeColumns(CLIENT_COLUMNS, order).map((column) => column.key);
  const nameOf = new Map(people.map((person) => [person.id, person.name]));
  // A team id nobody answers to any more is dropped, not printed blank: the
  // array carries no foreign key (`schema.ts`), so this is where it is filtered.
  const teamOf = (client: ClientRecord) =>
    (client.teamEmployeeIds ?? []).flatMap((id) => nameOf.get(id) ?? []);
  const nil = <span className="text-muted-foreground">{NIL}</span>;

  return (
    <RecordTable
      rows={clients}
      id={(client) => client.id}
      noun="client"
      /* Not "newest first": the list can be sorted and filtered by the page
         around it, and a caption naming an order the table no longer has is
         worse than one naming none. */
      caption="Saved clients"
      /* The whole row opens the client, via one stretched anchor rather than a
         row `onClick`, so middle-click, cmd-click and "copy link" all work. A
         list where one row is clickable and the next is not is a list nobody
         trusts to be clickable. */
      open={(client) => ({
        href: `/client/clients/${client.id}?step=${resumeStep(client)}`,
      })}
      sort={sort}
      onSortChange={onSortChange as ((column: string) => void) | undefined}
      // The manager sorts, whether or not the controls are on screen: the
      // `SortToggle` eye hides the arrows and keeps the order.
      externalSort
      paging={paging}
      dividers
      fixed
      fitTruncated
      actionsSticky
      columns={(
        [
        {
          ...col('name'),
          // Frozen, and the reason it is this column rather than any other: it
          // is the only one that says *which row you are on*, which is what a
          // reader needs at every scroll position in order to act on anything.
          sticky: true,
          size: 160,
          cell: (client) => client.name,
        },
        {
          /*
            `CopyValue`, not `CopyCell`, and the difference is the whole reason
            that split exists: `CopyCell` brings its own `<TableCell>`, and a
            width, a `left` and a divider all belong on that cell, which a
            resizable column cannot hand over. See the `ownCell` note in
            `RecordTable`. The control without the cell keeps both.

            No `trunc`, because `CopyValue` truncates its own value: `TruncCell`
            would put a second cap around one that already exists, and its
            `title` paints a native tooltip *above every layer on the page*,
            including the frozen columns, which is what made a hovered email
            appear to sit on top of the Name column.
          */
          ...col('email'),
          size: 210,
          sortValue: (client) => client.email,
          // `text-primary`, the app's own blue, rather than a new token: it is
          // already measured against every ground in `contrast.test.ts`, and a
          // second blue would be a second thing to keep passing.
          //
          // Worth knowing what it costs, since blue text in a table reads as a
          // link and this is not one: clicking it copies the address, it does
          // not open a mail client. The copy icon on hover is what says so. If
          // that turns out to mislead, the honest fix is a real `mailto:`
          // rather than a quieter blue.
          className: 'text-primary',
          cell: (client) => (
            <CopyValue value={client.email} label={`Copy email for ${client.name}`} />
          ),
        },
        {
          ...col('phone'),
          size: 150,
          sortValue: (client) => client.phone,
          // Never the stored E.164 form, which is the house rule and is policed
          // by `design-system.test.ts`. The copied value is still E.164, since
          // that is what a dialler wants.
          cell: (client) => (
            <CopyValue
              value={client.phone}
              label={`Copy phone number for ${client.name}`}
              display={formatPhoneForDisplay(client.phone)}
            />
          ),
          className: 'tabular-nums',
        },
        {
          /*
            Location, not country: the city is the half somebody is actually
            scanning for. Where a client is decides which registrations, legal
            forms and documents the record even asks for (`CONTEXT.md` §5d-ii),
            so it is the fact worth scanning, and blank reads as India, as
            everywhere else. Sorting still follows the *country*, because that
            is what `sortClients` orders by and a heading whose arrow means
            something other than what it appears to sort is worse than one
            that does not sort at all.
          */
          ...col('country'),
          size: 264,
          // 264px stated, and never narrower than that however short the
          // places on the page happen to be. `fit` alone was not this: it
          // derives the floor from the rows on the screen, so a page of
          // 'Pune, India' left the column narrow and the minimum was invisible
          // until a long value turned up.
          minSize: 264,
          // And still never cuts a value, which is the other half and the
          // reason both are set: a place name is the thing being scanned here
          // and a cut one is not a place ('Bridge of Earn, United Kingd' names
          // nowhere), so a city longer than 264px raises the column past it
          // rather than ellipsising. The floor is whichever of the two is
          // larger. See `fit` and `minSize` in `RecordTable`.
          fit: true,
          cell: (client) => (
            <LocationCell
              city={client.addressParts?.city}
              country={client.addressParts?.country}
            />
          ),
        },
        {
          ...col('amount'),
          size: 150,
          sortable: false,
          className: 'tabular-nums',
          cell: (client) => {
            const total = engagedTotalPaise(
              allEngagedLines(client.commercial?.services, catalogue),
            );
            if (total === undefined) return nil;
            // The country's currency, from the same `addressParts.country` the
            // flag reads. INR is the figure's own currency, so an Indian client
            // gets no second one to toggle to.
            const currency = currencyForCountry(client.addressParts?.country);
            const rate = currency === 'INR' ? undefined : rates?.rates[currency];
            return (
              <AmountCell
                minor={total}
                currency="INR"
                local={
                  rate && rates
                    ? { currency, rate, asOf: rates.asOf, source: rates.source }
                    : undefined
                }
              />
            );
          },
        },
        {
          ...col('industry'),
          size: 220,
          sortable: false,
          cell: (client) => {
            const industry = industryByKey(client.industry);
            return industry ? (
              // No border, a lighter wash and the hue's quieter ink: the
              // industry is context for the row, not something to read first.
              <span
                className={accentBadge(
                  industry.accent,
                  'h-[1.375rem] border-0 px-2 ',
                  true,
                )}
              >
                {industry.label}
              </span>
            ) : (
              nil
            );
          },
        },
        {
          /* Who brought this client in. One person, so a disc and a name. */
          ...col('lead'),
          size: 150,
          sortable: false,
          cell: (client) => (
            <PersonCell name={client.leadEmployeeId ? nameOf.get(client.leadEmployeeId) : undefined} />
          ),
        },
        {
          /* Who works with this client. Several people, so the discs stack and
             the names go to the tooltip: the question here is "how many, and
             the usual crowd?" rather than "who exactly". */
          ...col('team'),
          size: 120,
          sortable: false,
          cell: (client) => <PeopleCell names={teamOf(client)} />,
        },
        {
          /*
            `DateValue`, not `DateCell`, for the same reason Email uses
            `CopyValue`: a cell this column did not render is a cell it cannot
            put a width on, and under `table-layout: fixed` a column with no
            width takes whatever is left and paints its text over the column
            beside it. That is what made a hovered row's date appear on top of
            the Team column.
          */
          ...col('added'),
          size: 130,
          sortValue: (client) => client.createdAt,
          cell: (client) => <DateValue value={client.createdAt} />,
          className: 'tabular-nums',
        },
        {
          /*
            Named rather than `headingHidden`: the ring sits between Added and
            a frozen actions column, and an unnamed column with rules on both
            sides reads as a column whose heading failed to render.

            "Status", not "Onboarding": at this width the longer word would
            ellipsise into "Onboardi…", and the ring already means one thing.
          */
          ...col('onboarding'),
          size: 90,
          sortable: false,
          cell: (client) => (
            <OnboardingRing
              done={completedSteps(client)}
              // Out of *this* client's steps: an individual has one fewer.
              total={onboardingStepsFor(client).length}
            />
          ),
        },
        {
          ...col('legalName'),
          // Not one `sortClients` knows, so no arrow that would sort nothing.
          sortable: false,
          size: 180,
          cell: (client) => client.companyName || nil,
        },
        {
          ...col('entityType'),
          sortable: false,
          size: 170,
          cell: (client) => entityTypeLabel(client.entityType) ?? nil,
        },
        {
          ...col('contact'),
          sortable: false,
          size: 170,
          // Through `clientContact`, so a person is their own contact.
          cell: (client) => clientContact(client, 'primary')?.name || nil,
        },
        {
          ...col('gstin'),
          sortable: false,
          size: 160,
          // The top-level field: `tax.gstin` is never read outside onboarding.
          cell: (client) => client.gstin || nil,
          className: 'tabular-nums',
        },
        {
          ...col('pan'),
          sortable: false,
          size: 120,
          cell: (client) => client.tax?.pan || nil,
          className: 'tabular-nums',
        },
        {
          ...col('engagement'),
          sortable: false,
          size: 140,
          cell: (client) => {
            const type = client.commercial?.engagementType;
            return type ? ENGAGEMENT_TYPE_INFO[type].title : nil;
          },
        },
        {
          ...col('terms'),
          sortable: false,
          size: 150,
          cell: (client) => {
            const days = client.commercial?.paymentTermsDays;
            return days === undefined ? nil : days === 0 ? 'On receipt' : `Net ${days}`;
          },
          className: 'tabular-nums',
        },
        {
          ...col('services'),
          sortable: false,
          size: 150,
          // The codes, which is how the catalogue and the documents list name them.
          cell: (client) =>
            client.commercial?.services?.map((service) => service.code).join(', ') || nil,
        },
        {
          ...col('startDate'),
          sortable: false,
          size: 130,
          cell: (client) =>
            client.commercial?.startDate ? <DateValue value={client.commercial.startDate} /> : nil,
          className: 'tabular-nums',
        },
        {
          ...col('updated'),
          sortable: false,
          size: 130,
          cell: (client) => (client.updatedAt ? <DateValue value={client.updatedAt} /> : nil),
          className: 'tabular-nums',
        },
        {
          ...col('files'),
          sortable: false,
          size: 90,
          cell: (client) => client.attachments?.length || nil,
          className: 'tabular-nums',
        },
        ] satisfies RecordColumn<ClientRecord>[]
      )
        .filter((column) => column.key === 'name' || !hidden.includes(column.key))
        .sort((a, b) => drawn.indexOf(a.key) - drawn.indexOf(b.key))}
      onBulkDelete={onBulkDelete}
      bulkConsequence="This permanently removes these clients and any files uploaded for them. A client that has been on a document can't be deleted. This cannot be undone."
      actions={(client) => (
        <ClientRowMenu
          client={client}
          archived={archived}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      )}
      empty={{
        icon: archived ? <Archive /> : <Users />,
        title: archived ? 'Nothing archived' : 'No clients yet',
        description: archived
          ? 'Archive a client when the engagement is over and they leave this list.'
          : 'Add your first client to start issuing documents.',
      }}
    />
  );
}
