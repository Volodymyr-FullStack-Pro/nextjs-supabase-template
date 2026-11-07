import bundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env['ANALYZE'] === 'true' })

const nextConfig: NextConfig = {
  reactCompiler: true,
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
