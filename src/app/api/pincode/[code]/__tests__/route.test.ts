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

/** The request carries the country; everything else is in the path. */
function req(country?: string) {
  return new Request(
    country ? `http://localhost/api/pincode/x?country=${country}` : 'http://localhost/api/pincode/x',
  );
}

function upstreamSuccess(district: string, state: string) {
  return [{ Status: 'Success', PostOffice: [{ District: district, State: state }] }];
}

function zippopotam(place: string, state: string) {
  return { places: [{ 'place name': place, state }] };
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

    const response = await GET(req(), params('201017'));

    expect(response.status).toBe(401);
    // Crucially, no upstream call is made for an unauthorized caller.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a malformed pincode before spending a network call', async () => {
    global.fetch = jest.fn();

    for (const bad of ['20101', '2010177', 'abcdef', '../../etc']) {
      const response = await GET(req(), params(bad));
      expect(await response.json()).toEqual({ ok: false });
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns the city and state for a known pincode', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => upstreamSuccess('Ghaziabad', 'Uttar Pradesh'),
    });

    const response = await GET(req(), params('201017'));

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

    const response = await GET(req(), params('999999'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: false });
  });

  it('never fails the request when the upstream is down', async () => {
    // The caller treats this as an enhancement — a lookup that throws must not
    // surface as an error status, or a form could block on a third party.
    global.fetch = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));

    const response = await GET(req(), params('201017'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: false });
  });

  it('survives a garbage upstream payload', async () => {
    for (const payload of [null, {}, [], [{ Status: 'Success' }], 'nope']) {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload });

      const response = await GET(req(), params('201017'));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: false });
    }
  });

  it('treats a non-200 upstream as no result', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const response = await GET(req(), params('201017'));

    expect(await response.json()).toEqual({ ok: false });
  });
});

describe('GET /api/pincode/[code] outside India', () => {
  it('reads the world upstream, which is a different shape', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => zippopotam('Edinburgh', 'Scotland'),
    });

    const response = await GET(req('GB'), params('EH1'));

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.zippopotam.us/gb/EH1',
      expect.anything(),
    );
    expect(await response.json()).toEqual({ ok: true, city: 'Edinburgh', state: 'Scotland' });
  });

  /**
   * The UK indexes the outward code only, and people write their postcode in
   * full. Without the retry, every British client's lookup misses.
   */
  it('retries on the outward code when the full postcode misses', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ places: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => zippopotam('Edinburgh', 'Scotland') });

    const response = await GET(req('GB'), params('EH1 1YZ'));

    expect(global.fetch).toHaveBeenLastCalledWith(
      'https://api.zippopotam.us/gb/EH1',
      expect.anything(),
    );
    expect(await response.json()).toEqual({ ok: true, city: 'Edinburgh', state: 'Scotland' });
  });

  it('keeps caller text out of the upstream URL', async () => {
    global.fetch = jest.fn();

    for (const [country, code] of [
      ['GB', '../../etc'],
      ['GB', 'A'],
      ['gb/../nl', 'EH1'],
      ['G', 'EH1'],
    ] as const) {
      const response = await GET(req(country), params(code));
      expect(await response.json()).toEqual({ ok: false });
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('survives a garbage world payload', async () => {
    for (const payload of [null, [], { places: 'nope' }, { places: [{}] }]) {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload });

      const response = await GET(req('DE'), params('10115'));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: false });
    }
  });
});
