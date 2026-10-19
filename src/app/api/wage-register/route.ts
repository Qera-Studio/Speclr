import { authorized } from '@/server/actions/authGate';
import { listDocumentsByType } from '@/db/store';
import { isISOMonth } from '@/lib/domain/dates';
import { wageRegisterCsv, wageRegisterRows } from '@/lib/domain/wageRegister';
import type { SlipDocument } from '@/lib/domain/types';

/** One month of the wage register as CSV. Behind the same gate as every page. */
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  if (!(await authorized())) return new Response('Not found', { status: 404 });

  const month = new URL(request.url).searchParams.get('month') ?? '';
  if (!isISOMonth(month)) return new Response('Name a month as YYYY-MM.', { status: 400 });

  const rows = wageRegisterRows((await listDocumentsByType('PAY')) as SlipDocument[], month);
  return new Response(wageRegisterCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="wage-register-${month}.csv"`,
      'X-Content-Type-Options': 'nosniff',
      // Employees' pay: never in a shared cache.
      'Cache-Control': 'private, no-store',
    },
  });
}
