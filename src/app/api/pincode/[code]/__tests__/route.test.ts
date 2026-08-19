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
      json: async () => zippopotam('Berlin', 'Berlin'),
    });

    const response = await GET(req('DE'), params('10115'));

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.zippopotam.us/de/10115',
      expect.anything(),
    );
    expect(await response.json()).toEqual({ ok: true, city: 'Berlin', state: 'Berlin' });
  });

  /**
   * Several countries index part of the code only, and people write their
   * postcode in full. Without the retry, those lookups miss.
   */
  it('retries on the outward code when the full postcode misses', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ places: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => zippopotam('Amsterdam', 'Noord-Holland') });

    const response = await GET(req('NL'), params('1011 AB'));

    expect(global.fetch).toHaveBeenLastCalledWith(
      'https://api.zippopotam.us/nl/1011',
      expect.anything(),
    );
    expect(await response.json()).toEqual({ ok: true, city: 'Amsterdam', state: 'Noord-Holland' });
  });

  /**
   * Great Britain has its own upstream: Zippopotam indexes the outward code
   * only, so 'PH2' answers with thirty villages and a Perth address was filled
   * in as Bridge of Earn. Postcodes.io resolves the whole code.
   */
  it('resolves a full UK postcode, however it was typed', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          admin_district: 'Perth and Kinross',
          admin_county: null,
          region: null,
          country: 'Scotland',
        },
      }),
    });

    const response = await GET(req('GB'), params('PH28AL'));

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.postcodes.io/postcodes/PH28AL',
      expect.anything(),
    );
    expect(await response.json()).toEqual({
      ok: true,
      city: 'Perth and Kinross',
      state: 'Scotland',
    });
  });

  /**
   * The council area is not the town on a letter: PH2 8AL is Perth, filed
   * under Perth and Kinross. The built-up area and the travel-to-work area
   * both name the town, and one of them is always present.
   */
  it('prefers the town over the council area', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          bua: null,
          ttwa: 'Perth',
          admin_district: 'Perth and Kinross',
          country: 'Scotland',
        },
      }),
    });

    const response = await GET(req('GB'), params('PH2 8AL'));

    expect(await response.json()).toEqual({ ok: true, city: 'Perth', state: 'Scotland' });
  });

  it('prefers the built-up area, which is the town where a wider area is not', async () => {
    // LA23 1AB is Windermere, whose travel-to-work area is Kendal.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          bua: 'Windermere',
          ttwa: 'Kendal',
          admin_district: 'Westmorland and Furness',
          region: 'North West',
          country: 'England',
        },
      }),
    });

    const response = await GET(req('GB'), params('LA23 1AB'));

    expect(await response.json()).toEqual({
      ok: true,
      city: 'Windermere',
      state: 'North West',
    });
  });

  it('prefers the county an English address has over its country', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          admin_district: 'Islington',
          admin_county: null,
          region: 'London',
          country: 'England',
        },
      }),
    });

    const response = await GET(req('GB'), params('EC1A 1BB'));

    expect(await response.json()).toEqual({ ok: true, city: 'Islington', state: 'London' });
  });

  it('says nothing when a UK postcode does not exist', async () => {
    // Postcodes.io 404s, which `get` already turns into null.
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) });

    const response = await GET(req('GB'), params('ZZ1 1ZZ'));

    expect(await response.json()).toEqual({ ok: false });
  });

  it('fills only the region when the code covers more than one place', async () => {
    // A postcode district is not an address: `places[0]` is whichever village
    // the upstream happened to write first, and it was filled in as the town
    // and then locked read-only.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        places: [
          { 'place name': 'Bridge of Earn', state: 'Scotland' },
          { 'place name': 'Kinfauns', state: 'Scotland' },
        ],
      }),
    });

    const response = await GET(req('NL'), params('1011'));

    expect(await response.json()).toEqual({
      ok: true,
      city: '',
      state: 'Scotland',
      options: ['Bridge of Earn', 'Kinfauns'],
    });
  });

  // The Australian case that prompted this: 2155 is four suburbs and no town.
  // The names come back so the field can say why it is empty, which an empty
  // field on its own cannot.
  it('names the localities a shared postcode covers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        places: [
          { 'place name': 'Rouse Hill', state: 'New South Wales' },
          { 'place name': 'Beaumont Hills', state: 'New South Wales' },
          { 'place name': 'Kellyville', state: 'New South Wales' },
          { 'place name': 'Kellyville Ridge', state: 'New South Wales' },
        ],
      }),
    });

    const response = await GET(req('AU'), params('2155'));

    expect(await response.json()).toEqual({
      ok: true,
      city: '',
      state: 'New South Wales',
      options: ['Rouse Hill', 'Beaumont Hills', 'Kellyville', 'Kellyville Ridge'],
    });
  });

  // A code covering thirty villages is a district, and thirty buttons is not a
  // choice anybody makes from a form. The region is still right, so it still
  // fills; the list is simply not offered.
  it('offers no list when the postcode covers a whole district', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        places: Array.from({ length: 30 }, (_, i) => ({
          'place name': `Suburb ${i}`,
          state: 'New South Wales',
        })),
      }),
    });

    const response = await GET(req('AU'), params('2000'));
    expect(await response.json()).toEqual({ ok: true, city: '', state: 'New South Wales' });
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
