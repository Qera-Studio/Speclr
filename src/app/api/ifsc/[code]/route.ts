import { NextResponse } from 'next/server';
import { authorized } from '@/server/actions/authGate';
import { IFSC_RE } from '@/lib/domain/bank';
import { logger } from '@/lib/logger';

/**
 * IFSC → bank + branch, proxied through our own server.
 *
 * Same shape and same reasoning as the pincode lookup next door: the upstream
 * hostname stays out of the client, the session is checked (this is an internal
 * tool holding financial records, not an open proxy), and there is one place to
 * swap providers.
 *
 * Chosen over a hardcoded bank list because it covers every branch in India and
 * carries no assets to maintain. Failure is always silent and non-blocking —
 * every path returns 200 with `{ ok: false }`, because the bank name stays
 * editable by hand and a lookup that fails must never stop someone saving.
 */

const UPSTREAM = 'https://ifsc.razorpay.com';
const TIMEOUT_MS = 3000;

/** Branch records change about never, so a long cache is safe and kind. */
export const revalidate = 86400;

interface IfscResult {
  ok: boolean;
  bank?: string;
  branch?: string;
}

const FAILED: IfscResult = { ok: false };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse<IfscResult>> {
  if (!(await authorized())) {
    return NextResponse.json(FAILED, { status: 401 });
  }

  const { code } = await params;

  // Validate before spending a network call — and before putting anything
  // caller-controlled into a URL.
  if (!IFSC_RE.test(code)) {
    return NextResponse.json(FAILED);
  }

  try {
    const response = await fetch(`${UPSTREAM}/${code}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
      next: { revalidate },
    });

    // 404 is the upstream's "no such branch" — a normal answer, not a fault.
    if (!response.ok) return NextResponse.json(FAILED);

    const payload: unknown = await response.json();
    const parsed = readUpstream(payload);
    if (!parsed) return NextResponse.json(FAILED);

    return NextResponse.json({ ok: true, ...parsed });
  } catch (err) {
    // Timeouts, DNS failures, malformed JSON — all the same to the caller.
    // Log the shape of the failure, never the upstream body.
    logger.warn({ action: 'ifscLookup', event: 'upstream_failed', error: err });
    return NextResponse.json(FAILED);
  }
}

/**
 * Reads the upstream shape defensively — it's a free third-party API and we
 * don't control its response. Anything unexpected is treated as "no result".
 */
function readUpstream(payload: unknown): { bank: string; branch: string } | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const record = payload as Record<string, unknown>;
  const bank = typeof record.BANK === 'string' ? record.BANK.trim() : '';
  const branch = typeof record.BRANCH === 'string' ? record.BRANCH.trim() : '';

  if (!bank) return null;
  return { bank, branch };
}
