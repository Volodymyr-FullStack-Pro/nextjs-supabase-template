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
        'src/proxy.ts',
        'src/shared/lib/session.ts',
        'src/shared/lib/api-denial.ts',
      ],
      thresholds: {
        // Чистое ядро покрывается полностью: это правила денег и бизнеса, их проверяют только тесты.
        'src/**/domain/**/*.ts': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/**/application/**/*.ts': { lines: 100, functions: 100, branches: 95, statements: 100 },
        // Проверка входа и шага второго фактора: снятая ветка должна быть видна.
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
