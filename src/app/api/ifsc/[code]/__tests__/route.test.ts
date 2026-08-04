/**
 * @jest-environment node
 */
import { GET } from '../route';

const authorized = jest.fn();
jest.mock('@/server/actions/authGate', () => ({
  authorized: () => authorized(),
}));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const originalFetch = global.fetch;

function params(code: string) {
  return { params: Promise.resolve({ code }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue(true);
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('GET /api/ifsc/[code]', () => {
  it('refuses unauthenticated callers so this is not an open proxy', async () => {
    authorized.mockResolvedValue(false);
    global.fetch = jest.fn();

    const response = await GET(new Request('http://localhost'), params('KKBK0000677'));

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a malformed IFSC before spending a network call', async () => {
    global.fetch = jest.fn();

    for (const bad of ['KKBK0', 'kkbk0000677', 'KKBK1000677', '../../etc', '']) {
      const response = await GET(new Request('http://localhost'), params(bad));
      expect(await response.json()).toEqual({ ok: false });
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns the bank and branch for a known IFSC', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ BANK: 'Kotak Mahindra Bank', BRANCH: 'Ghaziabad', CITY: 'GHAZIABAD' }),
    });

    const response = await GET(new Request('http://localhost'), params('KKBK0000677'));

    expect(await response.json()).toEqual({
      ok: true,
      bank: 'Kotak Mahindra Bank',
      branch: 'Ghaziabad',
    });
  });

  it('treats the upstream 404 for an unknown branch as no result', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    const response = await GET(new Request('http://localhost'), params('KKBK0999999'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: false });
  });

  it('never fails the request when the upstream is down', async () => {
    // The caller treats this as an enhancement — a lookup that throws must not
    // surface as an error status, or a form could block on a third party.
    global.fetch = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));

    const response = await GET(new Request('http://localhost'), params('KKBK0000677'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: false });
  });

  it('survives a garbage upstream payload', async () => {
    for (const payload of [null, {}, [], { BRANCH: 'Ghaziabad' }, 'nope']) {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload });

      const response = await GET(new Request('http://localhost'), params('KKBK0000677'));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: false });
    }
  });
});
