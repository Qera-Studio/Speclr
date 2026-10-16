import { notFound } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { PageBody, PageHeader } from '@/components/admin/Page';
import { Button } from '@/components/ui/button';
import { EditorPanelContent } from '@/components/admin/EditorPanel';
import { PageHeaderSlot } from '@/components/admin/PageHeaderSlot';
import DocumentPager from '@/components/docs/DocumentPager';
import DocumentsTable from '@/components/admin/DocumentsTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { contractDoc } from '@/lib/domain/contract/__tests__/fixture';
import type { ContractService } from '@/lib/domain/service';
import type { AdminDocument } from '@/lib/domain/types';

/**
 * `/preview/shell`: the whole admin chrome — `TopPanel`, the nav rail, the
 * inset and the editor rail — on a page with no session and no database, so a
 * browser can measure it.
 *
 * The rest of the app's chrome sits behind Clerk, so a Playwright run against
 * `/client` lands on the sign-in form and sees nothing. Every shell bug found
 * so far has been geometry a green Jest run could not see: a border drawn 8px
 * outside the edge it looked like it belonged to, a row whose height came from
 * a class three files away, a button aligned to the top of a box rather than
 * the centre of a line. jsdom resolves no Tailwind and reports every box as
 * zero, so none of them are findable there.
 *
 * The table and page header are here because the shell alone is empty space:
 * the boundaries that matter are the ones between the inset's content and the
 * rails beside it. They are built from `PageBody`, `PageHeader` and
 * `TableCard` rather than hand-rolled markup, so what is measured here is the
 * geometry a real page has — a fixture that lays out its own padding is
 * measuring the fixture. `design-system.test.ts` enforces that, and caught it.
 *
 * **It does not exist in production**, exactly as the other preview routes do
 * not: `notFound()` fires before anything renders.
 */
export const metadata = {
  title: 'Shell preview',
  robots: { index: false, follow: false },
};

/**
 * Fixed rows for the real table, in the shape it reads. A finalized row and a
 * draft row, because the two link to different places and both are measured.
 */
const ROWS = [
  {
    id: 'sq-1',
    type: 'SQ',
    status: 'draft',
    number: null,
    issueDate: '2026-08-27',
    gstRatePercent: 0,
    lineItems: [],
    clientSnapshot: { name: 'Clayora' },
  },
  {
    id: 'inv-1',
    type: 'INV',
    status: 'finalized',
    number: 'QS-INV-2627-001',
    issueDate: '2026-07-30',
    gstRatePercent: 18,
    // Bills the Service by code, so the Services column has a badge to draw
    // from `CATALOGUE` below.
    lineItems: [{ description: 'Design', ratePaise: 100000, qty: 1, serviceCode: 'SOC' }],
    clientSnapshot: { name: 'Clayora' },
  },
  // A contract with a Build Part and a priced Retainer Part, so the Services
  // column and a "/mo" figure are on the page to be measured.
  contractDoc({ codes: ['05', '15'], blanks: { 'part.15.fee#0': '₹45,000' } }),
] as unknown as AdminDocument[];

/** Just enough catalogue to turn the invoice's `serviceCode` into a Schedule. */
const CATALOGUE = [{ code: 'SOC', scheduleKey: 'retainer' }] as unknown as ContractService[];

export default function ShellPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <AdminShell
      user={{ name: 'Preview', email: 'preview@qera.studio' }}
      defaultOpen
    >
      <PageBody>
        <PageHeader title="Dashboard">
          <Button variant="primary" type="button">New document</Button>
        </PageHeader>
        {/*
          The real `DocumentsTable`, not a hand-built one. It used to be four
          plain `TableRow`s here, which measured the fixture rather than the
          component: the stretched row link, the copy cell that sits over it and
          the hover actions are all things only a browser can see, and none of
          them existed in the copy. A row-wide click was broken for exactly as
          long as this fixture drew its own rows.
        */}
        <DocumentsTable documents={ROWS} catalogue={CATALOGUE} />
        {/* The header row's page-owned half: the pager a document editor
            portals up there. The row is the thing this fixture exists to
            measure now — back, breadcrumbs and pager on one line, levelled
            with the nav's header to its left and the rail's title row to its
            right. Three separately-owned columns that have to share a band, and
            jsdom reports every box as zero, so it cannot see any of it. */}
        <PageHeaderSlot>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <DocumentPager currentPage={0} pageCount={4} />
          </div>
        </PageHeaderSlot>

        {/* Opens the edit rail, so the right-hand column can be measured in
            its expanded state — where its title sits, where its seam falls.
            Collapsed, there is nothing there to measure. */}
        <EditorPanelContent title="Edit service quotation draft" autoOpen>
          <div className="flex flex-col gap-2">
            <Label htmlFor="preview-field">Kind attention</Label>
            <Input id="preview-field" placeholder="Prospect or company name" />
          </div>
        </EditorPanelContent>
      </PageBody>
    </AdminShell>
  );
}
