import bundleAnalyzer from '@next/bundle-analyzer'
import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env['ANALYZE'] === 'true' })
const isDev = process.env.NODE_ENV === 'development'

// CSP без nonce: App Router вставляет в каждую страницу инлайн-скрипты (тема, загрузчик, данные серверных
// компонентов), поэтому script-src без 'unsafe-inline' возможен только с nonce, а nonce требует рендерить
// каждую страницу на сервере на каждый запрос (await connection()) и отказаться от статической оболочки
// Cache Components; SRI (experimental.sri) инлайн-скрипты не покрывает — проверено в шаблоне (D-075 Finance Hub).
// Проект, где все экраны за входом, может выбрать nonce: см. docs/blocks/B00-setup/tasks.md, B00-T07.
// В dev React требует 'unsafe-eval' для отладки. form-action 'self': формы уходят только на свой сервер; при
// входе через OAuth браузер применяет form-action и к редиректу на провайдера — добавить origin Supabase (B00-T04).
// connect-src 'self': браузер ходит только к своему серверу (Server Actions, /api/vitals).
const scriptSources = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])].join(' ')
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSources}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ')
const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  headers: () => Promise.resolve([{ source: '/:path*', headers: securityHeaders }]),
  // Cache Components: статическая оболочка + стриминг динамики под Suspense; 'use cache' для справочных данных.
  cacheComponents: true,
  partialPrefetching: true, // Next 16.4 рекомендует включать вместе с cacheComponents
  typedRoutes: true, // href в Link и redirect проверяются по сгенерированным типам маршрутов
  // next dev по умолчанию создаёт и переписывает AGENTS.md для ИИ-агентов; инструкции агенту здесь — только CLAUDE.md
  // и .claude/rules/. Полезная часть того файла (документация установленной версии — node_modules/next/dist/docs) — в CLAUDE.md.
  agentRules: false,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

// Sentry только на сервере (src/instrumentation.ts): клиентского SDK нет ради бюджета JS (docs/release.md).
// Source maps уходят в Sentry, только если на сборке задан SENTRY_AUTH_TOKEN (Vercel); без него сборка идёт как обычно.
const sentryAuthToken = process.env['SENTRY_AUTH_TOKEN']
const sentryOrg = process.env['SENTRY_ORG']
const sentryProject = process.env['SENTRY_PROJECT']

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  ...(sentryAuthToken && sentryOrg && sentryProject
    ? { authToken: sentryAuthToken, org: sentryOrg, project: sentryProject }
    : { sourcemaps: { disable: true } }),
  silent: !process.env['CI'],
  telemetry: false,
  routeManifestInjection: false, // карта маршрутов нужна только клиентскому SDK, а его нет
})
