import { NextResponse } from 'next/server';
import { authorized } from '@/server/actions/authGate';
import { INDIA_PINCODE_RE, POSTCODE_RE } from '@/lib/domain/address';
import { logger } from '@/lib/logger';

/**
 * Postcode → city + state, proxied through our own server.
 *
 * The browser never calls an upstream directly: routing it through here keeps
 * the third-party hostname out of the client, lets us gate on the session (this
 * is an internal tool holding financial records, not an open proxy), and means
 * one place to swap providers.
 *
 * Two upstreams, because neither covers the other's ground well. India Post
 * knows every Indian pincode and returns the *district*, which is what an
 * Indian address wants; Zippopotam covers ~60 other countries with no key.
 * See `docs/vendors.md` for what each costs and what would replace it.
 *
 * Failure is always silent and non-blocking. Every path returns 200 with
 * `{ ok: false }` rather than an error status, because the caller treats this
 * as an enhancement: the city and state fields stay editable by hand, and a
 * lookup that fails must never stop someone saving a client.
 */

const INDIA_UPSTREAM = 'https://api.postalpincode.in/pincode';
const WORLD_UPSTREAM = 'https://api.zippopotam.us';
const TIMEOUT_MS = 3000;

/** Postcodes effectively never change, so a long cache is safe and kind. */
export const revalidate = 86400;

interface PincodeResult {
  ok: boolean;
  city?: string;
  state?: string;
}

type Place = { city: string; state: string } | null;

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
    const place = country === 'IN' ? await lookupIndia(code) : await lookupWorld(country, code);
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

  const direct = readWorld(await get(path(code)));
  if (direct) return direct;

  const outward = code.split(' ')[0];
  if (outward === code) return null;
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
  return place(first['place name'], first.state);
}

function place(city: unknown, state: unknown): Place {
  const asText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const found = { city: asText(city), state: asText(state) };
  return found.city || found.state ? found : null;
}
