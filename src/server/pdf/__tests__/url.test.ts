/**
 * @jest-environment node
 */
jest.mock('server-only', () => ({}));
jest.mock('next/headers', () => ({ headers: jest.fn() }));

import { isOwnHost } from '../url';

/**
 * The renderer carries the caller's session cookie to whatever host this
 * accepts, so a spoofed Host header must not be one of them.
 */
const env = {
  VERCEL_PROJECT_PRODUCTION_URL: 'speclr.qera.studio',
  VERCEL_BRANCH_URL: 'speclr-git-latest-qera.vercel.app',
  VERCEL_URL: 'speclr-abc123-qera.vercel.app',
} as unknown as NodeJS.ProcessEnv;

it('accepts localhost and the hosts this deployment is served on', () => {
  expect(isOwnHost('localhost:3000', env)).toBe(true);
  expect(isOwnHost('127.0.0.1:3000', env)).toBe(true);
  expect(isOwnHost('speclr.qera.studio', env)).toBe(true);
  expect(isOwnHost('speclr-git-latest-qera.vercel.app', env)).toBe(true);
  expect(isOwnHost('speclr-abc123-qera.vercel.app', env)).toBe(true);
});

it('refuses any other host, including look-alikes', () => {
  expect(isOwnHost('evil.example', env)).toBe(false);
  expect(isOwnHost('speclr.qera.studio.evil.example', env)).toBe(false);
  expect(isOwnHost('localhost.evil.example', env)).toBe(false);
});
