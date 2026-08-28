import { notFound } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { PageBody, PageHeader, TableCard } from '@/components/admin/Page';
import { Button } from '@/components/ui/button';
import { EditorPanelContent } from '@/components/admin/EditorPanel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NIL } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

const ROWS = [
  { number: 'Draft', type: 'Service Quotation', client: NIL, date: '27 Aug 2026' },
  { number: 'Draft', type: 'Invoice', client: 'Clayora', date: '27 Aug 2026' },
  { number: 'Draft', type: 'Contract', client: 'Clayora', date: '27 Aug 2026' },
  { number: 'QS-INV-2627-001', type: 'Invoice', client: 'Clayora', date: '30 Jul 2026' },
];

export default function ShellPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <AdminShell
      user={{ name: 'Preview', email: 'preview@qera.studio' }}
      defaultOpen
    >
      <PageBody>
        <PageHeader title="Dashboard">
          <Button type="button">New document</Button>
        </PageHeader>
        <TableCard count={`${ROWS.length} documents`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROWS.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.number}</TableCell>
                  <TableCell>{row.type}</TableCell>
                  <TableCell>{row.client}</TableCell>
                  <TableCell>{row.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
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
