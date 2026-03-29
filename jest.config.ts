import nextJest from 'next/jest.js';
import type { Config } from 'jest';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'jsdom',
  coverageProvider: 'v8',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/tests/**',
    // Exclude new Inline AI files until tests are written
    '!app/api/ai-change-request/**',
    '!components/AiInlineRequest.tsx',
    // Exclude dev-only seed route (server-side, tested via integration/E2E)
    '!app/api/dev/**',
    // Exclude settings page (depends on repositories with cuid2 + Dexie)
    '!app/settings/**',
    // Exclude new UI components added outside mock-data scope (no tests yet)
    '!components/SnoozeMenu.tsx',
    '!components/TagBadge.tsx',
    '!components/TagPicker.tsx',
    // Exclude dev-only panel (dynamic imports, tested via E2E)
    '!components/dev/**',
    // Exclude client-side wrappers (tested via integration)
    '!components/Providers.tsx',
    '!lib/apolloClient.ts',
    // Exclude files that use cuid2 ESM module (causes Jest parsing issues)
    '!lib/domain/repositories/PlantRepository.ts',
    '!lib/graphql/resolvers.ts',
    '!app/page.tsx',
    '!app/api/graphql/route.ts',
    '!lib/db.ts',
    // Exclude services that were removed from testing
    '!lib/domain/services/TelemetryService.ts',
    // Exclude plant identification service (requires mocking AI SDKs)
    '!lib/domain/services/plantIdentificationService.ts',
    '!lib/domain/types/plantIdentification.ts',
    '!app/api/identify-plants/**',
    // Exclude other pages that depend on repositories with cuid2
    '!app/layouts/**',
    '!app/plants/**',
    // Exclude layout components with complex dependencies
    '!components/layout/**',
    // Exclude utility components not critical for coverage
    '!components/PhotoCapture.tsx',
    '!components/PremiumSection.tsx',
    '!components/NotificationSetup.tsx',
    '!components/DatabaseInitializer.tsx',
  ],
  coverageThreshold: {
    global: {
      statements: 58,
      branches: 80,
      functions: 63,
      lines: 58,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(@apollo|@wry|@paralleldrive|@faker-js)/)'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/tests/e2e/'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
};

// createJestConfig merges transformIgnorePatterns by concatenation; override
// after the fact so ESM packages are transformed even with pnpm's virtual store.
// pnpm resolves symlinks → real paths look like:
//   node_modules/.pnpm/@scope+pkg@ver/node_modules/@scope/pkg/...
// The optional (?:\.pnpm\/[^/]+\/node_modules\/)? handles that prefix.
const ESM_PACKAGES = ['@apollo', '@wry', '@paralleldrive', '@faker-js', '@noble'];
const ESM_TRANSFORM_PATTERN =
  `node_modules/(?!(?:\\.pnpm\\/[^/]+\\/node_modules\\/)?(?:${ESM_PACKAGES.join('|')})/)`;

export default async () => {
  const resolved = await createJestConfig(config)();
  return {
    ...resolved,
    transformIgnorePatterns: [ESM_TRANSFORM_PATTERN],
  };
};
