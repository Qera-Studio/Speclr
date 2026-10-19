/**
 * @jest-environment node
 */

/**
 * The upload-token route is the gate on direct uploads: no token unless the
 * caller is signed in, the client exists, and the path is exactly that
 * client's prefix and a uuid. `handleUpload` is stubbed to run our check
 * against a chosen path and report what it would have issued.
 */

const authorized = jest.fn();
const getClient = jest.fn();

jest.mock('@/server/actions/authGate', () => ({ authorized: () => authorized() }));
jest.mock('@/db/store', () => ({ getClient: (...a: unknown[]) => getClient(...a) }));
jest.mock('@vercel/blob/client', () => ({
  handleUpload: async ({
    body,
    onBeforeGenerateToken,
  }: {
    body: { pathname: string };
    onBeforeGenerateToken: (p: string, c: null, m: boolean) => Promise<unknown>;
  }) => ({ issued: await onBeforeGenerateToken(body.pathname, null, false) }),
}));

import { POST } from '../route';

const ID = '6f1c2a1e-6c3b-4a7e-9d6a-1b2c3d4e5f60';
const call = (pathname: string, clientId = 'c1') =>
  POST(new Request('http://x/upload', { method: 'POST', body: JSON.stringify({ pathname }) }), {
    params: Promise.resolve({ id: clientId }),
  });

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue(true);
  getClient.mockResolvedValue({ id: 'c1' });
});

it('issues a token for the client own path, capped and typed, never overwriting', async () => {
  const res = await call(`clients/c1/${ID}`);
  expect(res.status).toBe(200);
  const { issued } = await res.json();
  expect(issued).toEqual(
    expect.objectContaining({
      allowedContentTypes: ['application/pdf', 'image/png', 'image/jpeg'],
      maximumSizeInBytes: 25 * 1024 * 1024,
      addRandomSuffix: false,
      allowOverwrite: false,
    }),
  );
});

it('refuses a signed-out caller', async () => {
  authorized.mockResolvedValue(false);
  expect((await call(`clients/c1/${ID}`)).status).toBe(400);
});

it('refuses another client path, or one that is not a uuid', async () => {
  expect((await call(`clients/c2/${ID}`)).status).toBe(400);
  expect((await call('clients/c1/../c2/secret')).status).toBe(400);
  expect((await call(`clients/c1/${ID}/extra`)).status).toBe(400);
});

it('refuses a client that does not exist', async () => {
  getClient.mockResolvedValue(null);
  expect((await call(`clients/c1/${ID}`)).status).toBe(400);
});
