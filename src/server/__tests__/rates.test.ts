/**
 * @jest-environment node
 */
import { inrRatesToday } from '../rates';

jest.mock('server-only', () => ({}));
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }));

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

/** 21 September 2026, 00:00 UTC, which is when the upstream stamps its day. */
const PUBLISHED = Date.UTC(2026, 8, 21) / 1000;

function answer(body: unknown, ok = true) {
  fetchMock.mockResolvedValue({ ok, status: ok ? 200 : 503, json: async () => body });
}

describe('inrRatesToday', () => {
  it('keeps the currencies the app knows, never INR, stamped with the upstream’s day', async () => {
    answer({
      result: 'success',
      time_last_update_unix: PUBLISHED,
      rates: { INR: 1, GBP: 0.0093, USD: 0.012, JPY: 1.7, AED: 0.044 },
    });

    expect(await inrRatesToday()).toEqual({
      asOf: '2026-09-21',
      rates: { GBP: 0.0093, USD: 0.012, AED: 0.044 },
      source: 'ExchangeRate-API',
    });
    // Cached across requests for the day, and never allowed to hang the page.
    expect(fetchMock).toHaveBeenCalledWith(
      'https://open.er-api.com/v6/latest/INR',
      expect.objectContaining({ next: { revalidate: 21600 }, signal: expect.any(AbortSignal) }),
    );
  });

  /**
   * Every failure is the same answer, so the list never has to know why: the
   * INR figure is on the page either way and only the toggle is missing.
   */
  it('answers null on a bad status, a bad shape, or a network error', async () => {
    answer({ result: 'error' }, false);
    expect(await inrRatesToday()).toBeNull();

    answer({ result: 'success', time_last_update_unix: PUBLISHED, rates: { GBP: 'lots' } });
    expect(await inrRatesToday()).toBeNull();

    fetchMock.mockRejectedValue(new Error('timeout'));
    expect(await inrRatesToday()).toBeNull();
  });
});
