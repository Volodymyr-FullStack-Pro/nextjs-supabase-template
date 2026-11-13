import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    globals: true, // only for Testing Library auto-cleanup (afterEach); tests import from 'vitest' explicitly
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: [
        'src/modules/**/domain/**',
        'src/modules/**/application/**',
        'src/shared/domain/**',
        'src/proxy.ts',
        'src/shared/lib/session.ts',
        'src/shared/lib/api-denial.ts',
      ],
      thresholds: {
        'src/**/domain/**/*.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/**/application/**/*.ts': { lines: 100, functions: 100, branches: 95, statements: 100 },
        'src/proxy.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/shared/lib/{session,api-denial}.ts': {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  },
})
