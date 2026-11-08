import bundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env['ANALYZE'] === 'true' })

// Базовые заголовки безопасности и CSP без nonce: nonce делает все страницы динамическими и ломает
// статическую оболочку Cache Components. script-src — через хэши (experimental.sri), когда понадобится.
// form-action не задан: вход через OAuth уходит редиректом на домен Supabase.
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
  },
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
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default withBundleAnalyzer(nextConfig)
