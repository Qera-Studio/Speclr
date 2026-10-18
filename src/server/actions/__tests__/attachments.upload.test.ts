/**
 * @jest-environment node
 */
import type { ClientRecord } from '@/lib/domain/types';

/**
 * Recording an attachment the browser uploaded straight to storage.
 *
 * The bytes no longer pass through a Server Action (Vercel refuses a body over
 * 4.5 MB), so the checks run on the way back: the stored bytes are read,
 * sniffed and refused here, and the server still decides what a slot document
 * is **called** and what happens to whatever was already in that slot.
 */

const authorized = jest.fn();
const saveClient = jest.fn((_c: ClientRecord) => Promise.resolve());
const getClient = jest.fn();
const get = jest.fn();
const del = jest.fn(() => Promise.resolve());

jest.mock('../authGate', () => ({ authorized: () => authorized() }));
jest.mock('@/db/store', () => ({
  saveClient: (...a: unknown[]) => saveClient(a[0] as ClientRecord),
  getClient: (...a: unknown[]) => getClient(...a),
}));
jest.mock('@vercel/blob', () => ({
  get: (...a: unknown[]) => get(...a),
  del: (...a: unknown[]) => del(...(a as [])),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import { recordClientAttachment } from '../attachments';

/** A real PDF signature, because the action sniffs the bytes. */
const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const ID = '6f1c2a1e-6c3b-4a7e-9d6a-1b2c3d4e5f60';

/** Storage answering with these bytes, as `get` does for a private blob. */
function stored(bytes: Uint8Array) {
  get.mockResolvedValue({ statusCode: 200, stream: new Response(new Blob([bytes as BlobPart])).body });
}

const record = (kind: string, filename = 'scan001.pdf', id = ID) =>
  recordClientAttachment('c1', { id, kind, filename });

const existing = {
  id: 'old',
  kind: 'gst_certificate',
  filename: 'Clayora Private Limited - GST registration certificate.pdf',
  mime: 'application/pdf',
  size: 100,
  key: 'clients/c1/old-gst.pdf',
  uploadedAt: 0,
};

const client = {
  id: 'c1',
  name: 'Clayora',
  companyName: 'Clayora Private Limited',
} as unknown as ClientRecord;

const saved = () => saveClient.mock.calls[0][0].attachments!;

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue(true);
  getClient.mockResolvedValue(client);
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  stored(pdfBytes);
});

test('names a slot document from the slot and the client, not from the scanner', async () => {
  await record('pan');
  expect(saved()[0].filename).toBe('Clayora Private Limited - PAN card.pdf');
  expect(saved()[0].key).toBe(`clients/c1/${ID}`);
});

test('takes the extension from the sniffed bytes, so the name cannot disagree', async () => {
  // Named like a PNG; the bytes say PDF, and the bytes win.
  await record('pan', 'anything.png');
  expect(saved()[0].filename).toBe('Clayora Private Limited - PAN card.pdf');
  expect(saved()[0].mime).toBe('application/pdf');
});

test('an extra keeps the name it arrived with, since a client has several', async () => {
  await record('purchase_order', 'PO-4417.pdf');
  expect(saved()[0].filename).toBe('PO-4417.pdf');
});

test('a second document in a slot replaces the first, blob and all', async () => {
  getClient.mockResolvedValue({ ...client, attachments: [existing] });
  await record('gst_certificate');

  const rows = saved().filter((a) => a.kind === 'gst_certificate');
  expect(rows).toHaveLength(1);
  expect(rows[0].id).toBe(ID);
  // The row is rewritten first and the old bytes deleted after: the other
  // order can leave the record pointing at a blob that is already gone.
  expect(del).toHaveBeenCalledWith(existing.key);
  expect(saveClient.mock.invocationCallOrder[0]).toBeLessThan(del.mock.invocationCallOrder[0]);
});

test('an extra never replaces another extra', async () => {
  const po = { ...existing, id: 'po1', kind: 'purchase_order', filename: 'PO-1.pdf' };
  getClient.mockResolvedValue({ ...client, attachments: [po] });
  await record('purchase_order', 'PO-2.pdf');

  expect(saved().filter((a) => a.kind === 'purchase_order')).toHaveLength(2);
  expect(del).not.toHaveBeenCalled();
});

/** The bytes are the claim that matters, and a refused file is erased. */
test('deletes and refuses stored bytes that are not a PDF, PNG or JPEG', async () => {
  stored(new TextEncoder().encode('<svg onload="alert(1)"></svg>'));
  const result = await record('pan', 'pan.pdf');
  expect(result.success).toBe(false);
  expect(del).toHaveBeenCalledWith(`clients/c1/${ID}`);
  expect(saveClient).not.toHaveBeenCalled();
});

test('refuses an upload that never arrived, without writing a row', async () => {
  get.mockResolvedValue(null);
  expect((await record('pan')).success).toBe(false);
  expect(saveClient).not.toHaveBeenCalled();
});

test('refuses recording the same upload twice', async () => {
  getClient.mockResolvedValue({ ...client, attachments: [{ ...existing, id: ID }] });
  expect((await record('pan')).success).toBe(false);
  expect(saveClient).not.toHaveBeenCalled();
});

test('refuses an id that is not a uuid, so no path can be named', async () => {
  expect((await record('pan', 'x.pdf', '../c2/secret')).success).toBe(false);
  expect(get).not.toHaveBeenCalled();
});

test('refuses an unauthorized caller before touching storage', async () => {
  authorized.mockResolvedValue(false);
  const result = await record('pan');
  expect(result.success).toBe(false);
  expect(get).not.toHaveBeenCalled();
  expect(del).not.toHaveBeenCalled();
});
