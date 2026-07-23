import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

// Deliberately untyped — `next/jest`'s `createJestConfig` expects its own
// config parameter type (sourced from Next's bundled Jest types), which can
// drift out of sync with the standalone `jest` package's `Config` type after
// a Jest version bump. Annotating this object with `jest`'s `Config` type
// forces TS to reconcile two independently-versioned declarations of the
// same shape; letting it infer structurally avoids that false conflict.
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};

export default createJestConfig(config);
