import bundleAnalyzer from '@next/bundle-analyzer'
import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env['ANALYZE'] === 'true' })
const isDev = process.env.NODE_ENV === 'development'

// CSP without nonce: App Router inlines scripts on every page, so script-src without 'unsafe-inline' needs
// a nonce, and a nonce needs every page rendered per request; SRI does not cover inline scripts.
// An app fully behind sign-in may choose a nonce: docs/blocks/B00-setup/tasks.md, B00-T07.
// Dev React needs 'unsafe-eval'. With OAuth sign-in, form-action also applies to the provider redirect:
// add the Supabase origin (B00-T04).
// connect-src 'self': the browser talks only to its own server (Server Actions).
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
  cacheComponents: true,
  partialPrefetching: true, // Next 16.4 recommends it together with cacheComponents
  typedRoutes: true,
  // next dev would write AGENTS.md; agent instructions live in CLAUDE.md and .claude/rules/
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

// Server-only Sentry: no client SDK, to keep the JS budget (docs/release.md).
// Source maps upload only when SENTRY_AUTH_TOKEN is set (Vercel).
const sentryAuthToken = process.env['SENTRY_AUTH_TOKEN']
const sentryOrg = process.env['SENTRY_ORG']
const sentryProject = process.env['SENTRY_PROJECT']

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  ...(sentryAuthToken && sentryOrg && sentryProject
    ? { authToken: sentryAuthToken, org: sentryOrg, project: sentryProject }
    : { sourcemaps: { disable: true } }),
  silent: !process.env['CI'],
  telemetry: false,
  routeManifestInjection: false, // only the client SDK needs the route manifest, and there is none
})
