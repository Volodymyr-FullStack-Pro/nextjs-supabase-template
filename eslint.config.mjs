import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

// Порядок: правила Next.js (включая доступность jsx-a11y из core-web-vitals) → строгий TypeScript
// с проверкой типов → Prettier последним, чтобы снять конфликты форматирования.
export default defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    'playwright-report/**',
    'test-results/**',
    'coverage/**',
  ]),
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // Конфиги и тесты — без типо-зависимых правил: они вне основного tsconfig-проекта.
    files: ['**/*.{js,mjs,cjs}', '*.config.{ts,mts}', 'tests/**'],
    ...tseslint.configs.disableTypeChecked,
  },
  eslintConfigPrettier,
])
