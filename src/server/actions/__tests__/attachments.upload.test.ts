import type { ClientRecord } from '@/lib/domain/types';

/**
 * Uploading an attachment.
 *
 * Two things the server decides and the browser does not: what a slot document
 * is **called**, and what happens to whatever was already in that slot. Both
 * moved here when the type picker was replaced by one upload per document, and
 * both are the reason the picker could go.
 */

const authorized = jest.fn();
const saveClient = jest.fn((_c: ClientRecord) => Promise.resolve());
const getClient = jest.fn();
const put = jest.fn(() => Promise.resolve({}));
const del = jest.fn(() => Promise.resolve());

jest.mock('../authGate', () => ({ authorized: () => authorized() }));
jest.mock('@/db/store', () => ({
  saveClient: (...a: unknown[]) => saveClient(a[0] as ClientRecord),
  getClient: (...a: unknown[]) => getClient(...a),
}));
jest.mock('@vercel/blob', () => ({
  put: (...a: unknown[]) => put(...(a as [])),
  del: (...a: unknown[]) => del(...(a as [])),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import { uploadClientAttachment } from '../attachments';

/** A real PDF signature, because the action sniffs the bytes. */
const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

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

/**
 * A `File` the action can read.
 *
 * jsdom's `File` has no `arrayBuffer`, and the action reads the bytes because
 * that is the whole point — the declared type is a claim. Patched rather than
 * stubbed so it stays a real `File` for the `instanceof` check.
 */
function file(filename: string, declaredType = 'application/pdf') {
  const f = new File([pdfBytes], filename, { type: declaredType });
  Object.defineProperty(f, 'arrayBuffer', { value: async () => pdfBytes.buffer });
  return f;
}

function form(kind: string, filename = 'scan001.pdf') {
  const data = new FormData();
  data.set('file', file(filename));
  data.set('kind', kind);
  return data;
}

const saved = () => saveClient.mock.calls[0][0].attachments!;

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue(true);
  getClient.mockResolvedValue(client);
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
});

test('names a slot document from the slot and the client, not from the scanner', async () => {
  await uploadClientAttachment('c1', form('pan'));
  expect(saved()[0].filename).toBe('Clayora Private Limited - PAN card.pdf');
});

test('takes the extension from the sniffed type, so the name cannot disagree', async () => {
  // Claims to be a PNG; the bytes say PDF, and the bytes win.
  const data = new FormData();
  data.set('file', file('anything.png', 'image/png'));
  data.set('kind', 'pan');
  await uploadClientAttachment('c1', data);
  expect(saved()[0].filename).toBe('Clayora Private Limited - PAN card.pdf');
  expect(saved()[0].mime).toBe('application/pdf');
});

test('an extra keeps the name it arrived with, since a client has several', async () => {
  getClient.mockResolvedValue(client);
  await uploadClientAttachment('c1', form('purchase_order', 'PO-4417.pdf'));
  expect(saved()[0].filename).toBe('PO-4417.pdf');
});

test('a second document in a slot replaces the first, blob and all', async () => {
  getClient.mockResolvedValue({ ...client, attachments: [existing] });
  await uploadClientAttachment('c1', form('gst_certificate'));

  const rows = saved().filter((a) => a.kind === 'gst_certificate');
  expect(rows).toHaveLength(1);
  expect(rows[0].id).not.toBe('old');
  // The row is rewritten first and the old bytes deleted after — the other
  // order can leave the record pointing at a blob that is already gone.
  expect(del).toHaveBeenCalledWith(existing.key);
  expect(saveClient.mock.invocationCallOrder[0]).toBeLessThan(del.mock.invocationCallOrder[0]);
});

test('an extra never replaces another extra', async () => {
  const po = { ...existing, id: 'po1', kind: 'purchase_order', filename: 'PO-1.pdf' };
  getClient.mockResolvedValue({ ...client, attachments: [po] });
  await uploadClientAttachment('c1', form('purchase_order', 'PO-2.pdf'));

  expect(saved().filter((a) => a.kind === 'purchase_order')).toHaveLength(2);
  expect(del).not.toHaveBeenCalled();
});

test('refuses an unauthorized caller before touching storage', async () => {
  authorized.mockResolvedValue(false);
  const result = await uploadClientAttachment('c1', form('pan'));
  expect(result.success).toBe(false);
  expect(put).not.toHaveBeenCalled();
});
