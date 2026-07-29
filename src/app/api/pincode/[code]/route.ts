import { NextResponse } from 'next/server';
import { authorized } from '@/server/actions/authGate';
import { INDIA_PINCODE_RE } from '@/lib/domain/address';
import { logger } from '@/lib/logger';

/**
 * Indian pincode → city + state, proxied through our own server.
 *
 * The browser never calls the upstream API directly: routing it through here
 * keeps the third-party hostname out of the client, lets us gate on the session
 * (this is an internal tool holding financial records, not an open proxy), and
 * means one place to swap providers.
 *
 * Failure is always silent and non-blocking. Every path returns 200 with
 * `{ ok: false }` rather than an error status, because the caller treats this
 * as an enhancement: the city and state fields stay editable by hand, and a
 * lookup that fails must never stop someone saving a client.
 */

const UPSTREAM = 'https://api.postalpincode.in/pincode';
const TIMEOUT_MS = 3000;

/** Pincodes effectively never change, so a long cache is safe and kind. */
export const revalidate = 86400;

interface PincodeResult {
  ok: boolean;
  city?: string;
  state?: string;
}

const FAILED: PincodeResult = { ok: false };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse<PincodeResult>> {
  if (!(await authorized())) {
    return NextResponse.json(FAILED, { status: 401 });
  }

  const { code } = await params;

  // Validate before spending a network call — and before putting anything
  // caller-controlled into a URL.
  if (!INDIA_PINCODE_RE.test(code)) {
    return NextResponse.json(FAILED);
  }

  try {
    const response = await fetch(`${UPSTREAM}/${code}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
      next: { revalidate },
    });

    if (!response.ok) return NextResponse.json(FAILED);

    const payload: unknown = await response.json();
    const parsed = readUpstream(payload);
    if (!parsed) return NextResponse.json(FAILED);

    return NextResponse.json({ ok: true, ...parsed });
  } catch (err) {
    // Timeouts, DNS failures, malformed JSON — all the same to the caller.
    // Log the shape of the failure, never the upstream body.
    logger.warn({ action: 'pincodeLookup', event: 'upstream_failed', error: err });
    return NextResponse.json(FAILED);
  }
}

/**
 * Reads the upstream shape defensively — it's a free third-party API and we
 * don't control its response. Anything unexpected is treated as "no result"
 * rather than trusted.
 */
function readUpstream(payload: unknown): { city: string; state: string } | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;

  const first = payload[0] as Record<string, unknown>;
  if (first?.Status !== 'Success') return null;

  const offices = first.PostOffice;
  if (!Array.isArray(offices) || offices.length === 0) return null;

  const office = offices[0] as Record<string, unknown>;
  // 'District' is the closest thing the upstream has to a city name; 'Block'
  // and 'Name' are sub-locality and are too granular for an address line.
  const city = typeof office.District === 'string' ? office.District.trim() : '';
  const state = typeof office.State === 'string' ? office.State.trim() : '';

  if (!city && !state) return null;
  return { city, state };
}
