/**
 * The authorization boundary, and the one shortcut taken through it.
 *
 * `currentEmail` prefers the email claim on the verified session token to an
 * HTTP call to Clerk's API, because that call was measured at ~690ms and 56
 * files reach this gate. These tests pin both halves: the claim is used when
 * present, the API is still called when it is not, and neither path lets a
 * non-allowlisted email through.
 */

const mockAuth = jest.fn();
const mockCurrentUser = jest.fn();

jest.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
  currentUser: () => mockCurrentUser(),
}));

const ALLOWED = 'ops@qera.studio';

describe('requireAuthorizedUser', () => {
  beforeEach(() => {
    jest.resetModules();
    mockAuth.mockReset();
    mockCurrentUser.mockReset();
    process.env.SPECLR_ALLOWED_EMAILS = ALLOWED;
  });

  const load = async () => (await import('../session')).requireAuthorizedUser;

  it('reads the email from the session token without calling Clerk', async () => {
    mockAuth.mockResolvedValue({ userId: 'u1', sessionClaims: { email: ALLOWED } });
    const requireAuthorizedUser = await load();

    await expect(requireAuthorizedUser()).resolves.toEqual({ userId: 'u1', email: ALLOWED });
    // The whole point of the change: no network round trip.
    expect(mockCurrentUser).not.toHaveBeenCalled();
  });

  it('falls back to the API when the token carries no email claim', async () => {
    mockAuth.mockResolvedValue({ userId: 'u1', sessionClaims: {} });
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddressId: 'e1',
      emailAddresses: [{ id: 'e1', emailAddress: ALLOWED }],
    });
    const requireAuthorizedUser = await load();

    await expect(requireAuthorizedUser()).resolves.toEqual({ userId: 'u1', email: ALLOWED });
    expect(mockCurrentUser).toHaveBeenCalled();
  });

  it('still refuses an email that is not allowlisted, claim or not', async () => {
    mockAuth.mockResolvedValue({ userId: 'u1', sessionClaims: { email: 'nope@example.com' } });
    const requireAuthorizedUser = await load();

    await expect(requireAuthorizedUser()).rejects.toThrow('UNAUTHORIZED');
  });

  it('refuses when there is no session at all', async () => {
    mockAuth.mockResolvedValue({ userId: null, sessionClaims: null });
    const requireAuthorizedUser = await load();

    await expect(requireAuthorizedUser()).rejects.toThrow('UNAUTHENTICATED');
  });
});
