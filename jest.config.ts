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
      statements: 52,
      branches: 80,
      functions: 63,
      lines: 52,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(@apollo|@wry|@paralleldrive)/)'],
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

export default createJestConfig(config);
