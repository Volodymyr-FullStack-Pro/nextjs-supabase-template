import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/data/**', 'src/features/**'],
      thresholds: {
        'src/lib/money.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  },
})
