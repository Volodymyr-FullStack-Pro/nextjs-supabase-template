import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs'
import vitest from '@vitest/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import playwright from 'eslint-plugin-playwright'
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
                  source: ['zod', 'decimal.js'],
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

// Код объясняет себя сам: комментарии запрещены, кроме директив инструментов (eslint, vitest, ts)
// и ссылки на решение из docs/knowledge/decisions.md: // D-041: налог округляется один раз.
const DIRECTIVE =
  /^(eslint-|@vitest-environment|@ts-expect-error|@ts-ignore|@ts-check|@ts-nocheck|@jsx|global\s|@type\s|prettier-ignore|v8 ignore|c8 ignore|D-\d+: )/

const noComments = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Смысл выражается именами и структурой, а не комментариями' },
    messages: {
      comment:
        'Комментарий: вынесите смысл в имя или тест; причина решения — строка в docs/knowledge/decisions.md и ссылка «// D-NNN: …»',
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

// Защита денег и доступа (см. .claude/rules/code-style.md и architecture.md). Каждая группа — своё локальное правило:
// в выводе видно, что сработало, и группы разных слоёв не перетирают друг друга (во flat config позднее правило
// заменяет опции целиком). Сообщение правила говорит, как исправить. Пробы на каждое правило — tests/lint-rules
// (npm run lint:rules). Отключение этих правил комментарием — ошибка (guardDirectivesConfig: eslint-disable защиты и
// комментарий-конфигурация вида eslint правило: "off"), а отключение самих этих двух проверок ловит второй проход
// npm run lint:rules, который линтует src без учёта комментариев. Ложное срабатывание — правка правила здесь и новая проба.
const syntaxRule = (description, checks) => ({
  meta: { type: 'problem', docs: { description }, schema: [] },
  create: (context) =>
    Object.fromEntries(
      checks.map(({ selector, message }) => [
        selector,
        (node) => context.report({ node, message }),
      ]),
    ),
})

// Сумма числом: 0.1 + 0.2 ≠ 0.3, (1.005).toFixed(2) = «1.00», «9» > «10» у строк — ошибки, которые не видит компилятор.
// Правило по именам: amount, price, balance, fee, cost, rate, quantity, share — и с префиксом (openingBalance, tax_rate).
const MONEY_NAME =
  '/(^|_)(amount|price|balance|fee|cost|rate|quantity|share)$|(Amount|Price|Balance|Fee|Cost|Rate|Quantity|Share)$/'
const HAS_MONEY_OPERAND = `:has(> :matches(Identifier[name=${MONEY_NAME}], MemberExpression[property.name=${MONEY_NAME}]))`
const MONEY_AS_NUMBER =
  'сумма, цена, остаток, курс, количество, доля — строка или Money (money() из @/shared/domain/money), не number; в Zod — z.string() с parseDecimalInput или decimalPattern, число из чужого JSON — z.coerce.string().regex(decimalPattern(…))'
const MONEY_OPERATOR =
  'арифметика и сравнение сумм — через money(): money(a).plus(b), money(a).gt(b); операторы на строках сравнивают по буквам, на числах теряют копейки'
const MONEY_CONVERSION =
  'Number(), parseFloat и унарный плюс теряют точность суммы: расчёт — money(a), на экран — formatMoney(a, { currency }), число для графика — money(a).toNumber() в ui'
// number, number | null, number | undefined (и необязательное поле): сумма «может отсутствовать» — самая частая форма.
const NUMBER_TYPE = ':matches(TSNumberKeyword, TSUnionType:has(> TSNumberKeyword))'
const moneyAsNumber = syntaxRule('Суммы — строка или Money, не number', [
  {
    selector: `:matches(TSPropertySignature, PropertyDefinition)[key.name=${MONEY_NAME}] > TSTypeAnnotation > ${NUMBER_TYPE}`,
    message: MONEY_AS_NUMBER,
  },
  {
    selector: `Identifier[name=${MONEY_NAME}] > TSTypeAnnotation > ${NUMBER_TYPE}`,
    message: MONEY_AS_NUMBER,
  },
  {
    selector: `Property[key.name=${MONEY_NAME}] CallExpression[callee.property.name="number"]`,
    message: MONEY_AS_NUMBER,
  },
  {
    selector: `BinaryExpression:matches([operator=/^([<>]=?|[-+*%]|\\*\\*)$/], [operator="/"])${HAS_MONEY_OPERAND}`,
    message: MONEY_OPERATOR,
  },
  {
    selector: `AssignmentExpression:matches([operator=/^([-+*%]|\\*\\*)=$/], [operator="/="])${HAS_MONEY_OPERAND}`,
    message: MONEY_OPERATOR,
  },
  {
    selector: `:matches(CallExpression[callee.name=/^(Number|parseFloat)$/], CallExpression[callee.property.name="parseFloat"], UnaryExpression[operator="+"])${HAS_MONEY_OPERAND}`,
    message: MONEY_CONVERSION,
  },
])

// Money (Decimal) в операторе сравнения превращается в строку: money('9') > money('10') — true, === сравнивает ссылки.
// Компилятор это пропускает, поэтому правило смотрит на тип.
const COMPARISON_OPERATORS = new Set(['<', '<=', '>', '>=', '==', '===', '!=', '!=='])
const isNullish = (node) =>
  (node.type === 'Literal' && node.value === null) ||
  (node.type === 'Identifier' && node.name === 'undefined')
const typeParts = (type) => (type.isUnion() ? type.types : [type])
const noMoneyOperators = {
  meta: {
    type: 'problem',
    docs: { description: 'Money сравнивается методами, не операторами' },
    messages: {
      operator:
        'Money сравнивается методами .gt() .gte() .lt() .lte() .eq() .cmp(): оператор «{{operator}}» сравнивает строки («9» > «10») или ссылки',
    },
    schema: [],
  },
  create(context) {
    const services = context.sourceCode.parserServices
    const isMoney = (node) =>
      typeParts(services.getTypeAtLocation(node)).some(
        (part) => part.getSymbol()?.getName() === 'Decimal',
      )
    return {
      BinaryExpression(node) {
        if (!COMPARISON_OPERATORS.has(node.operator)) return
        if (isNullish(node.left) || isNullish(node.right)) return
        if (isMoney(node.left) || isMoney(node.right)) {
          context.report({ node, messageId: 'operator', data: { operator: node.operator } })
        }
      },
    }
  },
}

// Чистое ядро не превращает строки в числа и не читает часы: расчёт идёт в money(), а «сейчас» приходит параметром —
// иначе правило «на дату» не проверить тестом, а new Date().toISOString() даёт день по UTC, не по времени проекта.
const NUMBER_CONVERSION =
  'domain и application не превращают строки в числа: расчёт — money(); целое (год, месяц, счётчик) — Number.parseInt(x, 10); число для графика готовит ui'
const CLOCK =
  'domain и application не читают часы: текущий момент приходит параметром (ctx.now), его задаёт action или server.ts'
const pureCore = syntaxRule('Чистое ядро: без чисел из строк и без часов', [
  { selector: 'CallExpression[callee.name=/^(Number|parseFloat)$/]', message: NUMBER_CONVERSION },
  {
    selector: 'CallExpression[callee.object.name="Number"][callee.property.name="parseFloat"]',
    message: NUMBER_CONVERSION,
  },
  { selector: 'CallExpression[callee.property.name="toNumber"]', message: NUMBER_CONVERSION },
  { selector: 'UnaryExpression[operator="+"]', message: NUMBER_CONVERSION },
  { selector: 'NewExpression[callee.name="Date"][arguments.length=0]', message: CLOCK },
  {
    selector: 'CallExpression[callee.object.name="Date"][callee.property.name="now"]',
    message: CLOCK,
  },
])

// Отказ use case — значение Result: исключение из use case пользователь видит как «Что-то пошло не так»,
// а непроверенный Result уходит ему как успех.
const noThrowInUseCase = syntaxRule('Use case возвращает Result, а не бросает исключение', [
  {
    selector: 'ThrowStatement',
    message:
      'use case не бросает исключений: ожидаемый отказ — return err(new RuleViolationError(…)); неожиданный придёт из infrastructure, нарушенный инвариант — из функции domain',
  },
])
const noIgnoredResult = {
  meta: {
    type: 'problem',
    docs: { description: 'Result use case проверяется' },
    messages: {
      ignored:
        'Result не проверен: const result = await …; if (!result.ok) fail(result.error) — иначе отказ уйдёт пользователю как успех',
    },
    schema: [],
  },
  create(context) {
    const services = context.sourceCode.parserServices
    return {
      ExpressionStatement(node) {
        const type = services.getTypeAtLocation(node.expression)
        if (type.aliasSymbol?.getName() === 'Result') context.report({ node, messageId: 'ignored' })
      },
    }
  },
}

// Server Action — открытая точка входа (вызывается прямым POST): только цепочка safe-action, которая проверяет сессию,
// второй фактор и вход; владелец записи — из сессии, а не из входа.
// Клиенты actions — четыре имени из src/shared/lib/safe-action.ts; свой клиент модуль собрать не может (local/action-client).
const ACTION_CLIENT = '/^(authActionClient|mfaActionClient|setupActionClient|actionClient)$/'
const USE_SERVER_FILE = 'Program:has(> ExpressionStatement[directive="use server"])'
const SERVER_ACTION =
  'Server Action — только цепочка safe-action: export const x = authActionClient.inputSchema(Schema).action(…) (@/shared/lib/safe-action); обычный экспорт не проверяет ни сессию, ни второй фактор, ни вход'
const serverAction = syntaxRule('Server Action — только через safe-action', [
  {
    selector: `${USE_SERVER_FILE} > ExportNamedDeclaration > FunctionDeclaration`,
    message: SERVER_ACTION,
  },
  {
    selector: `${USE_SERVER_FILE} > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator:not(:has(CallExpression Identifier[name=${ACTION_CLIENT}]))`,
    message: SERVER_ACTION,
  },
  {
    selector: `${USE_SERVER_FILE} > ExportNamedDeclaration > ExportSpecifier`,
    message: SERVER_ACTION,
  },
  {
    selector: `${USE_SERVER_FILE} > :matches(ExportDefaultDeclaration, ExportAllDeclaration)`,
    message: SERVER_ACTION,
  },
  {
    selector: ':function > BlockStatement > ExpressionStatement[directive="use server"]',
    message: SERVER_ACTION,
  },
  {
    selector:
      'Property[key.name=/^(userId|ownerId)$/] > MemberExpression[object.name="parsedInput"]',
    message:
      'userId и ownerId — только из сессии (ctx.session.userId), не из входа action: иначе вошедший действует от чужого имени',
  },
])

// За входом — только проверки с шагом второго фактора: verifySession() и клиенты actions без него остаются модулю auth.
const SESSION_FILE = '/shared\\/lib\\/session$/'
const SAFE_ACTION_FILE = '/shared\\/lib\\/safe-action$/'
const UNVERIFIED_SESSION =
  'verifySession() не проверяет шаг второго фактора: за входом — requireVerifiedSession(); verifySession — только экраны /mfa/* модуля auth'
const UNVERIFIED_ACTION =
  'actionClient, mfaActionClient и setupActionClient не проверяют сессию или шаг второго фактора: за входом — authActionClient; остальные — только модуль auth (вход и /mfa/*)'
const behindSignIn = syntaxRule('За входом — requireVerifiedSession и authActionClient', [
  {
    selector: `ImportDeclaration[source.value=${SESSION_FILE}] > ImportSpecifier[imported.name="verifySession"]`,
    message: UNVERIFIED_SESSION,
  },
  {
    selector: `ImportDeclaration[source.value=${SAFE_ACTION_FILE}] > ImportSpecifier[imported.name=/^(actionClient|mfaActionClient|setupActionClient)$/]`,
    message: UNVERIFIED_ACTION,
  },
  {
    selector: `ImportDeclaration[source.value=${SESSION_FILE}] > ImportNamespaceSpecifier`,
    message: UNVERIFIED_SESSION,
  },
  {
    selector: `ImportDeclaration[source.value=${SAFE_ACTION_FILE}] > ImportNamespaceSpecifier`,
    message: UNVERIFIED_ACTION,
  },
  { selector: `ImportExpression[source.value=${SESSION_FILE}]`, message: UNVERIFIED_SESSION },
  { selector: `ImportExpression[source.value=${SAFE_ACTION_FILE}]`, message: UNVERIFIED_ACTION },
])

// Клиент actions собирает только src/shared/lib/safe-action.ts: свой createSafeActionClient() в модуле — action без
// сессии, второго фактора, замера и отчёта об ошибке. Хуки (next-safe-action/hooks) и типы пакета доступны всем.
const OWN_ACTION_CLIENT =
  'клиент actions собирает только src/shared/lib/safe-action.ts: action — цепочка authActionClient; нужна функция пакета next-safe-action — добавьте её экспорт туда'
const actionClient = syntaxRule('next-safe-action импортирует только shared/lib/safe-action.ts', [
  {
    selector:
      'ImportDeclaration[importKind!="type"][source.value="next-safe-action"]:has(> :matches(ImportSpecifier[importKind!="type"], ImportDefaultSpecifier, ImportNamespaceSpecifier))',
    message: OWN_ACTION_CLIENT,
  },
  { selector: 'ImportExpression[source.value="next-safe-action"]', message: OWN_ACTION_CLIENT },
  {
    selector:
      ':matches(ExportNamedDeclaration, ExportAllDeclaration)[exportKind!="type"][source.value="next-safe-action"]',
    message: OWN_ACTION_CLIENT,
  },
])

// Клиент Supabase и подключение к базе создаёт только shared/infrastructure: свой createClient(url, secretKey)
// или postgres(databaseUrl) в репозитории — тот же обход RLS, что и createAdminClient(), но мимо запрета BYPASSES_RLS.
const RAW_CLIENT_PACKAGE = '/^(@supabase\\/(supabase-js|ssr)|postgres|drizzle-orm\\/postgres-js)$/'
const RAW_CLIENT =
  'клиент Supabase и подключение к базе создаёт только src/shared/infrastructure: в репозитории — createClient() из @/shared/infrastructure/supabase/server (тип можно: import type)'
const rawClient = syntaxRule('Клиент базы создаёт только shared/infrastructure', [
  {
    selector: `ImportDeclaration[importKind!="type"][source.value=${RAW_CLIENT_PACKAGE}]`,
    message: RAW_CLIENT,
  },
  { selector: `ImportExpression[source.value=${RAW_CLIENT_PACKAGE}]`, message: RAW_CLIENT },
])

// Динамический import() не виден no-restricted-imports: те же запреты обхода RLS повторены для него, а источник,
// который не строка, проверить нельзя вовсе.
const RLS_BYPASS_FILE =
  '/(^|\\/)infrastructure\\/(db(\\/[^\\/]+)?|supabase\\/admin)(\\.[cm]?[jt]s)?$/'
const dynamicImport = syntaxRule('Динамический import не обходит запреты импорта', [
  {
    selector: `ImportExpression[source.value=${RLS_BYPASS_FILE}]`,
    message:
      'db() и createAdminClient() обходят RLS: только в shared/infrastructure и *.admin.ts — и через import() тоже',
  },
  {
    selector: 'ImportExpression:not([source.type="Literal"])',
    message:
      'import() — только со строкой-литералом: путь, собранный из частей, не проверить на обход RLS и границы слоёв',
  },
])

// Репозиторий: ошибка Supabase приходит значением — без проверки error отказ базы выглядит как «пусто» (нулевой остаток).
const dataAccess = syntaxRule('Репозиторий проверяет error и выбирает колонки явно', [
  {
    selector:
      'VariableDeclarator[init.type="AwaitExpression"] > ObjectPattern:has(> Property[key.name=/^(data|count)$/]):not(:has(> Property[key.name="error"]))',
    message:
      "ответ Supabase: const { data, error } = await …; if (error) throw databaseError('модуль.действие', error) — иначе отказ базы выглядит как пустой список",
  },
  {
    selector:
      'CallExpression[callee.property.name="select"]:matches([arguments.length=0], [arguments.0.value=/\\*/])',
    message:
      'select — явный список колонок константой (деньги — amount::text), не *: наружу уходит модель домена, не строка таблицы',
  },
  {
    selector: 'CallExpression[callee.property.name="getSession"]',
    message:
      'getSession() не проверяет подпись токена: пользователь приходит параметром из сессии (requireVerifiedSession() в ui, ctx.session в action)',
  },
  {
    selector: 'CallExpression[callee.object.name="sql"][callee.property.name="raw"]',
    message:
      'sql.raw вставляет строку в запрос как есть: значения — только интерполяцией внутри sql`…`',
  },
])

// Тот же отказ базы, когда ответ не деструктурирован: result.data ?? [] или .then(({ data }) => …). Правило смотрит на тип:
// у ответа PostgREST, в котором ещё возможен отказ (PostgrestResponseFailure), data и count читать нельзя; после
// if (result.error) throw … компилятор сужает тип до успешного ответа, и обращение становится законным.
const RESPONSE_FIELDS = new Set(['data', 'count'])
const propertyName = (node) => {
  if (node.type === 'Identifier') return node.name
  return node.type === 'Literal' ? String(node.value) : undefined
}
const noUncheckedResponse = {
  meta: {
    type: 'problem',
    docs: { description: 'data и count ответа Supabase читаются после проверки error' },
    messages: {
      unchecked:
        "ответ Supabase прочитан без проверки error: сначала if (result.error) throw databaseError('модуль.действие', result.error) или const { data, error } = await … — иначе отказ базы выглядит как пустой список",
    },
    schema: [],
  },
  create(context) {
    const services = context.sourceCode.parserServices
    const mayHaveFailed = (node) =>
      typeParts(services.getTypeAtLocation(node)).some(
        (part) => part.getSymbol()?.getName() === 'PostgrestResponseFailure',
      )
    return {
      MemberExpression(node) {
        const name =
          node.computed && node.property.type !== 'Literal'
            ? undefined
            : propertyName(node.property)
        if (name !== undefined && RESPONSE_FIELDS.has(name) && mayHaveFailed(node.object)) {
          context.report({ node, messageId: 'unchecked' })
        }
      },
      ObjectPattern(node) {
        // объявление const { data } = await … уже ловит local/data-access — здесь параметры и остальные формы
        if (
          node.parent.type === 'VariableDeclarator' &&
          node.parent.init?.type === 'AwaitExpression'
        )
          return
        const names = node.properties.map((property) =>
          property.type === 'Property' ? propertyName(property.key) : undefined,
        )
        if (names.includes('error') || !names.some((name) => RESPONSE_FIELDS.has(name))) return
        if (mayHaveFailed(node)) context.report({ node, messageId: 'unchecked' })
      },
    }
  },
}

// Текст ошибки уходит в лог и в Sentry (reportUnexpectedError). Postgres цитирует в message введённое значение
// (invalid input syntax for type numeric: "…"), в details бывает вся строка с суммами, сообщение Auth называет почту —
// поэтому ошибка провайдера сообщается операцией и кодом, а сам её объект не бросается и не прикладывается как cause.
const PROVIDER_ERROR = /^(Postgrest|Auth\w*)Error$/
const errorByCode = {
  meta: {
    type: 'problem',
    docs: { description: 'Ошибка базы и Auth сообщается операцией и кодом' },
    messages: {
      text: "ошибка базы и Auth сообщается операцией и кодом: throw databaseError('модуль.действие', error) (@/shared/infrastructure/supabase/postgres-errors) или authError('auth.действие', error) (…/auth-errors); message, details и hint несут значения — сумму, строку таблицы, почту, — а текст ошибки уходит в лог и в Sentry",
      cause:
        'cause прикладывает объект ошибки провайдера вместе с его message и details — они уйдут в Sentry: ошибка сообщается операцией и кодом (databaseError, authError)',
      rethrown:
        "ошибка базы или Auth брошена как есть — её message и details уйдут в лог и в Sentry: throw databaseError('модуль.действие', error) или authError('auth.действие', error)",
    },
    schema: [],
  },
  create(context) {
    const services = context.sourceCode.parserServices
    const isProviderError = (node) =>
      typeParts(services.getTypeAtLocation(node)).some((part) =>
        PROVIDER_ERROR.test(part.getSymbol()?.getName() ?? ''),
      )
    return {
      'NewExpression[callee.name=/Error$/] MemberExpression[property.name=/^(message|details|hint)$/]'(
        node,
      ) {
        context.report({ node, messageId: 'text' })
      },
      'NewExpression[callee.name=/Error$/] Property[key.name="cause"]'(node) {
        context.report({ node, messageId: 'cause' })
      },
      ThrowStatement(node) {
        if (isProviderError(node.argument)) context.report({ node, messageId: 'rethrown' })
      },
    }
  },
}

// /api/cron/* открыт в proxy.ts (сессии у планировщика нет): без проверки секрета это привилегированная операция по адресу без входа.
const HTTP_HANDLER = '/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/'
// Проверка — первый оператор тела и с выходом: проверка после работы или без return ничего не закрывает.
const cronCheckFirst = (body) =>
  `[${body}.0.type="IfStatement"][${body}.0.test.type="UnaryExpression"][${body}.0.test.operator="!"][${body}.0.test.argument.callee.name="isCronRequest"]:matches([${body}.0.consequent.type="ReturnStatement"], [${body}.0.consequent.body.0.type="ReturnStatement"])`
const CRON_SECRET =
  'маршрут /api/cron/* открыт в proxy.ts: первая строка обработчика — if (!isCronRequest(request)) return new Response(null, { status: 401 }) — isCronRequest из @/shared/lib/cron'
const CRON_HANDLER_IN_PLACE =
  'обработчик плановой задачи объявляется в route.ts: export function GET(request) { if (!isCronRequest(request)) return … } — переэкспорт, деструктуризация и обёртка прячут обработчик от проверки секрета'
const cronSecret = syntaxRule('Плановая задача проверяет секрет', [
  {
    selector: `ExportNamedDeclaration > FunctionDeclaration[id.name=${HTTP_HANDLER}]:not(${cronCheckFirst('body.body')})`,
    message: CRON_SECRET,
  },
  {
    selector: `ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=${HTTP_HANDLER}]:not(${cronCheckFirst('init.body.body')})`,
    message: CRON_SECRET,
  },
  {
    selector:
      'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > :matches(ObjectPattern, ArrayPattern)',
    message: CRON_HANDLER_IN_PLACE,
  },
  { selector: 'ExportNamedDeclaration > ExportSpecifier', message: CRON_HANDLER_IN_PLACE },
  { selector: 'ExportAllDeclaration', message: CRON_HANDLER_IN_PLACE },
])

// enum: числовой принимает любое число, а значение не совпадает со строкой из базы и Zod — набор значений задаёт z.enum.
const noEnum = syntaxRule('enum не используется', [
  {
    selector: 'TSEnumDeclaration',
    message: 'enum не используется: z.enum([...]) в domain или массив as const и union строк',
  },
])

const local = {
  rules: {
    'no-comments': noComments,
    'money-as-number': moneyAsNumber,
    'no-money-operators': noMoneyOperators,
    'pure-core': pureCore,
    'no-throw-in-use-case': noThrowInUseCase,
    'no-ignored-result': noIgnoredResult,
    'server-action': serverAction,
    'behind-sign-in': behindSignIn,
    'action-client': actionClient,
    'raw-client': rawClient,
    'dynamic-import': dynamicImport,
    'data-access': dataAccess,
    'no-unchecked-response': noUncheckedResponse,
    'error-by-code': errorByCode,
    'cron-secret': cronSecret,
    'no-enum': noEnum,
  },
}
const NOT_VENDOR_UI = ['src/shared/ui/**', '!src/shared/ui/form/**']
const guardsConfig = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: NOT_VENDOR_UI,
  plugins: { local },
  rules: {
    'local/money-as-number': 'error',
    'local/no-money-operators': 'error',
    'local/no-ignored-result': 'error',
    'local/no-unchecked-response': 'error',
    'local/no-enum': 'error',
    // as на границе — только после проверки: сужение типа без Zod пропускает чужую форму данных
    '@typescript-eslint/no-unsafe-type-assertion': 'error',
  },
}
// Защиты доступа действуют и в стороннем shadcn (src/shared/ui): исключение для его стиля их не снимает.
const accessGuardsConfig = {
  files: ['src/**/*.{ts,tsx}'],
  plugins: { local },
  rules: { 'local/server-action': 'error' },
}
const actionClientConfig = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/shared/lib/safe-action.ts'],
  plugins: { local },
  rules: { 'local/action-client': 'error' },
}
const pureCoreConfig = {
  files: ['src/modules/*/domain/**', 'src/modules/*/application/**', 'src/shared/domain/**'],
  plugins: { local },
  rules: { 'local/pure-core': 'error' },
}
const useCaseConfig = {
  files: ['src/modules/*/application/**'],
  plugins: { local },
  rules: { 'local/no-throw-in-use-case': 'error' },
}
const behindSignInConfig = {
  files: ['src/modules/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
  ignores: ['src/modules/auth/**'],
  plugins: { local },
  rules: { 'local/behind-sign-in': 'error' },
}
const rawClientConfig = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/shared/infrastructure/**', 'src/proxy.ts'],
  plugins: { local },
  rules: { 'local/raw-client': 'error' },
}
const repositoryConfig = {
  files: ['src/modules/*/infrastructure/**'],
  ignores: ['src/**/*.fake.ts'],
  plugins: { local },
  rules: { 'local/data-access': 'error', 'local/error-by-code': 'error' },
}
const cronRouteConfig = {
  files: ['src/app/api/cron/**/route.ts'],
  plugins: { local },
  rules: { 'local/cron-secret': 'error' },
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
    local,
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
    // явные ошибки логики: одинаковые ветки и условия, перезапись элемента, проигнорированный результат
    'sonarjs/no-all-duplicated-branches': 'error',
    'sonarjs/no-identical-conditions': 'error',
    'sonarjs/no-identical-expressions': 'error',
    'sonarjs/no-element-overwrite': 'error',
    'sonarjs/no-ignored-return': 'error',
    'sonarjs/no-use-of-empty-return-value': 'error',
    'sonarjs/no-collection-size-mischeck': 'error',
    'sonarjs/no-gratuitous-expressions': 'error',
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
        detectObjects: false,
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
    // 0 — настоящее значение (сумма 0, количество 0): `||` и `if (amount)` его теряют, нужны `??` и явное сравнение.
    // Пустая строка и «нет значения» для строк обычно одно и то же (пустой поиск, не заданная переменная) — строки разрешены.
    '@typescript-eslint/prefer-nullish-coalescing': [
      'error',
      { ignorePrimitives: { string: true } },
    ],
    // остаток деструктуризации убирает поле без перечисления остальных: const { ownerId: _ownerId, ...note } = stored
    '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/strict-boolean-expressions': [
      'error',
      {
        allowString: true,
        allowNumber: false,
        allowNullableObject: true,
        allowNullableBoolean: true,
        allowNullableString: true,
        allowNullableNumber: false,
        allowAny: false,
      },
    ],
    // логи — одна строка JSON через console.info / console.error (docs/release.md, «Логи»); console.log — отладка, не в код
    'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
  },
}
// React: {count && <X/>} при count = 0 рисует «0»; ключ-индекс путает строки при сортировке; кнопка без type в форме — submit
const reactSafetyConfig = {
  files: ['src/**/*.tsx'],
  ignores: ['src/shared/ui/**', '!src/shared/ui/form/**'],
  rules: {
    'react/jsx-no-leaked-render': ['error', { validStrategies: ['ternary', 'coerce'] }],
    'react/no-array-index-key': 'error',
    'react/button-has-type': 'error',
  },
}
// eslint-disable — только с именем правила и причиной после «--»; лишняя директива — ошибка
const DIRECTIVE_FILES = ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs', 'tests/**/*.{ts,tsx}']
const disableDirectivesConfig = {
  ...eslintComments.recommended,
  files: DIRECTIVE_FILES,
  ignores: ['src/shared/ui/**', '!src/shared/ui/form/**'],
  rules: {
    ...eslintComments.recommended.rules,
    '@eslint-community/eslint-comments/disable-enable-pair': ['error', { allowWholeFile: true }],
    '@eslint-community/eslint-comments/require-description': 'error',
  },
}
// Границы слоёв, обход RLS, деньги и точки входа комментарием не снимаются — иначе любая защита отключается одной
// строкой. Комментарий умеет это двумя способами, и оба — ошибка, в том числе в стороннем shadcn:
//   eslint-disable <защита>          → no-restricted-disable (список ниже — он же список второго прохода);
//   eslint <правило>: "off" (конфиг) → no-use: из комментариев ESLint разрешены только eslint-disable* и eslint-enable.
// Эти два правила — тоже правила: их можно отключить тем же комментарием. Поэтому npm run lint:rules вторым проходом
// линтует src с allowInlineConfig: false (комментарии не действуют вовсе) и падает на любом сообщении правил из
// списка UNDISABLEABLE. npm run lint один такой двойной обход не видит — видит npm run check (и CI).
export const UNDISABLEABLE = [
  'boundaries/*',
  'no-restricted-imports',
  'no-restricted-properties',
  'local/*',
  '!local/no-comments',
  '@typescript-eslint/no-explicit-any',
  '@typescript-eslint/consistent-type-assertions',
]
const guardDirectivesConfig = {
  ...eslintComments.recommended,
  files: DIRECTIVE_FILES,
  rules: {
    '@eslint-community/eslint-comments/no-restricted-disable': ['error', ...UNDISABLEABLE],
    '@eslint-community/eslint-comments/no-use': [
      'error',
      {
        allow: [
          'eslint-disable',
          'eslint-disable-line',
          'eslint-disable-next-line',
          'eslint-enable',
        ],
      },
    ],
  },
}
// Тесты: забытый .only, тест без проверки, одинаковые названия, ожидание по таймеру и пропущенный await — ошибки
const unitTestsConfig = {
  files: ['tests/unit/**/*.{ts,tsx}'],
  plugins: { vitest },
  rules: {
    ...vitest.configs.recommended.rules,
    'vitest/no-focused-tests': 'error',
    'vitest/no-disabled-tests': 'error',
  },
}
const e2eTestsConfig = {
  ...playwright.configs['flat/recommended'],
  files: ['tests/e2e/**/*.ts'],
  rules: {
    ...playwright.configs['flat/recommended'].rules,
    'playwright/no-skipped-test': ['error', { allowConditional: true }],
    'playwright/no-focused-test': 'error',
    'playwright/no-wait-for-timeout': 'error',
    'playwright/missing-playwright-await': 'error',
    // signIn сам ждёт адрес после входа — это проверка
    'playwright/expect-expect': ['error', { assertFunctionNames: ['signIn'] }],
    // проверки от параметра теста (тема светлая или тёмная) — не случайная логика, а таблица случаев
    'playwright/no-conditional-in-test': 'off',
    'playwright/no-conditional-expect': 'off',
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

// Переменные окружения — только через env.ts (секреты и адреса) и runtime.ts (режим сборки).
// Секретный ключ Supabase и адрес базы — это и есть обход RLS: их читает только shared/infrastructure.
const SECRET_ACCESS =
  'секретный ключ Supabase и адрес базы читает только src/shared/infrastructure (createAdminClient, db): запрос с ними идёт мимо RLS'
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
      { object: 'env', property: 'supabaseSecretKey', message: SECRET_ACCESS },
      { object: 'env', property: 'databaseUrl', message: SECRET_ACCESS },
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
    ]
      .map((rule) => [`jsx-a11y/${rule}`, 'error'])
      // прокрутка таблицы на телефоне: <div role="region" aria-label="…" tabIndex={0}> (.claude/rules/ui.md)
      .concat([
        ['jsx-a11y/no-noninteractive-tabindex', ['error', { roles: ['region'], tags: [] }]],
      ]),
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

// Прямое подключение к базе (db(), локально и в CI) и клиент Supabase на секретном ключе (createAdminClient,
// серверные задачи без сессии) обходят RLS: только в shared/infrastructure и в файлах *.admin.ts инфраструктуры
// модуля (плановая задача в src/app/api/cron зовёт server.ts модуля). Паттерны ловят и алиас, и относительный путь.
// shared/lib — техника Next.js для ui и app: инфраструктуру видят только сессия, actions и проверка секрета
// планировщика (cron.ts читает env), иначе обход RLS просочился бы в ui через реэкспорт.
const BYPASSES_RLS = {
  group: [
    '@/shared/infrastructure/db',
    '@/shared/infrastructure/db/*',
    '@/shared/infrastructure/supabase/admin',
    '**/infrastructure/db',
    '**/infrastructure/db/*',
    '**/infrastructure/supabase/admin',
  ],
  message:
    'db() и createAdminClient() обходят RLS: только в shared/infrastructure и *.admin.ts; данные пользователя — через клиент Supabase с сессией',
}
// Глобальный Decimal из decimal.js считает с точностью 20 и округляет от нуля, а money() — клон с точностью 64
// и округлением к чётному: смешение двух классов теряет цифры. Расчёты денег — только через money().
// Во flat config позднее правило перетирает опции целиком, поэтому запрет decimal.js повторяется в каждом объекте,
// который задаёт no-restricted-imports, а для файлов вне bypassesRlsConfig задан отдельно.
const GLOBAL_DECIMAL = {
  name: 'decimal.js',
  message:
    'Расчёты денег — через money() из @/shared/domain/money: у глобального Decimal другая точность и округление',
}
const RLS_BYPASS_ALLOWED = ['src/shared/infrastructure/**', 'src/**/*.admin.ts']
const bypassesRlsConfig = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: RLS_BYPASS_ALLOWED,
  rules: {
    'no-restricted-imports': ['error', { paths: [GLOBAL_DECIMAL], patterns: [BYPASSES_RLS] }],
  },
}
const dynamicImportConfig = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: RLS_BYPASS_ALLOWED,
  plugins: { local },
  rules: { 'local/dynamic-import': 'error' },
}
const globalDecimalConfig = {
  files: RLS_BYPASS_ALLOWED,
  rules: { 'no-restricted-imports': ['error', { paths: [GLOBAL_DECIMAL] }] },
}
const moneyConfig = {
  files: ['src/shared/domain/money.ts'],
  rules: { 'no-restricted-imports': ['error', { patterns: [BYPASSES_RLS] }] },
}
const sharedLibConfig = {
  files: ['src/shared/lib/**/*.ts'],
  ignores: ['src/shared/lib/session.ts', 'src/shared/lib/safe-action.ts', 'src/shared/lib/cron.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [GLOBAL_DECIMAL],
        patterns: [
          BYPASSES_RLS,
          {
            group: ['@/shared/infrastructure/*', '@/shared/infrastructure/**'],
            message:
              'shared/lib доступен из ui: инфраструктура — только в session.ts, safe-action.ts и cron.ts',
          },
        ],
      },
    ],
  },
}

export default defineConfig([
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
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
    'tests/lint-rules/fixtures/**', // пробы правил: заведомо плохой код, проверяет npm run lint:rules
  ]),
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.strictTypeChecked,
  boundariesConfig,
  codeStyleConfig,
  componentLengthConfig,
  testsConfig,
  codeStyleTsConfig,
  reactSafetyConfig,
  disableDirectivesConfig,
  guardDirectivesConfig,
  unitTestsConfig,
  e2eTestsConfig,
  boundaryOnlyTypesConfig,
  guardsConfig,
  accessGuardsConfig,
  actionClientConfig,
  pureCoreConfig,
  useCaseConfig,
  behindSignInConfig,
  rawClientConfig,
  repositoryConfig,
  cronRouteConfig,
  a11yConfig,
  envAccessConfig,
  vendorUiConfig,
  bypassesRlsConfig,
  dynamicImportConfig,
  moneyConfig,
  globalDecimalConfig,
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
