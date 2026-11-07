import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import boundaries from 'eslint-plugin-boundaries'
import sonarjs from 'eslint-plugin-sonarjs'
import unicorn from 'eslint-plugin-unicorn'

// Порядок: правила Next.js (core-web-vitals даёт лишь шесть правил jsx-a11y; полный плагин ждёт поддержки ESLint 10)
// → строгий TypeScript с проверкой типов → Prettier последним, чтобы снять конфликты форматирования.

// Архитектурные границы (см. .claude/rules/architecture.md): модули с четырьмя слоями, shared и app.
// Внутри модуля слой видит только свои слои ниже; другой модуль доступен лишь через server.ts и domain.
const sameModule = (type) => ({
  element: { type, captured: { module: '{{from.element.captured.module}}' } },
})
const types = (...list) => ({ element: { type: list } })
const PURE_CORE = types('module-domain', 'module-application', 'shared-domain')
const boundariesConfig = {
  files: ['src/**/*.{ts,tsx}'],
  plugins: { boundaries },
  settings: {
    'boundaries/include': ['src/**/*'],
    'boundaries/elements': [
      // partialMatch: false — путь от корня, элемент = папка. Порядок важен: первое совпадение побеждает,
      // поэтому глубокие папки идут раньше. server.ts и proxy.ts — элементы-файлы; прочие файлы вне папок — unknown.
      {
        type: 'module-domain',
        pattern: 'src/modules/*/domain',
        partialMatch: false,
        capture: ['module'],
      },
      {
        type: 'module-application',
        pattern: 'src/modules/*/application',
        partialMatch: false,
        capture: ['module'],
      },
      {
        type: 'module-infrastructure',
        pattern: 'src/modules/*/infrastructure',
        partialMatch: false,
        capture: ['module'],
      },
      { type: 'module-ui', pattern: 'src/modules/*/ui', partialMatch: false, capture: ['module'] },
      {
        type: 'module-root',
        pattern: 'src/modules/*/server.ts',
        mode: 'file',
        capture: ['module'],
      },
      { type: 'app', pattern: 'src/app', partialMatch: false },
      { type: 'types', pattern: 'src/types', partialMatch: false },
      { type: 'shared-domain', pattern: 'src/shared/domain', partialMatch: false },
      { type: 'shared-infrastructure', pattern: 'src/shared/infrastructure', partialMatch: false },
      { type: 'shared-lib', pattern: 'src/shared/lib', partialMatch: false },
      { type: 'shared-ui', pattern: 'src/shared/ui', partialMatch: false },
      { type: 'root', pattern: 'src/proxy.ts', mode: 'file' },
    ],
    'import/resolver': { typescript: { alwaysTryTypes: true, project: './tsconfig.json' } },
  },
  rules: {
    'boundaries/no-unknown-files': 'error',
    'boundaries/no-unknown-dependencies': 'error',
    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        checkAllOrigins: true,
        // Последняя совпавшая политика побеждает: сначала общие разрешения, потом исключения.
        policies: [
          // Пакеты npm и модули Node разрешены всем...
          {
            from: { element: { type: '*' } },
            allow: { to: { module: { origin: ['external', 'core'] } } },
          },
          {
            from: types('module-domain'),
            allow: { to: [sameModule('module-domain'), types('shared-domain')] },
          },
          {
            from: types('module-application'),
            allow: {
              to: [
                sameModule('module-application'),
                sameModule('module-domain'),
                types('shared-domain'),
              ],
            },
          },
          {
            from: types('module-infrastructure'),
            allow: {
              to: [
                sameModule('module-infrastructure'),
                sameModule('module-application'),
                sameModule('module-domain'),
                types('shared-domain', 'shared-infrastructure'),
              ],
            },
          },
          {
            from: types('module-root'),
            allow: {
              to: [
                sameModule('module-application'),
                sameModule('module-infrastructure'),
                sameModule('module-domain'),
                types('shared-domain', 'shared-infrastructure', 'shared-lib'),
              ],
            },
          },
          {
            // ui своего модуля: server.ts, domain, ui; чужие модули — только их server.ts и domain
            from: types('module-ui'),
            allow: {
              to: [
                sameModule('module-ui'),
                types('module-root', 'module-domain', 'shared-domain', 'shared-ui', 'shared-lib'),
              ],
            },
          },
          {
            from: types('app'),
            allow: {
              to: types(
                'app',
                'module-ui',
                'module-root',
                'module-domain',
                'shared-ui',
                'shared-lib',
                'shared-domain',
              ),
            },
          },
          {
            from: types('root'),
            allow: { to: types('shared-infrastructure', 'shared-lib', 'shared-domain') },
          },
          { from: types('shared-domain'), allow: { to: types('shared-domain') } },
          {
            from: types('shared-infrastructure'),
            allow: { to: types('shared-infrastructure', 'shared-domain') },
          },
          {
            from: types('shared-lib'),
            allow: { to: types('shared-lib', 'shared-infrastructure', 'shared-domain') },
          },
          {
            from: types('shared-ui'),
            allow: { to: types('shared-ui', 'shared-lib', 'shared-domain') },
          },
          // ...кроме чистого ядра: ему можно только пакеты без I/O и фреймворка (allowlist)
          {
            from: PURE_CORE,
            disallow: { to: { module: { origin: ['external', 'core'] } } },
            message:
              'Домен и application не импортируют фреймворки и инфраструктуру ({{to.module.source}})',
          },
          {
            from: PURE_CORE,
            allow: {
              to: {
                module: {
                  origin: 'external',
                  source: ['zod', 'decimal.js', 'date-fns', 'date-fns/*'],
                },
              },
            },
          },
        ],
      },
    ],
  },
}

// Стиль кода (см. .claude/rules/code-style.md): понятные имена, без магических чисел, простые функции.
// Что можно проверить машиной — проверяет линтер; принципы DRY/KISS/YAGNI — в правилах и ревью.

// Код объясняет себя сам: комментарии запрещены, кроме директив инструментов (eslint, vitest, ts).
const DIRECTIVE = /^(eslint-|@vitest-environment|@ts-expect-error|@ts-ignore|@jsx|global\s|@type\s)/
const noComments = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Смысл выражается именами и структурой, а не комментариями' },
    messages: { comment: 'Комментарий: вынесите смысл в имя функции, переменной или в тест' },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === 'Shebang' || comment.type === 'Hashbang') continue
          if (DIRECTIVE.test(comment.value.trim())) continue
          context.report({ loc: comment.loc, messageId: 'comment' })
        }
      },
    }
  },
}

const codeStyleConfig = {
  files: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs', 'tests/**/*.{ts,tsx}'],
  ignores: [
    'src/shared/ui/**',
    '!src/shared/ui/form/**',
    'src/shared/infrastructure/supabase/types.ts',
  ],
  plugins: { unicorn, sonarjs, local: { rules: { 'no-comments': noComments } } },
  rules: {
    'local/no-comments': 'error',
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    // простота
    complexity: ['error', 10],
    'max-depth': ['error', 3],
    'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
    'sonarjs/cognitive-complexity': ['error', 15],
    'no-nested-ternary': 'error',
    'no-else-return': ['error', { allowElseIf: false }],
    'no-param-reassign': 'error',
    eqeqeq: ['error', 'always'],
    'unicorn/consistent-function-scoping': 'error',
    'unicorn/no-negated-condition': 'error',
    'unicorn/explicit-length-check': 'error',
    'unicorn/prefer-array-some': 'error',
    'unicorn/prefer-includes': 'error',
    'unicorn/prefer-string-slice': 'error',
    'unicorn/no-for-each': 'error',
    'unicorn/prefer-node-protocol': 'error',
    'unicorn/throw-new-error': 'error',
    'unicorn/error-message': 'error',
    'unicorn/no-abusive-eslint-disable': 'error',
    'sonarjs/no-identical-functions': 'error',
    'sonarjs/no-collapsible-if': 'error',
    'sonarjs/prefer-immediate-return': 'error',
    'sonarjs/no-redundant-boolean': 'error',
    'sonarjs/no-inverted-boolean-check': 'error',
    // имена
    'id-length': ['error', { min: 2, exceptions: ['_', 'z'], properties: 'never' }], // ключи данных (q в URL) не считаем
    'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    'unicorn/name-replacements': [
      'error',
      {
        checkFilenames: false,
        // идиомы Next/React и Result оставляем; остальные сокращения раскрываются
        replacements: {
          params: false,
          props: false,
          ref: false,
          env: false,
          ctx: false,
          db: false,
          args: false,
          dir: false,
          src: false,
          dev: false,
          prod: false,
          lib: false,
          config: false,
          utils: false,
          err: false,
        },
      },
    ],
    // числа и строки
    'no-magic-numbers': 'off',
  },
}
const codeStyleTsConfig = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: [
    'src/shared/ui/**',
    '!src/shared/ui/form/**',
    'src/shared/infrastructure/supabase/types.ts',
  ],
  rules: {
    '@typescript-eslint/max-params': ['error', { max: 3 }],
    '@typescript-eslint/no-magic-numbers': [
      'error',
      {
        ignore: [0, 1, -1],
        ignoreArrayIndexes: true,
        ignoreEnums: true,
        ignoreTypeIndexes: true,
        ignoreReadonlyClassProperties: true,
        enforceConst: true,
      },
    ],
    '@typescript-eslint/naming-convention': [
      'error',
      { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
      {
        selector: 'variable',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
      },
      { selector: 'function', format: ['camelCase', 'PascalCase'] },
      { selector: 'parameter', format: ['camelCase', 'PascalCase'], leadingUnderscore: 'allow' },
      { selector: 'typeLike', format: ['PascalCase'] },
      { selector: 'interface', format: ['PascalCase'], custom: { regex: '^I[A-Z]', match: false } },
      { selector: 'enumMember', format: ['PascalCase'] },
      { selector: ['objectLiteralProperty', 'typeProperty', 'classProperty'], format: null },
      { selector: 'import', format: null },
    ],
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
  },
}

// Компоненты shadcn (npx shadcn add) — сторонний код: границы проверяем, строгие типовые и стилевые правила — нет.
const vendorUiConfig = {
  files: ['src/shared/ui/**/*.{ts,tsx}'],
  ignores: ['src/shared/ui/form/**'],
  ...tseslint.configs.disableTypeChecked,
  rules: {
    ...tseslint.configs.disableTypeChecked.rules,
    'react-hooks/set-state-in-effect': 'off',
  },
}

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
  boundariesConfig,
  codeStyleConfig,
  codeStyleTsConfig,
  vendorUiConfig,
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
