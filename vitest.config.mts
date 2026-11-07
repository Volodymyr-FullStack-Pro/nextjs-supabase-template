import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true, // только ради auto-cleanup Testing Library (afterEach); в тестах импортировать из 'vitest' явно
    include: ['tests/unit/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: [
        'src/modules/**/domain/**',
        'src/modules/**/application/**',
        'src/shared/domain/**',
      ],
      thresholds: {
        // Чистое ядро покрывается полностью: это правила денег и бизнеса, их проверяют только тесты.
        'src/**/domain/**/*.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  },
})
