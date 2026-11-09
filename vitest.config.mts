import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    globals: true, // только ради auto-cleanup Testing Library (afterEach); в тестах импортировать из 'vitest' явно
    include: ['tests/unit/**/*.test.{ts,tsx}'],
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
        'src/**/application/**/*.ts': { lines: 100, functions: 100, branches: 95, statements: 100 },
      },
    },
  },
})
