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

function upstreamSuccess(district: string, state: string) {
  return [{ Status: 'Success', PostOffice: [{ District: district, State: state }] }];
}

beforeEach(() => {
  jest.clearAllMocks();
  authorized.mockResolvedValue(true);
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('GET /api/pincode/[code]', () => {
  it('refuses unauthenticated callers so this is not an open proxy', async () => {
    authorized.mockResolvedValue(false);
    global.fetch = jest.fn();

    const response = await GET(new Request('http://localhost'), params('201017'));

    expect(response.status).toBe(401);
    // Crucially, no upstream call is made for an unauthorized caller.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a malformed pincode before spending a network call', async () => {
    global.fetch = jest.fn();

    for (const bad of ['20101', '2010177', 'abcdef', '../../etc']) {
      const response = await GET(new Request('http://localhost'), params(bad));
      expect(await response.json()).toEqual({ ok: false });
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns the city and state for a known pincode', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => upstreamSuccess('Ghaziabad', 'Uttar Pradesh'),
    });

    const response = await GET(new Request('http://localhost'), params('201017'));

    expect(await response.json()).toEqual({
      ok: true,
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
    });
  });

  it('reports no result when the upstream finds nothing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ Status: 'Error', PostOffice: null }],
    });

    const response = await GET(new Request('http://localhost'), params('999999'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: false });
  });

  it('never fails the request when the upstream is down', async () => {
    // The caller treats this as an enhancement — a lookup that throws must not
    // surface as an error status, or a form could block on a third party.
    global.fetch = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));

    const response = await GET(new Request('http://localhost'), params('201017'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: false });
  });

  it('survives a garbage upstream payload', async () => {
    for (const payload of [null, {}, [], [{ Status: 'Success' }], 'nope']) {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload });

      const response = await GET(new Request('http://localhost'), params('201017'));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: false });
    }
  });

  it('treats a non-200 upstream as no result', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const response = await GET(new Request('http://localhost'), params('201017'));

    expect(await response.json()).toEqual({ ok: false });
  });
});
