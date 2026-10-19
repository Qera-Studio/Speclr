/**
 * @jest-environment node
 */
import { getTableName } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { tablesOf } from '../../scripts/backup';
import { TABLES } from '../../scripts/migrate-region';

/**
 * The copy script lists its tables by hand, for the insert order. That list
 * silently missed `leads` when the table was added, so it is held to the
 * schema here: a new table fails this test instead of being left behind on a
 * region move or a restore.
 */
const inSchema = tablesOf(schema).map(getTableName).sort();

it('copies every table the schema has, and nothing else', () => {
  expect([...TABLES].sort()).toEqual(inSchema);
});

it('inserts parents before children', () => {
  const at = (t: string) => TABLES.indexOf(t as (typeof TABLES)[number]);
  // clients.lead_employee_id -> employees (0017)
  expect(at('employees')).toBeLessThan(at('clients'));
  // documents.client_id, documents.employee_id: after every parent
  for (const parent of ['employees', 'clients', 'counters']) expect(at(parent)).toBeLessThan(at('documents'));
  // contract_acceptances.document_id -> documents (0024)
  expect(at('documents')).toBeLessThan(at('contract_acceptances'));
});
