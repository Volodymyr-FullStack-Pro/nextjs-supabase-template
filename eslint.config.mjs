import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import boundaries from 'eslint-plugin-boundaries'
import sonarjs from 'eslint-plugin-sonarjs'
import unicorn from 'eslint-plugin-unicorn'
import simpleImportSort from 'eslint-plugin-simple-import-sort'

// Порядок: правила Next.js (набор strict из jsx-a11y включается ниже, в a11yConfig)
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
      // mode: 'file' в v7 помечен устаревшим (предупреждение при lint), но замены для элемента-файла нет:
      // boundaries/files даёт файлам лишь категории без captured. Пересмотреть при переходе на v8.
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
      {
        type: 'root',
        pattern: 'src/{proxy,instrumentation,instrumentation-client}.ts',
        mode: 'file',
      },
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
const DIRECTIVE =
  /^(eslint-|@vitest-environment|@ts-expect-error|@ts-ignore|@ts-check|@ts-nocheck|@jsx|global\s|@type\s|prettier-ignore|v8 ignore|c8 ignore)/

const noComments = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Смысл выражается именами и структурой, а не комментариями' },
    messages: {
      comment:
        'Комментарий: вынесите смысл в имя или тест; причина решения — строка в docs/knowledge/decisions.md',
    },
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

// Порядок импортов (чинится --fix): побочные эффекты (server-only, css) → node: → react, next, пакеты → @/shared, @/modules → ../ → ./
const IMPORT_GROUPS = [
  ['^\\u0000'],
  ['^node:'],
  ['^react(/|$)', '^next(/|$)', '^@?\\w'],
  ['^@/shared', '^@/modules', '^@/'],
  ['^\\.\\.', '^\\./'],
]

const codeStyleConfig = {
  files: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs', 'tests/**/*.{ts,tsx}'],
  ignores: ['src/shared/ui/**', '!src/shared/ui/form/**'],
  plugins: {
    unicorn,
    sonarjs,
    'simple-import-sort': simpleImportSort,
    local: { rules: { 'no-comments': noComments } },
  },
  rules: {
    'local/no-comments': 'error',
    // импорты: один блок на источник, сгруппированы и отсортированы автоматически
    'simple-import-sort/imports': ['error', { groups: IMPORT_GROUPS }],
    'simple-import-sort/exports': 'error',
    'import/no-duplicates': ['error', { 'prefer-inline': true }],
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
    // безопасность: HTML из строки и eval запрещены
    'react/no-danger': 'error',
    'no-eval': 'error',
    'no-await-in-loop': 'error',
    'no-empty': ['error', { allowEmptyCatch: false }],
    'sonarjs/no-identical-functions': 'error',
    'sonarjs/no-collapsible-if': 'error',
    'sonarjs/prefer-immediate-return': 'error',
    'sonarjs/no-redundant-boolean': 'error',
    'sonarjs/no-inverted-boolean-check': 'error',
    // имена
    'id-length': ['error', { min: 2, exceptions: ['_', 'z', 't'], properties: 'never' }], // ключи данных (q в URL) не считаем
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
// JSX многословнее логики: компоненту даём 120 строк вместо 80
const componentLengthConfig = {
  files: ['src/**/*.tsx'],
  ignores: ['src/shared/ui/**', '!src/shared/ui/form/**'],
  rules: {
    'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
  },
}
// Тесты: describe с десятком кейсов длиннее 80 строк — норма; вспомогательные функции внутри describe тоже
const testsConfig = {
  files: ['tests/**/*.{ts,tsx}'],
  rules: {
    'max-lines-per-function': 'off',
    'unicorn/consistent-function-scoping': 'off',
  },
}
const codeStyleTsConfig = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/shared/ui/**', '!src/shared/ui/form/**'],
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
        detectObjects: true,
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
      { selector: 'variable', modifiers: ['destructured'], format: null }, // колонки snake_case из строк базы
      { selector: 'function', format: ['camelCase', 'PascalCase'] },
      { selector: 'parameter', format: ['camelCase', 'PascalCase'], leadingUnderscore: 'allow' },
      { selector: 'typeLike', format: ['PascalCase'] },
      { selector: 'interface', format: ['PascalCase'], custom: { regex: '^I[A-Z]', match: false } },
      { selector: 'enumMember', format: ['PascalCase'] },
      { selector: ['objectLiteralProperty', 'typeProperty', 'classProperty'], format: null },
      { selector: 'import', format: null },
    ],
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
    // React: async-обработчик в onClick — норма; остальные проверки промисов (forEach, условия) остаются
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: { attributes: false } },
    ],
    // Next требует async у 'use cache', Server Actions и серверных компонентов даже без await
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/no-import-type-side-effects': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
  },
}

// Цвета — только токены дизайн-системы (src/app/globals.css, docs/design/design-system.md): hex и rgb/hsl/oklch в коде — ошибка
const COLOR_MESSAGE = 'цвет только токеном дизайн-системы (globals.css), не значением в коде'
const HEX_COLOR = '/#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])/'
const FUNCTION_COLOR = '/(?:rgba?|hsla?|oklch)\\(/'
const COLOR_LITERAL_RULES = [
  { selector: `Literal[value=${HEX_COLOR}]`, message: COLOR_MESSAGE },
  { selector: `TemplateElement[value.raw=${HEX_COLOR}]`, message: COLOR_MESSAGE },
  { selector: `Literal[value=${FUNCTION_COLOR}]`, message: COLOR_MESSAGE },
  { selector: `TemplateElement[value.raw=${FUNCTION_COLOR}]`, message: COLOR_MESSAGE },
]

// unknown и as — только на границе с внешними данными (infrastructure, shared/lib, app/api, proxy): дальше данные уже прошли Zod
const boundaryOnlyTypesConfig = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: [
    'src/**/infrastructure/**',
    'src/shared/lib/**',
    'src/app/api/**',
    'src/proxy.ts',
    'src/shared/ui/**',
    '!src/shared/ui/form/**',
  ],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'TSUnknownKeyword',
        message:
          'unknown только на границе с внешними данными (infrastructure, shared/lib, app/api): здесь данные уже прошли Zod',
      },
      ...COLOR_LITERAL_RULES,
    ],
    '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
  },
}

// Переменные окружения — только через env.ts (секреты и адреса) и runtime.ts (режим сборки)
const envAccessConfig = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/shared/infrastructure/**', 'src/shared/lib/runtime.ts'],
  rules: {
    'no-restricted-properties': [
      'error',
      {
        object: 'process',
        property: 'env',
        message:
          'переменные окружения — через src/shared/infrastructure/env.ts, режим сборки — isProduction из src/shared/lib/runtime.ts',
      },
    ],
  },
}

// Доступность разметки: набор strict из jsx-a11y (плагин подключает eslint-config-next), кроме стороннего shadcn
const a11yConfig = {
  files: ['src/**/*.tsx'],
  ignores: ['src/shared/ui/**', '!src/shared/ui/form/**'],
  rules: Object.fromEntries(
    [
      'alt-text',
      'anchor-has-content',
      'anchor-is-valid',
      'aria-activedescendant-has-tabindex',
      'aria-props',
      'aria-proptypes',
      'aria-role',
      'aria-unsupported-elements',
      'autocomplete-valid',
      'click-events-have-key-events',
      'heading-has-content',
      'html-has-lang',
      'iframe-has-title',
      'img-redundant-alt',
      'interactive-supports-focus',
      'label-has-associated-control',
      'media-has-caption',
      'mouse-events-have-key-events',
      'no-access-key',
      'no-autofocus',
      'no-distracting-elements',
      'no-interactive-element-to-noninteractive-role',
      'no-noninteractive-element-interactions',
      'no-noninteractive-element-to-interactive-role',
      'no-noninteractive-tabindex',
      'no-redundant-roles',
      'no-static-element-interactions',
      'role-has-required-aria-props',
      'role-supports-aria-props',
      'scope',
      'tabindex-no-positive',
    ].map((rule) => [`jsx-a11y/${rule}`, 'error']),
  ),
}

// Компоненты shadcn (npx shadcn add) — сторонний код: границы проверяем, строгие типовые и стилевые правила — нет.
const vendorUiConfig = {
  files: ['src/shared/ui/**/*.{ts,tsx}'],
  ignores: ['src/shared/ui/form/**'],
  ...tseslint.configs.disableTypeChecked,
  rules: {
    ...tseslint.configs.disableTypeChecked.rules,
    'react-hooks/set-state-in-effect': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
  },
}

// Прямое подключение к базе (db()) обходит RLS: только в shared/infrastructure и в файлах *.admin.ts
// (служебные задачи, миграции данных). shared/lib — техника Next.js для ui и app: инфраструктуру видят
// только сессия и actions, иначе db() просочился бы в ui через реэкспорт.
const DIRECT_DB = {
  group: ['@/shared/infrastructure/db', '@/shared/infrastructure/db/*'],
  message:
    'db() обходит RLS: только в shared/infrastructure и *.admin.ts; данные пользователя — через клиент Supabase',
}
const directDbConfig = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/shared/infrastructure/**', 'src/**/*.admin.ts'],
  rules: { 'no-restricted-imports': ['error', { patterns: [DIRECT_DB] }] },
}
const sharedLibConfig = {
  files: ['src/shared/lib/**/*.ts'],
  ignores: ['src/shared/lib/session.ts', 'src/shared/lib/safe-action.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          DIRECT_DB,
          {
            group: ['@/shared/infrastructure/*', '@/shared/infrastructure/**'],
            message:
              'shared/lib доступен из ui: инфраструктура — только в session.ts и safe-action.ts',
          },
        ],
      },
    ],
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
    'src/shared/infrastructure/supabase/types.ts', // генерирует npm run db:types
  ]),
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.strictTypeChecked,
  boundariesConfig,
  codeStyleConfig,
  componentLengthConfig,
  testsConfig,
  codeStyleTsConfig,
  boundaryOnlyTypesConfig,
  a11yConfig,
  envAccessConfig,
  vendorUiConfig,
  directDbConfig,
  sharedLibConfig,
  {
    files: ['**/*.{ts,tsx,mts}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // Конфиги и тесты — без типо-зависимых правил: они вне основного tsconfig-проекта.
    files: ['**/*.{js,mjs,cjs}', '*.config.{ts,mts}'],
    ...tseslint.configs.disableTypeChecked,
  },
  eslintConfigPrettier,
])
