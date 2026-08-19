import { NextResponse } from 'next/server';
import { authorized } from '@/server/actions/authGate';
import { formatPostcode, INDIA_PINCODE_RE, POSTCODE_RE } from '@/lib/domain/address';
import { logger } from '@/lib/logger';

/**
 * Postcode → city + state, proxied through our own server.
 *
 * The browser never calls an upstream directly: routing it through here keeps
 * the third-party hostname out of the client, lets us gate on the session (this
 * is an internal tool holding financial records, not an open proxy), and means
 * one place to swap providers.
 *
 * Three upstreams, because none covers the others' ground well. India Post
 * knows every Indian pincode and returns the *district*, which is what an
 * Indian address wants; Postcodes.io resolves a full UK postcode against ONS
 * open data, which Zippopotam cannot (it indexes GB by outward code only, so
 * it answers with a list of villages); Zippopotam covers ~60 other countries
 * with no key. See `docs/vendors.md` for what each costs and what would
 * replace it.
 *
 * Failure is always silent and non-blocking. Every path returns 200 with
 * `{ ok: false }` rather than an error status, because the caller treats this
 * as an enhancement: the city and state fields stay editable by hand, and a
 * lookup that fails must never stop someone saving a client.
 */

const INDIA_UPSTREAM = 'https://api.postalpincode.in/pincode';
const WORLD_UPSTREAM = 'https://api.zippopotam.us';
const UK_UPSTREAM = 'https://api.postcodes.io/postcodes';
const TIMEOUT_MS = 3000;

/** Postcodes effectively never change, so a long cache is safe and kind. */
export const revalidate = 86400;

interface PincodeResult {
  ok: boolean;
  city?: string;
  state?: string;
  /**
   * The localities this code covers, when it covers more than one.
   *
   * Present *instead of* a city, never alongside one. A postcode like AU 2155
   * is four suburbs (Rouse Hill, Beaumont Hills, Kellyville, Kellyville Ridge)
   * and the upstream lists them in no meaningful order, so picking the first is
   * a guess wearing a lookup's clothes. Handing back all four lets the field
   * say why it is empty and lets the operator answer in one click.
   */
  options?: string[];
}

type Place = { city: string; state: string; options?: string[] } | null;

const FAILED: PincodeResult = { ok: false };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse<PincodeResult>> {
  if (!(await authorized())) {
    return NextResponse.json(FAILED, { status: 401 });
  }

  const { code: raw } = await params;
  const code = raw.trim().toUpperCase();
  const country = (new URL(request.url).searchParams.get('country') ?? 'IN')
    .trim()
    .toUpperCase();

  // Validate before spending a network call — and before putting anything
  // caller-controlled into a URL.
  if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json(FAILED);
  if (country === 'IN' ? !INDIA_PINCODE_RE.test(code) : !POSTCODE_RE.test(code)) {
    return NextResponse.json(FAILED);
  }

  try {
    const place =
      country === 'IN'
        ? await lookupIndia(code)
        : country === 'GB'
          ? await lookupUk(code)
          : await lookupWorld(country, code);
    return place ? NextResponse.json({ ok: true, ...place }) : NextResponse.json(FAILED);
  } catch (err) {
    // Timeouts, DNS failures, malformed JSON — all the same to the caller.
    // Log the shape of the failure, never the upstream body.
    logger.warn({ action: 'pincodeLookup', event: 'upstream_failed', country, error: err });
    return NextResponse.json(FAILED);
  }
}

async function get(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: 'application/json' },
    next: { revalidate },
  });
  return response.ok ? response.json() : null;
}

async function lookupIndia(code: string): Promise<Place> {
  return readIndia(await get(`${INDIA_UPSTREAM}/${code}`));
}

/**
 * The UK gets its own upstream, because the general one is wrong there rather
 * than merely thin.
 *
 * Zippopotam indexes Great Britain by *outward* code only, so 'PH2' answers
 * with the thirty villages that share it and the first of them is not an
 * address: a Perth client was filled in as Bridge of Earn. Postcodes.io
 * resolves the full code against ONS open data, needs no key, and returns the
 * district the address is actually in.
 *
 * The town on a letter is the Royal Mail *post town*, which is PAF data and
 * licensed, so it is not in this payload and we approximate it. The built-up
 * area is the town itself where ONS records one ('Windermere', 'Truro'); the
 * travel-to-work area is named after its dominant town and is always present
 * ('Perth', 'Inverness'). `admin_district` is the council area and is the
 * worst of the three: it gave 'Perth and Kinross' for a Perth address.
 *
 * ponytail: right for 11 of 13 real post towns tested. Both misses are inner
 * London, where it names the borough ('Islington' for LONDON) rather than
 * anywhere wrong. Licence PAF if that ever matters.
 *
 * The line above it is whichever of county, region and country the address
 * has — England files three, Scotland one.
 */
async function lookupUk(code: string): Promise<Place> {
  const postcode = formatPostcode(code, 'GB').replace(/\s/g, '');
  const payload = await get(`${UK_UPSTREAM}/${encodeURIComponent(postcode)}`);

  if (!payload || typeof payload !== 'object') return null;
  const result = (payload as Record<string, unknown>).result;
  if (!result || typeof result !== 'object') return null;

  const row = result as Record<string, unknown>;
  const first = (...values: unknown[]) =>
    values.find((value) => typeof value === 'string' && value.trim());

  return place(
    first(row.bua, row.ttwa, row.admin_district),
    first(row.admin_county, row.region, row.country),
  );
}

/**
 * Zippopotam wants the postcode URL-shaped, and several countries file more
 * addresses than they publish codes for.
 *
 * The retry is for the UK in particular: it indexes the *outward* code ('EH1'),
 * so a client who writes their postcode in full ('EH1 1YZ') would otherwise get
 * nothing. Dropping to the first segment is a second call only on a miss, which
 * is cheap and beats asking people to type half their postcode.
 */
async function lookupWorld(country: string, code: string): Promise<Place> {
  const path = (value: string) =>
    `${WORLD_UPSTREAM}/${country.toLowerCase()}/${encodeURIComponent(value)}`;

  // Normalised first: the outward half is found by splitting on the space, so a
  // UK postcode typed without one ('PH28AL') had no first segment to fall back
  // to and returned nothing at all.
  const full = formatPostcode(code, country);
  const direct = readWorld(await get(path(full)));
  if (direct) return direct;

  const outward = full.split(' ')[0];
  if (outward === full) return null;
  return readWorld(await get(path(outward)));
}

/**
 * Reads each upstream shape defensively, because they're third-party APIs and we
 * don't control their responses. Anything unexpected is treated as "no result"
 * rather than trusted.
 */
function readIndia(payload: unknown): Place {
  if (!Array.isArray(payload) || payload.length === 0) return null;

  const first = payload[0] as Record<string, unknown>;
  if (first?.Status !== 'Success') return null;

  const offices = first.PostOffice;
  if (!Array.isArray(offices) || offices.length === 0) return null;

  const office = offices[0] as Record<string, unknown>;
  // 'District' is the closest thing the upstream has to a city name; 'Block'
  // and 'Name' are sub-locality and are too granular for an address line.
  return place(office.District, office.State);
}

function readWorld(payload: unknown): Place {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const places = (payload as Record<string, unknown>).places;
  if (!Array.isArray(places) || places.length === 0) return null;

  const first = places[0] as Record<string, unknown>;
  // 'state' is whatever the country calls its top region: Scotland for GB, a
  // Bundesland for DE. Blank in the handful of countries that have none, which
  // leaves the field empty and typeable rather than wrong.
  //
  // One place means one answer. Several means the code covers a district and
  // `places[0]` is whichever locality the upstream happened to list first: PH2
  // returns thirty of them, so a Perth address was filled in as 'Bridge of
  // Earn' and then locked. The region they share is still known and still
  // right, so that is filled and the town is left blank. A guess presented as a
  // lookup is worse than no lookup.
  //
  // The names go back with it, so the caller can offer the choice rather than
  // leaving an empty box that reads as a failed lookup. Capped: a code covering
  // more than a dozen localities is a district, and a list that long is not a
  // choice anybody makes from a form.
  if (places.length === 1) return place(first['place name'], first.state);

  const names = places
    .map((entry) => (entry as Record<string, unknown>)['place name'])
    .filter((name): name is string => typeof name === 'string' && name.trim() !== '');

  return place('', first.state, names.length <= MAX_OPTIONS ? names : undefined);
}

/** Above this a postcode is a district, not a choice. */
const MAX_OPTIONS = 12;

function place(city: unknown, state: unknown, options?: string[]): Place {
  const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const found = { city: asText(city), state: asText(state) };
  if (!found.city && !found.state) return null;
  return options?.length ? { ...found, options } : found;
}
