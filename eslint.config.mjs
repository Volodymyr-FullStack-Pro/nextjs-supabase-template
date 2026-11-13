import { dirname, resolve, sep } from 'node:path'

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
      // partialMatch: false matches from the root and the first match wins, so deeper folders go first.
      // mode: 'file' is deprecated in v7, but boundaries/files gives file elements no captured values; revisit with v8.
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
        // The last matching policy wins: general permissions first, exceptions after.
        policies: [
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
          {
            from: PURE_CORE,
            disallow: { to: { module: { origin: ['external', 'core'] } } },
            message:
              'Domain and application do not import frameworks or infrastructure ({{to.module.source}})',
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

const DIRECTIVE =
  /^(eslint-|@vitest-environment|@ts-expect-error|@ts-ignore|@ts-check|@ts-nocheck|@jsx|global\s|@type\s|prettier-ignore|v8 ignore|c8 ignore|D-\d+: )/

const noComments = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Meaning is expressed by names and structure, not comments' },
    messages: {
      comment:
        'Comment: move the meaning into a name or a test; the reason for a decision is a row in docs/knowledge/decisions.md and a "// D-NNN: …" reference',
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

const MONEY_NAME =
  '/(^|_)(amount|price|balance|fee|cost|rate|quantity|share)$|(Amount|Price|Balance|Fee|Cost|Rate|Quantity|Share)$/'
const HAS_MONEY_OPERAND = `:has(> :matches(Identifier[name=${MONEY_NAME}], MemberExpression[property.name=${MONEY_NAME}]))`
const MONEY_AS_NUMBER =
  'amount, price, balance, rate, quantity and share are a string or Money (money() from @/shared/domain/money), not number; in Zod use z.string() with parseDecimalInput or decimalPattern, a number from foreign JSON is z.coerce.string().regex(decimalPattern(…))'
const MONEY_OPERATOR =
  'money arithmetic and comparison go through money(): money(a).plus(b), money(a).gt(b); operators compare strings letter by letter and lose cents on numbers'
const MONEY_CONVERSION =
  'Number(), parseFloat and unary plus lose amount precision: compute with money(a), display with formatMoney(a, { currency }), a chart number is money(a).toNumber() in ui'
const NUMBER_TYPE = ':matches(TSNumberKeyword, TSUnionType:has(> TSNumberKeyword))'
const moneyAsNumber = syntaxRule('Amounts are a string or Money, not number', [
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

const COMPARISON_OPERATORS = new Set(['<', '<=', '>', '>=', '==', '===', '!=', '!=='])
const isNullish = (node) =>
  (node.type === 'Literal' && node.value === null) ||
  (node.type === 'Identifier' && node.name === 'undefined')
const typeParts = (type) => (type.isUnion() ? type.types : [type])
const noMoneyOperators = {
  meta: {
    type: 'problem',
    docs: { description: 'Money is compared with methods, not operators' },
    messages: {
      operator:
        'Money is compared with .gt() .gte() .lt() .lte() .eq() .cmp(): the operator "{{operator}}" compares strings ("9" > "10") or references',
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

const NUMBER_CONVERSION =
  'domain and application do not turn strings into numbers: compute with money(); an integer (year, month, counter) is Number.parseInt(x, 10); ui prepares chart numbers'
const CLOCK =
  'domain and application do not read the clock: the current moment comes as a parameter (ctx.now) set by the action or server.ts'
const pureCore = syntaxRule('Pure core: no numbers from strings and no clock', [
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

const noThrowInUseCase = syntaxRule('A use case returns Result instead of throwing', [
  {
    selector: 'ThrowStatement',
    message:
      'a use case does not throw: an expected failure is return err(new RuleViolationError(…)); an unexpected one comes from infrastructure, a broken invariant from a domain function',
  },
])
const noIgnoredResult = {
  meta: {
    type: 'problem',
    docs: { description: 'A use case Result is checked' },
    messages: {
      ignored:
        'Result is not checked: const result = await …; if (!result.ok) fail(result.error), otherwise the failure reaches the user as success',
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

const ACTION_CLIENT = '/^(authActionClient|mfaActionClient|setupActionClient|actionClient)$/'
const USE_SERVER_FILE = 'Program:has(> ExpressionStatement[directive="use server"])'
const SERVER_ACTION =
  'a Server Action is a safe-action chain only: export const x = authActionClient.inputSchema(Schema).action(…) (@/shared/lib/safe-action); a plain export checks neither the session, nor the second factor, nor the input'
const serverAction = syntaxRule('Server Actions go through safe-action only', [
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
      'userId and ownerId come from the session (ctx.session.userId), not from action input: otherwise a signed-in user acts on behalf of someone else',
  },
])

const SESSION_FILE = '/shared\\/lib\\/session$/'
const SAFE_ACTION_FILE = '/shared\\/lib\\/safe-action$/'
const UNVERIFIED_SESSION =
  'verifySession() does not check the second-factor step: behind sign-in use requireVerifiedSession(); verifySession is only for the /mfa/* screens of the auth module'
const UNVERIFIED_ACTION =
  'actionClient, mfaActionClient and setupActionClient do not check the session or the second-factor step: behind sign-in use authActionClient; the others are for the auth module only (sign-in and /mfa/*)'
const behindSignIn = syntaxRule('Behind sign-in: requireVerifiedSession and authActionClient', [
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

const OWN_ACTION_CLIENT =
  'only src/shared/lib/safe-action.ts builds the actions client: an action is an authActionClient chain; if you need a next-safe-action function, export it from there'
const actionClient = syntaxRule('Only shared/lib/safe-action.ts imports next-safe-action', [
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

const RAW_CLIENT_PACKAGE = '/^@supabase\\/(supabase-js|ssr)$/'
const RAW_CLIENT =
  'only src/shared/infrastructure creates a Supabase client: in a repository use createClient() from @/shared/infrastructure/supabase/server (import type is allowed)'
const rawClient = syntaxRule('Only shared/infrastructure creates a database client', [
  {
    selector: `ImportDeclaration[importKind!="type"][source.value=${RAW_CLIENT_PACKAGE}]`,
    message: RAW_CLIENT,
  },
  { selector: `ImportExpression[source.value=${RAW_CLIENT_PACKAGE}]`, message: RAW_CLIENT },
])

const DIRECT_DATABASE_PACKAGE = '/^(postgres|pg|drizzle-orm)(\\/.*)?$/'
const DIRECT_DATABASE =
  'the app has no direct database connection: a Postgres driver bypasses RLS. User data goes through createClient() from @/shared/infrastructure/supabase/server, a job without a session through createAdminClient() in *.admin.ts; the postgres package is for scripts/ and tests/ only'
const directDatabase = syntaxRule('No Postgres driver or ORM in the app', [
  {
    selector: `ImportDeclaration[source.value=${DIRECT_DATABASE_PACKAGE}]`,
    message: DIRECT_DATABASE,
  },
  {
    selector: `ImportExpression[source.value=${DIRECT_DATABASE_PACKAGE}]`,
    message: DIRECT_DATABASE,
  },
  {
    selector: `:matches(ExportNamedDeclaration, ExportAllDeclaration)[source.value=${DIRECT_DATABASE_PACKAGE}]`,
    message: DIRECT_DATABASE,
  },
])

// no-restricted-imports does not see dynamic import(), so the RLS bypass ban is repeated here.
const RLS_BYPASS_FILE = '/(^|\\/)infrastructure\\/supabase\\/admin(\\.[cm]?[jt]s)?$/'
const dynamicImport = syntaxRule('Dynamic import does not bypass import bans', [
  {
    selector: `ImportExpression[source.value=${RLS_BYPASS_FILE}]`,
    message:
      'createAdminClient() bypasses RLS: only in shared/infrastructure and *.admin.ts, through import() too',
  },
  {
    selector: 'ImportExpression:not([source.type="Literal"])',
    message:
      'import() takes a string literal only: a path built from parts cannot be checked for RLS bypass and layer boundaries',
  },
])

const dataAccess = syntaxRule('A repository checks error and selects columns explicitly', [
  {
    selector:
      'VariableDeclarator[init.type="AwaitExpression"] > ObjectPattern:has(> Property[key.name=/^(data|count)$/]):not(:has(> Property[key.name="error"]))',
    message:
      "Supabase response: const { data, error } = await …; if (error) throw databaseError('module.action', error), otherwise a database failure looks like an empty list",
  },
  {
    selector:
      'CallExpression[callee.property.name="select"]:matches([arguments.length=0], [arguments.0.value=/\\*/])',
    message:
      'select takes an explicit column list constant (money as amount::text), not *: a domain model leaves the repository, not a table row',
  },
  {
    selector: 'CallExpression[callee.property.name="getSession"]',
    message:
      'getSession() does not verify the token signature: the user comes as a parameter from the session (requireVerifiedSession() in ui, ctx.session in an action)',
  },
])

const RESPONSE_FIELDS = new Set(['data', 'count'])
const RESPONSE_CHECKS = new Set(['error', 'success'])
const POSTGREST_BUILDER = /^Postgrest\w*Builder$/
const FUNCTIONS = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'])
const propertyName = (node) => {
  if (node.type === 'Identifier') return node.name
  return node.type === 'Literal' ? String(node.value) : undefined
}
const withoutVoid = (node) =>
  node.type === 'UnaryExpression' && node.operator === 'void' ? node.argument : node
const isInAsyncFunction = (node) => {
  let current = node.parent
  while (current && !FUNCTIONS.has(current.type)) current = current.parent
  return Boolean(current?.async)
}
const CHECK_ERROR =
  "const { error } = await …; if (error) throw databaseError('module.action', error) (or if (result.error) throw …)"
const noUncheckedResponse = {
  meta: {
    type: 'problem',
    docs: {
      description: 'A Supabase response is read, returned or discarded only after checking error',
    },
    messages: {
      unchecked: `Supabase response read without checking error: first ${CHECK_ERROR}, otherwise a database failure looks like an empty list`,
      discarded: `Supabase response discarded: ${CHECK_ERROR}, otherwise a database failure (RLS, check) looks like "saved"`,
      notSent: `Supabase query not sent: the builder is lazy and reaches the database only on await, ${CHECK_ERROR}`,
      returned: `a Supabase response leaves the function instead of a domain model: ${CHECK_ERROR}, then return the parsed data`,
    },
    schema: [],
  },
  create(context) {
    const services = context.sourceCode.parserServices
    const symbolNames = (node) =>
      typeParts(services.getTypeAtLocation(node)).map((part) => part.getSymbol()?.getName() ?? '')
    const mayHaveFailed = (node) => symbolNames(node).includes('PostgrestResponseFailure')
    const isBuilder = (node) => symbolNames(node).some((name) => POSTGREST_BUILDER.test(name))
    const checkReturned = (node) => {
      if (mayHaveFailed(node) || (isBuilder(node) && isInAsyncFunction(node))) {
        context.report({ node, messageId: 'returned' })
      }
    }
    return {
      MemberExpression(node) {
        const name =
          node.computed && node.property.type !== 'Literal'
            ? undefined
            : propertyName(node.property)
        if (name === undefined || RESPONSE_CHECKS.has(name)) return
        if (mayHaveFailed(node.object)) context.report({ node, messageId: 'unchecked' })
      },
      ObjectPattern(node) {
        const names = node.properties.map((property) =>
          property.type === 'Property' ? propertyName(property.key) : undefined,
        )
        if (names.some((name) => RESPONSE_CHECKS.has(name))) return
        const isDeclaredFromAwait =
          node.parent.type === 'VariableDeclarator' && node.parent.init?.type === 'AwaitExpression'
        if (isDeclaredFromAwait && names.some((name) => RESPONSE_FIELDS.has(name))) return
        if (mayHaveFailed(node)) context.report({ node, messageId: 'unchecked' })
      },
      ExpressionStatement(node) {
        const expression = withoutVoid(node.expression)
        if (expression.type === 'AssignmentExpression') return
        if (isBuilder(expression)) context.report({ node, messageId: 'notSent' })
        else if (mayHaveFailed(expression)) context.report({ node, messageId: 'discarded' })
      },
      ReturnStatement(node) {
        if (node.argument) checkReturned(node.argument)
      },
      'ArrowFunctionExpression[expression=true]'(node) {
        checkReturned(node.body)
      },
    }
  },
}

const importPath = {
  meta: {
    type: 'problem',
    docs: { description: 'Import path is normalized and stays inside src' },
    messages: {
      normalised:
        'import path "{{source}}" is not normalized (/./, /../ or // inside the path): import bans compare the path text, so write it without extra segments',
      outside:
        'import "{{source}}" leaves src: application code lives in src, and layer boundaries and lint guards apply only there',
    },
    schema: [],
  },
  create(context) {
    const sourceRoot = resolve(context.cwd, 'src') + sep
    const check = (node) => {
      if (node?.type !== 'Literal' || typeof node.value !== 'string') return
      const source = node.value
      const segments = source.split('/')
      const leading = segments[0] === '.' ? 1 : segments.findIndex((segment) => segment !== '..')
      const rest = leading < 0 ? [] : segments.slice(leading)
      if (rest.some((segment) => segment === '.' || segment === '..' || segment === '')) {
        context.report({ node, messageId: 'normalised', data: { source } })
      } else if (
        source.startsWith('.') &&
        !(resolve(dirname(context.filename), source) + sep).startsWith(sourceRoot)
      ) {
        context.report({ node, messageId: 'outside', data: { source } })
      }
    }
    const checkSource = (node) => check(node.source)
    return {
      ImportDeclaration: checkSource,
      ExportNamedDeclaration: checkSource,
      ExportAllDeclaration: checkSource,
      ImportExpression: checkSource,
      TSImportType: (node) => check(node.source ?? node.argument?.literal),
    }
  },
}

const typescriptOnly = {
  meta: {
    type: 'problem',
    docs: { description: 'Only .ts and .tsx in src' },
    messages: {
      extension:
        'only .ts and .tsx files in src: layer boundaries and money and access guards do not apply to other extensions',
    },
    schema: [],
  },
  create: (context) => ({
    Program() {
      context.report({ loc: { line: 1, column: 0 }, messageId: 'extension' })
    },
  }),
}

const PROVIDER_ERROR = /^(Postgrest|Auth\w*)Error$/
const errorByCode = {
  meta: {
    type: 'problem',
    docs: { description: 'Database and Auth errors are reported by operation and code' },
    messages: {
      text: "a database or Auth error is reported by operation and code: throw databaseError('module.action', error) (@/shared/infrastructure/supabase/postgres-errors) or authError('auth.action', error) (…/auth-errors); message, details and hint carry values (an amount, a table row, an email), and the error text reaches the log and Sentry",
      cause:
        'cause attaches the provider error object with its message and details, which reach Sentry: report the error by operation and code (databaseError, authError)',
      rethrown:
        "a database or Auth error is thrown as is, so its message and details reach the log and Sentry: throw databaseError('module.action', error) or authError('auth.action', error)",
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

const HTTP_HANDLER = '/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/'
const cronCheckFirst = (body) =>
  `[${body}.0.type="IfStatement"][${body}.0.test.type="UnaryExpression"][${body}.0.test.operator="!"][${body}.0.test.argument.callee.name="isCronRequest"]:matches([${body}.0.consequent.type="ReturnStatement"], [${body}.0.consequent.body.0.type="ReturnStatement"])`
const CRON_SECRET =
  '/api/cron/* is open in proxy.ts: the first statement of the handler is if (!isCronRequest(request)) return new Response(null, { status: 401 }), with isCronRequest from @/shared/lib/cron'
const CRON_HANDLER_IN_PLACE =
  'a scheduled job handler is declared in route.ts: export function GET(request) { if (!isCronRequest(request)) return … }; a re-export, destructuring or wrapper hides the handler from the secret check'
const CRON_CHECK_IMPORT =
  'Program:not(:has(> ImportDeclaration[source.value="@/shared/lib/cron"]:has(> ImportSpecifier[imported.name="isCronRequest"][local.name="isCronRequest"])))'
const cronSecret = syntaxRule('A scheduled job checks the secret', [
  {
    selector: CRON_CHECK_IMPORT,
    message:
      "a scheduled job checks the secret with isCronRequest from @/shared/lib/cron: import { isCronRequest } from '@/shared/lib/cron'; a local function with the same name does not compare the secret",
  },
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

const noEnum = syntaxRule('No enum', [
  {
    selector: 'TSEnumDeclaration',
    message: 'no enum: z.enum([...]) in domain, or an as const array and a string union',
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
    'direct-database': directDatabase,
    'dynamic-import': dynamicImport,
    'data-access': dataAccess,
    'no-unchecked-response': noUncheckedResponse,
    'import-path': importPath,
    'typescript-only': typescriptOnly,
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
    '@typescript-eslint/no-unsafe-type-assertion': 'error',
  },
}
const accessGuardsConfig = {
  files: ['src/**/*.{ts,tsx}'],
  plugins: { local },
  rules: { 'local/server-action': 'error', 'local/import-path': 'error' },
}
const typescriptOnlyConfig = {
  files: ['src/**/*.{js,jsx,mjs,cjs,mts,cts}'],
  ...tseslint.configs.disableTypeChecked,
  plugins: { local },
  rules: { ...tseslint.configs.disableTypeChecked.rules, 'local/typescript-only': 'error' },
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
const directDatabaseConfig = {
  files: ['src/**/*.{ts,tsx}'],
  plugins: { local },
  rules: { 'local/direct-database': 'error' },
}
const repositoryConfig = {
  files: ['src/modules/*/infrastructure/**'],
  ignores: ['src/**/*.fake.ts'],
  plugins: { local },
  rules: { 'local/data-access': 'error', 'local/error-by-code': 'error' },
}
// Route groups (src/app/(jobs)/api/cron/…) and route.tsx also serve /api/cron/*.
const cronRouteConfig = {
  files: ['src/app/**/api/cron/**/route.{ts,tsx}'],
  plugins: { local },
  rules: { 'local/cron-secret': 'error' },
}

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
    'simple-import-sort/imports': ['error', { groups: IMPORT_GROUPS }],
    'simple-import-sort/exports': 'error',
    'import/no-duplicates': ['error', { 'prefer-inline': true }],
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
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
    'react/no-danger': 'error',
    'no-eval': 'error',
    'no-await-in-loop': 'error',
    'no-empty': ['error', { allowEmptyCatch: false }],
    'sonarjs/no-identical-functions': 'error',
    'sonarjs/no-collapsible-if': 'error',
    'sonarjs/prefer-immediate-return': 'error',
    'sonarjs/no-redundant-boolean': 'error',
    'sonarjs/no-inverted-boolean-check': 'error',
    'sonarjs/no-all-duplicated-branches': 'error',
    'sonarjs/no-identical-conditions': 'error',
    'sonarjs/no-identical-expressions': 'error',
    'sonarjs/no-element-overwrite': 'error',
    'sonarjs/no-ignored-return': 'error',
    'sonarjs/no-use-of-empty-return-value': 'error',
    'sonarjs/no-collection-size-mischeck': 'error',
    'sonarjs/no-gratuitous-expressions': 'error',
    'id-length': ['error', { min: 2, exceptions: ['_', 'z', 't'], properties: 'never' }],
    'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    'unicorn/name-replacements': [
      'error',
      {
        checkFilenames: false,
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
    'no-magic-numbers': 'off',
  },
}
const componentLengthConfig = {
  files: ['src/**/*.tsx'],
  ignores: ['src/shared/ui/**', '!src/shared/ui/form/**'],
  rules: {
    'max-lines-per-function': ['error', { max: 120, skipBlankLines: true, skipComments: true }],
  },
}
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
      { selector: 'variable', modifiers: ['destructured'], format: null }, // snake_case columns of database rows
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
    '@typescript-eslint/no-misused-promises': [
      'error',
      { checksVoidReturn: { attributes: false } },
    ],
    // The Supabase query builder is a thenable, not a Promise: without checkThenables a forgotten await is invisible.
    '@typescript-eslint/no-floating-promises': ['error', { checkThenables: true }],
    // Next requires async for 'use cache', Server Actions and server components even without await.
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/no-import-type-side-effects': 'error',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': [
      'error',
      { ignorePrimitives: { string: true } },
    ],
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
    'no-console': ['error', { allow: ['info', 'warn', 'error'] }],
  },
}
const reactSafetyConfig = {
  files: ['src/**/*.tsx'],
  ignores: ['src/shared/ui/**', '!src/shared/ui/form/**'],
  rules: {
    'react/jsx-no-leaked-render': ['error', { validStrategies: ['ternary', 'coerce'] }],
    'react/no-array-index-key': 'error',
    'react/button-has-type': 'error',
  },
}
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
export const UNDISABLEABLE = [
  'boundaries/*',
  'no-restricted-imports',
  'no-restricted-properties',
  'local/*',
  '!local/no-comments',
  '@typescript-eslint/no-explicit-any',
  '@typescript-eslint/consistent-type-assertions',
  '@typescript-eslint/no-require-imports',
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
  files: ['tests/e2e/**/*.ts', 'tests/perf/**/*.ts'],
  rules: {
    ...playwright.configs['flat/recommended'].rules,
    'playwright/no-skipped-test': ['error', { allowConditional: true }],
    'playwright/no-focused-test': 'error',
    'playwright/no-wait-for-timeout': 'error',
    'playwright/missing-playwright-await': 'error',
    // signIn waits for the post-sign-in URL, which is an assertion
    'playwright/expect-expect': ['error', { assertFunctionNames: ['signIn'] }],
    // assertions that depend on a test parameter (light or dark theme) are a case table, not random logic
    'playwright/no-conditional-in-test': 'off',
    'playwright/no-conditional-expect': 'off',
  },
}

const COLOR_MESSAGE = 'colors only as design system tokens (globals.css), not as values in code'
const HEX_COLOR = '/#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z])/'
const FUNCTION_COLOR = '/(?:rgba?|hsla?|oklch)\\(/'
const COLOR_LITERAL_RULES = [
  { selector: `Literal[value=${HEX_COLOR}]`, message: COLOR_MESSAGE },
  { selector: `TemplateElement[value.raw=${HEX_COLOR}]`, message: COLOR_MESSAGE },
  { selector: `Literal[value=${FUNCTION_COLOR}]`, message: COLOR_MESSAGE },
  { selector: `TemplateElement[value.raw=${FUNCTION_COLOR}]`, message: COLOR_MESSAGE },
]

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
          'unknown only at the boundary with external data (infrastructure, shared/lib, app/api): here data has already passed Zod',
      },
      ...COLOR_LITERAL_RULES,
    ],
    '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
  },
}

const SECRET_ACCESS =
  'only src/shared/infrastructure reads the Supabase secret key (createAdminClient): requests with it bypass RLS'
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
          'environment variables go through src/shared/infrastructure/env.ts, the build mode is isProduction from src/shared/lib/runtime.ts',
      },
      { object: 'env', property: 'supabaseSecretKey', message: SECRET_ACCESS },
    ],
  },
}

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
      // table scrolled sideways on a phone: <div role="region" aria-label="…" tabIndex={0}> (.claude/rules/ui.md)
      .concat([
        ['jsx-a11y/no-noninteractive-tabindex', ['error', { roles: ['region'], tags: [] }]],
      ]),
  ),
}

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

const BYPASSES_RLS = {
  group: ['@/shared/infrastructure/supabase/admin', '**/infrastructure/supabase/admin'],
  message:
    'createAdminClient() bypasses RLS: only in shared/infrastructure and *.admin.ts; user data goes through the Supabase client with a session',
}
// Flat config replaces rule options wholesale, so the decimal.js ban repeats in every object that sets no-restricted-imports.
const GLOBAL_DECIMAL = {
  name: 'decimal.js',
  message:
    'Money calculations go through money() from @/shared/domain/money: the global Decimal has a different precision and rounding',
}
// Import bans do not see require(): require itself is banned by no-require-imports and createRequire here.
const NO_CREATE_REQUIRE = ['node:module', 'module'].map((name) => ({
  name,
  message:
    'createRequire gives require(), which import bans do not see (RLS bypass, own database client): use import in src',
}))
const RESTRICTED_PACKAGES = [GLOBAL_DECIMAL, ...NO_CREATE_REQUIRE]
const RLS_BYPASS_ALLOWED = ['src/shared/infrastructure/**', 'src/**/*.admin.ts']
const bypassesRlsConfig = {
  files: ['src/**/*.{ts,tsx}'],
  ignores: RLS_BYPASS_ALLOWED,
  rules: {
    'no-restricted-imports': ['error', { paths: RESTRICTED_PACKAGES, patterns: [BYPASSES_RLS] }],
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
  rules: { 'no-restricted-imports': ['error', { paths: RESTRICTED_PACKAGES }] },
}
const moneyConfig = {
  files: ['src/shared/domain/money.ts'],
  rules: {
    'no-restricted-imports': ['error', { paths: NO_CREATE_REQUIRE, patterns: [BYPASSES_RLS] }],
  },
}
const sharedLibConfig = {
  files: ['src/shared/lib/**/*.{ts,tsx}'],
  ignores: ['src/shared/lib/session.ts', 'src/shared/lib/safe-action.ts', 'src/shared/lib/cron.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: RESTRICTED_PACKAGES,
        patterns: [
          BYPASSES_RLS,
          {
            group: ['@/shared/infrastructure/*', '@/shared/infrastructure/**'],
            message:
              'shared/lib is visible from ui: infrastructure only in session.ts, safe-action.ts and cron.ts',
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
    'src/shared/infrastructure/supabase/types.ts', // generated by npm run db:types
    'tests/lint-rules/fixtures/**', // lint rule probes: bad code on purpose, checked by npm run lint:rules
    'scripts/module-template/**', // generator templates with placeholders: npm run generator:check checks the result
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
  directDatabaseConfig,
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
    // Configs and tests get no type-aware rules: they are outside the main tsconfig project.
    files: ['**/*.{js,mjs,cjs}', '*.config.{ts,mts}'],
    ...tseslint.configs.disableTypeChecked,
  },
  typescriptOnlyConfig,
  eslintConfigPrettier,
])
